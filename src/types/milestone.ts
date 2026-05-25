/**
 * マイルストーン型定義
 */

import { z } from 'zod';

// ============================================
// 定数
// ============================================

export const MILESTONE_STATUS = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type MilestoneStatus = (typeof MILESTONE_STATUS)[keyof typeof MILESTONE_STATUS];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PLANNED: '計画中',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
};

export const MILESTONE_NAME_MAX_LENGTH = 255;
export const MILESTONE_DESCRIPTION_MAX_LENGTH = 5000;

// ============================================
// 基本型
// ============================================

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: MilestoneStatus;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneWithProject extends Milestone {
  project: {
    id: string;
    name: string;
  };
}

// ============================================
// 入力型
// ============================================

export interface CreateMilestoneInput {
  projectId: string;
  name: string;
  description?: string | null;
  status?: MilestoneStatus;
  startDate?: string | null;
  dueDate?: string | null;
  sortOrder?: number;
}

export interface UpdateMilestoneInput {
  name?: string;
  description?: string | null;
  status?: MilestoneStatus;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  sortOrder?: number;
}

export interface MilestoneSearchParams {
  projectId: string;
  status?: MilestoneStatus;
  query?: string;
}

export interface UpdateSortOrderInput {
  id: string;
  sortOrder: number;
}

// ============================================
// バリデーション
// ============================================

export const milestoneNameSchema = z
  .string()
  .min(1, 'マイルストーン名は必須です。')
  .max(
    MILESTONE_NAME_MAX_LENGTH,
    `マイルストーン名は${MILESTONE_NAME_MAX_LENGTH}文字以内で入力してください。`
  )
  .refine((val) => val.trim().length > 0, 'マイルストーン名は空白のみにできません。');

export const milestoneDescriptionSchema = z
  .string()
  .max(
    MILESTONE_DESCRIPTION_MAX_LENGTH,
    `説明は${MILESTONE_DESCRIPTION_MAX_LENGTH}文字以内で入力してください。`
  )
  .nullable()
  .optional();

export const milestoneStatusSchema = z.enum([
  MILESTONE_STATUS.PLANNED,
  MILESTONE_STATUS.IN_PROGRESS,
  MILESTONE_STATUS.COMPLETED,
  MILESTONE_STATUS.CANCELLED,
]);

export const milestoneDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください。')
  .nullable()
  .optional();

export const createMilestoneSchema = z.object({
  projectId: z.string().min(1, 'プロジェクトIDは必須です。'),
  name: milestoneNameSchema,
  description: milestoneDescriptionSchema,
  status: milestoneStatusSchema.optional(),
  startDate: milestoneDateSchema,
  dueDate: milestoneDateSchema,
  sortOrder: z.number().int().min(0).optional(),
});

export const updateMilestoneSchema = z.object({
  name: milestoneNameSchema.optional(),
  description: milestoneDescriptionSchema,
  status: milestoneStatusSchema.optional(),
  startDate: milestoneDateSchema,
  dueDate: milestoneDateSchema,
  completedAt: z.string().datetime().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ============================================
// バリデーション関数
// ============================================

export function validateMilestoneName(name: string): { valid: boolean; error?: string } {
  const result = milestoneNameSchema.safeParse(name);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateMilestoneDescription(description: string | null): {
  valid: boolean;
  error?: string;
} {
  const result = milestoneDescriptionSchema.safeParse(description);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateMilestoneStatus(status: string): { valid: boolean; error?: string } {
  const result = milestoneStatusSchema.safeParse(status);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: '無効なステータスです。' };
}

export function validateMilestoneDate(date: string | null): { valid: boolean; error?: string } {
  const result = milestoneDateSchema.safeParse(date);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateCreateMilestoneInput(input: unknown): {
  valid: boolean;
  data?: CreateMilestoneInput;
  errors?: Record<string, string>;
} {
  const result = createMilestoneSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data as CreateMilestoneInput };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || 'root';
    errors[path] = issue.message;
  }
  return { valid: false, errors };
}

export function validateUpdateMilestoneInput(input: unknown): {
  valid: boolean;
  data?: UpdateMilestoneInput;
  errors?: Record<string, string>;
} {
  const result = updateMilestoneSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data as UpdateMilestoneInput };
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

export function getMilestoneStatusLabel(status: MilestoneStatus): string {
  return MILESTONE_STATUS_LABELS[status] || status;
}

export function isValidMilestoneStatus(status: string): status is MilestoneStatus {
  return Object.values(MILESTONE_STATUS).includes(status as MilestoneStatus);
}

export function getMilestoneStatusColor(status: MilestoneStatus): string {
  const colors: Record<MilestoneStatus, string> = {
    PLANNED: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  return colors[status] || colors.PLANNED;
}

export function isMilestoneOverdue(milestone: Milestone): boolean {
  if (!milestone.dueDate || milestone.status === 'COMPLETED' || milestone.status === 'CANCELLED') {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(milestone.dueDate);
  return dueDate < today;
}

export function getMilestoneProgress(milestone: Milestone): number {
  // プログレス計算はテスト実行結果と統合時に実装予定
  // 現時点ではステータスベースで簡易計算
  switch (milestone.status) {
    case 'PLANNED':
      return 0;
    case 'IN_PROGRESS':
      return 50;
    case 'COMPLETED':
      return 100;
    case 'CANCELLED':
      return 0;
    default:
      return 0;
  }
}
