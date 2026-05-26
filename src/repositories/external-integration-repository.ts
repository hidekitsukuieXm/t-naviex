/**
 * 外部連携設定リポジトリ
 */

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import type {
  ExternalIntegration,
  ExternalIntegrationWithRelations,
  CreateExternalIntegrationInput,
  UpdateExternalIntegrationInput,
  IntegrationType,
} from '@/types/external-integration';

// ============================================
// セレクト定義
// ============================================

const integrationSelect = {
  id: true,
  projectId: true,
  name: true,
  integrationType: true,
  baseUrl: true,
  apiKeyEncrypted: true,
  username: true,
  passwordEncrypted: true,
  projectKey: true,
  options: true,
  isEnabled: true,
  lastTestedAt: true,
  lastTestResult: true,
  lastTestError: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
};

const integrationWithRelationsSelect = {
  ...integrationSelect,
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

// ============================================
// 一覧取得
// ============================================

export async function getExternalIntegrations(
  projectId?: bigint
): Promise<ExternalIntegrationWithRelations[]> {
  const where = projectId !== undefined ? { projectId } : {};

  const integrations = await prisma.externalIntegration.findMany({
    where,
    select: integrationWithRelationsSelect,
    orderBy: [{ name: 'asc' }],
  });

  return integrations as unknown as ExternalIntegrationWithRelations[];
}

// ============================================
// 詳細取得
// ============================================

export async function getExternalIntegrationById(
  id: bigint
): Promise<ExternalIntegrationWithRelations | null> {
  const integration = await prisma.externalIntegration.findUnique({
    where: { id },
    select: integrationWithRelationsSelect,
  });

  return integration as unknown as ExternalIntegrationWithRelations | null;
}

// ============================================
// 作成
// ============================================

export async function createExternalIntegration(
  input: CreateExternalIntegrationInput,
  createdById: bigint
): Promise<ExternalIntegration> {
  const integration = await prisma.externalIntegration.create({
    data: {
      projectId: input.projectId ?? null,
      name: input.name,
      integrationType: input.integrationType as IntegrationType,
      baseUrl: input.baseUrl,
      apiKeyEncrypted: input.apiKey ? encrypt(input.apiKey) : null,
      username: input.username ?? null,
      passwordEncrypted: input.password ? encrypt(input.password) : null,
      projectKey: input.projectKey ?? null,
      options: input.options ?? null,
      isEnabled: input.isEnabled ?? true,
      createdById,
    },
    select: integrationSelect,
  });

  return integration as unknown as ExternalIntegration;
}

// ============================================
// 更新
// ============================================

export async function updateExternalIntegration(
  id: bigint,
  input: UpdateExternalIntegrationInput,
  updatedById: bigint
): Promise<ExternalIntegration> {
  const updateData: Record<string, unknown> = {
    updatedById,
  };

  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  if (input.baseUrl !== undefined) {
    updateData.baseUrl = input.baseUrl;
  }
  if (input.apiKey !== undefined) {
    updateData.apiKeyEncrypted = input.apiKey ? encrypt(input.apiKey) : null;
  }
  if (input.username !== undefined) {
    updateData.username = input.username;
  }
  if (input.password !== undefined) {
    updateData.passwordEncrypted = input.password ? encrypt(input.password) : null;
  }
  if (input.projectKey !== undefined) {
    updateData.projectKey = input.projectKey;
  }
  if (input.options !== undefined) {
    updateData.options = input.options;
  }
  if (input.isEnabled !== undefined) {
    updateData.isEnabled = input.isEnabled;
  }

  const integration = await prisma.externalIntegration.update({
    where: { id },
    data: updateData,
    select: integrationSelect,
  });

  return integration as unknown as ExternalIntegration;
}

// ============================================
// 削除
// ============================================

export async function deleteExternalIntegration(id: bigint): Promise<void> {
  await prisma.externalIntegration.delete({
    where: { id },
  });
}

// ============================================
// 接続テスト結果更新
// ============================================

export async function updateTestResult(
  id: bigint,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await prisma.externalIntegration.update({
    where: { id },
    data: {
      lastTestedAt: new Date(),
      lastTestResult: success,
      lastTestError: errorMessage ?? null,
    },
  });
}

// ============================================
// 存在確認
// ============================================

export async function externalIntegrationExists(id: bigint): Promise<boolean> {
  const count = await prisma.externalIntegration.count({
    where: { id },
  });
  return count > 0;
}

// ============================================
// 認証情報取得（復号化）
// ============================================

export async function getDecryptedCredentials(
  id: bigint
): Promise<{ apiKey: string | null; password: string | null } | null> {
  const integration = await prisma.externalIntegration.findUnique({
    where: { id },
    select: {
      apiKeyEncrypted: true,
      passwordEncrypted: true,
    },
  });

  if (!integration) {
    return null;
  }

  return {
    apiKey: integration.apiKeyEncrypted ? decrypt(integration.apiKeyEncrypted) : null,
    password: integration.passwordEncrypted ? decrypt(integration.passwordEncrypted) : null,
  };
}
