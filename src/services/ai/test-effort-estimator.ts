import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TestCaseForEstimation {
  id: string;
  title: string;
  priority?: string;
  complexity?: ComplexityLevel;
  stepCount?: number;
  automationStatus?: 'MANUAL' | 'AUTOMATED' | 'PARTIAL';
}

export interface ResourceInfo {
  totalTesters: number;
  experienceLevel?: 'JUNIOR' | 'MID' | 'SENIOR' | 'MIXED';
  availability?: number; // percentage 0-100
}

export interface HistoricalData {
  projectName: string;
  testCaseCount: number;
  actualEffort: number; // in hours
  teamSize: number;
}

export interface EffortBreakdown {
  category: string;
  hours: number;
  percentage: number;
  description: string;
}

export interface RiskFactor {
  factor: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation: string;
  adjustmentHours: number;
}

export interface EstimationAssumption {
  assumption: string;
  rationale: string;
}

export interface TestEffortEstimationResult {
  totalEstimatedHours: number;
  estimatedDays: number;
  breakdown: EffortBreakdown[];
  riskFactors: RiskFactor[];
  assumptions: EstimationAssumption[];
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number; // 0-100
  rangeMin: number;
  rangeMax: number;
  recommendation: string;
  comparisonWithHistorical?: {
    averageEffortPerTestCase: number;
    historicalAveragePerTestCase: number;
    variance: number;
    explanation: string;
  };
}

export interface TestEffortEstimationOptions {
  testCases: TestCaseForEstimation[];
  resources?: ResourceInfo;
  projectContext?: string;
  historicalData?: HistoricalData[];
  deadline?: string;
  hoursPerDay?: number;
}

