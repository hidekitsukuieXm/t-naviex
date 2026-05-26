import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export interface GeneratedTestCase {
  title: string;
  description: string;
  preconditions: string;
  steps: GeneratedTestStep[];
  expectedResult: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  testType: string;
  testTechnique?: string;
}

export interface GeneratedTestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface TestCaseGenerationOptions {
  requirement: string;
  feature?: string;
  considerations?: string;
  testTechnique?: string;
  detailLevel: 'basic' | 'standard' | 'detailed';
  count: number;
}

export interface TestCaseGenerationResult {
  testCases: GeneratedTestCase[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class TestCaseGeneratorService {
  /**
   * テストケースを生成
   */
  async generateTestCases(
    projectId: bigint | null,
    options: TestCaseGenerationOptions
  ): Promise<TestCaseGenerationResult> {
    // Get API key
    const apiKey = await aiSettingsRepository.getDecryptedApiKey(projectId);
    if (!apiKey) {
      throw new Error('APIキーが設定されていません');
    }

    // Get settings
    const settings = await aiSettingsRepository.getOrCreateSettings(projectId);
    if (!settings.isEnabled) {
      throw new Error('AI機能が無効になっています');
    }

    // Get template
    const template = await promptTemplateRepository.findDefault(projectId, 'TEST_CASE_GENERATION');
    if (!template) {
      throw new Error('テストケース生成テンプレートが見つかりません');
    }

    // Build prompt
    const prompt = this.buildPrompt(template.content, options);

    // Create Claude client
    const client = new ClaudeClient({
      apiKey,
      timeout: 120000, // 2 minutes for generation
      maxRetries: 2,
    });

    // Generate
    const response = await client.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      model: settings.model,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      systemPrompt: this.getSystemPrompt(options),
    });

    // Record usage
    await aiSettingsRepository.recordUsage(projectId, response.usage.totalTokens);

    // Parse response
    const testCases = this.parseResponse(response.content);

    return {
      testCases,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      },
    };
  }

  private buildPrompt(templateContent: string, options: TestCaseGenerationOptions): string {
    let prompt = substituteVariables(templateContent, {
      requirement: options.requirement,
      feature: options.feature || '指定なし',
      considerations: options.considerations || 'なし',
    });

    // Add additional instructions based on options
    prompt += `\n\n## 追加指示\n`;
    prompt += `- 生成件数: ${options.count}件\n`;
    prompt += `- 詳細度: ${this.getDetailLevelDescription(options.detailLevel)}\n`;

    if (options.testTechnique) {
      prompt += `- 使用するテスト技法: ${options.testTechnique}\n`;
    }

    prompt += `\n## 出力形式（JSON）
以下のJSON形式で出力してください。マークダウンのコードブロックは使用せず、純粋なJSONのみを出力してください:

[
  {
    "title": "テストケースのタイトル",
    "description": "テストケースの概要説明",
    "preconditions": "事前条件",
    "steps": [
      {"stepNumber": 1, "action": "操作内容", "expectedResult": "期待結果"}
    ],
    "expectedResult": "最終的な期待結果",
    "priority": "HIGH/MEDIUM/LOW",
    "testType": "テストタイプ",
    "testTechnique": "使用したテスト技法"
  }
]`;

    return prompt;
  }

  private getSystemPrompt(options: TestCaseGenerationOptions): string {
    return `あなたは経験豊富なソフトウェアテストエンジニアです。
要件から網羅的で実用的なテストケースを生成してください。
以下の点に注意してください：
- 正常系だけでなく異常系・境界値も考慮
- テスト手順は具体的かつ再現可能に
- 期待結果は明確に検証可能な形で記述
- 優先度は影響度とリスクに基づいて設定
出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private getDetailLevelDescription(level: string): string {
    switch (level) {
      case 'basic':
        return '基本的（主要なシナリオのみ）';
      case 'detailed':
        return '詳細（エッジケース・異常系を含む）';
      default:
        return '標準的（一般的なシナリオをカバー）';
    }
  }

  private parseResponse(content: string): GeneratedTestCase[] {
    try {
      // Remove markdown code blocks if present
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonContent);

      if (!Array.isArray(parsed)) {
        throw new Error('Invalid response format');
      }

      return parsed.map((tc: Record<string, unknown>) => ({
        title: String(tc.title || ''),
        description: String(tc.description || ''),
        preconditions: String(tc.preconditions || ''),
        steps: Array.isArray(tc.steps)
          ? (tc.steps as Array<Record<string, unknown>>).map((s, i) => ({
              stepNumber: Number(s.stepNumber) || i + 1,
              action: String(s.action || ''),
              expectedResult: String(s.expectedResult || ''),
            }))
          : [],
        expectedResult: String(tc.expectedResult || ''),
        priority: this.normalizePriority(String(tc.priority || 'MEDIUM')),
        testType: String(tc.testType || '機能テスト'),
        testTechnique: tc.testTechnique ? String(tc.testTechnique) : undefined,
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AIの応答を解析できませんでした。再度お試しください。');
    }
  }

  private normalizePriority(priority: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const upper = priority.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }
}

export const testCaseGeneratorService = new TestCaseGeneratorService();
