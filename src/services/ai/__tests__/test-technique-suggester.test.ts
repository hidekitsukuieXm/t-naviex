import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  testTechniqueSuggesterService,
  TestTechniqueSuggestionOptions,
  TECHNIQUE_INFO,
} from '../test-technique-suggester';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { ClaudeClient } from '@/lib/claude';

// Mock dependencies
vi.mock('@/repositories/ai-settings-repository', () => ({
  aiSettingsRepository: {
    getDecryptedApiKey: vi.fn(),
    getOrCreateSettings: vi.fn(),
    recordUsage: vi.fn(),
  },
}));

vi.mock('@/repositories/prompt-template-repository', () => ({
  promptTemplateRepository: {
    findDefault: vi.fn(),
  },
}));

vi.mock('@/lib/claude', () => ({
  ClaudeClient: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn(),
  })),
}));

describe('TestTechniqueSuggesterService', () => {
  const mockOptions: TestTechniqueSuggestionOptions = {
    requirement: 'ユーザーは年齢（1-120歳）を入力でき、年齢に応じた料金が計算される',
    feature: '料金計算機能',
    inputTypes: '数値（年齢）',
  };

  const mockSettings = {
    id: BigInt(1),
    projectId: null,
    isEnabled: true,
    hasApiKey: true,
    maskedApiKey: 'sk-a...1234',
    model: 'claude-sonnet-4-20250514' as const,
    maxTokens: 4096,
    temperature: 0.7,
    usageToday: 0,
    usageMonth: 0,
    usageTotal: 0,
    lastUsedAt: null,
    lastTestedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplate = {
    id: BigInt(1),
    projectId: null,
    name: 'テスト技法提案',
    description: null,
    type: 'TEST_TECHNIQUE' as const,
    content:
      '要件: {{requirement}}\n機能: {{feature}}\n入力: {{inputTypes}}\n制約: {{constraints}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `{
    "suggestions": [
      {
        "technique": "BOUNDARY_VALUE",
        "name": "境界値分析",
        "applicability": "HIGH",
        "reason": "年齢に範囲制限（1-120）があるため、境界値のテストが効果的です",
        "example": "0歳、1歳、2歳、119歳、120歳、121歳をテスト",
        "guidelines": ["最小値と最大値をテスト", "境界の前後をテスト"]
      },
      {
        "technique": "EQUIVALENCE_PARTITIONING",
        "name": "同値分割",
        "applicability": "HIGH",
        "reason": "有効な年齢範囲と無効な年齢範囲を分割してテストできます",
        "guidelines": ["有効クラス: 1-120", "無効クラス: 0以下、121以上"]
      }
    ],
    "overallRecommendation": "境界値分析と同値分割を組み合わせて効率的にテストすることを推奨します",
    "testDesignGuidance": "1. 有効/無効の同値クラスを特定\\n2. 境界値を選定\\n3. 各料金区分の境界もテスト"
  }`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('suggestTechniques', () => {
    it('should suggest techniques successfully', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: {
          inputTokens: 200,
          outputTokens: 300,
          totalTokens: 500,
        },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testTechniqueSuggesterService.suggestTechniques(null, mockOptions);

      expect(result.result.suggestions).toHaveLength(2);
      expect(result.result.suggestions[0].technique).toBe('BOUNDARY_VALUE');
      expect(result.result.suggestions[0].applicability).toBe('HIGH');
      expect(result.result.overallRecommendation).toContain('境界値分析');
      expect(result.usage.inputTokens).toBe(200);
      expect(result.usage.outputTokens).toBe(300);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 500);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(
        testTechniqueSuggesterService.suggestTechniques(null, mockOptions)
      ).rejects.toThrow('APIキーが設定されていません');
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(
        testTechniqueSuggesterService.suggestTechniques(null, mockOptions)
      ).rejects.toThrow('AI機能が無効になっています');
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(
        testTechniqueSuggesterService.suggestTechniques(null, mockOptions)
      ).rejects.toThrow('テスト技法提案テンプレートが見つかりません');
    });

    it('should handle JSON with markdown code blocks', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithCodeBlock = '```json\n' + mockAiResponse + '\n```';

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithCodeBlock,
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 300, totalTokens: 500 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testTechniqueSuggesterService.suggestTechniques(null, mockOptions);

      expect(result.result.suggestions).toHaveLength(2);
    });

    it('should normalize technique names from Japanese', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapaneseTechniques = `{
        "suggestions": [
          {"technique": "同値分割", "name": "同値分割", "applicability": "高", "reason": "理由", "guidelines": []},
          {"technique": "境界値", "name": "境界値分析", "applicability": "中", "reason": "理由", "guidelines": []},
          {"technique": "状態遷移", "name": "状態遷移", "applicability": "LOW", "reason": "理由", "guidelines": []}
        ],
        "overallRecommendation": "テスト",
        "testDesignGuidance": "ガイダンス"
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithJapaneseTechniques,
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testTechniqueSuggesterService.suggestTechniques(null, mockOptions);

      expect(result.result.suggestions[0].technique).toBe('EQUIVALENCE_PARTITIONING');
      expect(result.result.suggestions[0].applicability).toBe('HIGH');
      expect(result.result.suggestions[1].technique).toBe('BOUNDARY_VALUE');
      expect(result.result.suggestions[1].applicability).toBe('MEDIUM');
      expect(result.result.suggestions[2].technique).toBe('STATE_TRANSITION');
      expect(result.result.suggestions[2].applicability).toBe('LOW');
    });

    it('should throw error for invalid JSON response', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: 'This is not valid JSON',
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      await expect(
        testTechniqueSuggesterService.suggestTechniques(null, mockOptions)
      ).rejects.toThrow('AIの応答を解析できませんでした');
    });
  });

  describe('getTechniqueGuide', () => {
    it('should return guide for EQUIVALENCE_PARTITIONING', () => {
      const guide = testTechniqueSuggesterService.getTechniqueGuide('EQUIVALENCE_PARTITIONING');

      expect(guide.technique).toBe('EQUIVALENCE_PARTITIONING');
      expect(guide.name).toBe('同値分割');
      expect(guide.whenToUse.length).toBeGreaterThan(0);
      expect(guide.howToApply.length).toBeGreaterThan(0);
      expect(guide.examples.length).toBeGreaterThan(0);
    });

    it('should return guide for all techniques', () => {
      const techniques = Object.keys(TECHNIQUE_INFO) as Array<keyof typeof TECHNIQUE_INFO>;

      techniques.forEach((technique) => {
        const guide = testTechniqueSuggesterService.getTechniqueGuide(technique);
        expect(guide.technique).toBe(technique);
        expect(guide.name).toBeTruthy();
        expect(guide.description).toBeTruthy();
      });
    });
  });

  describe('TECHNIQUE_INFO', () => {
    it('should have info for all techniques', () => {
      expect(TECHNIQUE_INFO.EQUIVALENCE_PARTITIONING.name).toBe('同値分割');
      expect(TECHNIQUE_INFO.BOUNDARY_VALUE.name).toBe('境界値分析');
      expect(TECHNIQUE_INFO.DECISION_TABLE.name).toBe('デシジョンテーブル');
      expect(TECHNIQUE_INFO.STATE_TRANSITION.name).toBe('状態遷移');
      expect(TECHNIQUE_INFO.PAIRWISE.name).toBe('ペアワイズ');
      expect(TECHNIQUE_INFO.EXPLORATORY.name).toBe('探索的テスト');
      expect(TECHNIQUE_INFO.USE_CASE.name).toBe('ユースケーステスト');
      expect(TECHNIQUE_INFO.ERROR_GUESSING.name).toBe('エラー推測');
    });
  });
});
