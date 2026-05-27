/**
 * ベストプラクティスリポジトリ
 *
 * ベストプラクティスのCRUD操作と検索機能を提供
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import type {
  BestPracticeWithTags,
  BestPracticeWithFeedbacks,
  BestPracticeFeedback,
  CreateBestPracticeInput,
  UpdateBestPracticeInput,
  CreateFeedbackInput,
  UpdateFeedbackInput,
  BestPracticeFilter,
  BestPracticeSortOption,
  PaginatedResult,
} from '@/types/best-practice';

// ========================================
// ヘルパー関数
// ========================================

/**
 * タグのInclude設定
 */
const tagsInclude = {
  tags: {
    include: {
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

/**
 * ユーザーのInclude設定
 */
const usersInclude = {
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

/**
 * フィードバックのInclude設定
 */
const feedbacksInclude = {
  feedbacks: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc' as const,
    },
  },
};

/**
 * DB結果をBestPracticeWithTagsに変換
 */
function transformToWithTags(
  data: Prisma.BestPracticeGetPayload<{
    include: typeof tagsInclude;
  }>
): BestPracticeWithTags {
  return {
    ...data,
    applicability: data.applicability as string[],
    examples: data.examples as string[],
    benefits: data.benefits as string[],
    risks: data.risks as string[],
    tags: data.tags.map((t) => t.tag),
  };
}

/**
 * DB結果をBestPracticeWithFeedbacksに変換
 */
function transformToWithFeedbacks(
  data: Prisma.BestPracticeGetPayload<{
    include: typeof tagsInclude & typeof usersInclude & typeof feedbacksInclude;
  }>
): BestPracticeWithFeedbacks {
  return {
    ...data,
    applicability: data.applicability as string[],
    examples: data.examples as string[],
    benefits: data.benefits as string[],
    risks: data.risks as string[],
    tags: data.tags.map((t) => t.tag),
  };
}

// ========================================
// CRUD操作
// ========================================

/**
 * ベストプラクティスを作成
 */
export async function createBestPractice(
  input: CreateBestPracticeInput
): Promise<BestPracticeWithTags> {
  const { tagIds, ...data } = input;

  const bestPractice = await prisma.bestPractice.create({
    data: {
      ...data,
      applicability: input.applicability ?? [],
      examples: input.examples ?? [],
      benefits: input.benefits ?? [],
      risks: input.risks ?? [],
      tags: tagIds
        ? {
            create: tagIds.map((tagId) => ({
              tagId,
            })),
          }
        : undefined,
    },
    include: tagsInclude,
  });

  return transformToWithTags(bestPractice);
}

/**
 * ベストプラクティスをIDで取得
 */
export async function getBestPracticeById(id: bigint): Promise<BestPracticeWithFeedbacks | null> {
  const bestPractice = await prisma.bestPractice.findUnique({
    where: { id },
    include: {
      ...tagsInclude,
      ...usersInclude,
      ...feedbacksInclude,
    },
  });

  if (!bestPractice) return null;

  return transformToWithFeedbacks(bestPractice);
}

/**
 * ベストプラクティスを更新
 */
export async function updateBestPractice(
  id: bigint,
  input: UpdateBestPracticeInput
): Promise<BestPracticeWithTags> {
  const { tagIds, ...data } = input;

  // タグの更新がある場合は既存を削除して再作成
  if (tagIds !== undefined) {
    await prisma.bestPracticeTag.deleteMany({
      where: { bestPracticeId: id },
    });
  }

  const bestPractice = await prisma.bestPractice.update({
    where: { id },
    data: {
      ...data,
      tags: tagIds
        ? {
            create: tagIds.map((tagId) => ({
              tagId,
            })),
          }
        : undefined,
    },
    include: tagsInclude,
  });

  return transformToWithTags(bestPractice);
}

/**
 * ベストプラクティスを削除
 */
export async function deleteBestPractice(id: bigint): Promise<void> {
  await prisma.bestPractice.delete({
    where: { id },
  });
}

/**
 * ベストプラクティスを複製
 */
export async function duplicateBestPractice(
  id: bigint,
  newTitle: string,
  createdById?: bigint
): Promise<BestPracticeWithTags> {
  const original = await prisma.bestPractice.findUnique({
    where: { id },
    include: tagsInclude,
  });

  if (!original) {
    throw new Error('Best practice not found');
  }

  const duplicated = await prisma.bestPractice.create({
    data: {
      projectId: original.projectId,
      title: newTitle,
      description: original.description,
      content: original.content,
      category: original.category,
      complexity: original.complexity,
      status: 'DRAFT',
      applicability: original.applicability,
      examples: original.examples,
      benefits: original.benefits,
      risks: original.risks,
      version: '1.0.0',
      metadata: original.metadata,
      createdById,
      tags: {
        create: original.tags.map((t) => ({
          tagId: t.tagId,
        })),
      },
    },
    include: tagsInclude,
  });

  return transformToWithTags(duplicated);
}

// ========================================
// 一覧取得・検索
// ========================================

/**
 * ベストプラクティス一覧を取得（ページネーション付き）
 */
export async function getBestPractices(
  filter: BestPracticeFilter = {},
  sort: BestPracticeSortOption = { field: 'updatedAt', order: 'desc' },
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<BestPracticeWithTags>> {
  const where = buildWhereClause(filter);

  const [items, total] = await Promise.all([
    prisma.bestPractice.findMany({
      where,
      include: tagsInclude,
      orderBy: { [sort.field]: sort.order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bestPractice.count({ where }),
  ]);

  return {
    items: items.map(transformToWithTags),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * プロジェクト内のベストプラクティス一覧を取得
 */
export async function getBestPracticesByProject(
  projectId: bigint,
  filter: Omit<BestPracticeFilter, 'projectId'> = {},
  sort: BestPracticeSortOption = { field: 'updatedAt', order: 'desc' },
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<BestPracticeWithTags>> {
  return getBestPractices(
    {
      ...filter,
      projectId,
      includeGlobal: filter.includeGlobal ?? true,
    },
    sort,
    page,
    limit
  );
}

/**
 * Where句を構築
 */
function buildWhereClause(filter: BestPracticeFilter): Prisma.BestPracticeWhereInput {
  const where: Prisma.BestPracticeWhereInput = {};

  // プロジェクトフィルター
  if (filter.projectId !== undefined) {
    if (filter.includeGlobal) {
      where.OR = [{ projectId: filter.projectId }, { projectId: null }];
    } else {
      where.projectId = filter.projectId;
    }
  }

  // カテゴリフィルター
  if (filter.category) {
    where.category = filter.category;
  }

  // 複雑度フィルター
  if (filter.complexity) {
    where.complexity = filter.complexity;
  }

  // ステータスフィルター
  if (filter.status) {
    where.status = filter.status;
  }

  // 最低評価フィルター
  if (filter.minRating !== undefined) {
    where.rating = { gte: filter.minRating };
  }

  // タグフィルター
  if (filter.tagIds && filter.tagIds.length > 0) {
    where.tags = {
      some: {
        tagId: { in: filter.tagIds },
      },
    };
  }

  // 検索フィルター
  if (filter.search) {
    const searchTerm = filter.search.trim();
    where.OR = [
      ...(where.OR || []),
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { content: { contains: searchTerm, mode: 'insensitive' } },
      { category: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  return where;
}

// ========================================
// カテゴリ管理
// ========================================

/**
 * プロジェクト内の使用中カテゴリ一覧を取得
 */
export async function getCategories(projectId?: bigint): Promise<string[]> {
  const where: Prisma.BestPracticeWhereInput = {};

  if (projectId) {
    where.OR = [{ projectId }, { projectId: null }];
  }

  const result = await prisma.bestPractice.findMany({
    where,
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return result.map((r) => r.category);
}

// ========================================
// フィードバック管理
// ========================================

/**
 * フィードバックを追加
 */
export async function createFeedback(
  bestPracticeId: bigint,
  input: CreateFeedbackInput
): Promise<BestPracticeFeedback> {
  const feedback = await prisma.bestPracticeFeedback.create({
    data: {
      bestPracticeId,
      userId: input.userId,
      rating: input.rating,
      comment: input.comment,
      isHelpful: input.isHelpful,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // 平均評価を更新
  await updateAverageRating(bestPracticeId);

  return feedback;
}

/**
 * フィードバックを更新
 */
export async function updateFeedback(
  id: bigint,
  input: UpdateFeedbackInput
): Promise<BestPracticeFeedback> {
  const feedback = await prisma.bestPracticeFeedback.update({
    where: { id },
    data: input,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // 平均評価を更新
  await updateAverageRating(feedback.bestPracticeId);

  return feedback;
}

/**
 * フィードバックを削除
 */
export async function deleteFeedback(id: bigint): Promise<void> {
  const feedback = await prisma.bestPracticeFeedback.findUnique({
    where: { id },
  });

  if (!feedback) {
    throw new Error('Feedback not found');
  }

  await prisma.bestPracticeFeedback.delete({
    where: { id },
  });

  // 平均評価を更新
  await updateAverageRating(feedback.bestPracticeId);
}

/**
 * ユーザーのフィードバックを取得
 */
export async function getUserFeedback(
  bestPracticeId: bigint,
  userId: bigint
): Promise<BestPracticeFeedback | null> {
  return prisma.bestPracticeFeedback.findUnique({
    where: {
      bestPracticeId_userId: {
        bestPracticeId,
        userId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * 平均評価を更新
 */
async function updateAverageRating(bestPracticeId: bigint): Promise<void> {
  const result = await prisma.bestPracticeFeedback.aggregate({
    where: { bestPracticeId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.bestPractice.update({
    where: { id: bestPracticeId },
    data: {
      rating: result._avg.rating ?? 0,
      ratingCount: result._count.rating,
    },
  });
}

// ========================================
// 使用状況管理
// ========================================

/**
 * 使用回数をインクリメント
 */
export async function incrementUsageCount(id: bigint): Promise<void> {
  await prisma.bestPractice.update({
    where: { id },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

// ========================================
// コンテキストベースの推奨
// ========================================

/**
 * コンテキストに基づいてベストプラクティスを推奨
 */
export async function getRecommendations(
  context: {
    projectId?: bigint;
    testType?: string;
    category?: string;
    keywords?: string[];
    excludeIds?: bigint[];
  },
  limit: number = 5
): Promise<BestPracticeWithTags[]> {
  const where: Prisma.BestPracticeWhereInput = {
    status: 'ACTIVE',
  };

  // プロジェクトフィルター（グローバルも含む）
  if (context.projectId) {
    where.OR = [{ projectId: context.projectId }, { projectId: null }];
  }

  // カテゴリフィルター
  if (context.category) {
    where.category = context.category;
  }

  // キーワード検索
  if (context.keywords && context.keywords.length > 0) {
    const keywordConditions = context.keywords.map((keyword) => ({
      OR: [
        { title: { contains: keyword, mode: 'insensitive' as const } },
        { content: { contains: keyword, mode: 'insensitive' as const } },
        { description: { contains: keyword, mode: 'insensitive' as const } },
      ],
    }));
    where.AND = keywordConditions;
  }

  // 除外ID
  if (context.excludeIds && context.excludeIds.length > 0) {
    where.id = { notIn: context.excludeIds };
  }

  const recommendations = await prisma.bestPractice.findMany({
    where,
    include: tagsInclude,
    orderBy: [{ rating: 'desc' }, { usageCount: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  });

  return recommendations.map(transformToWithTags);
}

/**
 * 類似のベストプラクティスを取得
 */
export async function getSimilarBestPractices(
  id: bigint,
  limit: number = 5
): Promise<BestPracticeWithTags[]> {
  const current = await prisma.bestPractice.findUnique({
    where: { id },
    include: tagsInclude,
  });

  if (!current) return [];

  const tagIds = current.tags.map((t) => t.tagId);

  const similar = await prisma.bestPractice.findMany({
    where: {
      id: { not: id },
      status: 'ACTIVE',
      OR: [
        { category: current.category },
        tagIds.length > 0
          ? {
              tags: {
                some: {
                  tagId: { in: tagIds },
                },
              },
            }
          : {},
      ],
    },
    include: tagsInclude,
    orderBy: [{ rating: 'desc' }, { usageCount: 'desc' }],
    take: limit,
  });

  return similar.map(transformToWithTags);
}
