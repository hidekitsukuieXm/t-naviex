import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export type TrendDirection = 'IMPROVING' | 'STABLE' | 'DECLINING';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface HistoricalDataPoint {
  date: string;
  passRate: number;
  failRate: number;
  executedCount: number;
  passedCount: number;
  failedCount: number;
  blockedCount?: number;
  skippedCount?: number;
  defectsFound?: number;
  defectsClosed?: number;
}

export interface TrendMetric {
  metricName: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  direction: TrendDirection;
  observation: string;
}

export interface TrendPattern {
  pattern: string;
  description: string;
  significance: RiskLevel;
  frequency: string;
  recommendation: string;
}

export interface Anomaly {
  date: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  possibleCause: string;
  recommendation: string;
}

export interface Prediction {
  metric: string;
  predictedValue: number;
  confidence: Confidence;
  timeframe: string;
  assumptions: string[];
  risks: string[];
}

export interface CyclicalAnalysis {
  cycleName: string;
  averagePassRate: number;
  averageDefects: number;
  trend: TrendDirection;
  observation: string;
}

export interface SeasonalPattern {
  period: string;
  description: string;
  impact: string;
  recommendation: string;
}

export interface TestTrendAnalysisResult {
  overallTrend: TrendDirection;
  healthScore: number; // 0-100
  trendMetrics: TrendMetric[];
  patterns: TrendPattern[];
  anomalies: Anomaly[];
  predictions: Prediction[];
  cyclicalAnalysis: CyclicalAnalysis[];
  seasonalPatterns: SeasonalPattern[];
  recommendations: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    recommendation: string;
    rationale: string;
    expectedImpact: string;
  }>;
  summary: string;
  detailedAnalysis: string;
}

export interface TestTrendAnalysisOptions {
  historicalData: HistoricalDataPoint[];
  projectContext?: string;
  analysisTimeframe?: string; // e.g., "30 days", "3 months"
  compareWithPrevious?: boolean;
  focusAreas?: string[];
}

