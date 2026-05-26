/**
 * バグ型定義
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const BugType = {
  BUG: 'BUG',
  FEATURE: 'FEATURE',
  INQUIRY: 'INQUIRY',
  TASK: 'TASK',
  IMPROVEMENT: 'IMPROVEMENT',
} as const;

export type BugType = (typeof BugType)[keyof typeof BugType];

export const BugTypeLabels: Record<BugType, string> = {
  BUG: '不具合',
  FEATURE: '機能要望',
  INQUIRY: '問い合わせ',
  TASK: 'タスク',
  IMPROVEMENT: '改善',
};

export const BugPriority = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type BugPriority = (typeof BugPriority)[keyof typeof BugPriority];

export const BugPriorityLabels: Record<BugPriority, string> = {
  CRITICAL: '緊急',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

export const BugSeverity = {
  BLOCKER: 'BLOCKER',
  CRITICAL: 'CRITICAL',
  MAJOR: 'MAJOR',
  MINOR: 'MINOR',
  TRIVIAL: 'TRIVIAL',
} as const;

export type BugSeverity = (typeof BugSeverity)[keyof typeof BugSeverity];

export const BugSeverityLabels: Record<BugSeverity, string> = {
  BLOCKER: 'ブロッカー',
  CRITICAL: '致命的',
  MAJOR: '重大',
  MINOR: '軽微',
  TRIVIAL: '些細',
};

export const BugStatus = {
  NEW: 'NEW',
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  VERIFIED: 'VERIFIED',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
  DEFERRED: 'DEFERRED',
} as const;

export type BugStatus = (typeof BugStatus)[keyof typeof BugStatus];

export const BugStatusLabels: Record<BugStatus, string> = {
  NEW: '新規',
  OPEN: 'オープン',
  IN_PROGRESS: '対応中',
  RESOLVED: '解決済み',
  VERIFIED: '検証済み',
  CLOSED: 'クローズ',
  REJECTED: '却下',
  DEFERRED: '保留',
};

// ============================================
// Zod Schemas
// ============================================

export const bugTitleSchema = z
  .string()
  .min(1, 'タイトルは必須です')
  .max(500, 'タイトルは500文字以内で入力してください');

export const bugDescriptionSchema = z
  .string()
  .max(10000, '説明は10000文字以内で入力してください')
  .optional()
  .nullable();

export const bugTypeSchema = z.enum(['BUG', 'FEATURE', 'INQUIRY', 'TASK', 'IMPROVEMENT']);

export const bugPrioritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);

export const bugSeveritySchema = z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL']);

export const bugStatusSchema = z.enum([
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'VERIFIED',
  'CLOSED',
  'REJECTED',
  'DEFERRED',
]);

export const createBugSchema = z.object({
  projectId: z.bigint().or(z.number().transform((n) => BigInt(n))),
  title: bugTitleSchema,
  description: bugDescriptionSchema,
  type: bugTypeSchema.optional().default('BUG'),
  priority: bugPrioritySchema.optional().default('MEDIUM'),
  severity: bugSeveritySchema.optional().default('MAJOR'),
  assigneeId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  reporterId: z.bigint().or(z.number().transform((n) => BigInt(n))),
  parentBugId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  testResultId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  stepsToReproduce: z.string().max(10000).optional().nullable(),
  expectedResult: z.string().max(10000).optional().nullable(),
  actualResult: z.string().max(10000).optional().nullable(),
  environment: z.string().max(500).optional().nullable(),
  version: z.string().max(100).optional().nullable(),
  dueDate: z
    .date()
    .or(z.string().transform((s) => new Date(s)))
    .optional()
    .nullable(),
});

export const updateBugSchema = z.object({
  title: bugTitleSchema.optional(),
  description: bugDescriptionSchema,
  type: bugTypeSchema.optional(),
  status: bugStatusSchema.optional(),
  priority: bugPrioritySchema.optional(),
  severity: bugSeveritySchema.optional(),
  assigneeId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  parentBugId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  stepsToReproduce: z.string().max(10000).optional().nullable(),
  expectedResult: z.string().max(10000).optional().nullable(),
  actualResult: z.string().max(10000).optional().nullable(),
  environment: z.string().max(500).optional().nullable(),
  version: z.string().max(100).optional().nullable(),
  fixedVersion: z.string().max(100).optional().nullable(),
  dueDate: z
    .date()
    .or(z.string().transform((s) => new Date(s)))
    .optional()
    .nullable(),
  externalId: z.string().max(100).optional().nullable(),
  externalUrl: z.string().max(500).optional().nullable(),
});

// ============================================
// Types
// ============================================

export type CreateBugInput = z.infer<typeof createBugSchema>;
export type UpdateBugInput = z.infer<typeof updateBugSchema>;

export interface Bug {
  id: bigint;
  projectId: bigint;
  parentBugId: bigint | null;
  testResultId: bigint | null;
  title: string;
  description: string | null;
  type: BugType;
  status: BugStatus;
  priority: BugPriority;
  severity: BugSeverity;
  assigneeId: bigint | null;
  reporterId: bigint;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  version: string | null;
  fixedVersion: string | null;
  dueDate: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  externalId: string | null;
  externalUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BugWithRelations extends Bug {
  project?: { id: bigint; name: string };
  parentBug?: { id: bigint; title: string } | null;
  childBugs?: { id: bigint; title: string; status: BugStatus }[];
  testResult?: { id: bigint } | null;
  assignee?: { id: bigint; name: string; email: string } | null;
  reporter?: { id: bigint; name: string; email: string };
}

export interface BugListFilters {
  projectId: bigint;
  status?: BugStatus | BugStatus[];
  type?: BugType | BugType[];
  priority?: BugPriority | BugPriority[];
  severity?: BugSeverity | BugSeverity[];
  assigneeId?: bigint | null;
  reporterId?: bigint;
  parentBugId?: bigint | null;
  query?: string;
}

export interface BugListOptions {
  skip?: number;
  take?: number;
  orderBy?: {
    field: 'createdAt' | 'updatedAt' | 'priority' | 'severity' | 'status' | 'title' | 'dueDate';
    direction: 'asc' | 'desc';
  };
}

// ============================================
// Validation Functions
// ============================================

export function validateBugTitle(title: string): { valid: boolean; error?: string } {
  const result = bugTitleSchema.safeParse(title);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateCreateBugInput(input: unknown): {
  valid: boolean;
  data?: CreateBugInput;
  error?: string;
} {
  const result = createBugSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateUpdateBugInput(input: unknown): {
  valid: boolean;
  data?: UpdateBugInput;
  error?: string;
} {
  const result = updateBugSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

// ============================================
// Helper Functions
// ============================================

export function isOpenStatus(status: BugStatus): boolean {
  return ['NEW', 'OPEN', 'IN_PROGRESS'].includes(status);
}

export function isClosedStatus(status: BugStatus): boolean {
  return ['CLOSED', 'REJECTED'].includes(status);
}

export function isResolvedStatus(status: BugStatus): boolean {
  return ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(status);
}

export function getNextStatuses(currentStatus: BugStatus): BugStatus[] {
  const transitions: Record<BugStatus, BugStatus[]> = {
    NEW: ['OPEN', 'IN_PROGRESS', 'REJECTED', 'DEFERRED'],
    OPEN: ['IN_PROGRESS', 'RESOLVED', 'REJECTED', 'DEFERRED'],
    IN_PROGRESS: ['RESOLVED', 'OPEN', 'DEFERRED'],
    RESOLVED: ['VERIFIED', 'OPEN', 'IN_PROGRESS'],
    VERIFIED: ['CLOSED', 'OPEN'],
    CLOSED: ['OPEN'],
    REJECTED: ['OPEN'],
    DEFERRED: ['OPEN', 'IN_PROGRESS'],
  };
  return transitions[currentStatus] || [];
}

/**
 * バグ統計情報
 */
