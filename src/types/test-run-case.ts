/**
 * テストランケース型定義
 */

// ============================================
// ステータス定義
// ============================================

export const TEST_RUN_CASE_STATUS = {
  NOT_RUN: 'NOT_RUN',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  SKIPPED: 'SKIPPED',
  RETEST: 'RETEST',
} as const;

export type TestRunCaseStatus = (typeof TEST_RUN_CASE_STATUS)[keyof typeof TEST_RUN_CASE_STATUS];

// ============================================
// 基本型定義
// ============================================

export interface TestRunCase {
  id: string;
  testRunId: string;
  testCaseId: string;
  assignedToId: string | null;
  status: TestRunCaseStatus;
  executedAt: string | null;
  executionTime: number | null;
  actualResult: string | null;
  defects: string | null;
  comment: string | null;
  reproducibility: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 再現性選択肢
export const REPRODUCIBILITY_OPTIONS = {
  ALWAYS: 'ALWAYS',
  SOMETIMES: 'SOMETIMES',
  RARELY: 'RARELY',
  ONCE: 'ONCE',
  UNKNOWN: 'UNKNOWN',
} as const;

export type Reproducibility =
  (typeof REPRODUCIBILITY_OPTIONS)[keyof typeof REPRODUCIBILITY_OPTIONS];

export const REPRODUCIBILITY_LABELS: Record<string, string> = {
  ALWAYS: '常に再現',
  SOMETIMES: '時々再現',
  RARELY: 'まれに再現',
  ONCE: '1回のみ',
  UNKNOWN: '不明',
};

export interface TestRunCaseWithRelations extends TestRunCase {
  testRun: {
    id: string;
    name: string;
  };
  testCase: {
    id: string;
    title: string;
    priority: string;
    description?: string | null;
    preconditions?: string | null;
    expectedResult?: string | null;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// ============================================
// 入力型定義
// ============================================

export interface CreateTestRunCaseInput {
  testRunId: string;
  testCaseId: string;
  assignedToId?: string | null;
  status?: TestRunCaseStatus;
  sortOrder?: number;
}

export interface UpdateTestRunCaseInput {
  assignedToId?: string | null;
  status?: TestRunCaseStatus;
  executedAt?: string | null;
  executionTime?: number | null;
  actualResult?: string | null;
  defects?: string | null;
  comment?: string | null;
  reproducibility?: string | null;
  sortOrder?: number;
}

export interface BulkCreateTestRunCaseInput {
  testRunId: string;
  testCaseIds: string[];
  assignedToId?: string | null;
}

export interface BulkUpdateTestRunCaseInput {
  ids: string[];
  assignedToId?: string | null;
  status?: TestRunCaseStatus;
}

// ============================================
// 検索パラメータ
// ============================================

export interface TestRunCaseSearchParams {
  testRunId?: string;
  testCaseId?: string;
  assignedToId?: string | null;
  status?: TestRunCaseStatus;
  query?: string;
}

// ============================================
// バリデーション定数
// ============================================

export const TEST_RUN_CASE_ACTUAL_RESULT_MAX_LENGTH = 10000;
export const TEST_RUN_CASE_DEFECTS_MAX_LENGTH = 5000;
export const TEST_RUN_CASE_COMMENT_MAX_LENGTH = 5000;

// ============================================
// バリデーション関数
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateTestRunCaseStatus(status: string): ValidationResult {
  const validStatuses = Object.values(TEST_RUN_CASE_STATUS);
  if (!validStatuses.includes(status as TestRunCaseStatus)) {
    return {
      valid: false,
      error: `ステータスは次のいずれかである必要があります: ${validStatuses.join(', ')}`,
    };
  }
  return { valid: true };
}

export function validateTestRunCaseActualResult(actualResult: string | null): ValidationResult {
  if (actualResult === null) {
    return { valid: true };
  }
  if (actualResult.length > TEST_RUN_CASE_ACTUAL_RESULT_MAX_LENGTH) {
    return {
      valid: false,
      error: `実行結果は${TEST_RUN_CASE_ACTUAL_RESULT_MAX_LENGTH}文字以内で入力してください。`,
    };
  }
  return { valid: true };
}

export function validateTestRunCaseDefects(defects: string | null): ValidationResult {
  if (defects === null) {
    return { valid: true };
  }
  if (defects.length > TEST_RUN_CASE_DEFECTS_MAX_LENGTH) {
    return {
      valid: false,
      error: `不具合情報は${TEST_RUN_CASE_DEFECTS_MAX_LENGTH}文字以内で入力してください。`,
    };
  }
  return { valid: true };
}

export function validateTestRunCaseComment(comment: string | null): ValidationResult {
  if (comment === null) {
    return { valid: true };
  }
  if (comment.length > TEST_RUN_CASE_COMMENT_MAX_LENGTH) {
    return {
      valid: false,
      error: `コメントは${TEST_RUN_CASE_COMMENT_MAX_LENGTH}文字以内で入力してください。`,
    };
  }
  return { valid: true };
}

export function validateExecutionTime(executionTime: number | null): ValidationResult {
  if (executionTime === null) {
    return { valid: true };
  }
  if (executionTime < 0) {
    return {
      valid: false,
      error: '実行時間は0以上の値を入力してください。',
    };
  }
  return { valid: true };
}

export function validateSortOrder(sortOrder: number): ValidationResult {
  if (sortOrder < 0) {
    return {
      valid: false,
      error: '表示順序は0以上の値を入力してください。',
    };
  }
  return { valid: true };
}

// ============================================
// 入力バリデーション
// ============================================

export interface CreateInputValidationResult {
  valid: boolean;
  data?: CreateTestRunCaseInput;
  errors?: Record<string, string>;
}

export interface UpdateInputValidationResult {
  valid: boolean;
  data?: UpdateTestRunCaseInput;
  errors?: Record<string, string>;
}

export function validateCreateTestRunCaseInput(
  input: Partial<CreateTestRunCaseInput>
): CreateInputValidationResult {
  const errors: Record<string, string> = {};

  // testRunId必須
  if (!input.testRunId) {
    errors.testRunId = 'テストランIDは必須です。';
  }

  // testCaseId必須
  if (!input.testCaseId) {
    errors.testCaseId = 'テストケースIDは必須です。';
  }

  // status検証
  if (input.status) {
    const statusResult = validateTestRunCaseStatus(input.status);
    if (!statusResult.valid) {
      errors.status = statusResult.error!;
    }
  }

  // sortOrder検証
  if (input.sortOrder !== undefined) {
    const sortResult = validateSortOrder(input.sortOrder);
    if (!sortResult.valid) {
      errors.sortOrder = sortResult.error!;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      testRunId: input.testRunId!,
      testCaseId: input.testCaseId!,
      assignedToId: input.assignedToId ?? null,
      status: input.status ?? TEST_RUN_CASE_STATUS.NOT_RUN,
      sortOrder: input.sortOrder ?? 0,
    },
  };
}

export function validateUpdateTestRunCaseInput(
  input: Partial<UpdateTestRunCaseInput>
): UpdateInputValidationResult {
  const errors: Record<string, string> = {};

  // status検証
  if (input.status) {
    const statusResult = validateTestRunCaseStatus(input.status);
    if (!statusResult.valid) {
      errors.status = statusResult.error!;
    }
  }

  // actualResult検証
  if (input.actualResult !== undefined) {
    const actualResultValidation = validateTestRunCaseActualResult(input.actualResult);
    if (!actualResultValidation.valid) {
      errors.actualResult = actualResultValidation.error!;
    }
  }

  // defects検証
  if (input.defects !== undefined) {
    const defectsValidation = validateTestRunCaseDefects(input.defects);
    if (!defectsValidation.valid) {
      errors.defects = defectsValidation.error!;
    }
  }

  // comment検証
  if (input.comment !== undefined) {
    const commentValidation = validateTestRunCaseComment(input.comment);
    if (!commentValidation.valid) {
      errors.comment = commentValidation.error!;
    }
  }

  // executionTime検証
  if (input.executionTime !== undefined) {
    const execTimeValidation = validateExecutionTime(input.executionTime);
    if (!execTimeValidation.valid) {
      errors.executionTime = execTimeValidation.error!;
    }
  }

  // sortOrder検証
  if (input.sortOrder !== undefined) {
    const sortResult = validateSortOrder(input.sortOrder);
    if (!sortResult.valid) {
      errors.sortOrder = sortResult.error!;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: input as UpdateTestRunCaseInput,
  };
}

// ============================================
// ユーティリティ関数
// ============================================

const TEST_RUN_CASE_STATUS_LABELS: Record<TestRunCaseStatus, string> = {
  NOT_RUN: '未実行',
  PASSED: '合格',
  FAILED: '不合格',
  BLOCKED: 'ブロック',
  SKIPPED: 'スキップ',
  RETEST: '再テスト',
};

const TEST_RUN_CASE_STATUS_COLORS: Record<TestRunCaseStatus, string> = {
  NOT_RUN: 'bg-gray-100 text-gray-800',
  PASSED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  BLOCKED: 'bg-yellow-100 text-yellow-800',
  SKIPPED: 'bg-purple-100 text-purple-800',
  RETEST: 'bg-blue-100 text-blue-800',
};

export function getTestRunCaseStatusLabel(status: TestRunCaseStatus): string {
  return TEST_RUN_CASE_STATUS_LABELS[status] || status;
}

export function getTestRunCaseStatusColor(status: TestRunCaseStatus): string {
  return TEST_RUN_CASE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}

/**
 * 実行時間をフォーマット（秒 → mm:ss形式）
 */
export function formatExecutionTime(seconds: number | null): string {
  if (seconds === null || seconds === 0) {
    return '-';
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * テストランケースの統計情報
 */
export interface TestRunCaseStats {
  total: number;
  notRun: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  retest: number;
  progress: number;
  passRate: number;
}

export function getTestRunCaseStats(cases: TestRunCase[]): TestRunCaseStats {
  const total = cases.length;
  const notRun = cases.filter((c) => c.status === TEST_RUN_CASE_STATUS.NOT_RUN).length;
  const passed = cases.filter((c) => c.status === TEST_RUN_CASE_STATUS.PASSED).length;
  const failed = cases.filter((c) => c.status === TEST_RUN_CASE_STATUS.FAILED).length;
  const blocked = cases.filter((c) => c.status === TEST_RUN_CASE_STATUS.BLOCKED).length;
  const skipped = cases.filter((c) => c.status === TEST_RUN_CASE_STATUS.SKIPPED).length;
  const retest = cases.filter((c) => c.status === TEST_RUN_CASE_STATUS.RETEST).length;

  const executed = total - notRun;
  const progress = total > 0 ? Math.round((executed / total) * 100) : 0;
  const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;

  return {
    total,
    notRun,
    passed,
    failed,
    blocked,
    skipped,
    retest,
    progress,
    passRate,
  };
}
