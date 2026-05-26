/**
 * 外部連携設定型定義
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const IntegrationType = {
  REDMINE: 'REDMINE',
  BACKLOG: 'BACKLOG',
  JIRA: 'JIRA',
  GITHUB: 'GITHUB',
  GITLAB: 'GITLAB',
  AZURE_DEVOPS: 'AZURE_DEVOPS',
} as const;

export type IntegrationType = (typeof IntegrationType)[keyof typeof IntegrationType];

export const IntegrationTypeLabels: Record<IntegrationType, string> = {
  REDMINE: 'Redmine',
  BACKLOG: 'Backlog',
  JIRA: 'JIRA',
  GITHUB: 'GitHub',
  GITLAB: 'GitLab',
  AZURE_DEVOPS: 'Azure DevOps',
};

// ============================================
// Types
// ============================================

export interface ExternalIntegration {
  id: bigint;
  projectId: bigint | null;
  name: string;
  integrationType: IntegrationType;
  baseUrl: string;
  apiKeyEncrypted: string | null;
  username: string | null;
  passwordEncrypted: string | null;
  projectKey: string | null;
  options: Record<string, unknown> | null;
  isEnabled: boolean;
  lastTestedAt: Date | null;
  lastTestResult: boolean | null;
  lastTestError: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: bigint;
  updatedById: bigint | null;
}

export interface ExternalIntegrationWithRelations extends ExternalIntegration {
  project?: { id: bigint; name: string } | null;
  createdBy?: { id: bigint; name: string; email: string };
  updatedBy?: { id: bigint; name: string; email: string } | null;
}

/**
 * APIレスポンス用（暗号化されたフィールドを除外）
 */
export interface ExternalIntegrationSafe {
  id: string;
  projectId: string | null;
  name: string;
  integrationType: IntegrationType;
  baseUrl: string;
  hasApiKey: boolean;
  username: string | null;
  hasPassword: boolean;
  projectKey: string | null;
  options: Record<string, unknown> | null;
  isEnabled: boolean;
  lastTestedAt: string | null;
  lastTestResult: boolean | null;
  lastTestError: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
  project?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string; email: string };
  updatedBy?: { id: string; name: string; email: string } | null;
}

// ============================================
// Zod Schemas
// ============================================

export const integrationTypeSchema = z.enum([
  'REDMINE',
  'BACKLOG',
  'JIRA',
  'GITHUB',
  'GITLAB',
  'AZURE_DEVOPS',
]);

export const createExternalIntegrationSchema = z.object({
  projectId: z
    .bigint()
    .or(z.number().transform((n) => BigInt(n)))
    .optional()
    .nullable(),
  name: z.string().min(1, '名前は必須です').max(100, '名前は100文字以内で入力してください'),
  integrationType: integrationTypeSchema,
  baseUrl: z
    .string()
    .min(1, 'URLは必須です')
    .max(500, 'URLは500文字以内で入力してください')
    .url('有効なURLを入力してください'),
  apiKey: z.string().max(1000).optional().nullable(),
  username: z.string().max(100).optional().nullable(),
  password: z.string().max(500).optional().nullable(),
  projectKey: z.string().max(100).optional().nullable(),
  options: z.record(z.unknown()).optional().nullable(),
  isEnabled: z.boolean().optional().default(true),
});

export const updateExternalIntegrationSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内で入力してください')
    .optional(),
  baseUrl: z
    .string()
    .min(1, 'URLは必須です')
    .max(500, 'URLは500文字以内で入力してください')
    .url('有効なURLを入力してください')
    .optional(),
  apiKey: z.string().max(1000).optional().nullable(),
  username: z.string().max(100).optional().nullable(),
  password: z.string().max(500).optional().nullable(),
  projectKey: z.string().max(100).optional().nullable(),
  options: z.record(z.unknown()).optional().nullable(),
  isEnabled: z.boolean().optional(),
});

// ============================================
// Input Types
// ============================================

export type CreateExternalIntegrationInput = z.infer<typeof createExternalIntegrationSchema>;
export type UpdateExternalIntegrationInput = z.infer<typeof updateExternalIntegrationSchema>;

// ============================================
// Validation Functions
// ============================================

export function validateCreateExternalIntegration(input: unknown): {
  valid: boolean;
  data?: CreateExternalIntegrationInput;
  error?: string;
} {
  const result = createExternalIntegrationSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

export function validateUpdateExternalIntegration(input: unknown): {
  valid: boolean;
  data?: UpdateExternalIntegrationInput;
  error?: string;
} {
  const result = updateExternalIntegrationSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message || 'バリデーションエラー' };
}

// ============================================
// Helper Functions
// ============================================

/**
 * 外部連携設定を安全な形式に変換
 */
export function toExternalIntegrationSafe(
  integration: ExternalIntegrationWithRelations
): ExternalIntegrationSafe {
  return {
    id: integration.id.toString(),
    projectId: integration.projectId?.toString() || null,
    name: integration.name,
    integrationType: integration.integrationType,
    baseUrl: integration.baseUrl,
    hasApiKey: !!integration.apiKeyEncrypted,
    username: integration.username,
    hasPassword: !!integration.passwordEncrypted,
    projectKey: integration.projectKey,
    options: integration.options as Record<string, unknown> | null,
    isEnabled: integration.isEnabled,
    lastTestedAt: integration.lastTestedAt?.toISOString() || null,
    lastTestResult: integration.lastTestResult,
    lastTestError: integration.lastTestError,
    createdAt: integration.createdAt.toISOString(),
    updatedAt: integration.updatedAt.toISOString(),
    createdById: integration.createdById.toString(),
    updatedById: integration.updatedById?.toString() || null,
    project: integration.project
      ? { id: integration.project.id.toString(), name: integration.project.name }
      : null,
    createdBy: integration.createdBy
      ? {
          id: integration.createdBy.id.toString(),
          name: integration.createdBy.name,
          email: integration.createdBy.email,
        }
      : undefined,
    updatedBy: integration.updatedBy
      ? {
          id: integration.updatedBy.id.toString(),
          name: integration.updatedBy.name,
          email: integration.updatedBy.email,
        }
      : null,
  };
}

/**
 * 接続テスト結果
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}
