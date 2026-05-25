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
  expectedResult: string | null;
  checkpoint: string | null;
  scenario: string | null;
  testEnvironment: string | null;
  notes: string | null;
  tags: string[];
  classification: string | null;
  referenceId: string | null;
  estimatedTime: number | null;
  priority: TestCasePriority;
  testType: TestType;
  testTechnique: TestTechnique;
  isMatrix: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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
  expectedResult?: string | null;
  checkpoint?: string | null;
  scenario?: string | null;
  testEnvironment?: string | null;
  notes?: string | null;
  tags?: string[];
  classification?: string | null;
  referenceId?: string | null;
  estimatedTime?: number | null;
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
  expectedResult?: string | null;
  checkpoint?: string | null;
  scenario?: string | null;
  testEnvironment?: string | null;
  notes?: string | null;
  tags?: string[];
  classification?: string | null;
  referenceId?: string | null;
  estimatedTime?: number | null;
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
  tags?: string[];
  classification?: string;
  page?: number;
  limit?: number;
  sortBy?:
    | 'title'
    | 'priority'
    | 'sortOrder'
    | 'createdAt'
    | 'updatedAt'
    | 'testType'
    | 'testTechnique';
  sortOrder?: 'asc' | 'desc';
}

/**
 * テストケースフィルタ条件
 */
