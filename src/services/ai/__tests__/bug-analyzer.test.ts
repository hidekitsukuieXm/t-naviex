import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bugAnalyzerService, BugAnalysisOptions } from '../bug-analyzer';
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

describe('BugAnalyzerService', () => {
  const mockOptions: BugAnalysisOptions = {
    bugData: {
      id: 'BUG-001',
      title: 'ログイン時にエラーが発生する',
      description: 'ユーザーがログインしようとすると500エラーが返される',
      severity: 'MAJOR',
      priority: 'HIGH',
      module: '認証',
      reproductionSteps:
        '1. ログイン画面を開く\n2. 正しい認証情報を入力\n3. ログインボタンをクリック',
      errorLog: 'TypeError: Cannot read property "id" of null',
    },
    projectContext: 'ECサイト開発プロジェクト',
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
    name: 'バグ分析',
    description: null,
    type: 'BUG_ANALYSIS' as const,
    content: 'バグデータ: {{bugData}}\nコンテキスト: {{projectContext}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `{
    "overallSeverity": "MAJOR",
    "estimatedPriority": "HIGH",
    "rootCauseAnalysis": {
      "category": "CODING_ERROR",
      "description": "ユーザー情報取得時のNullチェックが不足している",
      "confidence": 85,
      "evidence": ["エラーログにTypeError: Cannot read property 'id' of null", "認証モジュールでの発生"],
      "suggestedFix": "ユーザーオブジェクトのNull/Undefinedチェックを追加する"
    },
    "impactAssessment": [
      {
        "area": "認証機能",
        "level": "HIGH",
        "description": "全ユーザーがログインできない状態",
        "affectedUsers": "全ユーザー",
        "affectedFeatures": ["ログイン", "セッション管理"]
      }
    ],
    "similarPatterns": [
      {
        "pattern": "Nullチェック漏れ",
        "description": "オブジェクトプロパティへのアクセス時のNullチェック不足",
        "occurrences": 3,
        "relatedBugIds": ["BUG-005", "BUG-012"],
        "preventionStrategy": "Optional Chainingの使用とTypeScriptのstrictNullChecksを有効にする"
      }
    ],
    "fixRecommendations": [
      {
        "priority": "HIGH",
        "recommendation": "Nullチェックの追加",
        "rationale": "即座にエラーを解消できる",
        "effort": "LOW",
        "expectedOutcome": "ログイン機能の復旧"
      },
      {
        "priority": "MEDIUM",
        "recommendation": "ユニットテストの追加",
        "rationale": "再発防止のため",
        "effort": "MEDIUM",
        "expectedOutcome": "同様のエラーの早期検出"
      }
    ],
    "preventionMeasures": [
      {
        "measure": "TypeScript strictモードの有効化",
        "description": "コンパイル時にNull/Undefinedのチェックを強制",
        "effectiveness": "HIGH",
        "implementationCost": "MEDIUM",
        "applicablePhase": "開発"
      },
      {
        "measure": "コードレビューチェックリスト更新",
        "description": "Nullチェックの確認を必須項目に追加",
        "effectiveness": "MEDIUM",
        "implementationCost": "LOW",
        "applicablePhase": "コードレビュー"
      }
    ],
    "regressionRisk": {
      "level": "MEDIUM",
      "areas": ["ログイン処理", "セッション管理"],
      "testingRecommendations": ["ログイン正常系テスト", "異常系テスト（無効なユーザー）", "セッション作成テスト"]
    },
    "summary": "認証モジュールでのNullチェック漏れによるログインエラー。即時対応が必要。",
    "detailedAnalysis": "このバグはユーザー情報を取得する際に、データベースからnullが返された場合の処理が不足していることに起因しています。"
  }`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeBug', () => {
    it('should analyze bug successfully', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: {
          inputTokens: 600,
          outputTokens: 900,
          totalTokens: 1500,
        },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await bugAnalyzerService.analyzeBug(null, mockOptions);

      expect(result.result.overallSeverity).toBe('MAJOR');
      expect(result.result.estimatedPriority).toBe('HIGH');
      expect(result.result.rootCauseAnalysis.category).toBe('CODING_ERROR');
      expect(result.result.rootCauseAnalysis.confidence).toBe(85);
      expect(result.result.impactAssessment).toHaveLength(1);
      expect(result.result.similarPatterns).toHaveLength(1);
      expect(result.result.fixRecommendations).toHaveLength(2);
      expect(result.result.preventionMeasures).toHaveLength(2);
      expect(result.result.regressionRisk.level).toBe('MEDIUM');
      expect(result.usage.inputTokens).toBe(600);
      expect(result.usage.outputTokens).toBe(900);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 1500);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(bugAnalyzerService.analyzeBug(null, mockOptions)).rejects.toThrow(
        'APIキーが設定されていません'
      );
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(bugAnalyzerService.analyzeBug(null, mockOptions)).rejects.toThrow(
        'AI機能が無効になっています'
      );
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(bugAnalyzerService.analyzeBug(null, mockOptions)).rejects.toThrow(
        'バグ分析テンプレートが見つかりません'
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
        usage: { inputTokens: 600, outputTokens: 900, totalTokens: 1500 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await bugAnalyzerService.analyzeBug(null, mockOptions);

      expect(result.result.overallSeverity).toBe('MAJOR');
    });

    it('should normalize Japanese severity and categories', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapanese = `{
        "overallSeverity": "致命的",
        "estimatedPriority": "緊急",
        "rootCauseAnalysis": {
          "category": "設計不良",
          "description": "説明",
          "confidence": 90,
          "evidence": ["根拠"],
          "suggestedFix": "修正案"
        },
        "impactAssessment": [
          {
            "area": "領域",
            "level": "高",
            "description": "説明",
            "affectedUsers": "ユーザー",
            "affectedFeatures": ["機能"]
          }
        ],
        "similarPatterns": [],
        "fixRecommendations": [
          {
            "priority": "高",
            "recommendation": "推奨",
            "rationale": "根拠",
            "effort": "低",
            "expectedOutcome": "結果"
          }
        ],
        "preventionMeasures": [
          {
            "measure": "対策",
            "description": "説明",
            "effectiveness": "高",
            "implementationCost": "低",
            "applicablePhase": "フェーズ"
          }
        ],
        "regressionRisk": {
          "level": "低",
          "areas": ["領域"],
          "testingRecommendations": ["テスト"]
        },
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

      const result = await bugAnalyzerService.analyzeBug(null, mockOptions);

      expect(result.result.overallSeverity).toBe('CRITICAL');
      expect(result.result.estimatedPriority).toBe('CRITICAL');
      expect(result.result.rootCauseAnalysis.category).toBe('DESIGN_FLAW');
      expect(result.result.impactAssessment[0].level).toBe('HIGH');
      expect(result.result.fixRecommendations[0].priority).toBe('HIGH');
      expect(result.result.fixRecommendations[0].effort).toBe('LOW');
      expect(result.result.preventionMeasures[0].effectiveness).toBe('HIGH');
      expect(result.result.regressionRisk.level).toBe('LOW');
    });

    it('should clamp confidence to valid range', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithInvalidConfidence = `{
        "overallSeverity": "MINOR",
        "estimatedPriority": "LOW",
        "rootCauseAnalysis": {
          "category": "CODING_ERROR",
          "description": "説明",
          "confidence": 150,
          "evidence": [],
          "suggestedFix": "修正"
        },
        "impactAssessment": [],
        "similarPatterns": [],
        "fixRecommendations": [],
        "preventionMeasures": [],
        "regressionRisk": {
          "level": "LOW",
          "areas": [],
          "testingRecommendations": []
        },
        "summary": "サマリー",
        "detailedAnalysis": "詳細"
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithInvalidConfidence,
        stopReason: 'end_turn',
        usage: { inputTokens: 300, outputTokens: 400, totalTokens: 700 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await bugAnalyzerService.analyzeBug(null, mockOptions);

      expect(result.result.rootCauseAnalysis.confidence).toBe(100);
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

      await expect(bugAnalyzerService.analyzeBug(null, mockOptions)).rejects.toThrow(
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

      const minimalOptions: BugAnalysisOptions = {
        bugData: {
          id: 'BUG-002',
          title: 'テストバグ',
          description: 'テスト説明',
        },
      };

      const result = await bugAnalyzerService.analyzeBug(null, minimalOptions);

      expect(result.result.overallSeverity).toBe('MAJOR');
    });

    it('should handle recent bugs data', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 550, outputTokens: 800, totalTokens: 1350 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const optionsWithRecentBugs: BugAnalysisOptions = {
        ...mockOptions,
        recentBugs: [
          { id: 'BUG-005', title: '類似バグ1', module: '認証', rootCause: 'Nullチェック' },
          { id: 'BUG-012', title: '類似バグ2', module: 'データ管理' },
        ],
      };

      const result = await bugAnalyzerService.analyzeBug(null, optionsWithRecentBugs);

      expect(result.result.similarPatterns).toHaveLength(1);
    });

    it('should handle empty arrays in response', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const emptyArraysResponse = `{
        "overallSeverity": "MINOR",
        "estimatedPriority": "LOW",
        "rootCauseAnalysis": {
          "category": "UNKNOWN",
          "description": "原因不明",
          "confidence": 50,
          "evidence": [],
          "suggestedFix": "調査が必要"
        },
        "impactAssessment": [],
        "similarPatterns": [],
        "fixRecommendations": [],
        "preventionMeasures": [],
        "regressionRisk": {
          "level": "LOW",
          "areas": [],
          "testingRecommendations": []
        },
        "summary": "調査が必要",
        "detailedAnalysis": "詳細調査が必要"
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

      const result = await bugAnalyzerService.analyzeBug(null, mockOptions);

      expect(result.result.overallSeverity).toBe('MINOR');
      expect(result.result.rootCauseAnalysis.category).toBe('UNKNOWN');
      expect(result.result.impactAssessment).toHaveLength(0);
      expect(result.result.similarPatterns).toHaveLength(0);
      expect(result.result.fixRecommendations).toHaveLength(0);
      expect(result.result.preventionMeasures).toHaveLength(0);
      expect(result.result.regressionRisk.areas).toHaveLength(0);
    });
  });
});
