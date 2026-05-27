import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export type BugSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'TRIVIAL';
export type BugPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type RootCauseCategory =
  | 'CODING_ERROR'
  | 'DESIGN_FLAW'
  | 'REQUIREMENTS_GAP'
  | 'INTEGRATION_ISSUE'
  | 'ENVIRONMENT'
  | 'DATA_ISSUE'
  | 'UNKNOWN';
export type ImpactLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface BugData {
  id: string;
  title: string;
  description: string;
  severity?: BugSeverity;
  priority?: BugPriority;
  status?: string;
  module?: string;
  reproductionSteps?: string;
  environment?: string;
  errorLog?: string;
  relatedBugs?: string[];
}

export interface RootCauseAnalysis {
  category: RootCauseCategory;
  description: string;
  confidence: number; // 0-100
  evidence: string[];
  suggestedFix: string;
}

export interface ImpactAssessment {
  area: string;
  level: ImpactLevel;
  description: string;
  affectedUsers: string;
  affectedFeatures: string[];
}

export interface SimilarBugPattern {
  pattern: string;
  description: string;
  occurrences: number;
  relatedBugIds: string[];
  preventionStrategy: string;
}

export interface FixRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
  rationale: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedOutcome: string;
}

export interface PreventionMeasure {
  measure: string;
  description: string;
  effectiveness: 'HIGH' | 'MEDIUM' | 'LOW';
  implementationCost: 'LOW' | 'MEDIUM' | 'HIGH';
  applicablePhase: string;
}

export interface BugAnalysisResult {
  overallSeverity: BugSeverity;
  estimatedPriority: BugPriority;
  rootCauseAnalysis: RootCauseAnalysis;
  impactAssessment: ImpactAssessment[];
  similarPatterns: SimilarBugPattern[];
  fixRecommendations: FixRecommendation[];
  preventionMeasures: PreventionMeasure[];
  regressionRisk: {
    level: ImpactLevel;
    areas: string[];
    testingRecommendations: string[];
  };
  summary: string;
  detailedAnalysis: string;
}

export interface BugAnalysisOptions {
  bugData: BugData;
  projectContext?: string;
  recentBugs?: Array<{
    id: string;
    title: string;
    module?: string;
    rootCause?: string;
  }>;
  codeContext?: string;
}

