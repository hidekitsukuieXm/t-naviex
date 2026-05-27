import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requirementTestSuggesterService,
  RequirementTestSuggestionOptions,
} from '../requirement-test-suggester';
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

describe('RequirementTestSuggesterService', () => {
  const mockOptions: RequirementTestSuggestionOptions = {
    requirements: [
      {
        id: 'REQ-001',
        title: 'ユーザーログイン機能',
        description: 'ユーザーはメールアドレスとパスワードでログインできる',
        priority: 'HIGH',
      },
      {
        id: 'REQ-002',
        title: 'パスワードリセット機能',
        description: 'ユーザーはパスワードをリセットできる',
        priority: 'MEDIUM',
      },
    ],
    existingTestCases: [
      {
        id: 'TC-001',
        title: '正常ログインテスト',
        linkedRequirements: ['REQ-001'],
      },
    ],
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
    name: '要件連携テスト提案',
    description: null,
    type: 'REQUIREMENT_TEST' as const,
    content: '要件: {{requirements}}\n既存TC: {{existingTestCases}}\nコンテキスト: {{context}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `{
    "suggestedTestCases": [
      {
        "title": "ログイン失敗テスト - 無効なパスワード",
        "description": "無効なパスワードでログインが拒否されることを確認",
        "priority": "HIGH",
        "testType": "異常系テスト",
        "relatedRequirements": ["REQ-001"],
        "steps": [
          {"stepNumber": 1, "action": "ログイン画面を開く", "expectedResult": "ログイン画面表示"},
          {"stepNumber": 2, "action": "無効なパスワードを入力", "expectedResult": "入力反映"},
          {"stepNumber": 3, "action": "ログインボタンをクリック", "expectedResult": "エラー表示"}
        ],
        "expectedResult": "ログインが拒否され、エラーメッセージが表示される",
        "rationale": "既存テストは正常系のみのため、異常系のカバレッジが必要"
      },
      {
        "title": "パスワードリセットフロー",
        "description": "パスワードリセット機能が正常に動作することを確認",
        "priority": "MEDIUM",
        "testType": "機能テスト",
        "relatedRequirements": ["REQ-002"],
        "steps": [
          {"stepNumber": 1, "action": "パスワードリセット画面を開く", "expectedResult": "画面表示"},
          {"stepNumber": 2, "action": "メールアドレスを入力", "expectedResult": "入力反映"},
          {"stepNumber": 3, "action": "リセットボタンをクリック", "expectedResult": "メール送信"}
        ],
        "expectedResult": "パスワードリセットメールが送信される",
        "rationale": "REQ-002に対するテストケースが存在しない"
      }
    ],
    "coverageAnalysis": [
      {
        "requirementId": "REQ-001",
        "requirementText": "ユーザーログイン機能",
        "coverageLevel": "PARTIAL",
        "existingTestCases": ["TC-001"],
        "suggestedTestCases": ["ログイン失敗テスト"],
        "gaps": ["異常系テストが不足"]
      },
      {
        "requirementId": "REQ-002",
        "requirementText": "パスワードリセット機能",
        "coverageLevel": "NONE",
        "existingTestCases": [],
        "suggestedTestCases": ["パスワードリセットフロー"],
        "gaps": ["テストケースが存在しない"]
      }
    ],
    "coverageGaps": [
      {
        "requirementId": "REQ-001",
        "description": "異常系のテストケースが不足",
        "severity": "HIGH",
        "suggestion": "無効なパスワード、アカウントロック等のテストを追加"
      }
    ],
    "overallCoverageScore": 45,
    "summary": "2件の要件のうち、完全にカバーされているものはありません。異常系テストの追加を推奨します。"
  }`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('suggestTests', () => {
    it('should suggest tests successfully', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: {
          inputTokens: 300,
          outputTokens: 500,
          totalTokens: 800,
        },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await requirementTestSuggesterService.suggestTests(null, mockOptions);

      expect(result.result.suggestedTestCases).toHaveLength(2);
      expect(result.result.suggestedTestCases[0].title).toContain('ログイン失敗');
      expect(result.result.suggestedTestCases[0].relatedRequirements).toContain('REQ-001');
      expect(result.result.coverageAnalysis).toHaveLength(2);
      expect(result.result.coverageGaps).toHaveLength(1);
      expect(result.result.overallCoverageScore).toBe(45);
      expect(result.usage.inputTokens).toBe(300);
      expect(result.usage.outputTokens).toBe(500);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 800);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(requirementTestSuggesterService.suggestTests(null, mockOptions)).rejects.toThrow(
        'APIキーが設定されていません'
      );
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(requirementTestSuggesterService.suggestTests(null, mockOptions)).rejects.toThrow(
        'AI機能が無効になっています'
      );
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(requirementTestSuggesterService.suggestTests(null, mockOptions)).rejects.toThrow(
        '要件連携テスト提案テンプレートが見つかりません'
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
        usage: { inputTokens: 300, outputTokens: 500, totalTokens: 800 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await requirementTestSuggesterService.suggestTests(null, mockOptions);

      expect(result.result.suggestedTestCases).toHaveLength(2);
    });

    it('should normalize priority and coverage level', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapanese = `{
        "suggestedTestCases": [
          {
            "title": "テスト1",
            "description": "説明",
            "priority": "高",
            "testType": "機能テスト",
            "relatedRequirements": [],
            "steps": [],
            "expectedResult": "期待結果",
            "rationale": "理由"
          }
        ],
        "coverageAnalysis": [
          {
            "requirementId": "REQ-001",
            "requirementText": "要件",
            "coverageLevel": "完全",
            "existingTestCases": [],
            "suggestedTestCases": [],
            "gaps": []
          },
          {
            "requirementId": "REQ-002",
            "requirementText": "要件2",
            "coverageLevel": "なし",
            "existingTestCases": [],
            "suggestedTestCases": [],
            "gaps": []
          }
        ],
        "coverageGaps": [],
        "overallCoverageScore": 50,
        "summary": "サマリー"
      }`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithJapanese,
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 300, totalTokens: 500 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await requirementTestSuggesterService.suggestTests(null, mockOptions);

      expect(result.result.suggestedTestCases[0].priority).toBe('HIGH');
      expect(result.result.coverageAnalysis[0].coverageLevel).toBe('FULL');
      expect(result.result.coverageAnalysis[1].coverageLevel).toBe('NONE');
    });

    it('should clamp score to valid range', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithInvalidScore = `{
        "suggestedTestCases": [],
        "coverageAnalysis": [],
        "coverageGaps": [],
        "overallCoverageScore": 150,
        "summary": "サマリー"
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

      const result = await requirementTestSuggesterService.suggestTests(null, mockOptions);

      expect(result.result.overallCoverageScore).toBe(100);
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

      await expect(requirementTestSuggesterService.suggestTests(null, mockOptions)).rejects.toThrow(
        'AIの応答を解析できませんでした'
      );
    });

    it('should work without existing test cases', async () => {
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

      const optionsWithoutTC: RequirementTestSuggestionOptions = {
        requirements: mockOptions.requirements,
      };

      const result = await requirementTestSuggesterService.suggestTests(null, optionsWithoutTC);

      expect(result.result.suggestedTestCases).toHaveLength(2);
    });
  });
});
