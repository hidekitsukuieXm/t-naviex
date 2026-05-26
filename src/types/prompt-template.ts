export type PromptTemplateType =
  | 'TEST_CASE_GENERATION'
  | 'TEST_CASE_REVIEW'
  | 'TEST_TECHNIQUE'
  | 'TESTABILITY_CHECK'
  | 'REQUIREMENT_TEST'
  | 'TEST_PLAN_REVIEW'
  | 'EFFORT_ESTIMATION'
  | 'PROGRESS_ANALYSIS'
  | 'RESULT_ANALYSIS'
  | 'BUG_ANALYSIS'
  | 'TREND_ANALYSIS'
  | 'CUSTOM';

export interface PromptTemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface PromptTemplate {
  id: bigint;
  projectId: bigint | null;
  name: string;
  description: string | null;
  type: PromptTemplateType;
  content: string;
  variables: PromptTemplateVariable[];
  isSystem: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptTemplateCreate {
  name: string;
  description?: string;
  type: PromptTemplateType;
  content: string;
  variables?: PromptTemplateVariable[];
  isDefault?: boolean;
}

export interface PromptTemplateUpdate {
  name?: string;
  description?: string;
  content?: string;
  variables?: PromptTemplateVariable[];
  isDefault?: boolean;
}

export const PROMPT_TEMPLATE_TYPE_LABELS: Record<PromptTemplateType, string> = {
  TEST_CASE_GENERATION: 'テストケース生成',
  TEST_CASE_REVIEW: 'テストケースレビュー',
  TEST_TECHNIQUE: 'テスト技法提案',
  TESTABILITY_CHECK: 'テスタビリティチェック',
  REQUIREMENT_TEST: '要件連携テスト提案',
  TEST_PLAN_REVIEW: 'テスト計画レビュー',
  EFFORT_ESTIMATION: '工数予測',
  PROGRESS_ANALYSIS: '進捗分析',
  RESULT_ANALYSIS: '結果分析',
  BUG_ANALYSIS: 'バグ分析',
  TREND_ANALYSIS: '傾向分析',
  CUSTOM: 'カスタム',
};

export function validateTemplateName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'テンプレート名は必須です';
  }
  if (name.length > 255) {
    return 'テンプレート名は255文字以内である必要があります';
  }
  return null;
}

export function validateTemplateContent(content: string): string | null {
  if (!content || content.trim().length === 0) {
    return 'プロンプト内容は必須です';
  }
  if (content.length > 50000) {
    return 'プロンプト内容は50000文字以内である必要があります';
  }
  return null;
}

export function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
}

export function substituteVariables(content: string, values: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    return values[name] !== undefined ? values[name] : match;
  });
}
