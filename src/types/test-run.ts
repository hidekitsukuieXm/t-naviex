/**
 * テストラン型定義
 */

import { z } from 'zod';

// ============================================
// 定数
// ============================================

export const TEST_RUN_STATUS = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABORTED: 'ABORTED',
  BLOCKED: 'BLOCKED',
} as const;

export type TestRunStatus = (typeof TEST_RUN_STATUS)[keyof typeof TEST_RUN_STATUS];

export const TEST_RUN_STATUS_LABELS: Record<TestRunStatus, string> = {
  PLANNED: '計画中',
  IN_PROGRESS: '実行中',
  COMPLETED: '完了',
  ABORTED: '中止',
  BLOCKED: 'ブロック',
};

export const TEST_RUN_NAME_MAX_LENGTH = 255;
export const TEST_RUN_DESCRIPTION_MAX_LENGTH = 5000;
export const TEST_RUN_NOTES_MAX_LENGTH = 5000;

// ============================================
// 基本型
// ============================================

export interface TestRun {
  id: string;
  projectId: string;
  milestoneId: string | null;
  configurationId: string | null;
  name: string;
  description: string | null;
  status: TestRunStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  skippedCases: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestRunWithRelations extends TestRun {
  project: {
    id: string;
    name: string;
  };
  milestone: {
    id: string;
    name: string;
  } | null;
  configuration: {
    id: string;
    name: string;
  } | null;
}

// ============================================
// 入力型
// ============================================

export interface CreateTestRunInput {
  projectId: string;
  milestoneId?: string | null;
  configurationId?: string | null;
  name: string;
  description?: string | null;
  status?: TestRunStatus;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  notes?: string | null;
}

export interface UpdateTestRunInput {
  milestoneId?: string | null;
  configurationId?: string | null;
  name?: string;
  description?: string | null;
  status?: TestRunStatus;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  totalCases?: number;
  passedCases?: number;
  failedCases?: number;
  blockedCases?: number;
  skippedCases?: number;
  notes?: string | null;
}

export interface TestRunSearchParams {
  projectId: string;
  milestoneId?: string | null;
  configurationId?: string | null;
  status?: TestRunStatus;
  query?: string;
}

// ============================================
// バリデーション
// ============================================

export const testRunNameSchema = z
  .string()
  .min(1, 'テストラン名は必須です。')
  .max(
    TEST_RUN_NAME_MAX_LENGTH,
    `テストラン名は${TEST_RUN_NAME_MAX_LENGTH}文字以内で入力してください。`
  )
  .refine((val) => val.trim().length > 0, 'テストラン名は空白のみにできません。');

export const testRunDescriptionSchema = z
  .string()
  .max(
    TEST_RUN_DESCRIPTION_MAX_LENGTH,
    `説明は${TEST_RUN_DESCRIPTION_MAX_LENGTH}文字以内で入力してください。`
  )
  .nullable()
  .optional();

export const testRunNotesSchema = z
  .string()
  .max(TEST_RUN_NOTES_MAX_LENGTH, `備考は${TEST_RUN_NOTES_MAX_LENGTH}文字以内で入力してください。`)
  .nullable()
  .optional();

export const testRunStatusSchema = z.enum([
  TEST_RUN_STATUS.PLANNED,
  TEST_RUN_STATUS.IN_PROGRESS,
  TEST_RUN_STATUS.COMPLETED,
  TEST_RUN_STATUS.ABORTED,
  TEST_RUN_STATUS.BLOCKED,
]);

export const testRunDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください。')
  .nullable()
  .optional();

export const createTestRunSchema = z.object({
  projectId: z.string().min(1, 'プロジェクトIDは必須です。'),
  milestoneId: z.string().nullable().optional(),
  configurationId: z.string().nullable().optional(),
  name: testRunNameSchema,
  description: testRunDescriptionSchema,
  status: testRunStatusSchema.optional(),
  plannedStartDate: testRunDateSchema,
  plannedEndDate: testRunDateSchema,
  notes: testRunNotesSchema,
});

export const updateTestRunSchema = z.object({
  milestoneId: z.string().nullable().optional(),
  configurationId: z.string().nullable().optional(),
  name: testRunNameSchema.optional(),
  description: testRunDescriptionSchema,
  status: testRunStatusSchema.optional(),
  plannedStartDate: testRunDateSchema,
  plannedEndDate: testRunDateSchema,
  actualStartDate: testRunDateSchema,
  actualEndDate: testRunDateSchema,
  totalCases: z.number().int().min(0).optional(),
  passedCases: z.number().int().min(0).optional(),
  failedCases: z.number().int().min(0).optional(),
  blockedCases: z.number().int().min(0).optional(),
  skippedCases: z.number().int().min(0).optional(),
  notes: testRunNotesSchema,
});

// ============================================
// バリデーション関数
// ============================================

export function validateTestRunName(name: string): { valid: boolean; error?: string } {
  const result = testRunNameSchema.safeParse(name);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateTestRunDescription(description: string | null): {
  valid: boolean;
  error?: string;
} {
  const result = testRunDescriptionSchema.safeParse(description);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateTestRunStatus(status: string): { valid: boolean; error?: string } {
  const result = testRunStatusSchema.safeParse(status);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: '無効なステータスです。' };
}

export function validateTestRunDate(date: string | null): { valid: boolean; error?: string } {
  const result = testRunDateSchema.safeParse(date);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateCreateTestRunInput(input: unknown): {
  valid: boolean;
  data?: CreateTestRunInput;
  errors?: Record<string, string>;
} {
  const result = createTestRunSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data as CreateTestRunInput };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || 'root';
    errors[path] = issue.message;
  }
  return { valid: false, errors };
}

export function validateUpdateTestRunInput(input: unknown): {
  valid: boolean;
  data?: UpdateTestRunInput;
  errors?: Record<string, string>;
} {
  const result = updateTestRunSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data as UpdateTestRunInput };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || 'root';
    errors[path] = issue.message;
  }
  return { valid: false, errors };
}