export interface BugStatistics {
  total: number;
  byStatus: Record<BugStatus, number>;
  byPriority: Record<BugPriority, number>;
  bySeverity: Record<BugSeverity, number>;
  byType: Record<BugType, number>;
  openCount: number;
  closedCount: number;
  resolvedCount: number;
}

export function calculateBugStatistics(bugs: Bug[]): BugStatistics {
  const stats: BugStatistics = {
    total: bugs.length,
    byStatus: {
      NEW: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      VERIFIED: 0,
      CLOSED: 0,
      REJECTED: 0,
      DEFERRED: 0,
    },
    byPriority: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    },
    bySeverity: {
      BLOCKER: 0,
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      TRIVIAL: 0,
    },
    byType: {
      BUG: 0,
      FEATURE: 0,
      INQUIRY: 0,
      TASK: 0,
      IMPROVEMENT: 0,
    },
    openCount: 0,
    closedCount: 0,
    resolvedCount: 0,
  };

  for (const bug of bugs) {
    stats.byStatus[bug.status]++;
    stats.byPriority[bug.priority]++;
    stats.bySeverity[bug.severity]++;
    stats.byType[bug.type]++;

    if (isOpenStatus(bug.status)) {
      stats.openCount++;
    }
    if (isClosedStatus(bug.status)) {
      stats.closedCount++;
    }
    if (isResolvedStatus(bug.status)) {
      stats.resolvedCount++;
    }
  }

  return stats;
}
