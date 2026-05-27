import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TrendDirection = 'IMPROVING' | 'STABLE' | 'DECLINING';

export interface TestProgressData {
  totalTestCases: number;
  executedTestCases: number;
  passedTestCases: number;
  failedTestCases: number;
  blockedTestCases: number;
  skippedTestCases: number;
  startDate: string;
  plannedEndDate: string;
  currentDate?: string;
  dailyProgress?: Array<{
    date: string;
    executed: number;
    passed: number;
    failed: number;
  }>;
}

export interface DelayRisk {
  riskLevel: RiskLevel;
  description: string;
  daysAtRisk: number;
  probability: number; // 0-100
  mitigation: string;
}

export interface Bottleneck {
  area: string;
  description: string;
  severity: RiskLevel;
  impact: string;
  recommendation: string;
}

export interface ProgressTrend {
  metric: string;
  direction: TrendDirection;
  change: number; // percentage
  observation: string;
}

export interface RecommendedAction {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  rationale: string;
  expectedImpact: string;
}

export interface ProgressAlert {
  type: 'WARNING' | 'CRITICAL' | 'INFO';
  title: string;
  message: string;
  recommendation: string;
}

export interface TestProgressAnalysisResult {
  overallStatus: 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'CRITICAL';
  progressPercentage: number;
  executionRate: number; // tests per day
  passRate: number;
  estimatedCompletionDate: string;
  daysRemaining: number;
  daysOverdue: number;
  delayRisks: DelayRisk[];
  bottlenecks: Bottleneck[];
  trends: ProgressTrend[];
  recommendedActions: RecommendedAction[];
  alerts: ProgressAlert[];
  summary: string;
  detailedAnalysis: string;
}

export interface TestProgressAnalysisOptions {
  progressData: TestProgressData;
  projectContext?: string;
  teamSize?: number;
  previousCycleData?: {
    passRate: number;
    executionRate: number;
    actualDuration: number;
  };
}

