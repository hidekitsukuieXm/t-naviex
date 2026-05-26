import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testCaseGeneratorService, TestCaseGenerationOptions } from '../test-case-generator';
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

describe('TestCaseGeneratorService', () => {
  const mockOptions: TestCaseGenerationOptions = {
    requirement: 'ユーザーはログイン画面でメールアドレスとパスワードを入力してログインできる',
    feature: 'ログイン機能',
    detailLevel: 'standard',
    count: 3,
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
    name: 'テストケース生成',
    description: null,
    type: 'TEST_CASE_GENERATION' as const,
    content: '要件: {{requirement}}\n機能: {{feature}}\n考慮事項: {{considerations}}',
    variables: [],
    isSystem: true,
    isDefault: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAiResponse = `[
    {
      "title": "正常ログインテスト",
      "description": "有効な認証情報でログインできることを確認",
      "preconditions": "ユーザーアカウントが存在する",
      "steps": [
        {"stepNumber": 1, "action": "ログイン画面を開く", "expectedResult": "ログイン画面が表示される"},
        {"stepNumber": 2, "action": "メールアドレスを入力", "expectedResult": "入力が反映される"},
        {"stepNumber": 3, "action": "パスワードを入力", "expectedResult": "パスワードがマスクされて表示される"},
        {"stepNumber": 4, "action": "ログインボタンをクリック", "expectedResult": "ダッシュボードに遷移する"}
      ],
      "expectedResult": "ユーザーが正常にログインし、ダッシュボード画面が表示される",
      "priority": "HIGH",
      "testType": "機能テスト",
      "testTechnique": "正常系テスト"
    }
  ]`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateTestCases', () => {
    it('should generate test cases successfully', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: mockAiResponse,
        stopReason: 'end_turn',
        usage: {
          inputTokens: 100,
          outputTokens: 200,
          totalTokens: 300,
        },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testCaseGeneratorService.generateTestCases(null, mockOptions);

      expect(result.testCases).toHaveLength(1);
      expect(result.testCases[0].title).toBe('正常ログインテスト');
      expect(result.testCases[0].priority).toBe('HIGH');
      expect(result.testCases[0].steps).toHaveLength(4);
      expect(result.usage.inputTokens).toBe(100);
      expect(result.usage.outputTokens).toBe(200);

      expect(aiSettingsRepository.recordUsage).toHaveBeenCalledWith(null, 300);
    });

    it('should throw error when API key is not set', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue(null);

      await expect(testCaseGeneratorService.generateTestCases(null, mockOptions)).rejects.toThrow(
        'APIキーが設定されていません'
      );
    });

    it('should throw error when AI is disabled', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue({
        ...mockSettings,
        isEnabled: false,
      });

      await expect(testCaseGeneratorService.generateTestCases(null, mockOptions)).rejects.toThrow(
        'AI機能が無効になっています'
      );
    });

    it('should throw error when template is not found', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(null);

      await expect(testCaseGeneratorService.generateTestCases(null, mockOptions)).rejects.toThrow(
        'テストケース生成テンプレートが見つかりません'
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
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testCaseGeneratorService.generateTestCases(null, mockOptions);

      expect(result.testCases).toHaveLength(1);
    });

    it('should normalize priority values', async () => {
      vi.mocked(aiSettingsRepository.getDecryptedApiKey).mockResolvedValue('sk-ant-test-key');
      vi.mocked(aiSettingsRepository.getOrCreateSettings).mockResolvedValue(mockSettings);
      vi.mocked(promptTemplateRepository.findDefault).mockResolvedValue(mockTemplate);

      const responseWithJapanesePriority = `[
        {"title": "Test 1", "description": "", "preconditions": "", "steps": [], "expectedResult": "", "priority": "高", "testType": "機能テスト"},
        {"title": "Test 2", "description": "", "preconditions": "", "steps": [], "expectedResult": "", "priority": "低", "testType": "機能テスト"},
        {"title": "Test 3", "description": "", "preconditions": "", "steps": [], "expectedResult": "", "priority": "medium", "testType": "機能テスト"}
      ]`;

      const mockSendMessage = vi.fn().mockResolvedValue({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: responseWithJapanesePriority,
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      const result = await testCaseGeneratorService.generateTestCases(null, mockOptions);

      expect(result.testCases[0].priority).toBe('HIGH');
      expect(result.testCases[1].priority).toBe('LOW');
      expect(result.testCases[2].priority).toBe('MEDIUM');
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
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      });

      vi.mocked(ClaudeClient).mockImplementation(
        () =>
          ({
            sendMessage: mockSendMessage,
          }) as unknown as ClaudeClient
      );

      await expect(testCaseGeneratorService.generateTestCases(null, mockOptions)).rejects.toThrow(
        'AIの応答を解析できませんでした'
      );
    });
  });
});