export interface TestEffortEstimationResponse {
  result: TestEffortEstimationResult;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export const COMPLEXITY_INFO: Record<ComplexityLevel, { label: string; weight: number }> = {
  LOW: { label: '低', weight: 1.0 },
  MEDIUM: { label: '中', weight: 1.5 },
  HIGH: { label: '高', weight: 2.5 },
  VERY_HIGH: { label: '非常に高', weight: 4.0 },
};

export class TestEffortEstimatorService {
  /**
   * テスト工数を予測
   */
  async estimateEffort(
    projectId: bigint | null,
    options: TestEffortEstimationOptions
  ): Promise<TestEffortEstimationResponse> {
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
    const template = await promptTemplateRepository.findDefault(projectId, 'EFFORT_ESTIMATION');
    if (!template) {
      throw new Error('工数予測テンプレートが見つかりません');
    }

    // Build prompt
    const prompt = this.buildPrompt(template.content, options);

    // Create Claude client
    const client = new ClaudeClient({
      apiKey,
      timeout: 180000, // 3 minutes
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
    const result = this.parseResponse(response.content, options.hoursPerDay || 8);

    return {
      result,
      usage: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      },
    };
  }

  private buildPrompt(templateContent: string, options: TestEffortEstimationOptions): string {
    const { testCases, resources, projectContext, historicalData, deadline, hoursPerDay } = options;

    // Format test cases
    const testCasesText = testCases
      .map((tc) => {
        let line = `[${tc.id}] ${tc.title}`;
        if (tc.priority) line += ` (優先度: ${tc.priority})`;
        if (tc.complexity) line += ` (複雑度: ${COMPLEXITY_INFO[tc.complexity].label})`;
        if (tc.stepCount) line += ` (ステップ数: ${tc.stepCount})`;
        if (tc.automationStatus) {
          const statusLabel =
            tc.automationStatus === 'AUTOMATED'
              ? '自動'
              : tc.automationStatus === 'PARTIAL'
                ? '一部自動'
                : '手動';
          line += ` (${statusLabel})`;
        }
        return line;
      })
      .join('\n');

    // Format resources
    let resourcesText = 'なし';
    if (resources) {
      const parts: string[] = [];
      parts.push(`テスター数: ${resources.totalTesters}名`);
      if (resources.experienceLevel) {
        const expLabel = {
          JUNIOR: 'ジュニア',
          MID: 'ミドル',
          SENIOR: 'シニア',
          MIXED: '混合',
        }[resources.experienceLevel];
        parts.push(`経験レベル: ${expLabel}`);
      }
      if (resources.availability !== undefined) {
        parts.push(`稼働率: ${resources.availability}%`);
      }
      resourcesText = parts.join(', ');
    }

    // Format historical data
    let historicalText = 'なし';
    if (historicalData?.length) {
      historicalText = historicalData
        .map(
          (h) => `${h.projectName}: ${h.testCaseCount}件 / ${h.actualEffort}時間 (${h.teamSize}名)`
        )
        .join('\n');
    }

    // Format deadline
    const deadlineText = deadline || 'なし';
    const hoursPerDayText = hoursPerDay ? `${hoursPerDay}時間/日` : '8時間/日';

    let prompt = substituteVariables(templateContent, {
      testCases: testCasesText,
      testCaseCount: String(testCases.length),
      resources: resourcesText,
      projectContext: projectContext || 'なし',
      historicalData: historicalText,
    });

    prompt += `\n\n## 追加情報
- テストケース総数: ${testCases.length}件
- 締め切り: ${deadlineText}
- 1日あたりの作業時間: ${hoursPerDayText}

## 出力形式（JSON）
以下のJSON形式で出力してください。マークダウンのコードブロックは使用せず、純粋なJSONのみを出力してください:

{
  "totalEstimatedHours": 総工数（時間）,
  "estimatedDays": 日数,
  "breakdown": [
    {
      "category": "カテゴリ名（設計/実行/バグ修正確認/報告等）",
      "hours": 時間,
      "percentage": パーセンテージ,
      "description": "説明"
    }
  ],
  "riskFactors": [
    {
      "factor": "リスク要因",
      "impact": "LOW|MEDIUM|HIGH",
      "mitigation": "対策",
      "adjustmentHours": 調整時間
    }
  ],
  "assumptions": [
    {
      "assumption": "前提条件",
      "rationale": "根拠"
    }
  ],
  "confidenceLevel": "LOW|MEDIUM|HIGH",
  "confidenceScore": 0-100,
  "rangeMin": 最小工数（時間）,
  "rangeMax": 最大工数（時間）,
  "recommendation": "推奨事項",
  "comparisonWithHistorical": {
    "averageEffortPerTestCase": 今回予測の1件あたり工数,
    "historicalAveragePerTestCase": 過去実績の1件あたり平均,
    "variance": 差異パーセンテージ,
    "explanation": "説明"
  }
}`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `あなたは経験豊富なテストマネージャー兼工数見積もりの専門家です。
テストケースの情報とプロジェクト状況からテスト工数を予測してください。

以下の観点で見積もりを行います：

1. 工数内訳
   - テスト設計・準備
   - テスト実行
   - バグ報告・再テスト
   - 結果報告・ドキュメント作成

2. 複雑度の考慮
   - テストケースの複雑度
   - ステップ数
   - 自動化状況
   - 依存関係

3. リソースの考慮
   - チーム構成
   - 経験レベル
   - 稼働率

4. リスク要因
   - 環境の安定性
   - 要件変更の可能性
   - 技術的な不確実性

5. 過去実績との比較
   - 類似プロジェクトの実績
   - 差異の分析

見積もりは根拠を明確にし、幅を持たせた予測（最小・最大）を含めてください。
信頼度（confidence）は、情報の充実度や不確実性に基づいて設定してください。
出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private parseResponse(content: string, hoursPerDay: number): TestEffortEstimationResult {
    try {
      // Remove markdown code blocks if present
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonContent);

      const totalHours = Math.max(0, Number(parsed.totalEstimatedHours) || 0);
      const estimatedDays = Number(parsed.estimatedDays) || Math.ceil(totalHours / hoursPerDay);

      return {
        totalEstimatedHours: totalHours,
        estimatedDays: estimatedDays,
        breakdown: Array.isArray(parsed.breakdown)
          ? parsed.breakdown.map((b: Record<string, unknown>) => ({
              category: String(b.category || ''),
              hours: Math.max(0, Number(b.hours) || 0),
              percentage: Math.min(100, Math.max(0, Number(b.percentage) || 0)),
              description: String(b.description || ''),
            }))
          : [],
        riskFactors: Array.isArray(parsed.riskFactors)
          ? parsed.riskFactors.map((r: Record<string, unknown>) => ({
              factor: String(r.factor || ''),
              impact: this.normalizeImpact(String(r.impact || '')),
              mitigation: String(r.mitigation || ''),
              adjustmentHours: Number(r.adjustmentHours) || 0,
            }))
          : [],
        assumptions: Array.isArray(parsed.assumptions)
          ? parsed.assumptions.map((a: Record<string, unknown>) => ({
              assumption: String(a.assumption || ''),
              rationale: String(a.rationale || ''),
            }))
          : [],
        confidenceLevel: this.normalizeConfidence(String(parsed.confidenceLevel || '')),
        confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 50)),
        rangeMin: Math.max(0, Number(parsed.rangeMin) || totalHours * 0.8),
        rangeMax: Math.max(0, Number(parsed.rangeMax) || totalHours * 1.2),
        recommendation: String(parsed.recommendation || ''),
        comparisonWithHistorical: parsed.comparisonWithHistorical
          ? {
              averageEffortPerTestCase:
                Number(parsed.comparisonWithHistorical.averageEffortPerTestCase) || 0,
              historicalAveragePerTestCase:
                Number(parsed.comparisonWithHistorical.historicalAveragePerTestCase) || 0,
              variance: Number(parsed.comparisonWithHistorical.variance) || 0,
              explanation: String(parsed.comparisonWithHistorical.explanation || ''),
            }
          : undefined,
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AIの応答を解析できませんでした。再度お試しください。');
    }
  }

  private normalizeImpact(impact: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const upper = impact.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }

  private normalizeConfidence(confidence: string): ConfidenceLevel {
    const upper = confidence.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }
}

export const testEffortEstimatorService = new TestEffortEstimatorService();
