import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testCaseReviewerService, TestCaseReviewOptions } from '../test-case-reviewer';
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

describe('TestCaseReviewerService', () => {
  const mockTestCase = {
    id: '1',
    title: 'ログイン機能テスト',
    description: '正常なログインフローを確認',
    preconditions: 'ユーザーアカウントが存在する',
    steps: [
      { stepNumber: 1, action: 'ログイン画面を開く', expectedResult: 'ログイン画面が表示される' },
      { stepNumber: 2, action: 'メールアドレスを入力', expectedResult: '入力が反映される' },
      { stepNumber: 3, action: 'パスワードを入力', expectedResult: 'パスワードが入力される' },
      { stepNumber: 4, action: 'ログインボタンをクリック', expectedResult: 'ダッシュボードに遷移' },
    ],
    expectedResult: 'ユーザーが正常にログインできる',
    priority: 'HIGH',
    testType: '機能テスト',
  };

  const mockOptions: TestCaseReviewOptions = {
    testCase: mockTestCase,
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
    name: 'テストケースレビュー',
    description: null,
    type: 'TEST_CASE_REVIEW' as const,
    content:
      'タイトル: {{title}}\n説明: {{description}}\n前提条件: {{preconditions}}\n手順:\n{{steps}}\n期待結果: {{expectedResult}}\nコンテキスト: {{context}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `{
    "overallScore": 75,
    "summary": "全体的に良好なテストケースですが、いくつかの改善点があります。",
    "checkItems": [
      {
        "category": "preconditions",
        "status": "PASS",
        "message": "前提条件が明確に記述されています"
      },
      {
        "category": "steps",
        "status": "WARNING",
        "message": "パスワード入力の期待結果が曖昧です",
        "suggestion": "パスワードがマスクされて表示されることを明記"
      },
      {
        "category": "expectedResult",
        "status": "PASS",
        "message": "最終的な期待結果が検証可能な形式で記述されています"
      },
      {
        "category": "coverage",
        "status": "FAIL",
        "message": "異常系のテストケースが含まれていません",
        "suggestion": "無効なパスワードでのログイン失敗ケースを追加"
      }
    ],
    "improvements": [
      {
        "field": "steps",
        "current": "パスワードを入力",
        "suggested": "パスワード欄に有効なパスワード「testPass123」を入力",
        "reason": "具体的な入力値を示すことで再現性が向上"
      }
    ]
  }`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reviewTestCase', () => {
    it('should review test case successfully', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: {
          inputTokens: 150,
          outputTokens: 250,
          totalTokens: 400,
        },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testCaseReviewerService.reviewTestCase(null, mockOptions);

      expect(result.review.overallScore).toBe(75);
      expect(result.review.summary).toContain('良好なテストケース');
      expect(result.review.checkItems).toHaveLength(4);
      expect(result.review.improvements).toHaveLength(1);
      expect(result.usage.inputTokens).toBe(150);
      expect(result.usage.outputTokens).toBe(250);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 400);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(testCaseReviewerService.reviewTestCase(null, mockOptions)).rejects.toThrow(
        'APIキーが設定されていません'
      );
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(testCaseReviewerService.reviewTestCase(null, mockOptions)).rejects.toThrow(
        'AI機能が無効になっています'
      );
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(testCaseReviewerService.reviewTestCase(null, mockOptions)).rejects.toThrow(
        'テストケースレビューテンプレートが見つかりません'
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
        usage: { inputTokens: 150, outputTokens: 250, totalTokens: 400 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testCaseReviewerService.reviewTestCase(null, mockOptions);

      expect(result.review.overallScore).toBe(75);
    });

    it('should normalize status values', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapaneseStatus = `{
        "overallScore": 60,
        "summary": "テスト",
        "checkItems": [
          {"category": "前提条件", "status": "合格", "message": "OK"},
          {"category": "手順", "status": "NG", "message": "改善必要"},
          {"category": "coverage", "status": "warning", "message": "注意"}
        ],
        "improvements": []
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithJapaneseStatus,
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testCaseReviewerService.reviewTestCase(null, mockOptions);

      expect(result.review.checkItems[0].status).toBe('PASS');
      expect(result.review.checkItems[1].status).toBe('FAIL');
      expect(result.review.checkItems[2].status).toBe('WARNING');
    });

    it('should clamp score to valid range', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithInvalidScore = `{
        "overallScore": 150,
        "summary": "テスト",
        "checkItems": [],
        "improvements": []
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

      const result = await testCaseReviewerService.reviewTestCase(null, mockOptions);

      expect(result.review.overallScore).toBe(100);
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

      await expect(testCaseReviewerService.reviewTestCase(null, mockOptions)).rejects.toThrow(
        'AIの応答を解析できませんでした'
      );
    });

    it('should include review focus in prompt when specified', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: { inputTokens: 150, outputTokens: 250, totalTokens: 400 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const optionsWithFocus: TestCaseReviewOptions = {
        ...mockOptions,
        reviewFocus: ['preconditions', 'coverage'],
      };

      await testCaseReviewerService.reviewTestCase(null, optionsWithFocus);

      expect(mockSendMessage).toHaveBeenCalled();
      const callArg = mockSendMessage.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('重点レビュー項目');
      expect(callArg.messages[0].content).toContain('前提条件の網羅性');
      expect(callArg.messages[0].content).toContain('境界値・異常系の考慮');
    });
  });
});
