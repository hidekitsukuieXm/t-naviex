import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  testProgressAnalyzerService,
  TestProgressAnalysisOptions,
} from '../test-progress-analyzer';
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

describe('TestProgressAnalyzerService', () => {
  const mockOptions: TestProgressAnalysisOptions = {
    progressData: {
      totalTestCases: 100,
      executedTestCases: 60,
      passedTestCases: 50,
      failedTestCases: 8,
      blockedTestCases: 2,
      skippedTestCases: 0,
      startDate: '2024-01-15',
      plannedEndDate: '2024-02-15',
      currentDate: '2024-02-01',
    },
    projectContext: '新規リリースのテスト',
    teamSize: 4,
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
    name: '進捗分析',
    description: null,
    type: 'PROGRESS_ANALYSIS' as const,
    content: '進捗データ: {{progressData}}\nコンテキスト: {{projectContext}}\nチーム: {{teamSize}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `{
    "overallStatus": "AT_RISK",
    "progressPercentage": 60,
    "executionRate": 4.0,
    "passRate": 83.3,
    "estimatedCompletionDate": "2024-02-20",
    "daysRemaining": 14,
    "daysOverdue": 0,
    "delayRisks": [
      {
        "riskLevel": "MEDIUM",
        "description": "現在のペースでは計画終了日に間に合わない可能性",
        "daysAtRisk": 5,
        "probability": 60,
        "mitigation": "実行ペースの向上または人員追加"
      }
    ],
    "bottlenecks": [
      {
        "area": "バグ修正待ち",
        "description": "8件のテストが失敗しており、修正待ち",
        "severity": "MEDIUM",
        "impact": "再テストの工数増加",
        "recommendation": "開発チームとの連携強化"
      }
    ],
    "trends": [
      {
        "metric": "合格率",
        "direction": "STABLE",
        "change": 0,
        "observation": "合格率は83%で安定"
      },
      {
        "metric": "実行ペース",
        "direction": "DECLINING",
        "change": -10,
        "observation": "実行ペースが低下傾向"
      }
    ],
    "recommendedActions": [
      {
        "priority": "HIGH",
        "action": "実行ペースの改善",
        "rationale": "残り40件を14日で完了するには現在の4件/日では不十分",
        "expectedImpact": "遅延リスクの低減"
      }
    ],
    "alerts": [
      {
        "type": "WARNING",
        "title": "スケジュール遅延リスク",
        "message": "現在のペースでは5日の遅延が予想されます",
        "recommendation": "週末の追加作業を検討してください"
      }
    ],
    "summary": "進捗率60%で計画の半分を過ぎました。実行ペースの改善が必要です。",
    "detailedAnalysis": "残り40件のテストケースを14日間で消化するには、1日あたり約2.9件の実行が必要です。現在のペース4件/日を維持できれば間に合いますが、バグ修正待ちの再テスト工数を考慮すると余裕がありません。"
  }`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeProgress', () => {
    it('should analyze progress successfully', async () => {
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
          outputTokens: 700,
          totalTokens: 1100,
        },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testProgressAnalyzerService.analyzeProgress(null, mockOptions);

      expect(result.result.overallStatus).toBe('AT_RISK');
      expect(result.result.progressPercentage).toBe(60);
      expect(result.result.passRate).toBe(83.3);
      expect(result.result.delayRisks).toHaveLength(1);
      expect(result.result.bottlenecks).toHaveLength(1);
      expect(result.result.trends).toHaveLength(2);
      expect(result.result.recommendedActions).toHaveLength(1);
      expect(result.result.alerts).toHaveLength(1);
      expect(result.usage.inputTokens).toBe(400);
      expect(result.usage.outputTokens).toBe(700);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 1100);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(testProgressAnalyzerService.analyzeProgress(null, mockOptions)).rejects.toThrow(
        'APIキーが設定されていません'
      );
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(testProgressAnalyzerService.analyzeProgress(null, mockOptions)).rejects.toThrow(
        'AI機能が無効になっています'
      );
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(testProgressAnalyzerService.analyzeProgress(null, mockOptions)).rejects.toThrow(
        '進捗分析テンプレートが見つかりません'
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
        usage: { inputTokens: 400, outputTokens: 700, totalTokens: 1100 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testProgressAnalyzerService.analyzeProgress(null, mockOptions);

      expect(result.result.overallStatus).toBe('AT_RISK');
    });

    it('should normalize Japanese status and risk levels', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapanese = `{
        "overallStatus": "危険",
        "progressPercentage": 30,
        "executionRate": 2,
        "passRate": 70,
        "estimatedCompletionDate": "2024-03-01",
        "daysRemaining": 30,
        "daysOverdue": 0,
        "delayRisks": [
          {
            "riskLevel": "高",
            "description": "遅延リスク",
            "daysAtRisk": 10,
            "probability": 80,
            "mitigation": "対策"
          }
        ],
        "bottlenecks": [
          {
            "area": "領域",
            "description": "説明",
            "severity": "危険",
            "impact": "影響",
            "recommendation": "推奨"
          }
        ],
        "trends": [
          {
            "metric": "合格率",
            "direction": "悪化",
            "change": -5,
            "observation": "観察"
          }
        ],
        "recommendedActions": [
          {
            "priority": "高",
            "action": "アクション",
            "rationale": "根拠",
            "expectedImpact": "効果"
          }
        ],
        "alerts": [
          {
            "type": "警告",
            "title": "タイトル",
            "message": "メッセージ",
            "recommendation": "推奨"
          }
        ],
        "summary": "サマリー",
        "detailedAnalysis": "詳細"
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithJapanese,
        stopReason: 'end_turn',
        usage: { inputTokens: 300, outputTokens: 500, totalTokens: 800 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testProgressAnalyzerService.analyzeProgress(null, mockOptions);

      expect(result.result.overallStatus).toBe('CRITICAL');
      expect(result.result.delayRisks[0].riskLevel).toBe('HIGH');
      expect(result.result.bottlenecks[0].severity).toBe('CRITICAL');
      expect(result.result.trends[0].direction).toBe('DECLINING');
      expect(result.result.recommendedActions[0].priority).toBe('HIGH');
      expect(result.result.alerts[0].type).toBe('WARNING');
    });

    it('should clamp values to valid ranges', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithInvalidValues = `{
        "overallStatus": "ON_TRACK",
        "progressPercentage": 150,
        "executionRate": -5,
        "passRate": 200,
        "estimatedCompletionDate": "2024-02-10",
        "daysRemaining": -5,
        "daysOverdue": -10,
        "delayRisks": [
          {
            "riskLevel": "HIGH",
            "description": "テスト",
            "daysAtRisk": -2,
            "probability": 150,
            "mitigation": "対策"
          }
        ],
        "bottlenecks": [],
        "trends": [],
        "recommendedActions": [],
        "alerts": [],
        "summary": "サマリー",
        "detailedAnalysis": "詳細"
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

      const result = await testProgressAnalyzerService.analyzeProgress(null, mockOptions);

      expect(result.result.progressPercentage).toBe(100);
      expect(result.result.executionRate).toBe(0);
      expect(result.result.passRate).toBe(100);
      expect(result.result.daysRemaining).toBe(0);
      expect(result.result.daysOverdue).toBe(0);
      expect(result.result.delayRisks[0].daysAtRisk).toBe(0);
      expect(result.result.delayRisks[0].probability).toBe(100);
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

      await expect(testProgressAnalyzerService.analyzeProgress(null, mockOptions)).rejects.toThrow(
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

      const minimalOptions: TestProgressAnalysisOptions = {
        progressData: {
          totalTestCases: 50,
          executedTestCases: 25,
          passedTestCases: 20,
          failedTestCases: 5,
          blockedTestCases: 0,
          skippedTestCases: 0,
          startDate: '2024-01-01',
          plannedEndDate: '2024-01-31',
        },
      };

      const result = await testProgressAnalyzerService.analyzeProgress(null, minimalOptions);

      expect(result.result.overallStatus).toBe('AT_RISK');
    });

    it('should handle daily progress data', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 450, outputTokens: 750, totalTokens: 1200 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const optionsWithDailyProgress: TestProgressAnalysisOptions = {
        ...mockOptions,
        progressData: {
          ...mockOptions.progressData,
          dailyProgress: [
            { date: '2024-01-29', executed: 5, passed: 4, failed: 1 },
            { date: '2024-01-30', executed: 6, passed: 5, failed: 1 },
            { date: '2024-01-31', executed: 4, passed: 3, failed: 1 },
          ],
        },
      };

      const result = await testProgressAnalyzerService.analyzeProgress(
        null,
        optionsWithDailyProgress
      );

      expect(result.result.trends).toHaveLength(2);
    });

    it('should handle previous cycle data', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 400, outputTokens: 650, totalTokens: 1050 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const optionsWithPreviousCycle: TestProgressAnalysisOptions = {
        ...mockOptions,
        previousCycleData: {
          passRate: 90,
          executionRate: 5,
          actualDuration: 25,
        },
      };

      const result = await testProgressAnalyzerService.analyzeProgress(
        null,
        optionsWithPreviousCycle
      );

      expect(result.result.passRate).toBe(83.3);
    });
  });
});