export interface TestTrendAnalysisResponse {
  result: TestTrendAnalysisResult;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export const TREND_DIRECTION_INFO: Record<TrendDirection, { label: string; color: string }> = {
  IMPROVING: { label: '改善', color: 'green' },
  STABLE: { label: '安定', color: 'gray' },
  DECLINING: { label: '悪化', color: 'red' },
};

export class TestTrendAnalyzerService {
  /**
   * テスト傾向を分析
   */
  async analyzeTrends(
    projectId: bigint | null,
    options: TestTrendAnalysisOptions
  ): Promise<TestTrendAnalysisResponse> {
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
    const template = await promptTemplateRepository.findDefault(projectId, 'TREND_ANALYSIS');
    if (!template) {
      throw new Error('傾向分析テンプレートが見つかりません');
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

  private buildPrompt(templateContent: string, options: TestTrendAnalysisOptions): string {
    const { historicalData, projectContext, analysisTimeframe, focusAreas } = options;

    // Calculate summary stats
    const totalDays = historicalData.length;
    const avgPassRate = historicalData.reduce((sum, d) => sum + d.passRate, 0) / totalDays || 0;
    const avgExecuted =
      historicalData.reduce((sum, d) => sum + d.executedCount, 0) / totalDays || 0;

    // Format historical data
    const historicalDataText = historicalData
      .map(
        (d) =>
          `${d.date}: 実行${d.executedCount}件, 合格${d.passedCount}件(${d.passRate.toFixed(1)}%), 失敗${d.failedCount}件(${d.failRate.toFixed(1)}%)${d.defectsFound !== undefined ? `, 欠陥発見${d.defectsFound}件` : ''}`
      )
      .join('\n');

    // Format summary
    const summaryText = `
分析期間: ${totalDays}日分
平均合格率: ${avgPassRate.toFixed(1)}%
平均実行件数: ${avgExecuted.toFixed(1)}件/日
`.trim();

    let prompt = substituteVariables(templateContent, {
      historicalData: historicalDataText,
      projectContext: projectContext || 'なし',
      summary: summaryText,
    });

    prompt += `\n\n## 追加データ
### 分析期間
${analysisTimeframe || '指定なし'}

### 重点分析領域
${focusAreas?.length ? focusAreas.join(', ') : 'なし'}

## 出力形式（JSON）
以下のJSON形式で出力してください:

{
  "overallTrend": "IMPROVING|STABLE|DECLINING",
  "healthScore": 0-100,
  "trendMetrics": [
    {
      "metricName": "指標名",
      "currentValue": 現在値,
      "previousValue": 前回値,
      "changePercent": 変化率,
      "direction": "IMPROVING|STABLE|DECLINING",
      "observation": "観察"
    }
  ],
  "patterns": [
    {
      "pattern": "パターン名",
      "description": "説明",
      "significance": "LOW|MEDIUM|HIGH|CRITICAL",
      "frequency": "頻度",
      "recommendation": "推奨"
    }
  ],
  "anomalies": [
    {
      "date": "YYYY-MM-DD",
      "metric": "指標名",
      "expectedValue": 期待値,
      "actualValue": 実際値,
      "deviation": 偏差,
      "possibleCause": "原因推測",
      "recommendation": "推奨対応"
    }
  ],
  "predictions": [
    {
      "metric": "指標名",
      "predictedValue": 予測値,
      "confidence": "HIGH|MEDIUM|LOW",
      "timeframe": "期間",
      "assumptions": ["前提条件"],
      "risks": ["リスク"]
    }
  ],
  "cyclicalAnalysis": [
    {
      "cycleName": "サイクル名",
      "averagePassRate": 平均合格率,
      "averageDefects": 平均欠陥数,
      "trend": "IMPROVING|STABLE|DECLINING",
      "observation": "観察"
    }
  ],
  "seasonalPatterns": [
    {
      "period": "期間",
      "description": "説明",
      "impact": "影響",
      "recommendation": "推奨"
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
    return `あなたは経験豊富なテスト分析エキスパート兼データサイエンティストです。
テストの時系列データを分析し、傾向とパターンを特定してください。

以下の観点で分析を行います：

1. トレンド分析
   - 合格率の推移
   - 実行ペースの変化
   - 欠陥発見率の傾向

2. パターン検出
   - 繰り返しパターン
   - 周期的な変動
   - 特定条件でのパターン

3. 異常検知
   - 統計的に異常な値
   - 急激な変化
   - 予期せぬ偏差

4. 予測分析
   - 将来の傾向予測
   - リスクの予測
   - 改善の見通し

5. サイクル分析
   - テストサイクルごとの傾向
   - サイクル間の比較
   - 学習曲線の分析

6. 季節性分析
   - 時期による変動
   - イベントとの相関

分析は客観的なデータに基づき、実行可能な提案を含めてください。
出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private parseResponse(content: string): TestTrendAnalysisResult {
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
        overallTrend: this.normalizeTrendDirection(String(parsed.overallTrend || '')),
        healthScore: Math.min(100, Math.max(0, Number(parsed.healthScore) || 0)),
        trendMetrics: Array.isArray(parsed.trendMetrics)
          ? parsed.trendMetrics.map((m: Record<string, unknown>) => ({
              metricName: String(m.metricName || ''),
              currentValue: Number(m.currentValue) || 0,
              previousValue: Number(m.previousValue) || 0,
              changePercent: Number(m.changePercent) || 0,
              direction: this.normalizeTrendDirection(String(m.direction || '')),
              observation: String(m.observation || ''),
            }))
          : [],
        patterns: Array.isArray(parsed.patterns)
          ? parsed.patterns.map((p: Record<string, unknown>) => ({
              pattern: String(p.pattern || ''),
              description: String(p.description || ''),
              significance: this.normalizeRiskLevel(String(p.significance || '')),
              frequency: String(p.frequency || ''),
              recommendation: String(p.recommendation || ''),
            }))
          : [],
        anomalies: Array.isArray(parsed.anomalies)
          ? parsed.anomalies.map((a: Record<string, unknown>) => ({
              date: String(a.date || ''),
              metric: String(a.metric || ''),
              expectedValue: Number(a.expectedValue) || 0,
              actualValue: Number(a.actualValue) || 0,
              deviation: Number(a.deviation) || 0,
              possibleCause: String(a.possibleCause || ''),
              recommendation: String(a.recommendation || ''),
            }))
          : [],
        predictions: Array.isArray(parsed.predictions)
          ? parsed.predictions.map((p: Record<string, unknown>) => ({
              metric: String(p.metric || ''),
              predictedValue: Number(p.predictedValue) || 0,
              confidence: this.normalizeConfidence(String(p.confidence || '')),
              timeframe: String(p.timeframe || ''),
              assumptions: Array.isArray(p.assumptions) ? p.assumptions.map((a) => String(a)) : [],
              risks: Array.isArray(p.risks) ? p.risks.map((r) => String(r)) : [],
            }))
          : [],
        cyclicalAnalysis: Array.isArray(parsed.cyclicalAnalysis)
          ? parsed.cyclicalAnalysis.map((c: Record<string, unknown>) => ({
              cycleName: String(c.cycleName || ''),
              averagePassRate: Math.min(100, Math.max(0, Number(c.averagePassRate) || 0)),
              averageDefects: Math.max(0, Number(c.averageDefects) || 0),
              trend: this.normalizeTrendDirection(String(c.trend || '')),
              observation: String(c.observation || ''),
            }))
          : [],
        seasonalPatterns: Array.isArray(parsed.seasonalPatterns)
          ? parsed.seasonalPatterns.map((s: Record<string, unknown>) => ({
              period: String(s.period || ''),
              description: String(s.description || ''),
              impact: String(s.impact || ''),
              recommendation: String(s.recommendation || ''),
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

  private normalizeTrendDirection(direction: string): TrendDirection {
    const upper = direction.toUpperCase();
    if (upper === 'IMPROVING' || upper === '改善' || upper === '上昇') return 'IMPROVING';
    if (upper === 'DECLINING' || upper === '悪化' || upper === '下降') return 'DECLINING';
    return 'STABLE';
  }

  private normalizeRiskLevel(level: string): RiskLevel {
    const upper = level.toUpperCase();
    if (upper === 'LOW' || upper === '低') return 'LOW';
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'CRITICAL' || upper === '危険') return 'CRITICAL';
    return 'MEDIUM';
  }

  private normalizeConfidence(confidence: string): Confidence {
    const upper = confidence.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }

  private normalizePriority(priority: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const upper = priority.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }
}

export const testTrendAnalyzerService = new TestTrendAnalyzerService();
