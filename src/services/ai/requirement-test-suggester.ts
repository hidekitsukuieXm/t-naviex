import { ClaudeClient } from '@/lib/claude';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { substituteVariables } from '@/types/prompt-template';

export interface SuggestedTestCase {
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  testType: string;
  relatedRequirements: string[];
  steps: Array<{
    stepNumber: number;
    action: string;
    expectedResult: string;
  }>;
  expectedResult: string;
  rationale: string;
}

export interface RequirementCoverage {
  requirementId: string;
  requirementText: string;
  coverageLevel: 'FULL' | 'PARTIAL' | 'NONE';
  existingTestCases: string[];
  suggestedTestCases: string[];
  gaps: string[];
}

export interface CoverageGap {
  requirementId: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestion: string;
}

export interface RequirementTestSuggestionResult {
  suggestedTestCases: SuggestedTestCase[];
  coverageAnalysis: RequirementCoverage[];
  coverageGaps: CoverageGap[];
  overallCoverageScore: number; // 0-100
  summary: string;
}

export interface RequirementForAnalysis {
  id: string;
  title: string;
  description: string;
  priority?: string;
  type?: string;
}

export interface ExistingTestCase {
  id: string;
  title: string;
  description?: string;
  linkedRequirements?: string[];
}

export interface RequirementTestSuggestionOptions {
  requirements: RequirementForAnalysis[];
  existingTestCases?: ExistingTestCase[];
  context?: string;
  maxSuggestions?: number;
}

