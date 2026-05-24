/**
 * テスト手順関連の型定義
 */

// ============================================
// 基本型定義
// ============================================

/**
 * テスト手順
 */
export interface TestStep {
  id: string;
  testCaseId: string;
  stepNo: number;
  actionMd: string;
  expectedMd: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * テスト手順詳細（テストケース情報付き）
 */
export interface TestStepDetail extends TestStep {
  testCase: {
    id: string;
    title: string;
    testSpecId: string;
  };
}

// ============================================
// 入力・更新型定義
// ============================================

/**
 * テスト手順作成入力
 */
export interface CreateTestStepInput {
  testCaseId: string;
  stepNo?: number;
  actionMd: string;
  expectedMd?: string | null;
}

/**
 * テスト手順更新入力
 */
export interface UpdateTestStepInput {
  stepNo?: number;
  actionMd?: string;
  expectedMd?: string | null;
}

/**
 * テスト手順一括作成入力
 */
export interface BulkCreateTestStepsInput {
  testCaseId: string;
  steps: Array<{
    actionMd: string;
    expectedMd?: string | null;
  }>;
}

/**
 * 手順並び替え入力
 */
export interface ReorderTestStepsInput {
  items: Array<{
    id: string;
    stepNo: number;
  }>;
}

// ============================================
// 検索・フィルタ型定義
// ============================================

/**
 * テスト手順検索パラメータ
 */
export interface TestStepSearchParams {
  testCaseId: string;
  query?: string;
}

// ============================================
// 定数定義
// ============================================

/**
 * アクション（操作手順）の最大文字数
 */
export const MAX_ACTION_LENGTH = 10000;

/**
 * 期待結果の最大文字数
 */
export const MAX_EXPECTED_LENGTH = 10000;

/**
 * 最大手順数
 */
export const MAX_STEPS_PER_CASE = 100;

// ============================================
// バリデーション関数
// ============================================

/**
 * アクション（操作手順）のバリデーション
 */
export function validateActionMd(actionMd: string): {
  valid: boolean;
  error?: string;
} {
  if (!actionMd || actionMd.trim() === '') {
    return { valid: false, error: '操作手順は必須です。' };
  }

  const trimmedAction = actionMd.trim();

  if (trimmedAction.length > MAX_ACTION_LENGTH) {
    return {
      valid: false,
      error: `操作手順は${MAX_ACTION_LENGTH}文字以内で入力してください。`,
    };
  }

  return { valid: true };
}

/**
 * 期待結果のバリデーション
 */
export function validateExpectedMd(expectedMd: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (expectedMd === null || expectedMd === undefined) {
    return { valid: true };
  }

  if (expectedMd.length > MAX_EXPECTED_LENGTH) {
    return {
      valid: false,
      error: `期待結果は${MAX_EXPECTED_LENGTH}文字以内で入力してください。`,
    };
  }

  return { valid: true };
}

/**
 * 手順番号のバリデーション
 */
export function validateStepNo(stepNo: number | undefined): {
  valid: boolean;
  error?: string;
} {
  if (stepNo === undefined) {
    return { valid: true };
  }

  if (!Number.isInteger(stepNo)) {
    return { valid: false, error: '手順番号は整数で指定してください。' };
  }

  if (stepNo < 1) {
    return { valid: false, error: '手順番号は1以上の値を指定してください。' };
  }

  if (stepNo > MAX_STEPS_PER_CASE) {
    return {
      valid: false,
      error: `手順番号は${MAX_STEPS_PER_CASE}以下の値を指定してください。`,
    };
  }

  return { valid: true };
}

/**
 * テスト手順作成入力のバリデーション
 */
export function validateCreateTestStepInput(input: CreateTestStepInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // テストケースID
  if (!input.testCaseId || input.testCaseId.trim() === '') {
    errors.push('テストケースIDは必須です。');
  }

  // アクション
  const actionValidation = validateActionMd(input.actionMd);
  if (!actionValidation.valid && actionValidation.error) {
    errors.push(actionValidation.error);
  }

  // 期待結果
  const expectedValidation = validateExpectedMd(input.expectedMd);
  if (!expectedValidation.valid && expectedValidation.error) {
    errors.push(expectedValidation.error);
  }

  // 手順番号
  const stepNoValidation = validateStepNo(input.stepNo);
  if (!stepNoValidation.valid && stepNoValidation.error) {
    errors.push(stepNoValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * テスト手順更新入力のバリデーション
 */
export function validateUpdateTestStepInput(input: UpdateTestStepInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // アクション（指定されている場合）
  if (input.actionMd !== undefined) {
    const actionValidation = validateActionMd(input.actionMd);
    if (!actionValidation.valid && actionValidation.error) {
      errors.push(actionValidation.error);
    }
  }

  // 期待結果
  const expectedValidation = validateExpectedMd(input.expectedMd);
  if (!expectedValidation.valid && expectedValidation.error) {
    errors.push(expectedValidation.error);
  }

  // 手順番号
  const stepNoValidation = validateStepNo(input.stepNo);
  if (!stepNoValidation.valid && stepNoValidation.error) {
    errors.push(stepNoValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 一括作成入力のバリデーション
 */
export function validateBulkCreateTestStepsInput(input: BulkCreateTestStepsInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // テストケースID
  if (!input.testCaseId || input.testCaseId.trim() === '') {
    errors.push('テストケースIDは必須です。');
  }

  // 手順リスト
  if (!Array.isArray(input.steps)) {
    errors.push('手順リストは配列で指定してください。');
    return { valid: false, errors };
  }

  if (input.steps.length === 0) {
    errors.push('手順が指定されていません。');
    return { valid: false, errors };
  }

  if (input.steps.length > MAX_STEPS_PER_CASE) {
    errors.push(`手順数は${MAX_STEPS_PER_CASE}件以内にしてください。`);
  }

  // 各手順のバリデーション
  input.steps.forEach((step, index) => {
    const actionValidation = validateActionMd(step.actionMd);
    if (!actionValidation.valid && actionValidation.error) {
      errors.push(`手順${index + 1}: ${actionValidation.error}`);
    }

    const expectedValidation = validateExpectedMd(step.expectedMd);
    if (!expectedValidation.valid && expectedValidation.error) {
      errors.push(`手順${index + 1}: ${expectedValidation.error}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 並び替え入力のバリデーション
 */
export function validateReorderTestStepsInput(input: ReorderTestStepsInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(input.items)) {
    errors.push('並び替えデータは配列で指定してください。');
    return { valid: false, errors };
  }

  if (input.items.length === 0) {
    errors.push('並び替えデータが空です。');
    return { valid: false, errors };
  }

  // 重複IDチェック
  const ids = input.items.map((item) => item.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    errors.push('重複したIDが含まれています。');
  }

  // 各項目のバリデーション
  input.items.forEach((item, index) => {
    if (!item.id || item.id.trim() === '') {
      errors.push(`項目${index + 1}: IDは必須です。`);
    }

    const stepNoValidation = validateStepNo(item.stepNo);
    if (!stepNoValidation.valid && stepNoValidation.error) {
      errors.push(`項目${index + 1}: ${stepNoValidation.error}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * 次の手順番号を取得
 */
export function getNextStepNo(steps: TestStep[]): number {
  if (steps.length === 0) {
    return 1;
  }
  const maxStepNo = Math.max(...steps.map((s) => s.stepNo));
  return maxStepNo + 1;
}

/**
 * 手順番号を連番に再計算
 */
export function recalculateStepNumbers(steps: TestStep[]): Array<{ id: string; stepNo: number }> {
  const sortedSteps = [...steps].sort((a, b) => a.stepNo - b.stepNo);
  return sortedSteps.map((step, index) => ({
    id: step.id,
    stepNo: index + 1,
  }));
}

/**
 * 手順を挿入位置に応じて番号を調整
 */
export function adjustStepNumbersForInsert(
  steps: TestStep[],
  insertAtStepNo: number
): Array<{ id: string; stepNo: number }> {
  return steps
    .filter((s) => s.stepNo >= insertAtStepNo)
    .map((s) => ({
      id: s.id,
      stepNo: s.stepNo + 1,
    }));
}

/**
 * 手順を削除位置に応じて番号を調整
 */
export function adjustStepNumbersForDelete(
  steps: TestStep[],
  deletedStepNo: number
): Array<{ id: string; stepNo: number }> {
  return steps
    .filter((s) => s.stepNo > deletedStepNo)
    .map((s) => ({
      id: s.id,
      stepNo: s.stepNo - 1,
    }));
}
