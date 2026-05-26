/**
 * 要求仕様型定義
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const RequirementType = {
  FUNCTIONAL: 'FUNCTIONAL',
  NON_FUNCTIONAL: 'NON_FUNCTIONAL',
  CONSTRAINT: 'CONSTRAINT',
  INTERFACE: 'INTERFACE',
  DESIGN: 'DESIGN',
  USER_STORY: 'USER_STORY',
} as const;

export type RequirementType = (typeof RequirementType)[keyof typeof RequirementType];

export const RequirementTypeLabels: Record<RequirementType, string> = {
  FUNCTIONAL: '機能要求',
  NON_FUNCTIONAL: '非機能要求',
  CONSTRAINT: '制約',
  INTERFACE: 'インターフェース',
  DESIGN: '設計',
  USER_STORY: 'ユーザーストーリー',
};

export const RequirementStatus = {
  DRAFT: 'DRAFT',
  PROPOSED: 'PROPOSED',
  APPROVED: 'APPROVED',
  IMPLEMENTED: 'IMPLEMENTED',
  VERIFIED: 'VERIFIED',
  DEPRECATED: 'DEPRECATED',
} as const;

export type RequirementStatus = (typeof RequirementStatus)[keyof typeof RequirementStatus];

export const RequirementStatusLabels: Record<RequirementStatus, string> = {
  DRAFT: '下書き',
  PROPOSED: '提案中',
  APPROVED: '承認済み',
  IMPLEMENTED: '実装済み',
  VERIFIED: '検証済み',
  DEPRECATED: '非推奨',
};

export const RequirementStatusColors: Record<RequirementStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  PROPOSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  IMPLEMENTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  VERIFIED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  DEPRECATED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export const RequirementPriority = {
  MUST_HAVE: 'MUST_HAVE',
  SHOULD_HAVE: 'SHOULD_HAVE',
  COULD_HAVE: 'COULD_HAVE',
  WONT_HAVE: 'WONT_HAVE',
} as const;

export type RequirementPriority = (typeof RequirementPriority)[keyof typeof RequirementPriority];

export const RequirementPriorityLabels: Record<RequirementPriority, string> = {
  MUST_HAVE: 'Must Have',
  SHOULD_HAVE: 'Should Have',
  COULD_HAVE: 'Could Have',
  WONT_HAVE: "Won't Have",
};

export const RequirementPriorityColors: Record<RequirementPriority, string> = {
  MUST_HAVE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  SHOULD_HAVE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  COULD_HAVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  WONT_HAVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

// ============================================
// Types
// ============================================

export interface Requirement {
  id: bigint;
  projectId: bigint;
  parentId: bigint | null;
  code: string;
  title: string;
  description: string | null;
  content: string | null;
  type: RequirementType;
  status: RequirementStatus;
  priority: RequirementPriority;
  version: string | null;
  source: string | null;
  rationale: string | null;
  acceptance: string | null;
  sortOrder: number;
  createdById: bigint;
  updatedById: bigint | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequirementWithRelations extends Requirement {
  project?: { id: bigint; name: string };
  parent?: { id: bigint; code: string; title: string } | null;
  children?: RequirementWithRelations[];
  createdBy?: { id: bigint; name: string; email: string };
  updatedBy?: { id: bigint; name: string; email: string } | null;
  testCases?: Array<{
    testCase: {
      id: bigint;
      title: string;
      testSpecId: bigint;
    };
  }>;
  _count?: {
    children: number;
    testCases: number;
  };
}

/**
 * APIレスポンス用（bigint → string変換済み）
 */
export interface RequirementSafe {
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  title: string;
  description: string | null;
  content: string | null;
  type: RequirementType;
  status: RequirementStatus;
  priority: RequirementPriority;
  version: string | null;
  source: string | null;
  rationale: string | null;
  acceptance: string | null;
  sortOrder: number;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  parent?: { id: string; code: string; title: string } | null;
  children?: RequirementSafe[];
  createdBy?: { id: string; name: string; email: string };
  updatedBy?: { id: string; name: string; email: string } | null;
  testCases?: Array<{
    testCaseId: string;
    title: string;
    testSpecId: string;
  }>;
  _count?: {
    children: number;
    testCases: number;
  };
}

// ============================================
// Zod Schemas
// ============================================

export const requirementTypeSchema = z.enum([
  'FUNCTIONAL',
  'NON_FUNCTIONAL',
  'CONSTRAINT',
  'INTERFACE',
  'DESIGN',
  'USER_STORY',
]);