export interface TestProgressAnalysisResponse {
  result: TestProgressAnalysisResult;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export const RISK_LEVEL_INFO: Record<RiskLevel, { label: string; color: string }> = {
  LOW: { label: '低', color: 'green' },
  MEDIUM: { label: '中', color: 'yellow' },
  HIGH: { label: '高', color: 'orange' },
  CRITICAL: { label: '危険', color: 'red' },
};

export class TestProgressAnalyzerService {
  /**
   * テスト進捗を分析
   */
  async analyzeProgress(
    projectId: bigint | null,
    options: TestProgressAnalysisOptions
  ): Promise<TestProgressAnalysisResponse> {
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
    const template = await promptTemplateRepository.findDefault(projectId, 'PROGRESS_ANALYSIS');
    if (!template) {
      throw new Error('進捗分析テンプレートが見つかりません');
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

  private buildPrompt(templateContent: string, options: TestProgressAnalysisOptions): string {
    const { progressData, projectContext, teamSize, previousCycleData } = options;

    // Format progress data
    const progressText = `
テストケース総数: ${progressData.totalTestCases}件
実行済み: ${progressData.executedTestCases}件 (${((progressData.executedTestCases / progressData.totalTestCases) * 100).toFixed(1)}%)
  - 合格: ${progressData.passedTestCases}件
  - 失敗: ${progressData.failedTestCases}件
  - ブロック: ${progressData.blockedTestCases}件
  - スキップ: ${progressData.skippedTestCases}件
開始日: ${progressData.startDate}
計画終了日: ${progressData.plannedEndDate}
現在日: ${progressData.currentDate || new Date().toISOString().split('T')[0]}
`.trim();

    // Format daily progress if available
    let dailyProgressText = 'なし';
    if (progressData.dailyProgress?.length) {
      dailyProgressText = progressData.dailyProgress
        .map((d) => `${d.date}: 実行${d.executed}件, 合格${d.passed}件, 失敗${d.failed}件`)
        .join('\n');
    }

    // Format previous cycle data
    let previousCycleText = 'なし';
    if (previousCycleData) {
      previousCycleText = `
合格率: ${previousCycleData.passRate}%
実行レート: ${previousCycleData.executionRate}件/日
実績期間: ${previousCycleData.actualDuration}日
`.trim();
    }

    let prompt = substituteVariables(templateContent, {
      progressData: progressText,
      projectContext: projectContext || 'なし',
      teamSize: teamSize ? `${teamSize}名` : '不明',
    });

    prompt += `\n\n## 追加データ
### 日次進捗
${dailyProgressText}

### 前回サイクル実績
${previousCycleText}

## 出力形式（JSON）
以下のJSON形式で出力してください:

{
  "overallStatus": "ON_TRACK|AT_RISK|DELAYED|CRITICAL",
  "progressPercentage": 進捗率（0-100）,
  "executionRate": 1日あたり実行件数,
  "passRate": 合格率（0-100）,
  "estimatedCompletionDate": "YYYY-MM-DD",
  "daysRemaining": 残り日数,
  "daysOverdue": 遅延日数（0以上）,
  "delayRisks": [
    {
      "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
      "description": "リスク説明",
      "daysAtRisk": 影響日数,
      "probability": 発生確率（0-100）,
      "mitigation": "緩和策"
    }
  ],
  "bottlenecks": [
    {
      "area": "ボトルネック領域",
      "description": "説明",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "impact": "影響",
      "recommendation": "推奨対応"
    }
  ],
  "trends": [
    {
      "metric": "指標名",
      "direction": "IMPROVING|STABLE|DECLINING",
      "change": 変化率（パーセント）,
      "observation": "観察結果"
    }
  ],
  "recommendedActions": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "action": "アクション",
      "rationale": "根拠",
      "expectedImpact": "期待される効果"
    }
  ],
  "alerts": [
    {
      "type": "WARNING|CRITICAL|INFO",
      "title": "アラートタイトル",
      "message": "メッセージ",
      "recommendation": "推奨対応"
    }
  ],
  "summary": "分析サマリー",
  "detailedAnalysis": "詳細分析"
}`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `あなたは経験豊富なテストマネージャー兼品質保証エキスパートです。
テスト進捗データを分析し、リスクと改善点を特定してください。

以下の観点で分析を行います：

1. 進捗状況評価
   - 計画に対する進捗度
   - 実行ペースの妥当性
   - 完了予測日の算出

2. リスク分析
   - 遅延リスクの検知
   - リスク発生確率の評価
   - 影響度の定量化

3. ボトルネック特定
   - 進捗を阻害する要因
   - リソース面の課題
   - プロセス面の課題

4. トレンド分析
   - 合格率の推移
   - 実行ペースの推移
   - 品質指標の変化

5. 推奨アクション
   - 優先度付きの改善提案
   - 具体的な対策
   - 期待される効果

分析は客観的なデータに基づき、実行可能な提案を含めてください。
出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private parseResponse(content: string): TestProgressAnalysisResult {
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
        overallStatus: this.normalizeStatus(String(parsed.overallStatus || '')),
        progressPercentage: Math.min(100, Math.max(0, Number(parsed.progressPercentage) || 0)),
        executionRate: Math.max(0, Number(parsed.executionRate) || 0),
        passRate: Math.min(100, Math.max(0, Number(parsed.passRate) || 0)),
        estimatedCompletionDate: String(parsed.estimatedCompletionDate || ''),
        daysRemaining: Math.max(0, Number(parsed.daysRemaining) || 0),
        daysOverdue: Math.max(0, Number(parsed.daysOverdue) || 0),
        delayRisks: Array.isArray(parsed.delayRisks)
          ? parsed.delayRisks.map((r: Record<string, unknown>) => ({
              riskLevel: this.normalizeRiskLevel(String(r.riskLevel || '')),
              description: String(r.description || ''),
              daysAtRisk: Math.max(0, Number(r.daysAtRisk) || 0),
              probability: Math.min(100, Math.max(0, Number(r.probability) || 0)),
              mitigation: String(r.mitigation || ''),
            }))
          : [],
        bottlenecks: Array.isArray(parsed.bottlenecks)
          ? parsed.bottlenecks.map((b: Record<string, unknown>) => ({
              area: String(b.area || ''),
              description: String(b.description || ''),
              severity: this.normalizeRiskLevel(String(b.severity || '')),
              impact: String(b.impact || ''),
              recommendation: String(b.recommendation || ''),
            }))
          : [],
        trends: Array.isArray(parsed.trends)
          ? parsed.trends.map((t: Record<string, unknown>) => ({
              metric: String(t.metric || ''),
              direction: this.normalizeTrendDirection(String(t.direction || '')),
              change: Number(t.change) || 0,
              observation: String(t.observation || ''),
            }))
          : [],
        recommendedActions: Array.isArray(parsed.recommendedActions)
          ? parsed.recommendedActions.map((a: Record<string, unknown>) => ({
              priority: this.normalizePriority(String(a.priority || '')),
              action: String(a.action || ''),
              rationale: String(a.rationale || ''),
              expectedImpact: String(a.expectedImpact || ''),
            }))
          : [],
        alerts: Array.isArray(parsed.alerts)
          ? parsed.alerts.map((a: Record<string, unknown>) => ({
              type: this.normalizeAlertType(String(a.type || '')),
              title: String(a.title || ''),
              message: String(a.message || ''),
              recommendation: String(a.recommendation || ''),
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

  private normalizeStatus(status: string): 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'CRITICAL' {
    const upper = status.toUpperCase();
    if (upper === 'ON_TRACK' || upper === '順調' || upper === '正常') return 'ON_TRACK';
    if (upper === 'AT_RISK' || upper === 'リスクあり' || upper === '要注意') return 'AT_RISK';
    if (upper === 'DELAYED' || upper === '遅延' || upper === '遅れ') return 'DELAYED';
    if (upper === 'CRITICAL' || upper === '危険' || upper === '重大') return 'CRITICAL';
    return 'AT_RISK';
  }

  private normalizeRiskLevel(level: string): RiskLevel {
    const upper = level.toUpperCase();
    if (upper === 'LOW' || upper === '低') return 'LOW';
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'CRITICAL' || upper === '危険' || upper === '重大') return 'CRITICAL';
    return 'MEDIUM';
  }

  private normalizeTrendDirection(direction: string): TrendDirection {
    const upper = direction.toUpperCase();
    if (upper === 'IMPROVING' || upper === '改善' || upper === '上昇') return 'IMPROVING';
    if (upper === 'DECLINING' || upper === '悪化' || upper === '下降') return 'DECLINING';
    return 'STABLE';
  }

  private normalizePriority(priority: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const upper = priority.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }

  private normalizeAlertType(type: string): 'WARNING' | 'CRITICAL' | 'INFO' {
    const upper = type.toUpperCase();
    if (upper === 'WARNING' || upper === '警告') return 'WARNING';
    if (upper === 'CRITICAL' || upper === '危険' || upper === '重大') return 'CRITICAL';
    return 'INFO';
  }
}

export const testProgressAnalyzerService = new TestProgressAnalyzerService();
