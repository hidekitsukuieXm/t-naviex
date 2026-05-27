import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  testabilityCheckerService,
  TestabilityCheckOptions,
  CATEGORY_INFO,
} from '../testability-checker';
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

describe('TestabilityCheckerService', () => {
  const mockOptions: TestabilityCheckOptions = {
    content: `ユーザーは適切なパスワードを入力してログインできる。
システムは迅速に応答する。
エラー時は適切なメッセージを表示する。`,
    contentType: 'requirement',
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
    name: 'テスタビリティチェック',
    description: null,
    type: 'TESTABILITY_CHECK' as const,
    content: 'コンテンツ: {{content}}\nタイプ: {{contentType}}\nコンテキスト: {{context}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `{
    "overallScore": 45,
    "summary": "複数の曖昧な表現があり、テスト可能性が低い状態です。",
    "issues": [
      {
        "category": "AMBIGUITY",
        "severity": "HIGH",
        "location": "1行目",
        "originalText": "適切なパスワード",
        "issue": "「適切な」が具体的に定義されていません",
        "suggestion": "パスワードの要件（長さ、文字種など）を明記してください",
        "improvedText": "8文字以上、英数字と記号を含むパスワード"
      },
      {
        "category": "QUANTITATIVE",
        "severity": "MEDIUM",
        "location": "2行目",
        "originalText": "迅速に応答する",
        "issue": "応答時間の定量的な基準がありません",
        "suggestion": "具体的な応答時間を指定してください",
        "improvedText": "3秒以内に応答する"
      },
      {
        "category": "EXPECTED_RESULT",
        "severity": "MEDIUM",
        "location": "3行目",
        "originalText": "適切なメッセージ",
        "issue": "エラーメッセージの内容が不明確です",
        "suggestion": "具体的なエラーメッセージを定義してください"
      }
    ],
    "recommendations": [
      "すべての曖昧な表現を具体的な基準に置き換える",
      "パフォーマンス要件には数値目標を設定する",
      "エラーケースの期待結果を明確にする"
    ]
  }`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkTestability', () => {
    it('should check testability successfully', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: {
          inputTokens: 250,
          outputTokens: 350,
          totalTokens: 600,
        },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testabilityCheckerService.checkTestability(null, mockOptions);

      expect(result.result.overallScore).toBe(45);
      expect(result.result.summary).toContain('曖昧な表現');
      expect(result.result.issues).toHaveLength(3);
      expect(result.result.issues[0].category).toBe('AMBIGUITY');
      expect(result.result.issues[0].severity).toBe('HIGH');
      expect(result.result.recommendations).toHaveLength(3);
      expect(result.usage.inputTokens).toBe(250);
      expect(result.usage.outputTokens).toBe(350);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 600);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(testabilityCheckerService.checkTestability(null, mockOptions)).rejects.toThrow(
        'APIキーが設定されていません'
      );
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(testabilityCheckerService.checkTestability(null, mockOptions)).rejects.toThrow(
        'AI機能が無効になっています'
      );
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(testabilityCheckerService.checkTestability(null, mockOptions)).rejects.toThrow(
        'テスタビリティチェックテンプレートが見つかりません'
      );
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
        usage: { inputTokens: 250, outputTokens: 350, totalTokens: 600 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testabilityCheckerService.checkTestability(null, mockOptions);

      expect(result.result.overallScore).toBe(45);
    });

    it('should normalize category and severity from Japanese', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapanese = `{
        "overallScore": 60,
        "summary": "テスト",
        "issues": [
          {"category": "曖昧", "severity": "高", "location": "1行目", "originalText": "テスト", "issue": "問題", "suggestion": "提案"},
          {"category": "定量的", "severity": "中", "location": "2行目", "originalText": "テスト", "issue": "問題", "suggestion": "提案"},
          {"category": "期待結果", "severity": "低", "location": "3行目", "originalText": "テスト", "issue": "問題", "suggestion": "提案"}
        ],
        "recommendations": []
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithJapanese,
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testabilityCheckerService.checkTestability(null, mockOptions);

      expect(result.result.issues[0].category).toBe('AMBIGUITY');
      expect(result.result.issues[0].severity).toBe('HIGH');
      expect(result.result.issues[1].category).toBe('QUANTITATIVE');
      expect(result.result.issues[1].severity).toBe('MEDIUM');
      expect(result.result.issues[2].category).toBe('EXPECTED_RESULT');
      expect(result.result.issues[2].severity).toBe('LOW');
    });

    it('should clamp score to valid range', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithInvalidScore = `{
        "overallScore": -10,
        "summary": "テスト",
        "issues": [],
        "recommendations": []
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithInvalidScore,
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testabilityCheckerService.checkTestability(null, mockOptions);

      expect(result.result.overallScore).toBe(0);
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

      await expect(testabilityCheckerService.checkTestability(null, mockOptions)).rejects.toThrow(
        'AIの応答を解析できませんでした'
      );
    });
  });

  describe('getCategoryInfo', () => {
    it('should return category info for AMBIGUITY', () => {
      const info = testabilityCheckerService.getCategoryInfo('AMBIGUITY');

      expect(info.name).toBe('曖昧な表現');
      expect(info.description).toBeTruthy();
      expect(info.examples.length).toBeGreaterThan(0);
    });

    it('should return category info for all categories', () => {
      const categories = Object.keys(CATEGORY_INFO) as Array<keyof typeof CATEGORY_INFO>;

      categories.forEach((category) => {
        const info = testabilityCheckerService.getCategoryInfo(category);
        expect(info.name).toBeTruthy();
        expect(info.description).toBeTruthy();
      });
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories with info', () => {
      const categories = testabilityCheckerService.getAllCategories();

      expect(categories).toHaveLength(5);
      expect(categories.map((c) => c.category)).toContain('AMBIGUITY');
      expect(categories.map((c) => c.category)).toContain('QUANTITATIVE');
      expect(categories.map((c) => c.category)).toContain('CONDITIONS');
      expect(categories.map((c) => c.category)).toContain('EXPECTED_RESULT');
      expect(categories.map((c) => c.category)).toContain('COMPLETENESS');
    });
  });

  describe('CATEGORY_INFO', () => {
    it('should have info for all categories', () => {
      expect(CATEGORY_INFO.AMBIGUITY.name).toBe('曖昧な表現');
      expect(CATEGORY_INFO.QUANTITATIVE.name).toBe('定量的基準');
      expect(CATEGORY_INFO.CONDITIONS.name).toBe('テスト条件');
      expect(CATEGORY_INFO.EXPECTED_RESULT.name).toBe('期待結果');
      expect(CATEGORY_INFO.COMPLETENESS.name).toBe('完全性');
    });
  });
});
