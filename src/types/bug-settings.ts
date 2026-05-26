/**
 * バグ設定型定義
 */

import { z } from 'zod';

// ============================================
// Base Schema
// ============================================

const baseMasterSchema = z.object({
  code: z
    .string()
    .min(1, 'コードは必須です')
    .max(50, 'コードは50文字以内で入力してください')
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'コードは英大文字で始まり、英大文字・数字・アンダースコアのみ使用可能です'
    ),
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional().nullable(),
  color: z.string().min(1, '色は必須です').max(50, '色は50文字以内で入力してください'),
  icon: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

// ============================================
// Bug Type Master
// ============================================

export const createBugTypeMasterSchema = baseMasterSchema.extend({
  projectId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
});

export const updateBugTypeMasterSchema = createBugTypeMasterSchema.partial();

export type CreateBugTypeMasterInput = z.infer<typeof createBugTypeMasterSchema>;
export type UpdateBugTypeMasterInput = z.infer<typeof updateBugTypeMasterSchema>;

export interface BugTypeMaster {
  id: bigint;
  projectId: bigint | null;
  code: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  sortOrder: number;
  isEnabled: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Bug Status Master
// ============================================

export const StatusCategory = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

export type StatusCategory = (typeof StatusCategory)[keyof typeof StatusCategory];

export const StatusCategoryLabels: Record<StatusCategory, string> = {
  OPEN: 'オープン',
  IN_PROGRESS: '対応中',
  RESOLVED: '解決済み',
  CLOSED: 'クローズ',
};

export const createBugStatusMasterSchema = baseMasterSchema.extend({
  projectId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  category: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  isFinal: z.boolean().default(false),
});

export const updateBugStatusMasterSchema = createBugStatusMasterSchema.partial();

export type CreateBugStatusMasterInput = z.infer<typeof createBugStatusMasterSchema>;
export type UpdateBugStatusMasterInput = z.infer<typeof updateBugStatusMasterSchema>;

export interface BugStatusMaster {
  id: bigint;
  projectId: bigint | null;
  code: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  category: StatusCategory;
  sortOrder: number;
  isEnabled: boolean;
  isDefault: boolean;
  isFinal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Bug Priority Master
// ============================================

export const createBugPriorityMasterSchema = baseMasterSchema.extend({
  projectId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  level: z.number().int().min(1).max(10).default(1),
});

export const updateBugPriorityMasterSchema = createBugPriorityMasterSchema.partial();

export type CreateBugPriorityMasterInput = z.infer<typeof createBugPriorityMasterSchema>;
export type UpdateBugPriorityMasterInput = z.infer<typeof updateBugPriorityMasterSchema>;

export interface BugPriorityMaster {
  id: bigint;
  projectId: bigint | null;
  code: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  level: number;
  sortOrder: number;
  isEnabled: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Bug Severity Master
// ============================================

export const createBugSeverityMasterSchema = baseMasterSchema.extend({
  projectId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  level: z.number().int().min(1).max(10).default(1),
});

export const updateBugSeverityMasterSchema = createBugSeverityMasterSchema.partial();

export type CreateBugSeverityMasterInput = z.infer<typeof createBugSeverityMasterSchema>;
export type UpdateBugSeverityMasterInput = z.infer<typeof updateBugSeverityMasterSchema>;

export interface BugSeverityMaster {
  id: bigint;
  projectId: bigint | null;
  code: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  level: number;
  sortOrder: number;
  isEnabled: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Validation Functions
// ============================================

export function validateCreateBugTypeMaster(input: unknown): {
  valid: boolean;
  data?: CreateBugTypeMasterInput;
  error?: string;
} {
  const result = createBugTypeMasterSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateUpdateBugTypeMaster(input: unknown): {
  valid: boolean;
  data?: UpdateBugTypeMasterInput;
  error?: string;
} {
  const result = updateBugTypeMasterSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateCreateBugStatusMaster(input: unknown): {
  valid: boolean;
  data?: CreateBugStatusMasterInput;
  error?: string;
} {
  const result = createBugStatusMasterSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateUpdateBugStatusMaster(input: unknown): {
  valid: boolean;
  data?: UpdateBugStatusMasterInput;
  error?: string;
} {
  const result = updateBugStatusMasterSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateCreateBugPriorityMaster(input: unknown): {
  valid: boolean;
  data?: CreateBugPriorityMasterInput;
  error?: string;
} {
  const result = createBugPriorityMasterSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateUpdateBugPriorityMaster(input: unknown): {
  valid: boolean;
  data?: UpdateBugPriorityMasterInput;
  error?: string;
} {
  const result = updateBugPriorityMasterSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateCreateBugSeverityMaster(input: unknown): {
  valid: boolean;
  data?: CreateBugSeverityMasterInput;
  error?: string;
} {
  const result = createBugSeverityMasterSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateUpdateBugSeverityMaster(input: unknown): {
  valid: boolean;
  data?: UpdateBugSeverityMasterInput;
  error?: string;
} {
  const result = updateBugSeverityMasterSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}
