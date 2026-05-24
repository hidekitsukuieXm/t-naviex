/**
 * テストケース関連の型定義
 */

// ============================================
// 基本型定義
// ============================================

/**
 * テストケース優先度
 */
export type TestCasePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * テストタイプ
 */
export type TestType =
  | 'FUNCTIONAL'
  | 'INTEGRATION'
  | 'E2E'
  | 'PERFORMANCE'
  | 'SECURITY'
  | 'USABILITY'
  | 'OTHER';

/**
 * テスト技法
 */
export type TestTechnique =
  | 'EQUIVALENCE_PARTITIONING'
  | 'BOUNDARY_VALUE_ANALYSIS'
  | 'DECISION_TABLE'
  | 'STATE_TRANSITION'
  | 'EXPLORATORY'
  | 'REGRESSION'
  | 'OTHER';

/**
 * テストケース
 */
export interface TestCase {
  id: string;
  testSpecId: string;
  sectionId: string | null;
  title: string;
  description: string | null;
  preconditions: string | null;
  priority: TestCasePriority;
  testType: TestType;
  testTechnique: TestTechnique;
  isMatrix: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * テストケース詳細（セクション情報付き）
 */
export interface TestCaseDetail extends TestCase {
  section: {
    id: string;
    name: string;
  } | null;
  testSpec: {
    id: string;
    name: string;
  };
}

// ============================================
// 入力・更新型定義
// ============================================

/**
 * テストケース作成入力
 */
export interface CreateTestCaseInput {
  testSpecId: string;
  sectionId?: string | null;
  title: string;
  description?: string | null;
  preconditions?: string | null;
  priority?: TestCasePriority;
  testType?: TestType;
  testTechnique?: TestTechnique;
  isMatrix?: boolean;
  sortOrder?: number;
}

/**
 * テストケース更新入力
 */
export interface UpdateTestCaseInput {
  sectionId?: string | null;
  title?: string;
  description?: string | null;
  preconditions?: string | null;
  priority?: TestCasePriority;
  testType?: TestType;
  testTechnique?: TestTechnique;
  isMatrix?: boolean;
  sortOrder?: number;
}

// ============================================
// 検索・フィルタ型定義
// ============================================

/**
 * テストケース検索パラメータ
 */
export interface TestCaseSearchParams {
  testSpecId: string;
  sectionId?: string | null;
  query?: string;
  priority?: TestCasePriority;
  testType?: TestType;
  testTechnique?: TestTechnique;
  isMatrix?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'priority' | 'sortOrder' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * テストケース一覧レスポンス
 */
export interface TestCaseListResponse {
  testCases: TestCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// 定数定義
// ============================================

/**
 * 有効な優先度リスト
 */
export const VALID_PRIORITIES: TestCasePriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * 優先度ラベル
 */
export const PRIORITY_LABELS: Record<TestCasePriority, string> = {
  CRITICAL: '致命的',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

/**
 * 有効なテストタイプリスト
 */
export const VALID_TEST_TYPES: TestType[] = [
  'FUNCTIONAL',
  'INTEGRATION',
  'E2E',
  'PERFORMANCE',
  'SECURITY',
  'USABILITY',
  'OTHER',
];

/**
 * テストタイプラベル
 */
export const TEST_TYPE_LABELS: Record<TestType, string> = {
  FUNCTIONAL: '機能テスト',
  INTEGRATION: '結合テスト',
  E2E: 'E2Eテスト',
  PERFORMANCE: '性能テスト',
  SECURITY: 'セキュリティテスト',
  USABILITY: 'ユーザビリティテスト',
  OTHER: 'その他',
};

/**
 * 有効なテスト技法リスト
 */
export const VALID_TEST_TECHNIQUES: TestTechnique[] = [
  'EQUIVALENCE_PARTITIONING',
  'BOUNDARY_VALUE_ANALYSIS',
  'DECISION_TABLE',
  'STATE_TRANSITION',
  'EXPLORATORY',
  'REGRESSION',
  'OTHER',
];

/**
 * テスト技法ラベル
 */
export const TEST_TECHNIQUE_LABELS: Record<TestTechnique, string> = {
  EQUIVALENCE_PARTITIONING: '同値分割',
  BOUNDARY_VALUE_ANALYSIS: '境界値分析',
  DECISION_TABLE: 'デシジョンテーブル',
  STATE_TRANSITION: '状態遷移',
  EXPLORATORY: '探索的テスト',
  REGRESSION: '回帰テスト',
  OTHER: 'その他',
};

// ============================================
// バリデーション関数
// ============================================

/**
 * テストケースタイトルのバリデーション
 */
export function validateTestCaseTitle(title: string): {
  valid: boolean;
  error?: string;
} {
  if (!title || title.trim() === '') {
    return { valid: false, error: 'テストケースタイトルは必須です。' };
  }

  const trimmedTitle = title.trim();

  if (trimmedTitle.length > 500) {
    return { valid: false, error: 'テストケースタイトルは500文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * 説明のバリデーション
 */
export function validateDescription(description: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (description === null || description === undefined) {
    return { valid: true };
  }

  if (description.length > 10000) {
    return { valid: false, error: '説明は10000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * 事前条件のバリデーション
 */
export function validatePreconditions(preconditions: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (preconditions === null || preconditions === undefined) {
    return { valid: true };
  }

  if (preconditions.length > 5000) {
    return { valid: false, error: '事前条件は5000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * 優先度のバリデーション
 */
export function validatePriority(priority: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (priority === undefined) {
    return { valid: true };
  }

  if (!VALID_PRIORITIES.includes(priority as TestCasePriority)) {
    return { valid: false, error: '無効な優先度です。' };
  }

  return { valid: true };
}

/**
 * テストタイプのバリデーション
 */
export function validateTestType(testType: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (testType === undefined) {
    return { valid: true };
  }

  if (!VALID_TEST_TYPES.includes(testType as TestType)) {
    return { valid: false, error: '無効なテストタイプです。' };
  }

  return { valid: true };
}

/**
 * テスト技法のバリデーション
 */
export function validateTestTechnique(testTechnique: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (testTechnique === undefined) {
    return { valid: true };
  }

  if (!VALID_TEST_TECHNIQUES.includes(testTechnique as TestTechnique)) {
    return { valid: false, error: '無効なテスト技法です。' };
  }

  return { valid: true };
}

/**
 * 並び順のバリデーション
 */
export function validateSortOrder(sortOrder: number | undefined): {
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

  if (sortOrder > 999999) {
    return { valid: false, error: '並び順は999999以下の値を指定してください。' };
  }

  return { valid: true };
}

/**
 * テストケース作成入力のバリデーション
 */
export function validateCreateTestCaseInput(input: CreateTestCaseInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // テスト仕様書ID
  if (!input.testSpecId || input.testSpecId.trim() === '') {
    errors.push('テスト仕様書IDは必須です。');
  }

  // タイトル
  const titleValidation = validateTestCaseTitle(input.title);
  if (!titleValidation.valid && titleValidation.error) {
    errors.push(titleValidation.error);
  }

  // 説明
  const descriptionValidation = validateDescription(input.description);
  if (!descriptionValidation.valid && descriptionValidation.error) {
    errors.push(descriptionValidation.error);
  }

  // 事前条件
  const preconditionsValidation = validatePreconditions(input.preconditions);
  if (!preconditionsValidation.valid && preconditionsValidation.error) {
    errors.push(preconditionsValidation.error);
  }

  // 優先度
  const priorityValidation = validatePriority(input.priority);
  if (!priorityValidation.valid && priorityValidation.error) {
    errors.push(priorityValidation.error);
  }

  // テストタイプ
  const testTypeValidation = validateTestType(input.testType);
  if (!testTypeValidation.valid && testTypeValidation.error) {
    errors.push(testTypeValidation.error);
  }

  // テスト技法
  const testTechniqueValidation = validateTestTechnique(input.testTechnique);
  if (!testTechniqueValidation.valid && testTechniqueValidation.error) {
    errors.push(testTechniqueValidation.error);
  }

  // 並び順
  const sortOrderValidation = validateSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid && sortOrderValidation.error) {
    errors.push(sortOrderValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * テストケース更新入力のバリデーション
 */
export function validateUpdateTestCaseInput(input: UpdateTestCaseInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // タイトル（指定されている場合）
  if (input.title !== undefined) {
    const titleValidation = validateTestCaseTitle(input.title);
    if (!titleValidation.valid && titleValidation.error) {
      errors.push(titleValidation.error);
    }
  }

  // 説明
  const descriptionValidation = validateDescription(input.description);
  if (!descriptionValidation.valid && descriptionValidation.error) {
    errors.push(descriptionValidation.error);
  }

  // 事前条件
  const preconditionsValidation = validatePreconditions(input.preconditions);
  if (!preconditionsValidation.valid && preconditionsValidation.error) {
    errors.push(preconditionsValidation.error);
  }

  // 優先度
  const priorityValidation = validatePriority(input.priority);
  if (!priorityValidation.valid && priorityValidation.error) {
    errors.push(priorityValidation.error);
  }

  // テストタイプ
  const testTypeValidation = validateTestType(input.testType);
  if (!testTypeValidation.valid && testTypeValidation.error) {
    errors.push(testTypeValidation.error);
  }

  // テスト技法
  const testTechniqueValidation = validateTestTechnique(input.testTechnique);
  if (!testTechniqueValidation.valid && testTechniqueValidation.error) {
    errors.push(testTechniqueValidation.error);
  }

  // 並び順
  const sortOrderValidation = validateSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid && sortOrderValidation.error) {
    errors.push(sortOrderValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
