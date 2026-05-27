import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export type ResultStatus = 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
export type QualityLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TestResultData {
  id: string;
  title: string;
  status: ResultStatus;
  module?: string;
  feature?: string;
  errorMessage?: string;
  executionTime?: number; // in seconds
  retryCount?: number;
}

export interface FailurePattern {
  pattern: string;
  description: string;
  occurrences: number;
  affectedTests: string[];
  rootCause: string;
  recommendation: string;
  severity: RiskLevel;
}

export interface QualityMetric {
  metric: string;
  value: number;
  threshold: number;
  status: 'PASS' | 'WARNING' | 'FAIL';
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  observation: string;
}

export interface FocusArea {
  area: string;
  reason: string;
  riskLevel: RiskLevel;
  suggestedActions: string[];
  affectedModules: string[];
}

export interface RegressionRisk {
  module: string;
  riskLevel: RiskLevel;
  indicators: string[];
  recommendation: string;
  recentFailures: number;
}

export interface TestResultAnalysisResult {
  overallQuality: QualityLevel;
  qualityScore: number; // 0-100
  passRate: number;
  failRate: number;
  blockRate: number;
  skipRate: number;
  failurePatterns: FailurePattern[];
  qualityMetrics: QualityMetric[];
  focusAreas: FocusArea[];
  regressionRisks: RegressionRisk[];
  moduleAnalysis: Array<{
    module: string;
    passRate: number;
    failCount: number;
    status: QualityLevel;
    observation: string;
  }>;
  recommendations: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    recommendation: string;
    rationale: string;
    expectedImpact: string;
  }>;
  summary: string;
  detailedAnalysis: string;
}

export interface TestResultAnalysisOptions {
  testResults: TestResultData[];
  projectContext?: string;
  previousCycleResults?: {
    passRate: number;
    failRate: number;
    topFailureModules: string[];
  };
  qualityThresholds?: {
    passRate?: number;
    failRate?: number;
    blockRate?: number;
  };
}

