import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testTrendAnalyzerService, TestTrendAnalysisOptions } from '../test-trend-analyzer';
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

describe('TestTrendAnalyzerService', () => {
  const mockOptions: TestTrendAnalysisOptions = {
    historicalData: [
      {
        date: '2024-01-01',
        passRate: 85,
        failRate: 10,
        executedCount: 100,
        passedCount: 85,
        failedCount: 10,
      },
      {
        date: '2024-01-02',
        passRate: 87,
        failRate: 8,
        executedCount: 120,
        passedCount: 104,
        failedCount: 10,
      },
      {
        date: '2024-01-03',
        passRate: 90,
        failRate: 5,
        executedCount: 110,
        passedCount: 99,
        failedCount: 6,
      },
      {
        date: '2024-01-04',
        passRate: 88,
        failRate: 7,
        executedCount: 115,
        passedCount: 101,
        failedCount: 8,
      },
      {
        date: '2024-01-05',
        passRate: 92,
        failRate: 4,
        executedCount: 125,
        passedCount: 115,
        failedCount: 5,
      },
    ],
    projectContext: 'ECサイト開発プロジェクト',
    analysisTimeframe: '過去5日間',
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
    name: '傾向分析',
    description: null,
    type: 'TREND_ANALYSIS' as const,
    content:
      '履歴データ: {{historicalData}}\nコンテキスト: {{projectContext}}\nサマリー: {{summary}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `{
    "overallTrend": "IMPROVING",
    "healthScore": 78,
    "trendMetrics": [
      {
        "metricName": "合格率",
        "currentValue": 92,
        "previousValue": 85,
        "changePercent": 8.2,
        "direction": "IMPROVING",
        "observation": "合格率は着実に改善しています"
      },
      {
        "metricName": "実行件数",
        "currentValue": 125,
        "previousValue": 100,
        "changePercent": 25,
        "direction": "IMPROVING",
        "observation": "テスト実行ペースが向上しています"
      }
    ],
    "patterns": [
      {
        "pattern": "週初めの低下",
        "description": "週明けに合格率が一時的に低下する傾向",
        "significance": "MEDIUM",
        "frequency": "毎週",
        "recommendation": "週初めの環境確認を強化する"
      }
    ],
    "anomalies": [
      {
        "date": "2024-01-03",
        "metric": "合格率",
        "expectedValue": 86,
        "actualValue": 90,
        "deviation": 4,
        "possibleCause": "重要なバグ修正がリリースされた",
        "recommendation": "この改善を維持するための施策を継続"
      }
    ],
    "predictions": [
      {
        "metric": "合格率",
        "predictedValue": 95,
        "confidence": "MEDIUM",
        "timeframe": "次の1週間",
        "assumptions": ["現在の改善ペースが継続する", "大きなリリースがない"],
        "risks": ["新機能リリースによる一時的な低下"]
      }
    ],
    "cyclicalAnalysis": [
      {
        "cycleName": "週次サイクル",
        "averagePassRate": 88.4,
        "averageDefects": 2,
        "trend": "IMPROVING",
        "observation": "週ごとに品質が向上している"
      }
    ],
    "seasonalPatterns": [
      {
        "period": "月曜日",
        "description": "週初めは合格率が低い傾向",
        "impact": "1-2%の低下",
        "recommendation": "月曜日の環境チェックを強化"
      }
    ],
    "recommendations": [
      {
        "priority": "HIGH",
        "recommendation": "現在の改善傾向を維持する",
        "rationale": "合格率が着実に向上している",
        "expectedImpact": "95%以上の合格率達成"
      },
      {
        "priority": "MEDIUM",
        "recommendation": "自動テストの拡充",
        "rationale": "実行件数の増加に対応するため",
        "expectedImpact": "テスト効率の向上"
      }
    ],
    "summary": "全体的に改善傾向にあり、健全な状態です。合格率は85%から92%に向上しました。",
    "detailedAnalysis": "過去5日間のデータを分析した結果、合格率は着実に改善しており、実行件数も増加傾向にあります。週初めの一時的な低下パターンが見られますが、全体としては健全な推移です。"
  }`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeTrends', () => {
    it('should analyze trends successfully', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: {
          inputTokens: 700,
          outputTokens: 1000,
          totalTokens: 1700,
        },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testTrendAnalyzerService.analyzeTrends(null, mockOptions);

      expect(result.result.overallTrend).toBe('IMPROVING');
      expect(result.result.healthScore).toBe(78);
      expect(result.result.trendMetrics).toHaveLength(2);
      expect(result.result.patterns).toHaveLength(1);
      expect(result.result.anomalies).toHaveLength(1);
      expect(result.result.predictions).toHaveLength(1);
      expect(result.result.cyclicalAnalysis).toHaveLength(1);
      expect(result.result.seasonalPatterns).toHaveLength(1);
      expect(result.result.recommendations).toHaveLength(2);
      expect(result.usage.inputTokens).toBe(700);
      expect(result.usage.outputTokens).toBe(1000);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 1700);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(testTrendAnalyzerService.analyzeTrends(null, mockOptions)).rejects.toThrow(
        'APIキーが設定されていません'
      );
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(testTrendAnalyzerService.analyzeTrends(null, mockOptions)).rejects.toThrow(
        'AI機能が無効になっています'
      );
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(testTrendAnalyzerService.analyzeTrends(null, mockOptions)).rejects.toThrow(
        '傾向分析テンプレートが見つかりません'
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
        usage: { inputTokens: 700, outputTokens: 1000, totalTokens: 1700 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testTrendAnalyzerService.analyzeTrends(null, mockOptions);

      expect(result.result.overallTrend).toBe('IMPROVING');
    });

    it('should normalize Japanese trend directions', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapanese = `{
        "overallTrend": "改善",
        "healthScore": 80,
        "trendMetrics": [
          {
            "metricName": "合格率",
            "currentValue": 90,
            "previousValue": 85,
            "changePercent": 5.9,
            "direction": "上昇",
            "observation": "観察"
          }
        ],
        "patterns": [
          {
            "pattern": "パターン",
            "description": "説明",
            "significance": "高",
            "frequency": "頻度",
            "recommendation": "推奨"
          }
        ],
        "anomalies": [],
        "predictions": [
          {
            "metric": "指標",
            "predictedValue": 95,
            "confidence": "高",
            "timeframe": "期間",
            "assumptions": ["前提"],
            "risks": ["リスク"]
          }
        ],
        "cyclicalAnalysis": [
          {
            "cycleName": "サイクル",
            "averagePassRate": 88,
            "averageDefects": 2,
            "trend": "悪化",
            "observation": "観察"
          }
        ],
        "seasonalPatterns": [],
        "recommendations": [
          {
            "priority": "高",
            "recommendation": "推奨",
            "rationale": "根拠",
            "expectedImpact": "効果"
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
        usage: { inputTokens: 500, outputTokens: 700, totalTokens: 1200 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testTrendAnalyzerService.analyzeTrends(null, mockOptions);

      expect(result.result.overallTrend).toBe('IMPROVING');
      expect(result.result.trendMetrics[0].direction).toBe('IMPROVING');
      expect(result.result.patterns[0].significance).toBe('HIGH');
      expect(result.result.predictions[0].confidence).toBe('HIGH');
      expect(result.result.cyclicalAnalysis[0].trend).toBe('DECLINING');
      expect(result.result.recommendations[0].priority).toBe('HIGH');
    });

    it('should clamp values to valid ranges', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithInvalidValues = `{
        "overallTrend": "STABLE",
        "healthScore": 150,
        "trendMetrics": [],
        "patterns": [],
        "anomalies": [],
        "predictions": [],
        "cyclicalAnalysis": [
          {
            "cycleName": "サイクル",
            "averagePassRate": 200,
            "averageDefects": -5,
            "trend": "STABLE",
            "observation": "観察"
          }
        ],
        "seasonalPatterns": [],
        "recommendations": [],
        "summary": "サマリー",
        "detailedAnalysis": "詳細"
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithInvalidValues,
        stopReason: 'end_turn',
        usage: { inputTokens: 300, outputTokens: 400, totalTokens: 700 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testTrendAnalyzerService.analyzeTrends(null, mockOptions);

      expect(result.result.healthScore).toBe(100);
      expect(result.result.cyclicalAnalysis[0].averagePassRate).toBe(100);
      expect(result.result.cyclicalAnalysis[0].averageDefects).toBe(0);
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

      await expect(testTrendAnalyzerService.analyzeTrends(null, mockOptions)).rejects.toThrow(
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
        usage: { inputTokens: 500, outputTokens: 800, totalTokens: 1300 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const minimalOptions: TestTrendAnalysisOptions = {
        historicalData: [
          {
            date: '2024-01-01',
            passRate: 85,
            failRate: 10,
            executedCount: 100,
            passedCount: 85,
            failedCount: 10,
          },
        ],
      };

      const result = await testTrendAnalyzerService.analyzeTrends(null, minimalOptions);

      expect(result.result.overallTrend).toBe('IMPROVING');
    });

    it('should handle empty arrays in response', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const emptyArraysResponse = `{
        "overallTrend": "STABLE",
        "healthScore": 70,
        "trendMetrics": [],
        "patterns": [],
        "anomalies": [],
        "predictions": [],
        "cyclicalAnalysis": [],
        "seasonalPatterns": [],
        "recommendations": [],
        "summary": "データが不十分",
        "detailedAnalysis": "より多くのデータが必要です"
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: emptyArraysResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 300, totalTokens: 500 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testTrendAnalyzerService.analyzeTrends(null, mockOptions);

      expect(result.result.overallTrend).toBe('STABLE');
      expect(result.result.healthScore).toBe(70);
      expect(result.result.trendMetrics).toHaveLength(0);
      expect(result.result.patterns).toHaveLength(0);
      expect(result.result.anomalies).toHaveLength(0);
      expect(result.result.predictions).toHaveLength(0);
      expect(result.result.cyclicalAnalysis).toHaveLength(0);
      expect(result.result.seasonalPatterns).toHaveLength(0);
      expect(result.result.recommendations).toHaveLength(0);
    });

    it('should handle focus areas option', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 600, outputTokens: 900, totalTokens: 1500 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const optionsWithFocusAreas: TestTrendAnalysisOptions = {
        ...mockOptions,
        focusAreas: ['合格率', '欠陥発見率'],
      };

      const result = await testTrendAnalyzerService.analyzeTrends(null, optionsWithFocusAreas);

      expect(result.result.overallTrend).toBe('IMPROVING');
    });
  });
});
