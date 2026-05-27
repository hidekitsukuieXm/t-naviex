/**
 * バグ対策ナレッジリポジトリ
 *
 * バグ対策ナレッジのCRUD操作と検索機能を提供
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import type {
  BugCountermeasureWithTags,
  BugCountermeasureWithFeedbacks,
  BugCountermeasureFeedback,
  CreateBugCountermeasureInput,
  UpdateBugCountermeasureInput,
  CreateFeedbackInput,
  UpdateFeedbackInput,
  BugCountermeasureFilter,
  BugCountermeasureSortOption,
  PaginatedResult,
} from '@/types/bug-countermeasure';

// ========================================
// ヘルパー関数
// ========================================

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

function transformToWithTags(
  data: Prisma.BugCountermeasureGetPayload<{
    include: typeof tagsInclude;
  }>
): BugCountermeasureWithTags {
  return {
    ...data,
    rootCauses: data.rootCauses as string[],
    symptoms: data.symptoms as string[],
    preventionMeasures: data.preventionMeasures as string[],
    detectionMethods: data.detectionMethods as string[],
    correctionSteps: data.correctionSteps as string[],
    affectedAreas: data.affectedAreas as string[],
    testCoverage: data.testCoverage as string[],
    examples: data.examples as string[],
    references: data.references as string[],
    tags: data.tags.map((t) => t.tag),
  };
}

function transformToWithFeedbacks(
  data: Prisma.BugCountermeasureGetPayload<{
    include: typeof tagsInclude & typeof usersInclude & typeof feedbacksInclude;
  }>
): BugCountermeasureWithFeedbacks {
  return {
    ...data,
    rootCauses: data.rootCauses as string[],
    symptoms: data.symptoms as string[],
    preventionMeasures: data.preventionMeasures as string[],
    detectionMethods: data.detectionMethods as string[],
    correctionSteps: data.correctionSteps as string[],
    affectedAreas: data.affectedAreas as string[],
    testCoverage: data.testCoverage as string[],
    examples: data.examples as string[],
    references: data.references as string[],
    tags: data.tags.map((t) => t.tag),
  };
}

// ========================================
// CRUD操作
// ========================================

export async function createBugCountermeasure(
  input: CreateBugCountermeasureInput
): Promise<BugCountermeasureWithTags> {
  const { tagIds, ...data } = input;

  const countermeasure = await prisma.bugCountermeasure.create({
    data: {
      ...data,
      rootCauses: input.rootCauses ?? [],
      symptoms: input.symptoms ?? [],
      preventionMeasures: input.preventionMeasures ?? [],
      detectionMethods: input.detectionMethods ?? [],
      correctionSteps: input.correctionSteps ?? [],
      affectedAreas: input.affectedAreas ?? [],
      testCoverage: input.testCoverage ?? [],
      examples: input.examples ?? [],
      references: input.references ?? [],
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

  return transformToWithTags(countermeasure);
}

export async function getBugCountermeasureById(
  id: bigint
): Promise<BugCountermeasureWithFeedbacks | null> {
  const countermeasure = await prisma.bugCountermeasure.findUnique({
    where: { id },
    include: {
      ...tagsInclude,
      ...usersInclude,
      ...feedbacksInclude,
    },
  });

  if (!countermeasure) return null;

  return transformToWithFeedbacks(countermeasure);
}

export async function updateBugCountermeasure(
  id: bigint,
  input: UpdateBugCountermeasureInput
): Promise<BugCountermeasureWithTags> {
  const { tagIds, ...data } = input;

  if (tagIds !== undefined) {
    await prisma.bugCountermeasureTag.deleteMany({
      where: { bugCountermeasureId: id },
    });
  }

  const countermeasure = await prisma.bugCountermeasure.update({
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

  return transformToWithTags(countermeasure);
}

export async function deleteBugCountermeasure(id: bigint): Promise<void> {
  await prisma.bugCountermeasure.delete({
    where: { id },
  });
}

export async function duplicateBugCountermeasure(
  id: bigint,
  newTitle: string,
  createdById?: bigint
): Promise<BugCountermeasureWithTags> {
  const original = await prisma.bugCountermeasure.findUnique({
    where: { id },
    include: tagsInclude,
  });

  if (!original) {
    throw new Error('Bug countermeasure not found');
  }

  const duplicated = await prisma.bugCountermeasure.create({
    data: {
      projectId: original.projectId,
      title: newTitle,
      description: original.description,
      content: original.content,
      bugPattern: original.bugPattern,
      category: original.category,
      status: 'DRAFT',
      severityLevel: original.severityLevel,
      rootCauses: original.rootCauses,
      symptoms: original.symptoms,
      preventionMeasures: original.preventionMeasures,
      detectionMethods: original.detectionMethods,
      correctionSteps: original.correctionSteps,
      affectedAreas: original.affectedAreas,
      testCoverage: original.testCoverage,
      examples: original.examples,
      references: original.references,
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

export async function getBugCountermeasures(
  filter: BugCountermeasureFilter = {},
  sort: BugCountermeasureSortOption = { field: 'updatedAt', order: 'desc' },
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<BugCountermeasureWithTags>> {
  const where = buildWhereClause(filter);

  const [items, total] = await Promise.all([
    prisma.bugCountermeasure.findMany({
      where,
      include: tagsInclude,
      orderBy: { [sort.field]: sort.order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bugCountermeasure.count({ where }),
  ]);

  return {
    items: items.map(transformToWithTags),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getBugCountermeasuresByProject(
  projectId: bigint,
  filter: Omit<BugCountermeasureFilter, 'projectId'> = {},
  sort: BugCountermeasureSortOption = { field: 'updatedAt', order: 'desc' },
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<BugCountermeasureWithTags>> {
  return getBugCountermeasures(
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

function buildWhereClause(filter: BugCountermeasureFilter): Prisma.BugCountermeasureWhereInput {
  const where: Prisma.BugCountermeasureWhereInput = {};

  if (filter.projectId !== undefined) {
    if (filter.includeGlobal) {
      where.OR = [{ projectId: filter.projectId }, { projectId: null }];
    } else {
      where.projectId = filter.projectId;
    }
  }

  if (filter.bugPattern) {
    where.bugPattern = filter.bugPattern;
  }

  if (filter.category) {
    where.category = filter.category;
  }

  if (filter.status) {
    where.status = filter.status;
  }

  if (filter.severityLevel) {
    where.severityLevel = filter.severityLevel;
  }

  if (filter.minRating !== undefined) {
    where.rating = { gte: filter.minRating };
  }

  if (filter.tagIds && filter.tagIds.length > 0) {
    where.tags = {
      some: {
        tagId: { in: filter.tagIds },
      },
    };
  }

  if (filter.search) {
    const searchTerm = filter.search.trim();
    where.OR = [
      ...(where.OR || []),
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { content: { contains: searchTerm, mode: 'insensitive' } },
      { bugPattern: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  return where;
}

// ========================================
// バグパターン一覧
// ========================================

export async function getBugPatterns(projectId?: bigint): Promise<string[]> {
  const where: Prisma.BugCountermeasureWhereInput = {};

  if (projectId) {
    where.OR = [{ projectId }, { projectId: null }];
  }

  const result = await prisma.bugCountermeasure.findMany({
    where,
    select: { bugPattern: true },
    distinct: ['bugPattern'],
    orderBy: { bugPattern: 'asc' },
  });

  return result.map((r) => r.bugPattern);
}

// ========================================
// フィードバック管理
// ========================================

export async function createFeedback(
  bugCountermeasureId: bigint,
  input: CreateFeedbackInput
): Promise<BugCountermeasureFeedback> {
  const feedback = await prisma.bugCountermeasureFeedback.create({
    data: {
      bugCountermeasureId,
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

  await updateAverageRating(bugCountermeasureId);

  return feedback;
}

export async function updateFeedback(
  id: bigint,
  input: UpdateFeedbackInput
): Promise<BugCountermeasureFeedback> {
  const feedback = await prisma.bugCountermeasureFeedback.update({
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

  await updateAverageRating(feedback.bugCountermeasureId);

  return feedback;
}

export async function deleteFeedback(id: bigint): Promise<void> {
  const feedback = await prisma.bugCountermeasureFeedback.findUnique({
    where: { id },
  });

  if (!feedback) {
    throw new Error('Feedback not found');
  }

  await prisma.bugCountermeasureFeedback.delete({
    where: { id },
  });

  await updateAverageRating(feedback.bugCountermeasureId);
}

export async function getUserFeedback(
  bugCountermeasureId: bigint,
  userId: bigint
): Promise<BugCountermeasureFeedback | null> {
  return prisma.bugCountermeasureFeedback.findUnique({
    where: {
      bugCountermeasureId_userId: {
        bugCountermeasureId,
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

async function updateAverageRating(bugCountermeasureId: bigint): Promise<void> {
  const result = await prisma.bugCountermeasureFeedback.aggregate({
    where: { bugCountermeasureId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.bugCountermeasure.update({
    where: { id: bugCountermeasureId },
    data: {
      rating: result._avg.rating ?? 0,
      ratingCount: result._count.rating,
    },
  });
}

// ========================================
// 使用状況管理
// ========================================

export async function incrementUsageCount(id: bigint): Promise<void> {
  await prisma.bugCountermeasure.update({
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

export async function getRecommendations(
  context: {
    projectId?: bigint;
    bugType?: string;
    category?: string;
    severityLevel?: string;
    keywords?: string[];
    excludeIds?: bigint[];
  },
  limit: number = 5
): Promise<BugCountermeasureWithTags[]> {
  const where: Prisma.BugCountermeasureWhereInput = {
    status: 'ACTIVE',
  };

  if (context.projectId) {
    where.OR = [{ projectId: context.projectId }, { projectId: null }];
  }

  if (context.category) {
    where.category = context.category as Prisma.EnumBugCountermeasureCategoryFilter;
  }

  if (context.severityLevel) {
    where.severityLevel = context.severityLevel as Prisma.EnumBugSeverityLevelNullableFilter;
  }

  if (context.keywords && context.keywords.length > 0) {
    const keywordConditions = context.keywords.map((keyword) => ({
      OR: [
        { title: { contains: keyword, mode: 'insensitive' as const } },
        { content: { contains: keyword, mode: 'insensitive' as const } },
        { description: { contains: keyword, mode: 'insensitive' as const } },
        { bugPattern: { contains: keyword, mode: 'insensitive' as const } },
      ],
    }));
    where.AND = keywordConditions;
  }

  if (context.excludeIds && context.excludeIds.length > 0) {
    where.id = { notIn: context.excludeIds };
  }

  const recommendations = await prisma.bugCountermeasure.findMany({
    where,
    include: tagsInclude,
    orderBy: [{ rating: 'desc' }, { usageCount: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  });

  return recommendations.map(transformToWithTags);
}

export async function getSimilarCountermeasures(
  id: bigint,
  limit: number = 5
): Promise<BugCountermeasureWithTags[]> {
  const current = await prisma.bugCountermeasure.findUnique({
    where: { id },
    include: tagsInclude,
  });

  if (!current) return [];

  const tagIds = current.tags.map((t) => t.tagId);

  const similar = await prisma.bugCountermeasure.findMany({
    where: {
      id: { not: id },
      status: 'ACTIVE',
      OR: [
        { bugPattern: current.bugPattern },
        { category: current.category },
        { severityLevel: current.severityLevel },
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
