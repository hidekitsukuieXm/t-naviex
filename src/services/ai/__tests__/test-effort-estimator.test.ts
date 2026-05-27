import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testEffortEstimatorService, TestEffortEstimationOptions } from '../test-effort-estimator';
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

describe('TestEffortEstimatorService', () => {
  const mockOptions: TestEffortEstimationOptions = {
    testCases: [
      {
        id: 'TC-001',
        title: 'ログインテスト',
        priority: 'HIGH',
        complexity: 'MEDIUM',
        stepCount: 5,
      },
      {
        id: 'TC-002',
        title: 'ユーザー登録テスト',
        priority: 'MEDIUM',
        complexity: 'HIGH',
        stepCount: 10,
      },
      {
        id: 'TC-003',
        title: 'パスワードリセット',
        priority: 'LOW',
        complexity: 'LOW',
        stepCount: 3,
      },
    ],
    resources: {
      totalTesters: 3,
      experienceLevel: 'MIXED',
      availability: 80,
    },
    projectContext: '新規ECサイトのテスト',
    hoursPerDay: 8,
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
    name: '工数予測',
    description: null,
    type: 'EFFORT_ESTIMATION' as const,
    content:
      'テストケース: {{testCases}}\nリソース: {{resources}}\nコンテキスト: {{projectContext}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `{
    "totalEstimatedHours": 48,
    "estimatedDays": 6,
    "breakdown": [
      {
        "category": "テスト設計・準備",
        "hours": 8,
        "percentage": 17,
        "description": "テストデータ準備とテスト環境セットアップ"
      },
      {
        "category": "テスト実行",
        "hours": 24,
        "percentage": 50,
        "description": "3件のテストケースの実行"
      },
      {
        "category": "バグ報告・再テスト",
        "hours": 12,
        "percentage": 25,
        "description": "バグ発見時の報告と修正確認"
      },
      {
        "category": "結果報告",
        "hours": 4,
        "percentage": 8,
        "description": "テスト結果のドキュメント作成"
      }
    ],
    "riskFactors": [
      {
        "factor": "要件変更の可能性",
        "impact": "MEDIUM",
        "mitigation": "定期的な要件確認ミーティングの実施",
        "adjustmentHours": 8
      },
      {
        "factor": "環境の不安定性",
        "impact": "LOW",
        "mitigation": "環境監視の強化",
        "adjustmentHours": 4
      }
    ],
    "assumptions": [
      {
        "assumption": "テスト環境が安定している",
        "rationale": "環境問題による遅延がないと仮定"
      },
      {
        "assumption": "要件変更がない",
        "rationale": "スコープの変更がないと仮定"
      }
    ],
    "confidenceLevel": "MEDIUM",
    "confidenceScore": 70,
    "rangeMin": 40,
    "rangeMax": 60,
    "recommendation": "チーム経験が混合のため、ペアテストを推奨します。",
    "comparisonWithHistorical": {
      "averageEffortPerTestCase": 16,
      "historicalAveragePerTestCase": 14,
      "variance": 14.3,
      "explanation": "今回は複雑度の高いテストケースが含まれるため、過去平均より高めの予測となっています。"
    }
  }`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('estimateEffort', () => {
    it('should estimate effort successfully', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: {
          inputTokens: 400,
          outputTokens: 600,
          totalTokens: 1000,
        },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testEffortEstimatorService.estimateEffort(null, mockOptions);

      expect(result.result.totalEstimatedHours).toBe(48);
      expect(result.result.estimatedDays).toBe(6);
      expect(result.result.breakdown).toHaveLength(4);
      expect(result.result.riskFactors).toHaveLength(2);
      expect(result.result.assumptions).toHaveLength(2);
      expect(result.result.confidenceLevel).toBe('MEDIUM');
      expect(result.result.confidenceScore).toBe(70);
      expect(result.result.rangeMin).toBe(40);
      expect(result.result.rangeMax).toBe(60);
      expect(result.result.comparisonWithHistorical).toBeDefined();
      expect(result.usage.inputTokens).toBe(400);
      expect(result.usage.outputTokens).toBe(600);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 1000);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(testEffortEstimatorService.estimateEffort(null, mockOptions)).rejects.toThrow(
        'APIキーが設定されていません'
      );
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(testEffortEstimatorService.estimateEffort(null, mockOptions)).rejects.toThrow(
        'AI機能が無効になっています'
      );
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(testEffortEstimatorService.estimateEffort(null, mockOptions)).rejects.toThrow(
        '工数予測テンプレートが見つかりません'
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
        usage: { inputTokens: 400, outputTokens: 600, totalTokens: 1000 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testEffortEstimatorService.estimateEffort(null, mockOptions);

      expect(result.result.totalEstimatedHours).toBe(48);
    });

    it('should normalize Japanese confidence and impact', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapanese = `{
        "totalEstimatedHours": 30,
        "estimatedDays": 4,
        "breakdown": [],
        "riskFactors": [
          {
            "factor": "リスク1",
            "impact": "高",
            "mitigation": "対策",
            "adjustmentHours": 5
          }
        ],
        "assumptions": [],
        "confidenceLevel": "低",
        "confidenceScore": 40,
        "rangeMin": 25,
        "rangeMax": 40,
        "recommendation": "推奨事項"
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithJapanese,
        stopReason: 'end_turn',
        usage: { inputTokens: 300, outputTokens: 400, totalTokens: 700 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testEffortEstimatorService.estimateEffort(null, mockOptions);

      expect(result.result.confidenceLevel).toBe('LOW');
      expect(result.result.riskFactors[0].impact).toBe('HIGH');
    });

    it('should clamp values to valid ranges', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithInvalidValues = `{
        "totalEstimatedHours": -10,
        "estimatedDays": 0,
        "breakdown": [
          {
            "category": "テスト",
            "hours": -5,
            "percentage": 150,
            "description": "説明"
          }
        ],
        "riskFactors": [],
        "assumptions": [],
        "confidenceLevel": "HIGH",
        "confidenceScore": 150,
        "rangeMin": -5,
        "rangeMax": -10,
        "recommendation": "推奨"
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithInvalidValues,
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 300, totalTokens: 500 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testEffortEstimatorService.estimateEffort(null, mockOptions);

      expect(result.result.totalEstimatedHours).toBe(0);
      expect(result.result.breakdown[0].hours).toBe(0);
      expect(result.result.breakdown[0].percentage).toBe(100);
      expect(result.result.confidenceScore).toBe(100);
      expect(result.result.rangeMin).toBe(0);
      expect(result.result.rangeMax).toBe(0);
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

      await expect(testEffortEstimatorService.estimateEffort(null, mockOptions)).rejects.toThrow(
        'AIの応答を解析できませんでした'
      );
    });

    it('should work with minimal options', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 300, outputTokens: 500, totalTokens: 800 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const minimalOptions: TestEffortEstimationOptions = {
        testCases: [{ id: 'TC-001', title: 'シンプルテスト' }],
      };

      const result = await testEffortEstimatorService.estimateEffort(null, minimalOptions);

      expect(result.result.totalEstimatedHours).toBe(48);
    });

    it('should handle historical data for comparison', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 450, outputTokens: 650, totalTokens: 1100 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const optionsWithHistorical: TestEffortEstimationOptions = {
        ...mockOptions,
        historicalData: [
          { projectName: '前回リリース', testCaseCount: 50, actualEffort: 120, teamSize: 3 },
        ],
      };

      const result = await testEffortEstimatorService.estimateEffort(null, optionsWithHistorical);

      expect(result.result.comparisonWithHistorical).toBeDefined();
      expect(result.result.comparisonWithHistorical?.averageEffortPerTestCase).toBe(16);
    });

    it('should calculate estimatedDays from hoursPerDay', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithoutDays = `{
        "totalEstimatedHours": 24,
        "breakdown": [],
        "riskFactors": [],
        "assumptions": [],
        "confidenceLevel": "MEDIUM",
        "confidenceScore": 60,
        "rangeMin": 20,
        "rangeMax": 30,
        "recommendation": "推奨"
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithoutDays,
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 200, totalTokens: 400 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const optionsWithHoursPerDay: TestEffortEstimationOptions = {
        testCases: [{ id: 'TC-001', title: 'テスト' }],
        hoursPerDay: 6, // 24 / 6 = 4 days
      };

      const result = await testEffortEstimatorService.estimateEffort(null, optionsWithHoursPerDay);

      expect(result.result.estimatedDays).toBe(4);
    });
  });
});
