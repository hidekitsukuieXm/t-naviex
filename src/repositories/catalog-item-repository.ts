/**
 * カタログアイテムリポジトリ
 */

import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type {
  CatalogItem,
  CatalogItemWithTags,
  CatalogItemDetail,
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
  CatalogItemType,
  CatalogItemStatus,
} from '@/types/catalog-item';

// ============================================
// セレクト定義
// ============================================

const catalogItemSelect = {
  id: true,
  projectId: true,
  name: true,
  description: true,
  type: true,
  status: true,
  category: true,
  content: true,
  metadata: true,
  version: true,
  usageCount: true,
  lastUsedAt: true,
  createdById: true,
  updatedById: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

const catalogItemWithTagsSelect = {
  ...catalogItemSelect,
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  },
};

const catalogItemDetailSelect = {
  ...catalogItemWithTagsSelect,
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
// ヘルパー関数
// ============================================

function formatCatalogItem(item: Record<string, unknown>): CatalogItem {
  return {
    id: String(item.id),
    projectId: String(item.projectId),
    name: item.name as string,
    description: item.description as string | null,
    type: item.type as CatalogItemType,
    status: item.status as CatalogItemStatus,
    category: item.category as string | null,
    content: item.content as string,
    metadata: item.metadata as Record<string, unknown> | null,
    version: item.version as string,
    usageCount: item.usageCount as number,
    lastUsedAt: item.lastUsedAt ? (item.lastUsedAt as Date).toISOString() : null,
    createdById: item.createdById ? String(item.createdById) : null,
    updatedById: item.updatedById ? String(item.updatedById) : null,
    sortOrder: item.sortOrder as number,
    createdAt: (item.createdAt as Date).toISOString(),
    updatedAt: (item.updatedAt as Date).toISOString(),
  };
}

function formatCatalogItemWithTags(item: Record<string, unknown>): CatalogItemWithTags {
  const base = formatCatalogItem(item);
  const tags = (item.tags as Array<{ tag: { id: bigint; name: string; color: string } }>) || [];

  return {
    ...base,
    tags: tags.map((t) => ({
      id: String(t.tag.id),
      name: t.tag.name,
      color: t.tag.color,
    })),
  };
}

function formatCatalogItemDetail(item: Record<string, unknown>): CatalogItemDetail {
  const base = formatCatalogItemWithTags(item);
  const createdBy = item.createdBy as { id: bigint; name: string; email: string } | null;
  const updatedBy = item.updatedBy as { id: bigint; name: string; email: string } | null;

  return {
    ...base,
    createdBy: createdBy
      ? {
          id: String(createdBy.id),
          name: createdBy.name,
          email: createdBy.email,
        }
      : null,
    updatedBy: updatedBy
      ? {
          id: String(updatedBy.id),
          name: updatedBy.name,
          email: updatedBy.email,
        }
      : null,
  };
}

// ============================================
// 一覧取得
// ============================================

export interface GetCatalogItemsOptions {
  projectId: bigint;
  type?: CatalogItemType;
  status?: CatalogItemStatus;
  category?: string;
  search?: string;
  tagIds?: bigint[];
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount' | 'sortOrder';
  sortOrder?: 'asc' | 'desc';
}

export async function getCatalogItems(
  options: GetCatalogItemsOptions
): Promise<{ items: CatalogItemWithTags[]; total: number }> {
  const {
    projectId,
    type,
    status,
    category,
    search,
    tagIds,
    page = 1,
    limit = 50,
    sortBy = 'sortOrder',
    sortOrder = 'asc',
  } = options;

  const where: Record<string, unknown> = {
    projectId,
  };

  if (type) {
    where.type = type;
  }

  if (status) {
    where.status = status;
  }

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (tagIds && tagIds.length > 0) {
    where.tags = {
      some: {
        tagId: { in: tagIds },
      },
    };
  }

  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({
      where,
      select: catalogItemWithTagsSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.catalogItem.count({ where }),
  ]);

  return {
    items: items.map((item) =>
      formatCatalogItemWithTags(item as unknown as Record<string, unknown>)
    ),
    total,
  };
}

// ============================================
// 単一取得
// ============================================

export async function getCatalogItemById(
  projectId: bigint,
  id: bigint
): Promise<CatalogItemDetail | null> {
  const item = await prisma.catalogItem.findFirst({
    where: {
      id,
      projectId,
    },
    select: catalogItemDetailSelect,
  });

  if (!item) {
    return null;
  }

  return formatCatalogItemDetail(item as unknown as Record<string, unknown>);
}

export async function getCatalogItemByName(
  projectId: bigint,
  name: string
): Promise<CatalogItem | null> {
  const item = await prisma.catalogItem.findFirst({
    where: {
      projectId,
      name,
    },
    select: catalogItemSelect,
  });

  if (!item) {
    return null;
  }

  return formatCatalogItem(item as unknown as Record<string, unknown>);
}

// ============================================
// 作成
// ============================================

export async function createCatalogItem(
  projectId: bigint,
  input: CreateCatalogItemInput,
  userId?: bigint
): Promise<CatalogItemDetail> {
  const { tagIds, ...data } = input;

  const item = await prisma.catalogItem.create({
    data: {
      projectId,
      name: data.name,
      description: data.description,
      type: data.type,
      status: data.status || 'DRAFT',
      category: data.category,
      content: data.content,
      metadata: (data.metadata || undefined) as Prisma.InputJsonValue | undefined,
      version: data.version || '1.0.0',
      sortOrder: data.sortOrder ?? 0,
      createdById: userId,
      updatedById: userId,
      tags: tagIds
        ? {
            create: tagIds.map((tagId) => ({
              tagId: BigInt(tagId),
            })),
          }
        : undefined,
    },
    select: catalogItemDetailSelect,
  });

  return formatCatalogItemDetail(item as unknown as Record<string, unknown>);
}

// ============================================
// 更新
// ============================================

export async function updateCatalogItem(
  projectId: bigint,
  id: bigint,
  input: UpdateCatalogItemInput,
  userId?: bigint
): Promise<CatalogItemDetail> {
  const { tagIds, ...data } = input;

  // タグの更新がある場合は既存タグを削除
  if (tagIds !== undefined) {
    await prisma.catalogItemTag.deleteMany({
      where: { catalogItemId: id },
    });
  }

  const item = await prisma.catalogItem.update({
    where: { id },
    data: {
      ...data,
      metadata: (data.metadata || undefined) as Prisma.InputJsonValue | undefined,
      updatedById: userId,
      tags: tagIds
        ? {
            create: tagIds.map((tagId) => ({
              tagId: BigInt(tagId),
            })),
          }
        : undefined,
    },
    select: catalogItemDetailSelect,
  });

  return formatCatalogItemDetail(item as unknown as Record<string, unknown>);
}

// ============================================
// 削除
// ============================================

export async function deleteCatalogItem(projectId: bigint, id: bigint): Promise<void> {
  await prisma.catalogItem.delete({
    where: {
      id,
      projectId,
    },
  });
}

// ============================================
// 使用回数更新
// ============================================

export async function incrementUsageCount(id: bigint): Promise<void> {
  await prisma.catalogItem.update({
    where: { id },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

// ============================================
// カテゴリ一覧取得
// ============================================

export async function getCategories(
  projectId: bigint
): Promise<Array<{ name: string; count: number }>> {
  const categories = await prisma.catalogItem.groupBy({
    by: ['category'],
    where: {
      projectId,
      category: { not: null },
    },
    _count: { id: true },
    orderBy: { category: 'asc' },
  });

  return categories
    .filter((c) => c.category !== null)
    .map((c) => ({
      name: c.category as string,
      count: c._count.id,
    }));
}

// ============================================
// 並び順更新
// ============================================

export async function updateSortOrder(
  projectId: bigint,
  items: Array<{ id: string; sortOrder: number }>
): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.catalogItem.update({
        where: {
          id: BigInt(item.id),
          projectId,
        },
        data: { sortOrder: item.sortOrder },
      })
    )
  );
}

// ============================================
// 複製
// ============================================

export async function duplicateCatalogItem(
  projectId: bigint,
  id: bigint,
  newName: string,
  userId?: bigint
): Promise<CatalogItemDetail> {
  const original = await prisma.catalogItem.findFirst({
    where: { id, projectId },
    include: { tags: true },
  });

  if (!original) {
    throw new Error('カタログアイテムが見つかりません');
  }

  const item = await prisma.catalogItem.create({
    data: {
      projectId,
      name: newName,
      description: original.description,
      type: original.type,
      status: 'DRAFT',
      category: original.category,
      content: original.content,
      metadata: original.metadata || undefined,
      version: '1.0.0',
      sortOrder: original.sortOrder + 1,
      createdById: userId,
      updatedById: userId,
      tags: {
        create: original.tags.map((t) => ({
          tagId: t.tagId,
        })),
      },
    },
    select: catalogItemDetailSelect,
  });

  return formatCatalogItemDetail(item as unknown as Record<string, unknown>);
}

// ============================================
// エクスポート
// ============================================

export const catalogItemRepository = {
  getCatalogItems,
  getCatalogItemById,
  getCatalogItemByName,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  incrementUsageCount,
  getCategories,
  updateSortOrder,
  duplicateCatalogItem,
};
