import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export type ReviewCategory = 'SCOPE' | 'RESOURCES' | 'SCHEDULE' | 'RISKS' | 'COVERAGE' | 'STRATEGY';

export type ReviewStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface ReviewItem {
  category: ReviewCategory;
  title: string;
  status: ReviewStatus;
  findings: string[];
  suggestions: string[];
  score: number; // 0-100
}

export interface RiskAssessment {
  riskId: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  currentMitigation: string;
  suggestedMitigation: string;
  isAdequate: boolean;
}

export interface ComparisonInsight {
  aspect: string;
  observation: string;
  recommendation: string;
}

export interface TestPlanReviewResult {
  reviewItems: ReviewItem[];
  riskAssessments: RiskAssessment[];
  comparisonInsights: ComparisonInsight[];
  overallScore: number; // 0-100
  overallStatus: ReviewStatus;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface TestPlanInfo {
  title: string;
  description: string;
  scope: string;
  objectives?: string[];
  testTypes?: string[];
  resources?: {
    team?: string;
    tools?: string[];
    environment?: string;
  };
  schedule?: {
    startDate?: string;
    endDate?: string;
    milestones?: Array<{
      name: string;
      date: string;
    }>;
  };
  risks?: Array<{
    description: string;
    mitigation?: string;
  }>;
  exitCriteria?: string[];
}

export interface TestPlanReviewOptions {
  testPlan: TestPlanInfo;
  projectContext?: string;
  previousPlans?: Array<{
    title: string;
    summary: string;
  }>;
  focusAreas?: ReviewCategory[];
}

export interface TestPlanReviewResponse {
  result: TestPlanReviewResult;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export const REVIEW_CATEGORY_INFO: Record<ReviewCategory, { label: string; description: string }> =
  {
    SCOPE: {
      label: 'テスト範囲',
      description: 'テスト対象の範囲定義と妥当性の評価',
    },
    RESOURCES: {
      label: 'リソース配分',
      description: 'テストチーム、ツール、環境の適切性',
    },
    SCHEDULE: {
      label: 'スケジュール',
      description: 'テスト期間と各マイルストーンの実現可能性',
    },
    RISKS: {
      label: 'リスク対応',
      description: 'リスクの特定と対策の十分性',
    },
    COVERAGE: {
      label: 'カバレッジ',
      description: 'テスト種別と要件カバレッジの網羅性',
    },
    STRATEGY: {
      label: 'テスト戦略',
      description: 'テストアプローチと優先順位付けの妥当性',
    },
  };

export class TestPlanReviewerService {
  /**
   * テスト計画をレビュー
   */
  async reviewTestPlan(
    projectId: bigint | null,
    options: TestPlanReviewOptions
  ): Promise<TestPlanReviewResponse> {
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
    const template = await promptTemplateRepository.findDefault(projectId, 'TEST_PLAN_REVIEW');
    if (!template) {
      throw new Error('テスト計画レビューテンプレートが見つかりません');
    }

    // Build prompt
    const prompt = this.buildPrompt(template.content, options);

    // Create Claude client
    const client = new ClaudeClient({
      apiKey,
      timeout: 180000, // 3 minutes for complex analysis
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

  private buildPrompt(templateContent: string, options: TestPlanReviewOptions): string {
    const { testPlan, projectContext, previousPlans, focusAreas } = options;

    // Format test plan
    let testPlanText = `タイトル: ${testPlan.title}\n`;
    testPlanText += `説明: ${testPlan.description}\n`;
    testPlanText += `テスト範囲: ${testPlan.scope}\n`;

    if (testPlan.objectives?.length) {
      testPlanText += `\n目的:\n${testPlan.objectives.map((o) => `- ${o}`).join('\n')}\n`;
    }

    if (testPlan.testTypes?.length) {
      testPlanText += `\nテスト種別:\n${testPlan.testTypes.map((t) => `- ${t}`).join('\n')}\n`;
    }

    if (testPlan.resources) {
      testPlanText += `\nリソース:`;
      if (testPlan.resources.team) testPlanText += `\n  チーム: ${testPlan.resources.team}`;
      if (testPlan.resources.tools?.length)
        testPlanText += `\n  ツール: ${testPlan.resources.tools.join(', ')}`;
      if (testPlan.resources.environment)
        testPlanText += `\n  環境: ${testPlan.resources.environment}`;
      testPlanText += '\n';
    }

    if (testPlan.schedule) {
      testPlanText += `\nスケジュール:`;
      if (testPlan.schedule.startDate) testPlanText += `\n  開始日: ${testPlan.schedule.startDate}`;
      if (testPlan.schedule.endDate) testPlanText += `\n  終了日: ${testPlan.schedule.endDate}`;
      if (testPlan.schedule.milestones?.length) {
        testPlanText += `\n  マイルストーン:`;
        testPlan.schedule.milestones.forEach((m) => {
          testPlanText += `\n    - ${m.name}: ${m.date}`;
        });
      }
      testPlanText += '\n';
    }

    if (testPlan.risks?.length) {
      testPlanText += `\nリスク:`;
      testPlan.risks.forEach((r, i) => {
        testPlanText += `\n  ${i + 1}. ${r.description}`;
        if (r.mitigation) testPlanText += `\n     対策: ${r.mitigation}`;
      });
      testPlanText += '\n';
    }

    if (testPlan.exitCriteria?.length) {
      testPlanText += `\n終了基準:\n${testPlan.exitCriteria.map((c) => `- ${c}`).join('\n')}\n`;
    }

    // Format previous plans
    const previousPlansText = previousPlans?.length
      ? previousPlans.map((p) => `【${p.title}】\n${p.summary}`).join('\n\n')
      : 'なし';

    // Format focus areas
    const focusAreasText = focusAreas?.length
      ? focusAreas.map((a) => REVIEW_CATEGORY_INFO[a].label).join(', ')
      : 'すべて';

    let prompt = substituteVariables(templateContent, {
      testPlan: testPlanText,
      projectContext: projectContext || 'なし',
      previousPlans: previousPlansText,
    });

    prompt += `\n\n## レビュー観点
重点的にレビューする領域: ${focusAreasText}

## 出力形式（JSON）
以下のJSON形式で出力してください。マークダウンのコードブロックは使用せず、純粋なJSONのみを出力してください:

{
  "reviewItems": [
    {
      "category": "SCOPE|RESOURCES|SCHEDULE|RISKS|COVERAGE|STRATEGY",
      "title": "レビュー項目タイトル",
      "status": "PASS|WARNING|FAIL",
      "findings": ["発見事項1", "発見事項2"],
      "suggestions": ["改善提案1", "改善提案2"],
      "score": 0-100
    }
  ],
  "riskAssessments": [
    {
      "riskId": "R001",
      "description": "リスク説明",
      "severity": "HIGH|MEDIUM|LOW",
      "likelihood": "HIGH|MEDIUM|LOW",
      "currentMitigation": "現在の対策",
      "suggestedMitigation": "推奨対策",
      "isAdequate": true|false
    }
  ],
  "comparisonInsights": [
    {
      "aspect": "比較観点",
      "observation": "観察結果",
      "recommendation": "推奨事項"
    }
  ],
  "overallScore": 0-100,
  "overallStatus": "PASS|WARNING|FAIL",
  "summary": "レビューサマリー",
  "strengths": ["強み1", "強み2"],
  "improvements": ["改善点1", "改善点2"]
}`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `あなたは経験豊富なテストマネージャー兼品質保証エキスパートです。
テスト計画のレビューを行い、改善提案を提供してください。

以下の観点で詳細なレビューを行います：

1. テスト範囲（SCOPE）
   - 要件やスコープの明確性
   - テスト対象の網羅性
   - 除外項目の妥当性

2. リソース配分（RESOURCES）
   - チーム構成の適切性
   - 必要スキルの充足
   - ツール・環境の準備状況

3. スケジュール（SCHEDULE）
   - 期間の妥当性
   - マイルストーンの適切性
   - バッファの確保

4. リスク対応（RISKS）
   - リスク特定の網羅性
   - 対策の十分性
   - 予備計画の有無

5. カバレッジ（COVERAGE）
   - テスト種別の網羅性
   - 要件カバレッジ
   - 優先度に基づくカバレッジ

6. テスト戦略（STRATEGY）
   - アプローチの妥当性
   - 優先順位付けの適切性
   - 効率性の考慮

レビュー結果は客観的かつ建設的に、具体的な改善提案とともに提供してください。
出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private parseResponse(content: string): TestPlanReviewResult {
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
        reviewItems: Array.isArray(parsed.reviewItems)
          ? parsed.reviewItems.map((item: Record<string, unknown>) => ({
              category: this.normalizeCategory(String(item.category || 'SCOPE')),
              title: String(item.title || ''),
              status: this.normalizeStatus(String(item.status || '')),
              findings: Array.isArray(item.findings)
                ? item.findings.map((f: unknown) => String(f))
                : [],
              suggestions: Array.isArray(item.suggestions)
                ? item.suggestions.map((s: unknown) => String(s))
                : [],
              score: Math.min(100, Math.max(0, Number(item.score) || 50)),
            }))
          : [],
        riskAssessments: Array.isArray(parsed.riskAssessments)
          ? parsed.riskAssessments.map((risk: Record<string, unknown>) => ({
              riskId: String(risk.riskId || ''),
              description: String(risk.description || ''),
              severity: this.normalizeSeverity(String(risk.severity || '')),
              likelihood: this.normalizeSeverity(String(risk.likelihood || '')),
              currentMitigation: String(risk.currentMitigation || ''),
              suggestedMitigation: String(risk.suggestedMitigation || ''),
              isAdequate: Boolean(risk.isAdequate),
            }))
          : [],
        comparisonInsights: Array.isArray(parsed.comparisonInsights)
          ? parsed.comparisonInsights.map((insight: Record<string, unknown>) => ({
              aspect: String(insight.aspect || ''),
              observation: String(insight.observation || ''),
              recommendation: String(insight.recommendation || ''),
            }))
          : [],
        overallScore: Math.min(100, Math.max(0, Number(parsed.overallScore) || 50)),
        overallStatus: this.normalizeStatus(String(parsed.overallStatus || '')),
        summary: String(parsed.summary || ''),
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.map((s: unknown) => String(s))
          : [],
        improvements: Array.isArray(parsed.improvements)
          ? parsed.improvements.map((i: unknown) => String(i))
          : [],
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AIの応答を解析できませんでした。再度お試しください。');
    }
  }

  private normalizeCategory(category: string): ReviewCategory {
    const upper = category.toUpperCase();
    if (upper === 'SCOPE' || upper === 'テスト範囲' || upper === '範囲') return 'SCOPE';
    if (upper === 'RESOURCES' || upper === 'リソース' || upper === 'リソース配分')
      return 'RESOURCES';
    if (upper === 'SCHEDULE' || upper === 'スケジュール' || upper === '日程') return 'SCHEDULE';
    if (upper === 'RISKS' || upper === 'リスク' || upper === 'リスク対応') return 'RISKS';
    if (upper === 'COVERAGE' || upper === 'カバレッジ' || upper === '網羅性') return 'COVERAGE';
    if (upper === 'STRATEGY' || upper === '戦略' || upper === 'テスト戦略') return 'STRATEGY';
    return 'SCOPE';
  }

  private normalizeStatus(status: string): ReviewStatus {
    const upper = status.toUpperCase();
    if (upper === 'PASS' || upper === '合格' || upper === 'OK') return 'PASS';
    if (upper === 'FAIL' || upper === '不合格' || upper === 'NG') return 'FAIL';
    return 'WARNING';
  }

  private normalizeSeverity(severity: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const upper = severity.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }
}

export const testPlanReviewerService = new TestPlanReviewerService();
