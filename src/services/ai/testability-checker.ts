import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export type TestabilityCategory =
  | 'AMBIGUITY'
  | 'QUANTITATIVE'
  | 'CONDITIONS'
  | 'EXPECTED_RESULT'
  | 'COMPLETENESS';

export type TestabilitySeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TestabilityIssue {
  category: TestabilityCategory;
  severity: TestabilitySeverity;
  location: string;
  originalText: string;
  issue: string;
  suggestion: string;
  improvedText?: string;
}

export interface TestabilityCheckResult {
  overallScore: number; // 0-100
  summary: string;
  issues: TestabilityIssue[];
  recommendations: string[];
}

export interface TestabilityCheckOptions {
  content: string;
  contentType: 'requirement' | 'specification' | 'user_story' | 'acceptance_criteria';
  context?: string;
}

export interface TestabilityCheckResponse {
  result: TestabilityCheckResult;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export const CATEGORY_INFO: Record<
  TestabilityCategory,
  { name: string; description: string; examples: string[] }
> = {
  AMBIGUITY: {
    name: '曖昧な表現',
    description: '「適切に」「迅速に」「高品質」など、解釈が異なる可能性のある表現',
    examples: [
      '「適切なエラーメッセージを表示する」 → 具体的なメッセージ内容を明記',
      '「迅速に処理する」 → 「3秒以内に処理完了」のように定量化',
      '「使いやすいUI」 → 具体的な操作フローや基準を記述',
    ],
  },
  QUANTITATIVE: {
    name: '定量的基準',
    description: '測定可能な基準や数値目標の有無',
    examples: [
      '「高速に動作する」→「応答時間は1秒以内」',
      '「多くのユーザーをサポート」→「同時接続1000ユーザー」',
      '「高い可用性」→「稼働率99.9%以上」',
    ],
  },
  CONDITIONS: {
    name: 'テスト条件',
    description: 'テストを実行するための前提条件や環境の明確性',
    examples: [
      '前提条件が不明確 →「ログイン済みユーザーで、商品がカートに入っている状態」',
      '環境条件の欠如 →「Windows 10以降、Chrome 100以上」',
      '入力データの不明確 →「有効なメールアドレス形式（xxx@example.com）」',
    ],
  },
  EXPECTED_RESULT: {
    name: '期待結果',
    description: '検証可能で具体的な期待結果の記述',
    examples: [
      '「正しく動作する」→「登録完了メッセージが表示され、DBにレコードが作成される」',
      '「エラーになる」→「エラーコード401と「認証が必要です」メッセージが表示」',
      '「更新される」→「更新日時が現在時刻に変更され、画面に反映される」',
    ],
  },
  COMPLETENESS: {
    name: '完全性',
    description: '仕様の網羅性、エッジケースや例外ケースの考慮',
    examples: [
      '異常系の記載漏れ →「無効な入力時の動作」を追加',
      '境界条件の欠如 →「0件の場合」「上限に達した場合」を追加',
      '並行処理の考慮 →「同時に複数リクエストがあった場合」を追加',
    ],
  },
};

export class TestabilityCheckerService {
  /**
   * テスタビリティをチェック
   */
  async checkTestability(
    projectId: bigint | null,
    options: TestabilityCheckOptions
  ): Promise<TestabilityCheckResponse> {
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
    const template = await promptTemplateRepository.findDefault(projectId, 'TESTABILITY_CHECK');
    if (!template) {
      throw new Error('テスタビリティチェックテンプレートが見つかりません');
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
    const result = this.parseResponse(response.content);

    return {
      result,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      },
    };
  }

  /**
   * カテゴリ情報を取得
   */
  getCategoryInfo(category: TestabilityCategory) {
    return CATEGORY_INFO[category];
  }

  /**
   * 全カテゴリ情報を取得
   */
  getAllCategories() {
    return Object.entries(CATEGORY_INFO).map(([key, value]) => ({
      category: key as TestabilityCategory,
      ...value,
    }));
  }

