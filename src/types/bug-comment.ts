/**
 * バグコメント型定義
 */

import { z } from 'zod';

// ============================================
// Zod Schemas
// ============================================

export const bugCommentContentSchema = z
  .string()
  .min(1, 'コメント内容は必須です')
  .max(10000, 'コメントは10000文字以内で入力してください');

export const createBugCommentSchema = z.object({
  bugId: z.bigint().or(z.number().transform((n) => BigInt(n))),
  authorId: z.bigint().or(z.number().transform((n) => BigInt(n))),
  parentId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  content: bugCommentContentSchema,
  isInternal: z.boolean().optional().default(false),
});

export const updateBugCommentSchema = z.object({
  content: bugCommentContentSchema.optional(),
  isInternal: z.boolean().optional(),
});

// ============================================
// Types
// ============================================

export type CreateBugCommentInput = z.infer<typeof createBugCommentSchema>;
export type UpdateBugCommentInput = z.infer<typeof updateBugCommentSchema>;

export interface BugComment {
  id: bigint;
  bugId: bigint;
  authorId: bigint;
  parentId: bigint | null;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BugCommentWithRelations extends BugComment {
  author?: { id: bigint; name: string; email: string; image: string | null };
  replies?: BugComment[];
}

// ============================================
// Validation Functions
// ============================================

export function validateCreateBugCommentInput(input: unknown): {
  valid: boolean;
  data?: CreateBugCommentInput;
  error?: string;
} {
  const result = createBugCommentSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateUpdateBugCommentInput(input: unknown): {
  valid: boolean;
  data?: UpdateBugCommentInput;
  error?: string;
} {
  const result = updateBugCommentSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}