export interface BugAnalysisResponse {
  result: BugAnalysisResult;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export const SEVERITY_INFO: Record<BugSeverity, { label: string; color: string }> = {
  CRITICAL: { label: '致命的', color: 'red' },
  MAJOR: { label: '重大', color: 'orange' },
  MINOR: { label: '軽微', color: 'yellow' },
  TRIVIAL: { label: '軽度', color: 'gray' },
};

export const ROOT_CAUSE_CATEGORY_INFO: Record<
  RootCauseCategory,
  { label: string; description: string }
> = {
  CODING_ERROR: { label: 'コーディングエラー', description: '実装上のミスやバグ' },
  DESIGN_FLAW: { label: '設計不良', description: 'アーキテクチャや設計上の問題' },
  REQUIREMENTS_GAP: { label: '要件漏れ', description: '要件定義の不備や曖昧さ' },
  INTEGRATION_ISSUE: { label: '統合問題', description: 'コンポーネント間の連携不良' },
  ENVIRONMENT: { label: '環境問題', description: '実行環境や設定に起因する問題' },
  DATA_ISSUE: { label: 'データ問題', description: 'データの不整合や異常データ' },
  UNKNOWN: { label: '不明', description: '原因が特定できない' },
};

export class BugAnalyzerService {
  /**
   * バグを分析
   */
  async analyzeBug(
    projectId: bigint | null,
    options: BugAnalysisOptions
  ): Promise<BugAnalysisResponse> {
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
    const template = await promptTemplateRepository.findDefault(projectId, 'BUG_ANALYSIS');
    if (!template) {
      throw new Error('バグ分析テンプレートが見つかりません');
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

  private buildPrompt(templateContent: string, options: BugAnalysisOptions): string {
    const { bugData, projectContext, recentBugs, codeContext } = options;

    // Format bug data
    const bugText = `
ID: ${bugData.id}
タイトル: ${bugData.title}
説明: ${bugData.description}
${bugData.severity ? `重大度: ${bugData.severity}` : ''}
${bugData.priority ? `優先度: ${bugData.priority}` : ''}
${bugData.status ? `ステータス: ${bugData.status}` : ''}
${bugData.module ? `モジュール: ${bugData.module}` : ''}
${bugData.reproductionSteps ? `再現手順: ${bugData.reproductionSteps}` : ''}
${bugData.environment ? `環境: ${bugData.environment}` : ''}
${bugData.errorLog ? `エラーログ: ${bugData.errorLog}` : ''}
${bugData.relatedBugs?.length ? `関連バグ: ${bugData.relatedBugs.join(', ')}` : ''}
`.trim();

    // Format recent bugs
    let recentBugsText = 'なし';
    if (recentBugs?.length) {
      recentBugsText = recentBugs
        .map(
          (b) =>
            `${b.id}: ${b.title}${b.module ? ` (${b.module})` : ''}${b.rootCause ? ` - 原因: ${b.rootCause}` : ''}`
        )
        .join('\n');
    }

    let prompt = substituteVariables(templateContent, {
      bugData: bugText,
      projectContext: projectContext || 'なし',
    });

    prompt += `\n\n## 追加データ
### 最近のバグ履歴
${recentBugsText}

### コードコンテキスト
${codeContext || 'なし'}

## 出力形式（JSON）
以下のJSON形式で出力してください:

{
  "overallSeverity": "CRITICAL|MAJOR|MINOR|TRIVIAL",
  "estimatedPriority": "URGENT|HIGH|MEDIUM|LOW",
  "rootCauseAnalysis": {
    "category": "CODING_ERROR|DESIGN_FLAW|REQUIREMENTS_GAP|INTEGRATION_ISSUE|ENVIRONMENT|DATA_ISSUE|UNKNOWN",
    "description": "根本原因の説明",
    "confidence": 0-100,
    "evidence": ["根拠1", "根拠2"],
    "suggestedFix": "推奨修正方法"
  },
  "impactAssessment": [
    {
      "area": "影響領域",
      "level": "CRITICAL|HIGH|MEDIUM|LOW",
      "description": "影響の説明",
      "affectedUsers": "影響を受けるユーザー",
      "affectedFeatures": ["機能1", "機能2"]
    }
  ],
  "similarPatterns": [
    {
      "pattern": "パターン名",
      "description": "説明",
      "occurrences": 件数,
      "relatedBugIds": ["BUG-001"],
      "preventionStrategy": "予防策"
    }
  ],
  "fixRecommendations": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "recommendation": "推奨事項",
      "rationale": "根拠",
      "effort": "LOW|MEDIUM|HIGH",
      "expectedOutcome": "期待される結果"
    }
  ],
  "preventionMeasures": [
    {
      "measure": "予防策",
      "description": "説明",
      "effectiveness": "HIGH|MEDIUM|LOW",
      "implementationCost": "LOW|MEDIUM|HIGH",
      "applicablePhase": "適用フェーズ"
    }
  ],
  "regressionRisk": {
    "level": "CRITICAL|HIGH|MEDIUM|LOW",
    "areas": ["影響領域"],
    "testingRecommendations": ["テスト推奨事項"]
  },
  "summary": "分析サマリー",
  "detailedAnalysis": "詳細分析"
}`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `あなたは経験豊富なソフトウェア品質エンジニア兼バグ分析の専門家です。
バグ報告を分析し、根本原因の特定と解決策の提案を行ってください。

以下の観点で分析を行います：

1. 根本原因分析
   - バグの原因カテゴリ特定
   - 証拠に基づく原因推定
   - 信頼度の評価

2. 影響度評価
   - 影響を受ける領域の特定
   - ユーザーへの影響度
   - 機能への影響範囲

3. 類似パターン分析
   - 過去の類似バグとの比較
   - 共通パターンの検出
   - 予防策の提案

4. 修正推奨事項
   - 優先度付きの修正提案
   - 必要工数の見積もり
   - 期待される効果

5. 予防措置
   - 再発防止策
   - 導入コストと効果
   - 適用すべき開発フェーズ

6. 回帰リスク評価
   - 修正による影響範囲
   - 必要なテスト項目

分析は客観的なデータに基づき、実行可能な提案を含めてください。
出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private parseResponse(content: string): BugAnalysisResult {
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
        overallSeverity: this.normalizeSeverity(String(parsed.overallSeverity || '')),
        estimatedPriority: this.normalizePriority(String(parsed.estimatedPriority || '')),
        rootCauseAnalysis: {
          category: this.normalizeRootCauseCategory(
            String(parsed.rootCauseAnalysis?.category || '')
          ),
          description: String(parsed.rootCauseAnalysis?.description || ''),
          confidence: Math.min(100, Math.max(0, Number(parsed.rootCauseAnalysis?.confidence) || 0)),
          evidence: Array.isArray(parsed.rootCauseAnalysis?.evidence)
            ? parsed.rootCauseAnalysis.evidence.map((e: unknown) => String(e))
            : [],
          suggestedFix: String(parsed.rootCauseAnalysis?.suggestedFix || ''),
        },
        impactAssessment: Array.isArray(parsed.impactAssessment)
          ? parsed.impactAssessment.map((a: Record<string, unknown>) => ({
              area: String(a.area || ''),
              level: this.normalizeImpactLevel(String(a.level || '')),
              description: String(a.description || ''),
              affectedUsers: String(a.affectedUsers || ''),
              affectedFeatures: Array.isArray(a.affectedFeatures)
                ? a.affectedFeatures.map((f) => String(f))
                : [],
            }))
          : [],
        similarPatterns: Array.isArray(parsed.similarPatterns)
          ? parsed.similarPatterns.map((p: Record<string, unknown>) => ({
              pattern: String(p.pattern || ''),
              description: String(p.description || ''),
              occurrences: Math.max(0, Number(p.occurrences) || 0),
              relatedBugIds: Array.isArray(p.relatedBugIds)
                ? p.relatedBugIds.map((id) => String(id))
                : [],
              preventionStrategy: String(p.preventionStrategy || ''),
            }))
          : [],
        fixRecommendations: Array.isArray(parsed.fixRecommendations)
          ? parsed.fixRecommendations.map((r: Record<string, unknown>) => ({
              priority: this.normalizeRecommendationPriority(String(r.priority || '')),
              recommendation: String(r.recommendation || ''),
              rationale: String(r.rationale || ''),
              effort: this.normalizeEffort(String(r.effort || '')),
              expectedOutcome: String(r.expectedOutcome || ''),
            }))
          : [],
        preventionMeasures: Array.isArray(parsed.preventionMeasures)
          ? parsed.preventionMeasures.map((m: Record<string, unknown>) => ({
              measure: String(m.measure || ''),
              description: String(m.description || ''),
              effectiveness: this.normalizeEffectiveness(String(m.effectiveness || '')),
              implementationCost: this.normalizeEffort(String(m.implementationCost || '')),
              applicablePhase: String(m.applicablePhase || ''),
            }))
          : [],
        regressionRisk: {
          level: this.normalizeImpactLevel(String(parsed.regressionRisk?.level || '')),
          areas: Array.isArray(parsed.regressionRisk?.areas)
            ? parsed.regressionRisk.areas.map((a: unknown) => String(a))
            : [],
          testingRecommendations: Array.isArray(parsed.regressionRisk?.testingRecommendations)
            ? parsed.regressionRisk.testingRecommendations.map((r: unknown) => String(r))
            : [],
        },
        summary: String(parsed.summary || ''),
        detailedAnalysis: String(parsed.detailedAnalysis || ''),
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AIの応答を解析できませんでした。再度お試しください。');
    }
  }

  private normalizeSeverity(severity: string): BugSeverity {
    const upper = severity.toUpperCase();
    if (upper === 'CRITICAL' || upper === '致命的' || upper === '致命') return 'CRITICAL';
    if (upper === 'MAJOR' || upper === '重大' || upper === '高') return 'MAJOR';
    if (upper === 'MINOR' || upper === '軽微' || upper === '中') return 'MINOR';
    if (upper === 'TRIVIAL' || upper === '軽度' || upper === '低') return 'TRIVIAL';
    return 'MINOR';
  }

  private normalizePriority(priority: string): BugPriority {
    const upper = priority.toUpperCase();
    if (upper === 'URGENT' || upper === '緊急' || upper === '最高') return 'URGENT';
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'MEDIUM' || upper === '中') return 'MEDIUM';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }

  private normalizeRootCauseCategory(category: string): RootCauseCategory {
    const upper = category.toUpperCase();
    if (upper === 'CODING_ERROR' || upper === 'コーディングエラー' || upper === '実装ミス')
      return 'CODING_ERROR';
    if (upper === 'DESIGN_FLAW' || upper === '設計不良' || upper === '設計ミス')
      return 'DESIGN_FLAW';
    if (upper === 'REQUIREMENTS_GAP' || upper === '要件漏れ' || upper === '要件不備')
      return 'REQUIREMENTS_GAP';
    if (upper === 'INTEGRATION_ISSUE' || upper === '統合問題' || upper === '連携不良')
      return 'INTEGRATION_ISSUE';
    if (upper === 'ENVIRONMENT' || upper === '環境問題' || upper === '環境') return 'ENVIRONMENT';
    if (upper === 'DATA_ISSUE' || upper === 'データ問題' || upper === 'データ') return 'DATA_ISSUE';
    return 'UNKNOWN';
  }

  private normalizeImpactLevel(level: string): ImpactLevel {
    const upper = level.toUpperCase();
    if (upper === 'CRITICAL' || upper === '致命的' || upper === '致命') return 'CRITICAL';
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }

  private normalizeRecommendationPriority(priority: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const upper = priority.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }

  private normalizeEffort(effort: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const upper = effort.toUpperCase();
    if (upper === 'LOW' || upper === '低' || upper === '小') return 'LOW';
    if (upper === 'HIGH' || upper === '高' || upper === '大') return 'HIGH';
    return 'MEDIUM';
  }

  private normalizeEffectiveness(effectiveness: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const upper = effectiveness.toUpperCase();
    if (upper === 'HIGH' || upper === '高') return 'HIGH';
    if (upper === 'LOW' || upper === '低') return 'LOW';
    return 'MEDIUM';
  }
}

export const bugAnalyzerService = new BugAnalyzerService();