  private buildPrompt(templateContent: string, options: TestabilityCheckOptions): string {
    const contentTypeLabel = this.getContentTypeLabel(options.contentType);

    let prompt = substituteVariables(templateContent, {
      content: options.content,
      contentType: contentTypeLabel,
      context: options.context || 'なし',
    });

    prompt += `\n\n## チェック観点
- AMBIGUITY: 曖昧な表現（「適切に」「迅速に」等）
- QUANTITATIVE: 定量的基準の有無
- CONDITIONS: テスト条件の特定可能性
- EXPECTED_RESULT: 期待結果の明確性
- COMPLETENESS: 仕様の完全性・網羅性

## 出力形式（JSON）
以下のJSON形式で出力してください。マークダウンのコードブロックは使用せず、純粋なJSONのみを出力してください:

{
  "overallScore": 0-100の数値,
  "summary": "全体的な評価サマリー",
  "issues": [
    {
      "category": "AMBIGUITY|QUANTITATIVE|CONDITIONS|EXPECTED_RESULT|COMPLETENESS",
      "severity": "HIGH|MEDIUM|LOW",
      "location": "問題のある箇所（行番号や項目名）",
      "originalText": "問題のある原文",
      "issue": "問題の説明",
      "suggestion": "改善提案",
      "improvedText": "改善後のテキスト例"
    }
  ],
  "recommendations": ["全般的な改善推奨事項"]
}`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `あなたは経験豊富なソフトウェアテストエンジニアです。
仕様書や要件のテスト可能性（テスタビリティ）を分析してください。
以下の観点でチェックを行います：

1. 曖昧な表現（AMBIGUITY）
   - 「適切に」「迅速に」「高品質」など主観的な表現
   - 複数の解釈が可能な記述
   - 具体性に欠ける説明

2. 定量的基準（QUANTITATIVE）
   - 測定可能な数値目標の有無
   - パフォーマンス要件の明確性
   - 閾値や範囲の定義

3. テスト条件（CONDITIONS）
   - 前提条件の明確性
   - 入力データの定義
   - 環境条件の記述

4. 期待結果（EXPECTED_RESULT）
   - 成功/失敗の判定基準
   - 出力や状態変化の具体性
   - 検証方法の明確性

5. 完全性（COMPLETENESS）
   - 正常系・異常系の網羅
   - 境界条件の考慮
   - エッジケースの記述

問題を発見した場合は、具体的な改善案と改善後のテキスト例を提示してください。
出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private getContentTypeLabel(contentType: TestabilityCheckOptions['contentType']): string {
    const labels: Record<TestabilityCheckOptions['contentType'], string> = {
      requirement: '要件',
      specification: '仕様書',
      user_story: 'ユーザーストーリー',
      acceptance_criteria: '受け入れ基準',
    };
    return labels[contentType];
  }

  private parseResponse(content: string): TestabilityCheckResult {
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
        issues: Array.isArray(parsed.issues)
          ? parsed.issues.map((issue: Record<string, unknown>) => ({
              category: this.normalizeCategory(String(issue.category || '')),
              severity: this.normalizeSeverity(String(issue.severity || '')),
              location: String(issue.location || ''),
              originalText: String(issue.originalText || ''),
              issue: String(issue.issue || ''),
              suggestion: String(issue.suggestion || ''),
              improvedText: issue.improvedText ? String(issue.improvedText) : undefined,
            }))
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map((r: unknown) => String(r))
          : [],
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AIの応答を解析できませんでした。再度お試しください。');
    }
  }

  private normalizeCategory(category: string): TestabilityCategory {
    const upper = category.toUpperCase().replace(/-/g, '_');
    const validCategories: TestabilityCategory[] = [
      'AMBIGUITY',
      'QUANTITATIVE',
      'CONDITIONS',
      'EXPECTED_RESULT',
      'COMPLETENESS',
    ];

    if (validCategories.includes(upper as TestabilityCategory)) {
      return upper as TestabilityCategory;
    }

    // Try to match by Japanese name
    const lower = category.toLowerCase();
    if (lower.includes('曖昧')) return 'AMBIGUITY';
    if (lower.includes('定量')) return 'QUANTITATIVE';
    if (lower.includes('条件')) return 'CONDITIONS';
    if (lower.includes('期待') || lower.includes('結果')) return 'EXPECTED_RESULT';
    if (lower.includes('完全') || lower.includes('網羅')) return 'COMPLETENESS';

    return 'AMBIGUITY'; // Default
  }

  private normalizeSeverity(severity: string): TestabilitySeverity {
    const upper = severity.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }
}

export const testabilityCheckerService = new TestabilityCheckerService();
