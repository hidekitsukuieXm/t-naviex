/**
 * バグワークフロー型定義
 */

import { z } from 'zod';

// ============================================
// Zod Schemas
// ============================================

export const createBugWorkflowSchema = z.object({
  projectId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  name: z
    .string()
    .min(1, 'ワークフロー名は必須です')
    .max(100, 'ワークフロー名は100文字以内で入力してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional().nullable(),
  isDefault: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
});

export const updateBugWorkflowSchema = createBugWorkflowSchema.partial();

export const createBugWorkflowTransitionSchema = z.object({
  workflowId: z.bigint().or(z.number().transform((n) => BigInt(n))),
  fromStatus: z.string().min(1).max(50),
  toStatus: z.string().min(1).max(50),
  name: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  buttonLabel: z.string().max(50).optional().nullable(),
  buttonColor: z.string().max(50).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
  requiredRole: z.string().max(50).optional().nullable(),
});

export const updateBugWorkflowTransitionSchema = createBugWorkflowTransitionSchema.partial();

// ============================================
// Types
// ============================================

export type CreateBugWorkflowInput = z.infer<typeof createBugWorkflowSchema>;
export type UpdateBugWorkflowInput = z.infer<typeof updateBugWorkflowSchema>;
export type CreateBugWorkflowTransitionInput = z.infer<typeof createBugWorkflowTransitionSchema>;
export type UpdateBugWorkflowTransitionInput = z.infer<typeof updateBugWorkflowTransitionSchema>;

export interface BugWorkflow {
  id: bigint;
  projectId: bigint | null;
  name: string;
  description: string | null;
  isDefault: boolean;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BugWorkflowTransition {
  id: bigint;
  workflowId: bigint;
  fromStatus: string;
  toStatus: string;
  name: string | null;
  description: string | null;
  buttonLabel: string | null;
  buttonColor: string | null;
  sortOrder: number;
  isEnabled: boolean;
  requiredRole: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BugWorkflowWithTransitions extends BugWorkflow {
  transitions: BugWorkflowTransition[];
}

// ============================================
// Validation Functions
// ============================================

export function validateCreateBugWorkflow(input: unknown): {
  valid: boolean;
  data?: CreateBugWorkflowInput;
  error?: string;
} {
  const result = createBugWorkflowSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateUpdateBugWorkflow(input: unknown): {
  valid: boolean;
  data?: UpdateBugWorkflowInput;
  error?: string;
} {
  const result = updateBugWorkflowSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateCreateBugWorkflowTransition(input: unknown): {
  valid: boolean;
  data?: CreateBugWorkflowTransitionInput;
  error?: string;
} {
  const result = createBugWorkflowTransitionSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateUpdateBugWorkflowTransition(input: unknown): {
  valid: boolean;
  data?: UpdateBugWorkflowTransitionInput;
  error?: string;
} {
  const result = updateBugWorkflowTransitionSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

// ============================================
// Helper Functions
// ============================================

/**
 * 指定されたワークフローと現在のステータスから、次に遷移可能なステータスを取得
 */
export function getAvailableTransitions(
  workflow: BugWorkflowWithTransitions,
  currentStatus: string
): BugWorkflowTransition[] {
  return workflow.transitions
    .filter((t) => t.fromStatus === currentStatus && t.isEnabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 指定された遷移が許可されているかどうかを確認
 */
export function isTransitionAllowed(
  workflow: BugWorkflowWithTransitions,
  fromStatus: string,
  toStatus: string
): boolean {
  return workflow.transitions.some(
    (t) => t.fromStatus === fromStatus && t.toStatus === toStatus && t.isEnabled
  );
}
