import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testResultAnalyzerService, TestResultAnalysisOptions } from '../test-result-analyzer';
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

describe('TestResultAnalyzerService', () => {
  const mockOptions: TestResultAnalysisOptions = {
    testResults: [
      { id: 'TC-001', title: 'ログインテスト', status: 'PASSED', module: '認証' },
      { id: 'TC-002', title: 'ログアウトテスト', status: 'PASSED', module: '認証' },
      {
        id: 'TC-003',
        title: 'データ登録',
        status: 'FAILED',
        module: 'データ管理',
        errorMessage: 'タイムアウト',
      },
      {
        id: 'TC-004',
        title: 'データ更新',
        status: 'FAILED',
        module: 'データ管理',
        errorMessage: 'タイムアウト',
      },
      { id: 'TC-005', title: '検索機能', status: 'PASSED', module: '検索' },
      { id: 'TC-006', title: '帳票出力', status: 'BLOCKED', module: '帳票' },
      { id: 'TC-007', title: 'バッチ処理', status: 'SKIPPED', module: 'バッチ' },
    ],
    projectContext: 'EC サイトのテスト',
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
    name: 'テスト結果分析',
    description: null,
    type: 'RESULT_ANALYSIS' as const,
    content:
      'テスト結果: {{testResults}}\nコンテキスト: {{projectContext}}\n失敗テスト: {{failedTests}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `{
    "overallQuality": "FAIR",
    "qualityScore": 65,
    "passRate": 42.9,
    "failRate": 28.6,
    "blockRate": 14.3,
    "skipRate": 14.3,
    "failurePatterns": [
      {
        "pattern": "タイムアウトエラー",
        "description": "データ管理モジュールでタイムアウトが発生",
        "occurrences": 2,
        "affectedTests": ["TC-003", "TC-004"],
        "rootCause": "データベース接続の遅延",
        "recommendation": "接続プールの設定を見直す",
        "severity": "HIGH"
      }
    ],
    "qualityMetrics": [
      {
        "metric": "合格率",
        "value": 42.9,
        "threshold": 95,
        "status": "FAIL",
        "trend": "DECLINING",
        "observation": "合格率が基準を大幅に下回っています"
      },
      {
        "metric": "ブロック率",
        "value": 14.3,
        "threshold": 5,
        "status": "WARNING",
        "trend": "STABLE",
        "observation": "ブロック率が高めです"
      }
    ],
    "focusAreas": [
      {
        "area": "データ管理モジュール",
        "reason": "失敗が集中している",
        "riskLevel": "HIGH",
        "suggestedActions": ["タイムアウト設定の見直し", "DB接続の確認"],
        "affectedModules": ["データ管理"]
      }
    ],
    "regressionRisks": [
      {
        "module": "データ管理",
        "riskLevel": "HIGH",
        "indicators": ["連続した失敗", "同一エラーパターン"],
        "recommendation": "優先的に修正が必要",
        "recentFailures": 2
      }
    ],
    "moduleAnalysis": [
      {
        "module": "認証",
        "passRate": 100,
        "failCount": 0,
        "status": "EXCELLENT",
        "observation": "すべてのテストが合格"
      },
      {
        "module": "データ管理",
        "passRate": 0,
        "failCount": 2,
        "status": "CRITICAL",
        "observation": "すべてのテストが失敗"
      },
      {
        "module": "検索",
        "passRate": 100,
        "failCount": 0,
        "status": "EXCELLENT",
        "observation": "正常動作"
      }
    ],
    "recommendations": [
      {
        "priority": "HIGH",
        "recommendation": "データベース接続の改善",
        "rationale": "タイムアウトエラーの根本原因",
        "expectedImpact": "失敗率の大幅な改善"
      },
      {
        "priority": "MEDIUM",
        "recommendation": "ブロック原因の調査",
        "rationale": "帳票機能がブロックされている",
        "expectedImpact": "テスト実行率の向上"
      }
    ],
    "summary": "品質スコア65点。データ管理モジュールに問題が集中しており、早急な対応が必要です。",
    "detailedAnalysis": "7件中3件が合格（42.9%）、2件が失敗（28.6%）、1件がブロック、1件がスキップとなっています。データ管理モジュールでタイムアウトエラーが連続して発生しており、データベース接続に問題がある可能性があります。"
  }`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeResults', () => {
    it('should analyze test results successfully', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: {
          inputTokens: 500,
          outputTokens: 800,
          totalTokens: 1300,
        },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testResultAnalyzerService.analyzeResults(null, mockOptions);

      expect(result.result.overallQuality).toBe('FAIR');
      expect(result.result.qualityScore).toBe(65);
      expect(result.result.passRate).toBe(42.9);
      expect(result.result.failRate).toBe(28.6);
      expect(result.result.failurePatterns).toHaveLength(1);
      expect(result.result.qualityMetrics).toHaveLength(2);
      expect(result.result.focusAreas).toHaveLength(1);
      expect(result.result.regressionRisks).toHaveLength(1);
      expect(result.result.moduleAnalysis).toHaveLength(3);
      expect(result.result.recommendations).toHaveLength(2);
      expect(result.usage.inputTokens).toBe(500);
      expect(result.usage.outputTokens).toBe(800);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 1300);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(testResultAnalyzerService.analyzeResults(null, mockOptions)).rejects.toThrow(
        'APIキーが設定されていません'
      );
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(testResultAnalyzerService.analyzeResults(null, mockOptions)).rejects.toThrow(
        'AI機能が無効になっています'
      );
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(testResultAnalyzerService.analyzeResults(null, mockOptions)).rejects.toThrow(
        'テスト結果分析テンプレートが見つかりません'
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
        usage: { inputTokens: 500, outputTokens: 800, totalTokens: 1300 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testResultAnalyzerService.analyzeResults(null, mockOptions);

      expect(result.result.overallQuality).toBe('FAIR');
    });

    it('should normalize Japanese quality levels and risk levels', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapanese = `{
        "overallQuality": "優秀",
        "qualityScore": 95,
        "passRate": 95,
        "failRate": 5,
        "blockRate": 0,
        "skipRate": 0,
        "failurePatterns": [
          {
            "pattern": "軽微なエラー",
            "description": "説明",
            "occurrences": 1,
            "affectedTests": ["TC-001"],
            "rootCause": "原因",
            "recommendation": "推奨",
            "severity": "低"
          }
        ],
        "qualityMetrics": [
          {
            "metric": "合格率",
            "value": 95,
            "threshold": 90,
            "status": "合格",
            "trend": "改善",
            "observation": "観察"
          }
        ],
        "focusAreas": [
          {
            "area": "領域",
            "reason": "理由",
            "riskLevel": "低",
            "suggestedActions": ["アクション"],
            "affectedModules": ["モジュール"]
          }
        ],
        "regressionRisks": [
          {
            "module": "モジュール",
            "riskLevel": "低",
            "indicators": ["指標"],
            "recommendation": "推奨",
            "recentFailures": 0
          }
        ],
        "moduleAnalysis": [
          {
            "module": "テスト",
            "passRate": 100,
            "failCount": 0,
            "status": "優秀",
            "observation": "観察"
          }
        ],
        "recommendations": [
          {
            "priority": "低",
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
        usage: { inputTokens: 400, outputTokens: 600, totalTokens: 1000 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testResultAnalyzerService.analyzeResults(null, mockOptions);

      expect(result.result.overallQuality).toBe('EXCELLENT');
      expect(result.result.failurePatterns[0].severity).toBe('LOW');
      expect(result.result.qualityMetrics[0].status).toBe('PASS');
      expect(result.result.qualityMetrics[0].trend).toBe('IMPROVING');
      expect(result.result.focusAreas[0].riskLevel).toBe('LOW');
      expect(result.result.regressionRisks[0].riskLevel).toBe('LOW');
      expect(result.result.moduleAnalysis[0].status).toBe('EXCELLENT');
      expect(result.result.recommendations[0].priority).toBe('LOW');
    });

    it('should clamp values to valid ranges', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithInvalidValues = `{
        "overallQuality": "GOOD",
        "qualityScore": 150,
        "passRate": -10,
        "failRate": 200,
        "blockRate": -5,
        "skipRate": 300,
        "failurePatterns": [
          {
            "pattern": "テスト",
            "description": "説明",
            "occurrences": -5,
            "affectedTests": [],
            "rootCause": "原因",
            "recommendation": "推奨",
            "severity": "HIGH"
          }
        ],
        "qualityMetrics": [],
        "focusAreas": [],
        "regressionRisks": [
          {
            "module": "テスト",
            "riskLevel": "HIGH",
            "indicators": [],
            "recommendation": "推奨",
            "recentFailures": -10
          }
        ],
        "moduleAnalysis": [
          {
            "module": "テスト",
            "passRate": 150,
            "failCount": -3,
            "status": "GOOD",
            "observation": "観察"
          }
        ],
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

      const result = await testResultAnalyzerService.analyzeResults(null, mockOptions);

      expect(result.result.qualityScore).toBe(100);
      expect(result.result.passRate).toBe(0);
      expect(result.result.failRate).toBe(100);
      expect(result.result.blockRate).toBe(0);
      expect(result.result.skipRate).toBe(100);
      expect(result.result.failurePatterns[0].occurrences).toBe(0);
      expect(result.result.regressionRisks[0].recentFailures).toBe(0);
      expect(result.result.moduleAnalysis[0].passRate).toBe(100);
      expect(result.result.moduleAnalysis[0].failCount).toBe(0);
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

      await expect(testResultAnalyzerService.analyzeResults(null, mockOptions)).rejects.toThrow(
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
        usage: { inputTokens: 400, outputTokens: 600, totalTokens: 1000 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const minimalOptions: TestResultAnalysisOptions = {
        testResults: [
          { id: 'TC-001', title: 'テスト1', status: 'PASSED' },
          { id: 'TC-002', title: 'テスト2', status: 'FAILED' },
        ],
      };

      const result = await testResultAnalyzerService.analyzeResults(null, minimalOptions);

      expect(result.result.overallQuality).toBe('FAIR');
    });

    it('should handle previous cycle results', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 500, outputTokens: 750, totalTokens: 1250 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const optionsWithPreviousCycle: TestResultAnalysisOptions = {
        ...mockOptions,
        previousCycleResults: {
          passRate: 90,
          failRate: 8,
          topFailureModules: ['認証', 'データ管理'],
        },
      };

      const result = await testResultAnalyzerService.analyzeResults(null, optionsWithPreviousCycle);

      expect(result.result.passRate).toBe(42.9);
    });

    it('should handle quality thresholds', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 450, outputTokens: 700, totalTokens: 1150 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const optionsWithThresholds: TestResultAnalysisOptions = {
        ...mockOptions,
        qualityThresholds: {
          passRate: 90,
          failRate: 5,
          blockRate: 2,
        },
      };

      const result = await testResultAnalyzerService.analyzeResults(null, optionsWithThresholds);

      expect(result.result.qualityMetrics).toHaveLength(2);
    });

    it('should handle empty arrays in response', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const emptyArraysResponse = `{
        "overallQuality": "EXCELLENT",
        "qualityScore": 100,
        "passRate": 100,
        "failRate": 0,
        "blockRate": 0,
        "skipRate": 0,
        "failurePatterns": [],
        "qualityMetrics": [],
        "focusAreas": [],
        "regressionRisks": [],
        "moduleAnalysis": [],
        "recommendations": [],
        "summary": "すべて合格",
        "detailedAnalysis": "問題なし"
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

      const result = await testResultAnalyzerService.analyzeResults(null, mockOptions);

      expect(result.result.overallQuality).toBe('EXCELLENT');
      expect(result.result.qualityScore).toBe(100);
      expect(result.result.failurePatterns).toHaveLength(0);
      expect(result.result.qualityMetrics).toHaveLength(0);
      expect(result.result.focusAreas).toHaveLength(0);
      expect(result.result.regressionRisks).toHaveLength(0);
      expect(result.result.moduleAnalysis).toHaveLength(0);
      expect(result.result.recommendations).toHaveLength(0);
    });
  });
});
