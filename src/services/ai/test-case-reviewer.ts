import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export interface ReviewCheckItem {
  category: 'preconditions' | 'steps' | 'expectedResult' | 'coverage' | 'clarity';
  status: 'PASS' | 'WARNING' | 'FAIL';
  message: string;
  suggestion?: string;
}

export interface TestCaseReviewResult {
  overallScore: number; // 0-100
  summary: string;
  checkItems: ReviewCheckItem[];
  improvements: ReviewImprovement[];
}

export interface ReviewImprovement {
  field: 'title' | 'description' | 'preconditions' | 'steps' | 'expectedResult';
  current: string;
  suggested: string;
  reason: string;
}

export interface TestCaseForReview {
  id: string;
  title: string;
  description?: string;
  preconditions?: string;
  steps: Array<{
    stepNumber: number;
    action: string;
    expectedResult: string;
  }>;
  expectedResult: string;
  priority?: string;
  testType?: string;
}

export interface TestCaseReviewOptions {
  testCase: TestCaseForReview;
  context?: string; // Additional context about the feature/requirement
  reviewFocus?: ('preconditions' | 'steps' | 'expectedResult' | 'coverage' | 'clarity')[];
}

export interface TestCaseReviewResponse {
  review: TestCaseReviewResult;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class TestCaseReviewerService {
  /**
   * テストケースをレビュー
   */
  async reviewTestCase(
    projectId: bigint | null,
    options: TestCaseReviewOptions
  ): Promise<TestCaseReviewResponse> {
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
    const template = await promptTemplateRepository.findDefault(projectId, 'TEST_CASE_REVIEW');
    if (!template) {
      throw new Error('テストケースレビューテンプレートが見つかりません');
    }

    // Build prompt
    const prompt = this.buildPrompt(template.content, options);

    // Create Claude client
    const client = new ClaudeClient({
      apiKey,
      timeout: 120000,
      maxRetries: 2,
    });

    // Generate
    const response = await client.sendMessage({
      messages: [{ role: 'user', content: prompt }],
      model: settings.model,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      systemPrompt: this.getSystemPrompt(),
    });

    // Record usage
    await aiSettingsRepository.recordUsage(projectId, response.usage.totalTokens);

    // Parse response
    const review = this.parseResponse(response.content);

    return {
      review,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      },
    };
  }

  private buildPrompt(templateContent: string, options: TestCaseReviewOptions): string {
    const { testCase, context } = options;

    // Format steps
    const stepsText = testCase.steps
      .map((s) => `${s.stepNumber}. ${s.action} → ${s.expectedResult}`)
      .join('\n');

    let prompt = substituteVariables(templateContent, {
      title: testCase.title,
      description: testCase.description || '説明なし',
      preconditions: testCase.preconditions || '前提条件なし',
      steps: stepsText,
      expectedResult: testCase.expectedResult,
      context: context || '追加コンテキストなし',
    });

    // Add review focus if specified
    if (options.reviewFocus && options.reviewFocus.length > 0) {
      prompt += `\n\n## 重点レビュー項目\n`;
      prompt += options.reviewFocus
        .map((focus) => {
          switch (focus) {
            case 'preconditions':
              return '- 前提条件の網羅性';
            case 'steps':
              return '- テスト手順の明確性';
            case 'expectedResult':
              return '- 期待結果の検証可能性';
            case 'coverage':
              return '- 境界値・異常系の考慮';
            case 'clarity':
              return '- 記述の明確性・一貫性';
            default:
              return '';
          }
        })
        .join('\n');
    }

    prompt += `\n\n## 出力形式（JSON）
以下のJSON形式で出力してください。マークダウンのコードブロックは使用せず、純粋なJSONのみを出力してください:

{
  "overallScore": 0-100の数値,
  "summary": "全体的な評価コメント",
  "checkItems": [
    {
      "category": "preconditions|steps|expectedResult|coverage|clarity",
      "status": "PASS|WARNING|FAIL",
      "message": "チェック結果の説明",
      "suggestion": "改善提案（任意）"
    }
  ],
  "improvements": [
    {
      "field": "title|description|preconditions|steps|expectedResult",
      "current": "現在の内容",
      "suggested": "改善後の内容",
      "reason": "改善理由"
    }
  ]
}`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `あなたは経験豊富なソフトウェアテストエンジニアです。
テストケースの品質をレビューし、具体的な改善提案を行ってください。
以下の観点でレビューを行います：

1. 前提条件の網羅性
   - テスト実行に必要な前提条件が明記されているか
   - 環境・データ・状態などの条件が具体的か

2. テスト手順の明確性
   - 各手順が具体的で再現可能か
   - 手順の順序が論理的か
   - 操作対象や入力値が明確か

3. 期待結果の検証可能性
   - 期待結果が具体的で客観的に検証可能か
   - 成功/失敗の判定基準が明確か

4. 境界値・異常系の考慮
   - 境界値テストが考慮されているか
   - エラーケースや異常系が網羅されているか

5. 記述の明確性・一貫性
   - 用語や表現が一貫しているか
   - 曖昧な表現がないか

出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private parseResponse(content: string): TestCaseReviewResult {
    try {
      // Remove markdown code blocks if present
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonContent);

      return {
        overallScore: Math.min(100, Math.max(0, Number(parsed.overallScore) || 50)),
        summary: String(parsed.summary || ''),
        checkItems: Array.isArray(parsed.checkItems)
          ? parsed.checkItems.map((item: Record<string, unknown>) => ({
              category: this.normalizeCategory(String(item.category || '')),
              status: this.normalizeStatus(String(item.status || '')),
              message: String(item.message || ''),
              suggestion: item.suggestion ? String(item.suggestion) : undefined,
            }))
          : [],
        improvements: Array.isArray(parsed.improvements)
          ? parsed.improvements.map((imp: Record<string, unknown>) => ({
              field: this.normalizeField(String(imp.field || '')),
              current: String(imp.current || ''),
              suggested: String(imp.suggested || ''),
              reason: String(imp.reason || ''),
            }))
          : [],
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AIの応答を解析できませんでした。再度お試しください。');
    }
  }

  private normalizeCategory(
    category: string
  ): 'preconditions' | 'steps' | 'expectedResult' | 'coverage' | 'clarity' {
    const lower = category.toLowerCase();
    if (lower.includes('precondition') || lower.includes('前提')) return 'preconditions';
    if (lower.includes('step') || lower.includes('手順')) return 'steps';
    if (lower.includes('expected') || lower.includes('期待') || lower.includes('結果'))
      return 'expectedResult';
    if (lower.includes('coverage') || lower.includes('網羅') || lower.includes('境界'))
      return 'coverage';
    return 'clarity';
  }

  private normalizeStatus(status: string): 'PASS' | 'WARNING' | 'FAIL' {
    const upper = status.toUpperCase();
    if (upper === 'PASS' || upper === 'OK' || upper === '合格') return 'PASS';
    if (upper === 'FAIL' || upper === 'NG' || upper === '不合格') return 'FAIL';
    return 'WARNING';
  }

  private normalizeField(
    field: string
  ): 'title' | 'description' | 'preconditions' | 'steps' | 'expectedResult' {
    const lower = field.toLowerCase();
    if (lower.includes('title') || lower.includes('タイトル')) return 'title';
    if (lower.includes('description') || lower.includes('説明')) return 'description';
    if (lower.includes('precondition') || lower.includes('前提')) return 'preconditions';
    if (lower.includes('step') || lower.includes('手順')) return 'steps';
    return 'expectedResult';
  }
}

export const testCaseReviewerService = new TestCaseReviewerService();