export interface RequirementTestSuggestionResponse {
  result: RequirementTestSuggestionResult;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class RequirementTestSuggesterService {
  /**
   * 要件からテストケースを提案
   */
  async suggestTests(
    projectId: bigint | null,
    options: RequirementTestSuggestionOptions
  ): Promise<RequirementTestSuggestionResponse> {
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
    const template = await promptTemplateRepository.findDefault(projectId, 'REQUIREMENT_TEST');
    if (!template) {
      throw new Error('要件連携テスト提案テンプレートが見つかりません');
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

  private buildPrompt(templateContent: string, options: RequirementTestSuggestionOptions): string {
    // Format requirements
    const requirementsText = options.requirements
      .map(
        (r) =>
          `[${r.id}] ${r.title}\n  説明: ${r.description}${r.priority ? `\n  優先度: ${r.priority}` : ''}${r.type ? `\n  種別: ${r.type}` : ''}`
      )
      .join('\n\n');

    // Format existing test cases
    const existingTestCasesText = options.existingTestCases
      ? options.existingTestCases
          .map(
            (tc) =>
              `[${tc.id}] ${tc.title}${tc.linkedRequirements?.length ? ` (関連要件: ${tc.linkedRequirements.join(', ')})` : ''}`
          )
          .join('\n')
      : 'なし';

    let prompt = substituteVariables(templateContent, {
      requirements: requirementsText,
      existingTestCases: existingTestCasesText,
      context: options.context || 'なし',
    });

    const maxSuggestions = options.maxSuggestions || 10;

    prompt += `\n\n## 追加指示
- 最大${maxSuggestions}件のテストケースを提案してください
- 既存テストケースとの重複を避けてください
- カバレッジギャップを特定してください

## 出力形式（JSON）
以下のJSON形式で出力してください。マークダウンのコードブロックは使用せず、純粋なJSONのみを出力してください:

{
  "suggestedTestCases": [
    {
      "title": "テストケースタイトル",
      "description": "テストケースの説明",
      "priority": "HIGH|MEDIUM|LOW",
      "testType": "機能テスト/境界値テスト等",
      "relatedRequirements": ["REQ-001"],
      "steps": [
        {"stepNumber": 1, "action": "操作", "expectedResult": "期待結果"}
      ],
      "expectedResult": "最終的な期待結果",
      "rationale": "このテストケースを提案する理由"
    }
  ],
  "coverageAnalysis": [
    {
      "requirementId": "REQ-001",
      "requirementText": "要件の概要",
      "coverageLevel": "FULL|PARTIAL|NONE",
      "existingTestCases": ["TC-001"],
      "suggestedTestCases": ["提案1"],
      "gaps": ["カバーされていない観点"]
    }
  ],
  "coverageGaps": [
    {
      "requirementId": "REQ-001",
      "description": "ギャップの説明",
      "severity": "HIGH|MEDIUM|LOW",
      "suggestion": "対応提案"
    }
  ],
  "overallCoverageScore": 0-100,
  "summary": "分析サマリー"
}`;

    return prompt;
  }

  private getSystemPrompt(): string {
    return `あなたは経験豊富なソフトウェアテストエンジニアです。
要件仕様から必要なテストケースを分析し、提案してください。
以下の観点で分析を行います：

1. 要件カバレッジ分析
   - 各要件に対して十分なテストケースがあるか
   - カバーされていない観点の特定
   - テストの網羅性評価

2. テストケース提案
   - 要件を満たすための具体的なテストケース
   - 正常系・異常系・境界値の考慮
   - テストの優先順位付け

3. ギャップ分析
   - テストされていない要件の特定
   - リスクに基づく優先順位付け
   - 改善提案

提案するテストケースは具体的で実行可能なものにしてください。
出力は必ずJSON形式で、余計な説明文は含めないでください。`;
  }

  private parseResponse(content: string): RequirementTestSuggestionResult {
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
        suggestedTestCases: Array.isArray(parsed.suggestedTestCases)
          ? parsed.suggestedTestCases.map((tc: Record<string, unknown>) => ({
              title: String(tc.title || ''),
              description: String(tc.description || ''),
              priority: this.normalizePriority(String(tc.priority || '')),
              testType: String(tc.testType || '機能テスト'),
              relatedRequirements: Array.isArray(tc.relatedRequirements)
                ? tc.relatedRequirements.map((r) => String(r))
                : [],
              steps: Array.isArray(tc.steps)
                ? (tc.steps as Array<Record<string, unknown>>).map((s, i) => ({
                    stepNumber: Number(s.stepNumber) || i + 1,
                    action: String(s.action || ''),
                    expectedResult: String(s.expectedResult || ''),
                  }))
                : [],
              expectedResult: String(tc.expectedResult || ''),
              rationale: String(tc.rationale || ''),
            }))
          : [],
        coverageAnalysis: Array.isArray(parsed.coverageAnalysis)
          ? parsed.coverageAnalysis.map((ca: Record<string, unknown>) => ({
              requirementId: String(ca.requirementId || ''),
              requirementText: String(ca.requirementText || ''),
              coverageLevel: this.normalizeCoverageLevel(String(ca.coverageLevel || '')),
              existingTestCases: Array.isArray(ca.existingTestCases)
                ? ca.existingTestCases.map((tc) => String(tc))
                : [],
              suggestedTestCases: Array.isArray(ca.suggestedTestCases)
                ? ca.suggestedTestCases.map((tc) => String(tc))
                : [],
              gaps: Array.isArray(ca.gaps) ? ca.gaps.map((g) => String(g)) : [],
            }))
          : [],
        coverageGaps: Array.isArray(parsed.coverageGaps)
          ? parsed.coverageGaps.map((gap: Record<string, unknown>) => ({
              requirementId: String(gap.requirementId || ''),
              description: String(gap.description || ''),
              severity: this.normalizePriority(String(gap.severity || '')),
              suggestion: String(gap.suggestion || ''),
            }))
          : [],
        overallCoverageScore: Math.min(100, Math.max(0, Number(parsed.overallCoverageScore) || 50)),
        summary: String(parsed.summary || ''),
      };
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

  private normalizeCoverageLevel(level: string): 'FULL' | 'PARTIAL' | 'NONE' {
    const upper = level.toUpperCase();
    if (upper === 'FULL' || upper === '完全' || upper === '100%') return 'FULL';
    if (upper === 'NONE' || upper === 'なし' || upper === '0%') return 'NONE';
    return 'PARTIAL';
  }
}

export const requirementTestSuggesterService = new RequirementTestSuggesterService();
