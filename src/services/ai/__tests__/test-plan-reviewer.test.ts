import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testPlanReviewerService, TestPlanReviewOptions } from '../test-plan-reviewer';
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

describe('TestPlanReviewerService', () => {
  const mockOptions: TestPlanReviewOptions = {
    testPlan: {
      title: 'ユーザー管理機能テスト計画',
      description: 'ユーザー管理機能の品質を保証するためのテスト計画',
      scope: 'ユーザー登録、ログイン、プロフィール管理機能',
      objectives: ['機能の正常動作確認', '非機能要件の検証'],
      testTypes: ['機能テスト', '性能テスト', 'セキュリティテスト'],
      resources: {
        team: 'テストリード1名、テスター3名',
        tools: ['Playwright', 'Jest'],
        environment: 'ステージング環境',
      },
      schedule: {
        startDate: '2024-01-15',
        endDate: '2024-02-15',
        milestones: [
          { name: 'テスト設計完了', date: '2024-01-22' },
          { name: 'テスト実行完了', date: '2024-02-08' },
        ],
      },
      risks: [
        { description: '要件変更による手戻り', mitigation: 'バッファ期間の確保' },
        { description: 'リソース不足', mitigation: '外部リソースの確保' },
      ],
      exitCriteria: ['テスト消化率100%', '重大バグ0件'],
    },
    projectContext: '新規サービスのローンチに向けたテスト',
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
    name: 'テスト計画レビュー',
    description: null,
    type: 'TEST_PLAN_REVIEW' as const,
    content:
      'テスト計画: {{testPlan}}\nコンテキスト: {{projectContext}}\n過去計画: {{previousPlans}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `{
    "reviewItems": [
      {
        "category": "SCOPE",
        "title": "テスト範囲の評価",
        "status": "PASS",
        "findings": ["主要機能がカバーされている", "範囲定義が明確"],
        "suggestions": ["非機能要件のテストも検討"],
        "score": 85
      },
      {
        "category": "SCHEDULE",
        "title": "スケジュールの評価",
        "status": "WARNING",
        "findings": ["期間が短い可能性がある"],
        "suggestions": ["バッファ期間の追加を検討"],
        "score": 65
      }
    ],
    "riskAssessments": [
      {
        "riskId": "R001",
        "description": "要件変更による手戻り",
        "severity": "HIGH",
        "likelihood": "MEDIUM",
        "currentMitigation": "バッファ期間の確保",
        "suggestedMitigation": "変更管理プロセスの強化も推奨",
        "isAdequate": true
      },
      {
        "riskId": "R002",
        "description": "リソース不足",
        "severity": "MEDIUM",
        "likelihood": "HIGH",
        "currentMitigation": "外部リソースの確保",
        "suggestedMitigation": "具体的な確保計画を策定",
        "isAdequate": false
      }
    ],
    "comparisonInsights": [
      {
        "aspect": "テスト期間",
        "observation": "類似プロジェクトより短い期間設定",
        "recommendation": "1週間の延長を推奨"
      }
    ],
    "overallScore": 75,
    "overallStatus": "WARNING",
    "summary": "テスト計画は概ね適切ですが、スケジュールとリソース面でリスクがあります。",
    "strengths": ["明確な範囲定義", "適切なテスト種別の選択"],
    "improvements": ["スケジュールバッファの追加", "リソース確保計画の具体化"]
  }`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reviewTestPlan', () => {
    it('should review test plan successfully', async () => {
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

      const result = await testPlanReviewerService.reviewTestPlan(null, mockOptions);

      expect(result.result.reviewItems).toHaveLength(2);
      expect(result.result.reviewItems[0].category).toBe('SCOPE');
      expect(result.result.reviewItems[0].status).toBe('PASS');
      expect(result.result.riskAssessments).toHaveLength(2);
      expect(result.result.riskAssessments[0].isAdequate).toBe(true);
      expect(result.result.overallScore).toBe(75);
      expect(result.result.overallStatus).toBe('WARNING');
      expect(result.result.strengths).toHaveLength(2);
      expect(result.result.improvements).toHaveLength(2);
      expect(result.usage.inputTokens).toBe(500);
      expect(result.usage.outputTokens).toBe(800);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 1300);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(testPlanReviewerService.reviewTestPlan(null, mockOptions)).rejects.toThrow(
        'APIキーが設定されていません'
      );
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(testPlanReviewerService.reviewTestPlan(null, mockOptions)).rejects.toThrow(
        'AI機能が無効になっています'
      );
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(testPlanReviewerService.reviewTestPlan(null, mockOptions)).rejects.toThrow(
        'テスト計画レビューテンプレートが見つかりません'
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

      const result = await testPlanReviewerService.reviewTestPlan(null, mockOptions);

      expect(result.result.reviewItems).toHaveLength(2);
    });

    it('should normalize Japanese category and status', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapanese = `{
        "reviewItems": [
          {
            "category": "テスト範囲",
            "title": "範囲評価",
            "status": "合格",
            "findings": [],
            "suggestions": [],
            "score": 80
          },
          {
            "category": "リスク",
            "title": "リスク評価",
            "status": "不合格",
            "findings": [],
            "suggestions": [],
            "score": 40
          }
        ],
        "riskAssessments": [
          {
            "riskId": "R001",
            "description": "リスク",
            "severity": "高",
            "likelihood": "低",
            "currentMitigation": "",
            "suggestedMitigation": "",
            "isAdequate": false
          }
        ],
        "comparisonInsights": [],
        "overallScore": 60,
        "overallStatus": "要注意",
        "summary": "サマリー",
        "strengths": [],
        "improvements": []
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

      const result = await testPlanReviewerService.reviewTestPlan(null, mockOptions);

      expect(result.result.reviewItems[0].category).toBe('SCOPE');
      expect(result.result.reviewItems[0].status).toBe('PASS');
      expect(result.result.reviewItems[1].category).toBe('RISKS');
      expect(result.result.reviewItems[1].status).toBe('FAIL');
      expect(result.result.riskAssessments[0].severity).toBe('HIGH');
      expect(result.result.riskAssessments[0].likelihood).toBe('LOW');
      expect(result.result.overallStatus).toBe('WARNING');
    });

    it('should clamp score to valid range', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithInvalidScore = `{
        "reviewItems": [
          {
            "category": "SCOPE",
            "title": "テスト",
            "status": "PASS",
            "findings": [],
            "suggestions": [],
            "score": 150
          }
        ],
        "riskAssessments": [],
        "comparisonInsights": [],
        "overallScore": -10,
        "overallStatus": "PASS",
        "summary": "サマリー",
        "strengths": [],
        "improvements": []
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithInvalidScore,
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 200, totalTokens: 400 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testPlanReviewerService.reviewTestPlan(null, mockOptions);

      expect(result.result.reviewItems[0].score).toBe(100);
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

      await expect(testPlanReviewerService.reviewTestPlan(null, mockOptions)).rejects.toThrow(
        'AIの応答を解析できませんでした'
      );
    });

    it('should work with minimal test plan', async () => {
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

      const minimalOptions: TestPlanReviewOptions = {
        testPlan: {
          title: 'シンプルテスト計画',
          description: '簡易なテスト計画',
          scope: 'ログイン機能のみ',
        },
      };

      const result = await testPlanReviewerService.reviewTestPlan(null, minimalOptions);

      expect(result.result.reviewItems).toHaveLength(2);
    });

    it('should handle focus areas parameter', async () => {
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

      const optionsWithFocus: TestPlanReviewOptions = {
        ...mockOptions,
        focusAreas: ['SCOPE', 'RISKS'],
      };

      const result = await testPlanReviewerService.reviewTestPlan(null, optionsWithFocus);

      expect(result.result.overallScore).toBe(75);
      expect(mockSendMessage).toHaveBeenCalled();
    });

    it('should handle previous plans for comparison', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 500, outputTokens: 700, totalTokens: 1200 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const optionsWithPrevious: TestPlanReviewOptions = {
        ...mockOptions,
        previousPlans: [
          {
            title: '過去プロジェクトA',
            summary: '3週間、5名体制で実施',
          },
        ],
      };

      const result = await testPlanReviewerService.reviewTestPlan(null, optionsWithPrevious);

      expect(result.result.comparisonInsights).toHaveLength(1);
    });
  });
});