export interface TestCaseFilterState {
  query: string;
  priority: TestCasePriority | 'all';
  testType: TestType | 'all';
  testTechnique: TestTechnique | 'all';
  tags: string[];
  classification: string;
  isMatrix: boolean | 'all';
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
// 全文検索型定義
// ============================================

/**
 * 検索対象フィールド
 */
export type SearchableField =
  | 'title'
  | 'description'
  | 'preconditions'
  | 'expectedResult'
  | 'checkpoint'
  | 'scenario'
  | 'testEnvironment'
  | 'notes';

/**
 * 検索結果のハイライト情報
 */
export interface SearchHighlight {
  field: SearchableField;
  snippet: string;
}

/**
 * 全文検索結果のテストケース
 */
export interface TestCaseSearchResult extends TestCase {
  rank: number;
  highlights: SearchHighlight[];
}

/**
 * 全文検索パラメータ
 */
export interface FullTextSearchParams {
  testSpecId: string;
  query: string;
  sectionId?: string | null;
  searchFields?: SearchableField[];
  priority?: TestCasePriority;
  testType?: TestType;
  testTechnique?: TestTechnique;
  isMatrix?: boolean;
  tags?: string[];
  classification?: string;
  page?: number;
  limit?: number;
}

/**
 * 全文検索レスポンス
 */
export interface FullTextSearchResponse {
  results: TestCaseSearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
  searchFields: SearchableField[];
}

/**
 * 全検索対象フィールド一覧
 */
export const ALL_SEARCHABLE_FIELDS: SearchableField[] = [
  'title',
  'description',
  'preconditions',
  'expectedResult',
  'checkpoint',
  'scenario',
  'testEnvironment',
  'notes',
];

/**
 * 検索対象フィールドのラベル
 */
export const SEARCHABLE_FIELD_LABELS: Record<SearchableField, string> = {
  title: 'タイトル',
  description: '説明',
  preconditions: '事前条件',
  expectedResult: '期待結果',
  checkpoint: 'チェックポイント',
  scenario: 'シナリオ',
  testEnvironment: 'テスト環境',
  notes: '特記事項',
};

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
 * 期待結果のバリデーション
 */
export function validateExpectedResult(expectedResult: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (expectedResult === null || expectedResult === undefined) {
    return { valid: true };
  }

  if (expectedResult.length > 10000) {
    return { valid: false, error: '期待結果は10000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * チェックポイントのバリデーション
 */
export function validateCheckpoint(checkpoint: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (checkpoint === null || checkpoint === undefined) {
    return { valid: true };
  }

  if (checkpoint.length > 5000) {
    return { valid: false, error: 'チェックポイントは5000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * シナリオのバリデーション
 */
export function validateScenario(scenario: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (scenario === null || scenario === undefined) {
    return { valid: true };
  }

  if (scenario.length > 10000) {
    return { valid: false, error: 'シナリオは10000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * テスト環境のバリデーション
 */
export function validateTestEnvironment(testEnvironment: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (testEnvironment === null || testEnvironment === undefined) {
    return { valid: true };
  }

  if (testEnvironment.length > 5000) {
    return { valid: false, error: 'テスト環境は5000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * 特記事項のバリデーション
 */
export function validateNotes(notes: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (notes === null || notes === undefined) {
    return { valid: true };
  }

  if (notes.length > 5000) {
    return { valid: false, error: '特記事項は5000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * タグのバリデーション
 */
export function validateTags(tags: string[] | undefined): {
  valid: boolean;
  error?: string;
} {
  if (tags === undefined || tags.length === 0) {
    return { valid: true };
  }

  if (tags.length > 20) {
    return { valid: false, error: 'タグは20個以内で指定してください。' };
  }

  for (const tag of tags) {
    if (tag.length > 50) {
      return { valid: false, error: '各タグは50文字以内で入力してください。' };
    }
    if (tag.trim() === '') {
      return { valid: false, error: '空のタグは指定できません。' };
    }
  }

  return { valid: true };
}

/**
 * 分類のバリデーション
 */
export function validateClassification(classification: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (classification === null || classification === undefined) {
    return { valid: true };
  }

  if (classification.length > 100) {
    return { valid: false, error: '分類は100文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * 参照IDのバリデーション
 */
export function validateReferenceId(referenceId: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (referenceId === null || referenceId === undefined) {
    return { valid: true };
  }

  if (referenceId.length > 100) {
    return { valid: false, error: '参照IDは100文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * 推定時間のバリデーション
 */
export function validateEstimatedTime(estimatedTime: number | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (estimatedTime === null || estimatedTime === undefined) {
    return { valid: true };
  }

  if (!Number.isInteger(estimatedTime)) {
    return { valid: false, error: '推定時間は整数で指定してください。' };
  }

  if (estimatedTime < 0) {
    return { valid: false, error: '推定時間は0以上の値を指定してください。' };
  }

  if (estimatedTime > 99999) {
    return { valid: false, error: '推定時間は99999分以内で指定してください。' };
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

  // 期待結果
  const expectedResultValidation = validateExpectedResult(input.expectedResult);
  if (!expectedResultValidation.valid && expectedResultValidation.error) {
    errors.push(expectedResultValidation.error);
  }

  // チェックポイント
  const checkpointValidation = validateCheckpoint(input.checkpoint);
  if (!checkpointValidation.valid && checkpointValidation.error) {
    errors.push(checkpointValidation.error);
  }

  // シナリオ
  const scenarioValidation = validateScenario(input.scenario);
  if (!scenarioValidation.valid && scenarioValidation.error) {
    errors.push(scenarioValidation.error);
  }

  // テスト環境
  const testEnvironmentValidation = validateTestEnvironment(input.testEnvironment);
  if (!testEnvironmentValidation.valid && testEnvironmentValidation.error) {
    errors.push(testEnvironmentValidation.error);
  }

  // 特記事項
  const notesValidation = validateNotes(input.notes);
  if (!notesValidation.valid && notesValidation.error) {
    errors.push(notesValidation.error);
  }

  // タグ
  const tagsValidation = validateTags(input.tags);
  if (!tagsValidation.valid && tagsValidation.error) {
    errors.push(tagsValidation.error);
  }

  // 分類
  const classificationValidation = validateClassification(input.classification);
  if (!classificationValidation.valid && classificationValidation.error) {
    errors.push(classificationValidation.error);
  }

  // 参照ID
  const referenceIdValidation = validateReferenceId(input.referenceId);
  if (!referenceIdValidation.valid && referenceIdValidation.error) {
    errors.push(referenceIdValidation.error);
  }

  // 推定時間
  const estimatedTimeValidation = validateEstimatedTime(input.estimatedTime);
  if (!estimatedTimeValidation.valid && estimatedTimeValidation.error) {
    errors.push(estimatedTimeValidation.error);
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

  // 期待結果
  const expectedResultValidation = validateExpectedResult(input.expectedResult);
  if (!expectedResultValidation.valid && expectedResultValidation.error) {
    errors.push(expectedResultValidation.error);
  }

  // チェックポイント
  const checkpointValidation = validateCheckpoint(input.checkpoint);
  if (!checkpointValidation.valid && checkpointValidation.error) {
    errors.push(checkpointValidation.error);
  }

  // シナリオ
  const scenarioValidation = validateScenario(input.scenario);
  if (!scenarioValidation.valid && scenarioValidation.error) {
    errors.push(scenarioValidation.error);
  }

  // テスト環境
  const testEnvironmentValidation = validateTestEnvironment(input.testEnvironment);
  if (!testEnvironmentValidation.valid && testEnvironmentValidation.error) {
    errors.push(testEnvironmentValidation.error);
  }

  // 特記事項
  const notesValidation = validateNotes(input.notes);
  if (!notesValidation.valid && notesValidation.error) {
    errors.push(notesValidation.error);
  }

  // タグ
  const tagsValidation = validateTags(input.tags);
  if (!tagsValidation.valid && tagsValidation.error) {
    errors.push(tagsValidation.error);
  }

  // 分類
  const classificationValidation = validateClassification(input.classification);
  if (!classificationValidation.valid && classificationValidation.error) {
    errors.push(classificationValidation.error);
  }

  // 参照ID
  const referenceIdValidation = validateReferenceId(input.referenceId);
  if (!referenceIdValidation.valid && referenceIdValidation.error) {
    errors.push(referenceIdValidation.error);
  }

  // 推定時間
  const estimatedTimeValidation = validateEstimatedTime(input.estimatedTime);
  if (!estimatedTimeValidation.valid && estimatedTimeValidation.error) {
    errors.push(estimatedTimeValidation.error);
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
