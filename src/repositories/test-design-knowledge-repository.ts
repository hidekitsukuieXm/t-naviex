/**
 * テスト設計ナレッジリポジトリ
 *
 * テスト設計ナレッジのCRUD操作と検索機能を提供
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import type {
  TestDesignKnowledgeWithTags,
  TestDesignKnowledgeWithFeedbacks,
  TestDesignKnowledgeFeedback,
  CreateTestDesignKnowledgeInput,
  UpdateTestDesignKnowledgeInput,
  CreateFeedbackInput,
  UpdateFeedbackInput,
  TestDesignKnowledgeFilter,
  TestDesignKnowledgeSortOption,
  PaginatedResult,
} from '@/types/test-design-knowledge';

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
  data: Prisma.TestDesignKnowledgeGetPayload<{
    include: typeof tagsInclude;
  }>
): TestDesignKnowledgeWithTags {
  return {
    ...data,
    applicableScenarios: data.applicableScenarios as string[],
    considerations: data.considerations as string[],
    examples: data.examples as string[],
    tools: data.tools as string[],
    references: data.references as string[],
    inputTypes: data.inputTypes as string[],
    outputTypes: data.outputTypes as string[],
    tags: data.tags.map((t) => t.tag),
  } as TestDesignKnowledgeWithTags;
}

function transformToWithFeedbacks(
  data: Prisma.TestDesignKnowledgeGetPayload<{
    include: typeof tagsInclude & typeof usersInclude & typeof feedbacksInclude;
  }>
): TestDesignKnowledgeWithFeedbacks {
  return {
    ...data,
    applicableScenarios: data.applicableScenarios as string[],
    considerations: data.considerations as string[],
    examples: data.examples as string[],
    tools: data.tools as string[],
    references: data.references as string[],
    inputTypes: data.inputTypes as string[],
    outputTypes: data.outputTypes as string[],
    tags: data.tags.map((t) => t.tag),
  } as TestDesignKnowledgeWithFeedbacks;
}

// ========================================
// CRUD操作
// ========================================

export async function createTestDesignKnowledge(
  input: CreateTestDesignKnowledgeInput
): Promise<TestDesignKnowledgeWithTags> {
  const { tagIds, ...data } = input;

  const knowledge = await prisma.testDesignKnowledge.create({
    data: {
      ...data,
      applicableScenarios: input.applicableScenarios ?? [],
      considerations: input.considerations ?? [],
      examples: input.examples ?? [],
      tools: input.tools ?? [],
      references: input.references ?? [],
      inputTypes: input.inputTypes ?? [],
      outputTypes: input.outputTypes ?? [],
      tags: tagIds
        ? {
            create: tagIds.map((tagId) => ({
              tagId,
            })),
          }
        : undefined,
    } as Prisma.TestDesignKnowledgeCreateInput,
    include: tagsInclude,
  });

  return transformToWithTags(knowledge);
}

export async function getTestDesignKnowledgeById(
  id: bigint
): Promise<TestDesignKnowledgeWithFeedbacks | null> {
  const knowledge = await prisma.testDesignKnowledge.findUnique({
    where: { id },
    include: {
      ...tagsInclude,
      ...usersInclude,
      ...feedbacksInclude,
    },
  });

  if (!knowledge) return null;

  return transformToWithFeedbacks(knowledge);
}

export async function updateTestDesignKnowledge(
  id: bigint,
  input: UpdateTestDesignKnowledgeInput
): Promise<TestDesignKnowledgeWithTags> {
  const { tagIds, ...data } = input;

  if (tagIds !== undefined) {
    await prisma.testDesignKnowledgeTag.deleteMany({
      where: { testDesignKnowledgeId: id },
    });
  }

  const knowledge = await prisma.testDesignKnowledge.update({
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
    } as Prisma.TestDesignKnowledgeUpdateInput,
    include: tagsInclude,
  });

  return transformToWithTags(knowledge);
}

export async function deleteTestDesignKnowledge(id: bigint): Promise<void> {
  await prisma.testDesignKnowledge.delete({
    where: { id },
  });
}

export async function duplicateTestDesignKnowledge(
  id: bigint,
  newTitle: string,
  createdById?: bigint
): Promise<TestDesignKnowledgeWithTags> {
  const original = await prisma.testDesignKnowledge.findUnique({
    where: { id },
    include: tagsInclude,
  });

  if (!original) {
    throw new Error('Test design knowledge not found');
  }

  const duplicated = await prisma.testDesignKnowledge.create({
    data: {
      projectId: original.projectId,
      title: newTitle,
      description: original.description,
      content: original.content,
      technique: original.technique,
      category: original.category,
      status: 'DRAFT',
      applicableScenarios: original.applicableScenarios as Prisma.InputJsonValue,
      considerations: original.considerations as Prisma.InputJsonValue,
      examples: original.examples as Prisma.InputJsonValue,
      tools: original.tools as Prisma.InputJsonValue,
      references: original.references as Prisma.InputJsonValue,
      inputTypes: original.inputTypes as Prisma.InputJsonValue,
      outputTypes: original.outputTypes as Prisma.InputJsonValue,
      version: '1.0.0',
      metadata: original.metadata as Prisma.InputJsonValue,
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

export async function getTestDesignKnowledges(
  filter: TestDesignKnowledgeFilter = {},
  sort: TestDesignKnowledgeSortOption = { field: 'updatedAt', order: 'desc' },
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<TestDesignKnowledgeWithTags>> {
  const where = buildWhereClause(filter);

  const [items, total] = await Promise.all([
    prisma.testDesignKnowledge.findMany({
      where,
      include: tagsInclude,
      orderBy: { [sort.field]: sort.order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.testDesignKnowledge.count({ where }),
  ]);

  return {
    items: items.map(transformToWithTags),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getTestDesignKnowledgesByProject(
  projectId: bigint,
  filter: Omit<TestDesignKnowledgeFilter, 'projectId'> = {},
  sort: TestDesignKnowledgeSortOption = { field: 'updatedAt', order: 'desc' },
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<TestDesignKnowledgeWithTags>> {
  return getTestDesignKnowledges(
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

function buildWhereClause(filter: TestDesignKnowledgeFilter): Prisma.TestDesignKnowledgeWhereInput {
  const where: Prisma.TestDesignKnowledgeWhereInput = {};

  if (filter.projectId !== undefined) {
    if (filter.includeGlobal) {
      where.OR = [{ projectId: filter.projectId }, { projectId: null }];
    } else {
      where.projectId = filter.projectId;
    }
  }

  if (filter.technique) {
    where.technique = filter.technique;
  }

  if (filter.category) {
    where.category = filter.category;
  }

  if (filter.status) {
    where.status = filter.status;
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
      { technique: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  return where;
}

// ========================================
// テスト技法一覧
// ========================================

export async function getTechniques(projectId?: bigint): Promise<string[]> {
  const where: Prisma.TestDesignKnowledgeWhereInput = {};

  if (projectId) {
    where.OR = [{ projectId }, { projectId: null }];
  }

  const result = await prisma.testDesignKnowledge.findMany({
    where,
    select: { technique: true },
    distinct: ['technique'],
    orderBy: { technique: 'asc' },
  });

  return result.map((r) => r.technique);
}

// ========================================
// フィードバック管理
// ========================================

export async function createFeedback(
  testDesignKnowledgeId: bigint,
  input: CreateFeedbackInput
): Promise<TestDesignKnowledgeFeedback> {
  const feedback = await prisma.testDesignKnowledgeFeedback.create({
    data: {
      testDesignKnowledgeId,
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

  await updateAverageRating(testDesignKnowledgeId);

  return feedback;
}

export async function updateFeedback(
  id: bigint,
  input: UpdateFeedbackInput
): Promise<TestDesignKnowledgeFeedback> {
  const feedback = await prisma.testDesignKnowledgeFeedback.update({
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

  await updateAverageRating(feedback.testDesignKnowledgeId);

  return feedback;
}

export async function deleteFeedback(id: bigint): Promise<void> {
  const feedback = await prisma.testDesignKnowledgeFeedback.findUnique({
    where: { id },
  });

  if (!feedback) {
    throw new Error('Feedback not found');
  }

  await prisma.testDesignKnowledgeFeedback.delete({
    where: { id },
  });

  await updateAverageRating(feedback.testDesignKnowledgeId);
}

export async function getUserFeedback(
  testDesignKnowledgeId: bigint,
  userId: bigint
): Promise<TestDesignKnowledgeFeedback | null> {
  return prisma.testDesignKnowledgeFeedback.findUnique({
    where: {
      testDesignKnowledgeId_userId: {
        testDesignKnowledgeId,
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

async function updateAverageRating(testDesignKnowledgeId: bigint): Promise<void> {
  const result = await prisma.testDesignKnowledgeFeedback.aggregate({
    where: { testDesignKnowledgeId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.testDesignKnowledge.update({
    where: { id: testDesignKnowledgeId },
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
  await prisma.testDesignKnowledge.update({
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
    testType?: string;
    category?: string;
    keywords?: string[];
    excludeIds?: bigint[];
  },
  limit: number = 5
): Promise<TestDesignKnowledgeWithTags[]> {
  const where: Prisma.TestDesignKnowledgeWhereInput = {
    status: 'ACTIVE',
  };

  if (context.projectId) {
    where.OR = [{ projectId: context.projectId }, { projectId: null }];
  }

  if (context.category) {
    where.category = context.category as Prisma.EnumTestTechniqueCategoryFilter;
  }

  if (context.keywords && context.keywords.length > 0) {
    const keywordConditions = context.keywords.map((keyword) => ({
      OR: [
        { title: { contains: keyword, mode: 'insensitive' as const } },
        { content: { contains: keyword, mode: 'insensitive' as const } },
        { description: { contains: keyword, mode: 'insensitive' as const } },
        { technique: { contains: keyword, mode: 'insensitive' as const } },
      ],
    }));
    where.AND = keywordConditions;
  }

  if (context.excludeIds && context.excludeIds.length > 0) {
    where.id = { notIn: context.excludeIds };
  }

  const recommendations = await prisma.testDesignKnowledge.findMany({
    where,
    include: tagsInclude,
    orderBy: [{ rating: 'desc' }, { usageCount: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  });

  return recommendations.map(transformToWithTags);
}

export async function getSimilarKnowledges(
  id: bigint,
  limit: number = 5
): Promise<TestDesignKnowledgeWithTags[]> {
  const current = await prisma.testDesignKnowledge.findUnique({
    where: { id },
    include: tagsInclude,
  });

  if (!current) return [];

  const tagIds = current.tags.map((t) => t.tagId);

  const similar = await prisma.testDesignKnowledge.findMany({
    where: {
      id: { not: id },
      status: 'ACTIVE',
      OR: [
        { technique: current.technique },
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