export const requirementStatusSchema = z.enum([
  'DRAFT',
  'PROPOSED',
  'APPROVED',
  'IMPLEMENTED',
  'VERIFIED',
  'DEPRECATED',
]);

export const requirementPrioritySchema = z.enum([
  'MUST_HAVE',
  'SHOULD_HAVE',
  'COULD_HAVE',
  'WONT_HAVE',
]);

export const createRequirementSchema = z.object({
  projectId: z
    .bigint()
    .or(z.string().transform((s) => BigInt(s)))
    .or(z.number().transform((n) => BigInt(n))),
  parentId: z
    .bigint()
    .or(z.string().transform((s) => BigInt(s)))
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  code: z
    .string()
    .min(1, 'コードは必須です')
    .max(50, 'コードは50文字以内で入力してください')
    .regex(/^[A-Z0-9_-]+$/, 'コードは英大文字・数字・ハイフン・アンダースコアのみ使用可能です'),
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(500, 'タイトルは500文字以内で入力してください'),
  description: z.string().max(10000).optional().nullable(),
  content: z.string().optional().nullable(),
  type: requirementTypeSchema.optional().default('FUNCTIONAL'),
  status: requirementStatusSchema.optional().default('DRAFT'),
  priority: requirementPrioritySchema.optional().default('SHOULD_HAVE'),
  version: z.string().max(50).optional().nullable(),
  source: z.string().max(500).optional().nullable(),
  rationale: z.string().max(10000).optional().nullable(),
  acceptance: z.string().max(10000).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});

export const updateRequirementSchema = z.object({
  parentId: z
    .bigint()
    .or(z.string().transform((s) => BigInt(s)))
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  code: z
    .string()
    .min(1, 'コードは必須です')
    .max(50, 'コードは50文字以内で入力してください')
    .regex(/^[A-Z0-9_-]+$/, 'コードは英大文字・数字・ハイフン・アンダースコアのみ使用可能です')
    .optional(),
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(500, 'タイトルは500文字以内で入力してください')
    .optional(),
  description: z.string().max(10000).optional().nullable(),
  content: z.string().optional().nullable(),
  type: requirementTypeSchema.optional(),
  status: requirementStatusSchema.optional(),
  priority: requirementPrioritySchema.optional(),
  version: z.string().max(50).optional().nullable(),
  source: z.string().max(500).optional().nullable(),
  rationale: z.string().max(10000).optional().nullable(),
  acceptance: z.string().max(10000).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// ============================================
// Input Types
// ============================================

export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;
export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;

// ============================================
// Validation Functions
// ============================================

export function validateCreateRequirement(input: unknown): {
  valid: boolean;
  data?: CreateRequirementInput;
  error?: string;
} {
  const result = createRequirementSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateUpdateRequirement(input: unknown): {
  valid: boolean;
  data?: UpdateRequirementInput;
  error?: string;
} {
  const result = updateRequirementSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

// ============================================
// Helper Functions
// ============================================

/**
 * 要求仕様を安全な形式に変換
 */
export function toRequirementSafe(requirement: RequirementWithRelations): RequirementSafe {
  return {
    id: requirement.id.toString(),
    projectId: requirement.projectId.toString(),
    parentId: requirement.parentId?.toString() || null,
    code: requirement.code,
    title: requirement.title,
    description: requirement.description,
    content: requirement.content,
    type: requirement.type,
    status: requirement.status,
    priority: requirement.priority,
    version: requirement.version,
    source: requirement.source,
    rationale: requirement.rationale,
    acceptance: requirement.acceptance,
    sortOrder: requirement.sortOrder,
    createdById: requirement.createdById.toString(),
    updatedById: requirement.updatedById?.toString() || null,
    createdAt: requirement.createdAt.toISOString(),
    updatedAt: requirement.updatedAt.toISOString(),
    parent: requirement.parent
      ? {
          id: requirement.parent.id.toString(),
          code: requirement.parent.code,
          title: requirement.parent.title,
        }
      : null,
    children: requirement.children?.map(toRequirementSafe),
    createdBy: requirement.createdBy
      ? {
          id: requirement.createdBy.id.toString(),
          name: requirement.createdBy.name,
          email: requirement.createdBy.email,
        }
      : undefined,
    updatedBy: requirement.updatedBy
      ? {
          id: requirement.updatedBy.id.toString(),
          name: requirement.updatedBy.name,
          email: requirement.updatedBy.email,
        }
      : null,
    testCases: requirement.testCases?.map((tc) => ({
      testCaseId: tc.testCase.id.toString(),
      title: tc.testCase.title,
      testSpecId: tc.testCase.testSpecId.toString(),
    })),
    _count: requirement._count,
  };
}