export interface TestResultAnalysisResponse {
  result: TestResultAnalysisResult;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export const QUALITY_LEVEL_INFO: Record<QualityLevel, { label: string; color: string }> = {
  EXCELLENT: { label: '優秀', color: 'green' },
  GOOD: { label: '良好', color: 'blue' },
  FAIR: { label: '普通', color: 'yellow' },
  POOR: { label: '要改善', color: 'orange' },
  CRITICAL: { label: '危険', color: 'red' },
};

export class TestResultAnalyzerService {
  /**
   * テスト結果を分析
   */
  async analyzeResults(
    projectId: bigint | null,
    options: TestResultAnalysisOptions
  ): Promise<TestResultAnalysisResponse> {
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
    const template = await promptTemplateRepository.findDefault(projectId, 'RESULT_ANALYSIS');
    if (!template) {
      throw new Error('テスト結果分析テンプレートが見つかりません');
    }

    // Build prompt
    const prompt = this.buildPrompt(template.content, options);

    // Create Claude client
    const client = new ClaudeClient({
      apiKey,
      timeout: 180000,
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

  private buildPrompt(templateContent: string, options: TestResultAnalysisOptions): string {
    const { testResults, projectContext, previousCycleResults, qualityThresholds } = options;

    // Calculate basic stats
    const total = testResults.length;
    const passed = testResults.filter((r) => r.status === 'PASSED').length;
    const failed = testResults.filter((r) => r.status === 'FAILED').length;
    const blocked = testResults.filter((r) => r.status === 'BLOCKED').length;
    const skipped = testResults.filter((r) => r.status === 'SKIPPED').length;

    // Group by module
    const byModule: Record<string, TestResultData[]> = {};
    testResults.forEach((r) => {
      const moduleName = r.module || 'Unknown';
      if (!byModule[moduleName]) byModule[moduleName] = [];
      byModule[moduleName].push(r);
    });

    // Format test results summary
    const resultsSummary = `
総テスト数: ${total}件
合格: ${passed}件 (${((passed / total) * 100).toFixed(1)}%)
失敗: ${failed}件 (${((failed / total) * 100).toFixed(1)}%)
ブロック: ${blocked}件 (${((blocked / total) * 100).toFixed(1)}%)
スキップ: ${skipped}件 (${((skipped / total) * 100).toFixed(1)}%)
`.trim();

    // Format failed tests
    const failedTests = testResults.filter((r) => r.status === 'FAILED');
    const failedTestsText =
      failedTests.length > 0
        ? failedTests
            .slice(0, 20)
            .map(
              (t) =>
                `[${t.id}] ${t.title}${t.module ? ` (${t.module})` : ''}${t.errorMessage ? `\n  エラー: ${t.errorMessage}` : ''}`
            )
            .join('\n')
        : 'なし';

    // Format module breakdown
    const moduleBreakdown = Object.entries(byModule)
      .map(([module, results]) => {
        const modulePassed = results.filter((r) => r.status === 'PASSED').length;
        const moduleFailed = results.filter((r) => r.status === 'FAILED').length;
        return `${module}: ${modulePassed}/${results.length}件合格 (失敗${moduleFailed}件)`;
      })
      .join('\n');

    // Format previous cycle
    let previousCycleText = 'なし';
    if (previousCycleResults) {
      previousCycleText = `
合格率: ${previousCycleResults.passRate}%
失敗率: ${previousCycleResults.failRate}%
失敗多発モジュール: ${previousCycleResults.topFailureModules.join(', ') || 'なし'}
`.trim();
    }

    // Format thresholds
    let thresholdsText = 'デフォルト（合格率95%以上）';
    if (qualityThresholds) {
      const parts = [];
      if (qualityThresholds.passRate) parts.push(`合格率: ${qualityThresholds.passRate}%以上`);
      if (qualityThresholds.failRate) parts.push(`失敗率: ${qualityThresholds.failRate}%以下`);
      if (qualityThresholds.blockRate)
        parts.push(`ブロック率: ${qualityThresholds.blockRate}%以下`);
      if (parts.length) thresholdsText = parts.join(', ');
    }

    let prompt = substituteVariables(templateContent, {
      testResults: resultsSummary,
      projectContext: projectContext || 'なし',
      failedTests: failedTestsText,
    });

    prompt += `\n\n## 追加データ
### モジュール別内訳
${moduleBreakdown}

### 前回サイクル実績
${previousCycleText}

### 品質基準
${thresholdsText}

## 出力形式（JSON）
以下のJSON形式で出力してください:

{
  "overallQuality": "EXCELLENT|GOOD|FAIR|POOR|CRITICAL",
  "qualityScore": 0-100,
  "passRate": パーセント,
  "failRate": パーセント,
  "blockRate": パーセント,
  "skipRate": パーセント,
  "failurePatterns": [
    {
      "pattern": "パターン名",
      "description": "説明",
      "occurrences": 発生件数,
      "affectedTests": ["TC-001"],
      "rootCause": "根本原因",
      "recommendation": "推奨対応",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL"
    }
  ],
  "qualityMetrics": [
    {
      "metric": "指標名",
      "value": 値,
      "threshold": 閾値,
      "status": "PASS|WARNING|FAIL",
      "trend": "IMPROVING|STABLE|DECLINING",
      "observation": "観察"
    }
  ],
  "focusAreas": [
    {
      "area": "重点領域",
      "reason": "理由",
      "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
      "suggestedActions": ["アクション"],
      "affectedModules": ["モジュール"]
    }
  ],
  "regressionRisks": [
    {
      "module": "モジュール名",
      "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
      "indicators": ["指標"],
      "recommendation": "推奨",
      "recentFailures": 件数
    }
  ],
  "moduleAnalysis": [
    {
      "module": "モジュール名",
      "passRate": パーセント,
      "failCount": 件数,
      "status": "EXCELLENT|GOOD|FAIR|POOR|CRITICAL",
      "observation": "観察"
    }
  ],
  "recommendations": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "recommendation": "推奨事項",
      "rationale": "根拠",
      "expectedImpact": "期待効果"
    }
  ],
  "summary": "分析サマリー",
  "detailedAnalysis": "詳細分析"
}`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `あなたは経験豊富なQAエンジニア兼テスト分析の専門家です。
テスト結果データを分析し、品質傾向とリスクを特定してください。

以下の観点で分析を行います：

1. 品質評価
   - 全体的な品質レベル
   - 合格率・失敗率の評価
   - 品質基準との比較

2. 失敗パターン分析
   - 共通する失敗パターンの特定
   - 根本原因の推測
   - 対応策の提案

3. モジュール別分析
   - モジュールごとの品質状況
   - 問題が集中している領域
   - リスクの高いモジュール

4. 回帰リスク評価
   - 過去と比較した傾向
   - 回帰の兆候
   - 重点的に監視すべき領域

5. 改善提案
   - 優先度付きの推奨事項
   - 具体的なアクション
   - 期待される効果

分析は客観的なデータに基づき、実行可能な提案を含めてください。
出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private parseResponse(content: string): TestResultAnalysisResult {
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
        overallQuality: this.normalizeQualityLevel(String(parsed.overallQuality || '')),
        qualityScore: Math.min(100, Math.max(0, Number(parsed.qualityScore) || 0)),
        passRate: Math.min(100, Math.max(0, Number(parsed.passRate) || 0)),
        failRate: Math.min(100, Math.max(0, Number(parsed.failRate) || 0)),
        blockRate: Math.min(100, Math.max(0, Number(parsed.blockRate) || 0)),
        skipRate: Math.min(100, Math.max(0, Number(parsed.skipRate) || 0)),
        failurePatterns: Array.isArray(parsed.failurePatterns)
          ? parsed.failurePatterns.map((p: Record<string, unknown>) => ({
              pattern: String(p.pattern || ''),
              description: String(p.description || ''),
              occurrences: Math.max(0, Number(p.occurrences) || 0),
              affectedTests: Array.isArray(p.affectedTests)
                ? p.affectedTests.map((t) => String(t))
                : [],
              rootCause: String(p.rootCause || ''),
              recommendation: String(p.recommendation || ''),
              severity: this.normalizeRiskLevel(String(p.severity || '')),
            }))
          : [],
        qualityMetrics: Array.isArray(parsed.qualityMetrics)
          ? parsed.qualityMetrics.map((m: Record<string, unknown>) => ({
              metric: String(m.metric || ''),
              value: Number(m.value) || 0,
              threshold: Number(m.threshold) || 0,
              status: this.normalizeMetricStatus(String(m.status || '')),
              trend: this.normalizeTrend(String(m.trend || '')),
              observation: String(m.observation || ''),
            }))
          : [],
        focusAreas: Array.isArray(parsed.focusAreas)
          ? parsed.focusAreas.map((a: Record<string, unknown>) => ({
              area: String(a.area || ''),
              reason: String(a.reason || ''),
              riskLevel: this.normalizeRiskLevel(String(a.riskLevel || '')),
              suggestedActions: Array.isArray(a.suggestedActions)
                ? a.suggestedActions.map((s) => String(s))
                : [],
              affectedModules: Array.isArray(a.affectedModules)
                ? a.affectedModules.map((m) => String(m))
                : [],
            }))
          : [],
        regressionRisks: Array.isArray(parsed.regressionRisks)
          ? parsed.regressionRisks.map((r: Record<string, unknown>) => ({
              module: String(r.module || ''),
              riskLevel: this.normalizeRiskLevel(String(r.riskLevel || '')),
              indicators: Array.isArray(r.indicators) ? r.indicators.map((i) => String(i)) : [],
              recommendation: String(r.recommendation || ''),
              recentFailures: Math.max(0, Number(r.recentFailures) || 0),
            }))
          : [],
        moduleAnalysis: Array.isArray(parsed.moduleAnalysis)
          ? parsed.moduleAnalysis.map((m: Record<string, unknown>) => ({
              module: String(m.module || ''),
              passRate: Math.min(100, Math.max(0, Number(m.passRate) || 0)),
              failCount: Math.max(0, Number(m.failCount) || 0),
              status: this.normalizeQualityLevel(String(m.status || '')),
              observation: String(m.observation || ''),
            }))
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map((r: Record<string, unknown>) => ({
              priority: this.normalizePriority(String(r.priority || '')),
              recommendation: String(r.recommendation || ''),
              rationale: String(r.rationale || ''),
              expectedImpact: String(r.expectedImpact || ''),
            }))
          : [],
        summary: String(parsed.summary || ''),
        detailedAnalysis: String(parsed.detailedAnalysis || ''),
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AIの応答を解析できませんでした。再度お試しください。');
    }
  }

  private normalizeQualityLevel(level: string): QualityLevel {
    const upper = level.toUpperCase();
    if (upper === 'EXCELLENT' || upper === '優秀') return 'EXCELLENT';
    if (upper === 'GOOD' || upper === '良好') return 'GOOD';
    if (upper === 'FAIR' || upper === '普通') return 'FAIR';
    if (upper === 'POOR' || upper === '要改善') return 'POOR';
    if (upper === 'CRITICAL' || upper === '危険') return 'CRITICAL';
    return 'FAIR';
  }

  private normalizeRiskLevel(level: string): RiskLevel {
    const upper = level.toUpperCase();
    if (upper === 'LOW' || upper === '低') return 'LOW';
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'CRITICAL' || upper === '危険') return 'CRITICAL';
    return 'MEDIUM';
  }

  private normalizeMetricStatus(status: string): 'PASS' | 'WARNING' | 'FAIL' {
    const upper = status.toUpperCase();
    if (upper === 'PASS' || upper === '合格') return 'PASS';
    if (upper === 'FAIL' || upper === '不合格') return 'FAIL';
    return 'WARNING';
  }

  private normalizeTrend(trend: string): 'IMPROVING' | 'STABLE' | 'DECLINING' {
    const upper = trend.toUpperCase();
    if (upper === 'IMPROVING' || upper === '改善') return 'IMPROVING';
    if (upper === 'DECLINING' || upper === '悪化') return 'DECLINING';
    return 'STABLE';
  }

  private normalizePriority(priority: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const upper = priority.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }
}

export const testResultAnalyzerService = new TestResultAnalyzerService();
