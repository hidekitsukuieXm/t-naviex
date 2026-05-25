/**
 * コンフィギュレーションリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  Configuration,
  ConfigParams,
  CreateConfigurationInput,
  UpdateConfigurationInput,
  ConfigurationListOptions,
} from '@/types/configuration';

// ============================================
// セレクト定義
// ============================================

const configurationSelect = {
  id: true,
  projectId: true,
  name: true,
  description: true,
  configParams: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

// ============================================
// 変換関数
// ============================================

interface DbConfiguration {
  id: bigint;
  projectId: bigint;
  name: string;
  description: string | null;
  configParams: unknown;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function serializeConfiguration(configuration: DbConfiguration): Configuration {
  return {
    id: configuration.id.toString(),
    projectId: configuration.projectId.toString(),
    name: configuration.name,
    description: configuration.description,
    configParams: (configuration.configParams ?? {}) as ConfigParams,
    sortOrder: configuration.sortOrder,
    isActive: configuration.isActive,
    createdAt: configuration.createdAt.toISOString(),
    updatedAt: configuration.updatedAt.toISOString(),
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * コンフィギュレーション作成
 */
export async function createConfiguration(input: CreateConfigurationInput): Promise<Configuration> {
  const trimmedName = input.name.trim();

  // 並び順を決定（指定がなければ最後に追加）
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const maxSortOrder = await prisma.configuration.aggregate({
      where: { projectId: BigInt(input.projectId) },
      _max: { sortOrder: true },
    });
    sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
  }

  const configuration = await prisma.configuration.create({
    data: {
      projectId: BigInt(input.projectId),
      name: trimmedName,
      description: input.description ?? null,
      configParams: (input.configParams ?? {}) as object,
      sortOrder,
      isActive: input.isActive ?? true,
    },
    select: configurationSelect,
  });

  return serializeConfiguration(configuration as DbConfiguration);
}

/**
 * コンフィギュレーション取得（ID指定）
 */
export async function getConfigurationById(id: bigint): Promise<Configuration | null> {
  const configuration = await prisma.configuration.findUnique({
    where: { id },
    select: configurationSelect,
  });

  if (!configuration) {
    return null;
  }

  return serializeConfiguration(configuration as DbConfiguration);
}

/**
 * コンフィギュレーション一覧取得
 */
export async function getConfigurations(
  projectId: string,
  options: ConfigurationListOptions = {}
): Promise<Configuration[]> {
  const where: {
    projectId: bigint;
    isActive?: boolean;
    OR?: { name: { contains: string; mode: 'insensitive' } }[];
  } = {
    projectId: BigInt(projectId),
  };

  // アクティブフィルター
  if (options.isActive !== undefined) {
    where.isActive = options.isActive;
  }

  // 検索クエリ
  if (options.search) {
    where.OR = [{ name: { contains: options.search, mode: 'insensitive' } }];
  }

  // ソート設定
  type OrderByField = 'name' | 'sortOrder' | 'createdAt' | 'updatedAt';
  const sortBy: OrderByField = options.sortBy ?? 'sortOrder';
  const sortOrder = options.sortOrder ?? 'asc';

  const configurations = await prisma.configuration.findMany({
    where,
    select: configurationSelect,
    orderBy: { [sortBy]: sortOrder },
  });

  return configurations.map((c) => serializeConfiguration(c as DbConfiguration));
}

/**
 * コンフィギュレーション更新
 */
export async function updateConfiguration(
  id: bigint,
  input: UpdateConfigurationInput
): Promise<Configuration | null> {
  const existing = await prisma.configuration.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const updateData: {
    name?: string;
    description?: string | null;
    configParams?: object;
    sortOrder?: number;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.configParams !== undefined) {
    updateData.configParams = input.configParams as object;
  }

  if (input.sortOrder !== undefined) {
    updateData.sortOrder = input.sortOrder;
  }

  if (input.isActive !== undefined) {
    updateData.isActive = input.isActive;
  }

  const configuration = await prisma.configuration.update({
    where: { id },
    data: updateData,
    select: configurationSelect,
  });

  return serializeConfiguration(configuration as DbConfiguration);
}

/**
 * コンフィギュレーション削除
 */
export async function deleteConfiguration(
  id: bigint
): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.configuration.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, error: 'コンフィギュレーションが見つかりません。' };
  }

  await prisma.configuration.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * 並び順一括更新
 */
export async function updateConfigurationSortOrders(
  projectId: string,
  items: { id: string; sortOrder: number }[]
): Promise<Configuration[]> {
  const updates = items.map((item) =>
    prisma.configuration.update({
      where: {
        id: BigInt(item.id),
        projectId: BigInt(projectId),
      },
      data: {
        sortOrder: item.sortOrder,
      },
      select: configurationSelect,
    })
  );

  const configurations = await prisma.$transaction(updates);

  return configurations.map((c) => serializeConfiguration(c as DbConfiguration));
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * プロジェクトが存在するか確認
 */
export async function projectExists(projectId: bigint): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  return project !== null;
}

/**
 * コンフィギュレーション名が同じプロジェクト内で重複しているか確認
 */
export async function isConfigurationNameTaken(
  projectId: bigint,
  name: string,
  excludeId?: bigint
): Promise<boolean> {
  const where: {
    projectId: bigint;
    name: string;
    id?: { not: bigint };
  } = {
    projectId,
    name: name.trim(),
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existing = await prisma.configuration.findFirst({
    where,
    select: { id: true },
  });

  return existing !== null;
}

/**
 * コンフィギュレーションがプロジェクトに属しているか確認
 */
export async function configurationExistsInProject(
  projectId: bigint,
  configurationId: bigint
): Promise<boolean> {
  const configuration = await prisma.configuration.findFirst({
    where: {
      id: configurationId,
      projectId,
    },
    select: { id: true },
  });

  return configuration !== null;
}

/**
 * プロジェクトのコンフィギュレーション数を取得
 */
export async function getConfigurationCount(
  projectId: bigint,
  isActive?: boolean
): Promise<number> {
  const where: { projectId: bigint; isActive?: boolean } = {
    projectId,
  };

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  return prisma.configuration.count({ where });
}
