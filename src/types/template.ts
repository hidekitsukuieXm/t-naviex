/**
 * テストケーステンプレート関連の型定義
 */

import type { TestCasePriority, TestType, TestTechnique } from './test-case';

// ============================================
// 基本型定義
// ============================================

/**
 * テンプレートステップ
 */
export interface TemplateStep {
  id: string;
  templateId: string;
  stepNo: number;
  actionMd: string;
  expectedMd: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * テストケーステンプレート
 */
export interface TestCaseTemplate {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  title: string | null;
  templateDescription: string | null;
  preconditions: string | null;
  expectedResult: string | null;
  checkpoint: string | null;
  scenario: string | null;
  testEnvironment: string | null;
  notes: string | null;
  tags: string[];
  classification: string | null;
  priority: TestCasePriority;
  testType: TestType;
  testTechnique: TestTechnique;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * テンプレート詳細（ステップ付き）
 */
export interface TestCaseTemplateDetail extends TestCaseTemplate {
  templateSteps: TemplateStep[];
}

// ============================================
// 入力型定義
// ============================================

/**
 * テンプレートステップ入力
 */
export interface TemplateStepInput {
  stepNo: number;
  actionMd: string;
  expectedMd?: string | null;
}

/**
 * テンプレート作成入力
 */
export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  title?: string | null;
  templateDescription?: string | null;
  preconditions?: string | null;
  expectedResult?: string | null;
  checkpoint?: string | null;
  scenario?: string | null;
  testEnvironment?: string | null;
  notes?: string | null;
  tags?: string[];
  classification?: string | null;
  priority?: TestCasePriority;
  testType?: TestType;
  testTechnique?: TestTechnique;
  isDefault?: boolean;
  sortOrder?: number;
  templateSteps?: TemplateStepInput[];
}

/**
 * テンプレート更新入力
 */
export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  title?: string | null;
  templateDescription?: string | null;
  preconditions?: string | null;
  expectedResult?: string | null;
  checkpoint?: string | null;
  scenario?: string | null;
  testEnvironment?: string | null;
  notes?: string | null;
  tags?: string[];
  classification?: string | null;
  priority?: TestCasePriority;
  testType?: TestType;
  testTechnique?: TestTechnique;
  isDefault?: boolean;
  sortOrder?: number;
  templateSteps?: TemplateStepInput[];
}

// ============================================
// レスポンス型定義
// ============================================

/**
 * テンプレート一覧レスポンス
 */
export interface TemplateListResponse {
  templates: TestCaseTemplate[];
  total: number;
}

// ============================================
// バリデーション関数
// ============================================

/**
 * テンプレート名のバリデーション
 */
export function validateTemplateName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'テンプレート名は必須です。' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length > 255) {
    return { valid: false, error: 'テンプレート名は255文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * テンプレート説明のバリデーション
 */
export function validateTemplateDescription(description: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (description === null || description === undefined) {
    return { valid: true };
  }

  if (description.length > 5000) {
    return { valid: false, error: 'テンプレート説明は5000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * テンプレートタイトルのバリデーション
 */
export function validateTemplateTitle(title: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (title === null || title === undefined) {
    return { valid: true };
  }

  if (title.length > 500) {
    return { valid: false, error: 'タイトルテンプレートは500文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * テンプレートステップのバリデーション
 */
export function validateTemplateSteps(steps: TemplateStepInput[] | undefined): {
  valid: boolean;
  error?: string;
} {
  if (steps === undefined || steps.length === 0) {
    return { valid: true };
  }

  if (steps.length > 100) {
    return { valid: false, error: 'テスト手順は100件以内で指定してください。' };
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step.actionMd || step.actionMd.trim() === '') {
      return { valid: false, error: `手順${i + 1}のアクションは必須です。` };
    }
    if (step.actionMd.length > 10000) {
      return { valid: false, error: `手順${i + 1}のアクションは10000文字以内で入力してください。` };
    }
    if (step.expectedMd && step.expectedMd.length > 10000) {
      return { valid: false, error: `手順${i + 1}の期待結果は10000文字以内で入力してください。` };
    }
  }

  return { valid: true };
}

/**
 * テンプレート並び順のバリデーション
 */
export function validateTemplateSortOrder(sortOrder: number | undefined): {
  valid: boolean;
  error?: string;
} {
  if (sortOrder === undefined) {
    return { valid: true };
  }

  if (!Number.isInteger(sortOrder)) {
    return { valid: false, error: '並び順は整数で指定してください。' };
  }

  if (sortOrder < 0) {
    return { valid: false, error: '並び順は0以上の値を指定してください。' };
  }

  if (sortOrder > 9999) {
    return { valid: false, error: '並び順は9999以下の値を指定してください。' };
  }

  return { valid: true };
}

/**
 * テンプレート作成入力のバリデーション
 */
export function validateCreateTemplateInput(input: CreateTemplateInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 名前
  const nameValidation = validateTemplateName(input.name);
  if (!nameValidation.valid && nameValidation.error) {
    errors.push(nameValidation.error);
  }

  // 説明
  const descriptionValidation = validateTemplateDescription(input.description);
  if (!descriptionValidation.valid && descriptionValidation.error) {
    errors.push(descriptionValidation.error);
  }

  // タイトル
  const titleValidation = validateTemplateTitle(input.title);
  if (!titleValidation.valid && titleValidation.error) {
    errors.push(titleValidation.error);
  }

  // 手順
  const stepsValidation = validateTemplateSteps(input.templateSteps);
  if (!stepsValidation.valid && stepsValidation.error) {
    errors.push(stepsValidation.error);
  }

  // 並び順
  const sortOrderValidation = validateTemplateSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid && sortOrderValidation.error) {
    errors.push(sortOrderValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * テンプレート更新入力のバリデーション
 */
export function validateUpdateTemplateInput(input: UpdateTemplateInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 名前（指定されている場合）
  if (input.name !== undefined) {
    const nameValidation = validateTemplateName(input.name);
    if (!nameValidation.valid && nameValidation.error) {
      errors.push(nameValidation.error);
    }
  }

  // 説明
  const descriptionValidation = validateTemplateDescription(input.description);
  if (!descriptionValidation.valid && descriptionValidation.error) {
    errors.push(descriptionValidation.error);
  }

  // タイトル
  const titleValidation = validateTemplateTitle(input.title);
  if (!titleValidation.valid && titleValidation.error) {
    errors.push(titleValidation.error);
  }

  // 手順
  const stepsValidation = validateTemplateSteps(input.templateSteps);
  if (!stepsValidation.valid && stepsValidation.error) {
    errors.push(stepsValidation.error);
  }

  // 並び順
  const sortOrderValidation = validateTemplateSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid && sortOrderValidation.error) {
    errors.push(sortOrderValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