// ============================================
// ヘルパー関数
// ============================================

export function getTestRunStatusLabel(status: TestRunStatus): string {
  return TEST_RUN_STATUS_LABELS[status] || status;
}

export function isValidTestRunStatus(status: string): status is TestRunStatus {
  return Object.values(TEST_RUN_STATUS).includes(status as TestRunStatus);
}

export function getTestRunStatusColor(status: TestRunStatus): string {
  const colors: Record<TestRunStatus, string> = {
    PLANNED: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    ABORTED: 'bg-red-100 text-red-800',
    BLOCKED: 'bg-yellow-100 text-yellow-800',
  };
  return colors[status] || colors.PLANNED;
}

export function getTestRunProgress(testRun: TestRun): number {
  if (testRun.totalCases === 0) {
    return 0;
  }
  const executed =
    testRun.passedCases + testRun.failedCases + testRun.blockedCases + testRun.skippedCases;
  return Math.round((executed / testRun.totalCases) * 100);
}

export function getTestRunPassRate(testRun: TestRun): number {
  const executed = testRun.passedCases + testRun.failedCases;
  if (executed === 0) {
    return 0;
  }
  return Math.round((testRun.passedCases / executed) * 100);
}

export function isTestRunOverdue(testRun: TestRun): boolean {
  if (!testRun.plannedEndDate || testRun.status === 'COMPLETED' || testRun.status === 'ABORTED') {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(testRun.plannedEndDate);
  return endDate < today;
}

export function getTestRunStatsSummary(testRun: TestRun): {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  notRun: number;
  progress: number;
  passRate: number;
} {
  const executed =
    testRun.passedCases + testRun.failedCases + testRun.blockedCases + testRun.skippedCases;
  const notRun = testRun.totalCases - executed;

  return {
    total: testRun.totalCases,
    passed: testRun.passedCases,
    failed: testRun.failedCases,
    blocked: testRun.blockedCases,
    skipped: testRun.skippedCases,
    notRun: Math.max(0, notRun),
    progress: getTestRunProgress(testRun),
    passRate: getTestRunPassRate(testRun),
  };
}
