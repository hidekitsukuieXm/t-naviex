/**
 * テストセットリポジトリ
 */

import prisma from '@/lib/prisma';
import type {
  TestSet,
  TestSetWithTags,
  TestSetDetail,
  CreateTestSetInput,
  UpdateTestSetInput,
  TestSetStatus,
  TestSetCaseOrderInput,
} from '@/types/test-set';

/**
 * BigIntからstringへ変換するヘルパー
 */
function bigIntToString<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj.toString() as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(bigIntToString) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      result[key] = bigIntToString((obj as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return obj;
}

/**
 * テストセット一覧を取得
 */
export async function getTestSets(
  projectId: string,
  options?: {
    search?: string;
    status?: TestSetStatus;
    sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'executionCount' | 'sortOrder';
    sortOrder?: 'asc' | 'desc';
    skip?: number;
    take?: number;
  }
): Promise<{ items: TestSetWithTags[]; total: number }> {
  const {
    search,
    status,
    sortBy = 'sortOrder',
    sortOrder = 'asc',
    skip = 0,
    take = 50,
  } = options || {};

  const where = {
    projectId: BigInt(projectId),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.testSet.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: { testCases: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take,
    }),
    prisma.testSet.count({ where }),
  ]);

  return {
    items: items.map((item) =>
      bigIntToString({
        id: item.id.toString(),
        projectId: item.projectId.toString(),
        name: item.name,
        description: item.description,
        status: item.status as TestSetStatus,
        version: item.version,
        sortOrder: item.sortOrder,
        metadata: item.metadata as Record<string, unknown> | null,
        executionCount: item.executionCount,
        lastExecutedAt: item.lastExecutedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdById: item.createdById.toString(),
        updatedById: item.updatedById?.toString() || null,
        tags: item.tags.map((t) => ({
          id: t.tag.id.toString(),
          name: t.tag.name,
          color: t.tag.color,
        })),
        testCaseCount: item._count.testCases,
      })
    ),
    total,
  };
}

/**
 * テストセットを取得（詳細）
 */
export async function getTestSetById(
  projectId: string,
  testSetId: string
): Promise<TestSetDetail | null> {
  const testSet = await prisma.testSet.findFirst({
    where: {
      id: BigInt(testSetId),
      projectId: BigInt(projectId),
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      testCases: {
        include: {
          testCase: {
            select: {
              id: true,
              title: true,
              priority: true,
              testType: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
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
    },
  });

  if (!testSet) {
    return null;
  }

  return bigIntToString({
    id: testSet.id.toString(),
    projectId: testSet.projectId.toString(),
    name: testSet.name,
    description: testSet.description,
    status: testSet.status as TestSetStatus,
    version: testSet.version,
    sortOrder: testSet.sortOrder,
    metadata: testSet.metadata as Record<string, unknown> | null,
    executionCount: testSet.executionCount,
    lastExecutedAt: testSet.lastExecutedAt,
    createdAt: testSet.createdAt,
    updatedAt: testSet.updatedAt,
    createdById: testSet.createdById.toString(),
    updatedById: testSet.updatedById?.toString() || null,
    tags: testSet.tags.map((t) => ({
      id: t.tag.id.toString(),
      name: t.tag.name,
      color: t.tag.color,
    })),
    testCases: testSet.testCases.map((tc) => ({
      id: tc.id.toString(),
      testCaseId: tc.testCase.id.toString(),
      title: tc.testCase.title,
      priority: tc.testCase.priority,
      testType: tc.testCase.testType,
      sortOrder: tc.sortOrder,
    })),
    testCaseCount: testSet.testCases.length,
    createdBy: testSet.createdBy
      ? {
          id: testSet.createdBy.id.toString(),
          name: testSet.createdBy.name,
          email: testSet.createdBy.email,
        }
      : null,
    updatedBy: testSet.updatedBy
      ? {
          id: testSet.updatedBy.id.toString(),
          name: testSet.updatedBy.name,
          email: testSet.updatedBy.email,
        }
      : null,
  });
}

/**
 * テストセットを作成
 */
export async function createTestSet(
  projectId: string,
  userId: string,
  input: CreateTestSetInput
): Promise<TestSet> {
  const { tagIds, testCaseIds, ...data } = input;

  // 最大sortOrderを取得
  const maxSortOrder = await prisma.testSet.aggregate({
    where: { projectId: BigInt(projectId) },
    _max: { sortOrder: true },
  });

  const testSet = await prisma.testSet.create({
    data: {
      projectId: BigInt(projectId),
      createdById: BigInt(userId),
      name: data.name,
      description: data.description,
      status: data.status || 'DRAFT',
      version: data.version || '1.0.0',
      sortOrder: data.sortOrder ?? (maxSortOrder._max.sortOrder ?? -1) + 1,
      metadata: data.metadata,
      ...(tagIds && tagIds.length > 0
        ? {
            tags: {
              create: tagIds.map((tagId) => ({
                tagId: BigInt(tagId),
              })),
            },
          }
        : {}),
      ...(testCaseIds && testCaseIds.length > 0
        ? {
            testCases: {
              create: testCaseIds.map((testCaseId, index) => ({
                testCaseId: BigInt(testCaseId),
                sortOrder: index,
              })),
            },
          }
        : {}),
    },
  });

  return bigIntToString({
    id: testSet.id.toString(),
    projectId: testSet.projectId.toString(),
    name: testSet.name,
    description: testSet.description,
    status: testSet.status as TestSetStatus,
    version: testSet.version,
    sortOrder: testSet.sortOrder,
    metadata: testSet.metadata as Record<string, unknown> | null,
    executionCount: testSet.executionCount,
    lastExecutedAt: testSet.lastExecutedAt,
    createdAt: testSet.createdAt,
    updatedAt: testSet.updatedAt,
    createdById: testSet.createdById.toString(),
    updatedById: testSet.updatedById?.toString() || null,
  });
}

/**
 * テストセットを更新
 */
export async function updateTestSet(
  projectId: string,
  testSetId: string,
  userId: string,
  input: UpdateTestSetInput
): Promise<TestSet> {
  const { tagIds, ...data } = input;

  // タグの更新がある場合、既存のタグを削除して新規作成
  if (tagIds !== undefined) {
    await prisma.testSetTag.deleteMany({
      where: { testSetId: BigInt(testSetId) },
    });
  }

  const testSet = await prisma.testSet.update({
    where: {
      id: BigInt(testSetId),
      projectId: BigInt(projectId),
    },
    data: {
      ...data,
      updatedById: BigInt(userId),
      ...(tagIds && tagIds.length > 0
        ? {
            tags: {
              create: tagIds.map((tagId) => ({
                tagId: BigInt(tagId),
              })),
            },
          }
        : {}),
    },
  });

  return bigIntToString({
    id: testSet.id.toString(),
    projectId: testSet.projectId.toString(),
    name: testSet.name,
    description: testSet.description,
    status: testSet.status as TestSetStatus,
    version: testSet.version,
    sortOrder: testSet.sortOrder,
    metadata: testSet.metadata as Record<string, unknown> | null,
    executionCount: testSet.executionCount,
    lastExecutedAt: testSet.lastExecutedAt,
    createdAt: testSet.createdAt,
    updatedAt: testSet.updatedAt,
    createdById: testSet.createdById.toString(),
    updatedById: testSet.updatedById?.toString() || null,
  });
}

/**
 * テストセットを削除
 */
export async function deleteTestSet(projectId: string, testSetId: string): Promise<void> {
  await prisma.testSet.delete({
    where: {
      id: BigInt(testSetId),
      projectId: BigInt(projectId),
    },
  });
}

/**
 * テストセットを複製
 */
export async function duplicateTestSet(
  projectId: string,
  testSetId: string,
  userId: string,
  newName: string
): Promise<TestSet> {
  const original = await prisma.testSet.findFirst({
    where: {
      id: BigInt(testSetId),
      projectId: BigInt(projectId),
    },
    include: {
      tags: true,
      testCases: true,
    },
  });

  if (!original) {
    throw new Error('テストセットが見つかりません');
  }

  // 最大sortOrderを取得
  const maxSortOrder = await prisma.testSet.aggregate({
    where: { projectId: BigInt(projectId) },
    _max: { sortOrder: true },
  });

  const testSet = await prisma.testSet.create({
    data: {
      projectId: BigInt(projectId),
      createdById: BigInt(userId),
      name: newName,
      description: original.description,
      status: 'DRAFT',
      version: '1.0.0',
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      metadata: original.metadata,
      tags: {
        create: original.tags.map((t) => ({
          tagId: t.tagId,
        })),
      },
      testCases: {
        create: original.testCases.map((tc) => ({
          testCaseId: tc.testCaseId,
          sortOrder: tc.sortOrder,
        })),
      },
    },
  });

  return bigIntToString({
    id: testSet.id.toString(),
    projectId: testSet.projectId.toString(),
    name: testSet.name,
    description: testSet.description,
    status: testSet.status as TestSetStatus,
    version: testSet.version,
    sortOrder: testSet.sortOrder,
    metadata: testSet.metadata as Record<string, unknown> | null,
    executionCount: testSet.executionCount,
    lastExecutedAt: testSet.lastExecutedAt,
    createdAt: testSet.createdAt,
    updatedAt: testSet.updatedAt,
    createdById: testSet.createdById.toString(),
    updatedById: testSet.updatedById?.toString() || null,
  });
}

/**
 * テストセットにテストケースを追加
 */
export async function addTestCasesToTestSet(
  projectId: string,
  testSetId: string,
  testCaseIds: string[]
): Promise<void> {
  // テストセットの存在確認
  const testSet = await prisma.testSet.findFirst({
    where: {
      id: BigInt(testSetId),
      projectId: BigInt(projectId),
    },
  });

  if (!testSet) {
    throw new Error('テストセットが見つかりません');
  }

  // 現在の最大sortOrderを取得
  const maxSortOrder = await prisma.testSetCase.aggregate({
    where: { testSetId: BigInt(testSetId) },
    _max: { sortOrder: true },
  });

  let currentSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

  // 既存のテストケースIDを取得
  const existingCases = await prisma.testSetCase.findMany({
    where: {
      testSetId: BigInt(testSetId),
      testCaseId: { in: testCaseIds.map((id) => BigInt(id)) },
    },
    select: { testCaseId: true },
  });

  const existingCaseIds = new Set(existingCases.map((c) => c.testCaseId.toString()));

  // 新規追加するテストケースのみをフィルタ
  const newTestCaseIds = testCaseIds.filter((id) => !existingCaseIds.has(id));

  if (newTestCaseIds.length > 0) {
    await prisma.testSetCase.createMany({
      data: newTestCaseIds.map((testCaseId) => ({
        testSetId: BigInt(testSetId),
        testCaseId: BigInt(testCaseId),
        sortOrder: currentSortOrder++,
      })),
    });
  }
}

/**
 * テストセットからテストケースを削除
 */
export async function removeTestCasesFromTestSet(
  projectId: string,
  testSetId: string,
  testCaseIds: string[]
): Promise<void> {
  // テストセットの存在確認
  const testSet = await prisma.testSet.findFirst({
    where: {
      id: BigInt(testSetId),
      projectId: BigInt(projectId),
    },
  });

  if (!testSet) {
    throw new Error('テストセットが見つかりません');
  }

  await prisma.testSetCase.deleteMany({
    where: {
      testSetId: BigInt(testSetId),
      testCaseId: { in: testCaseIds.map((id) => BigInt(id)) },
    },
  });
}

/**
 * テストセット内のテストケースの並び順を更新
 */
export async function updateTestSetCaseOrder(
  projectId: string,
  testSetId: string,
  orders: TestSetCaseOrderInput[]
): Promise<void> {
  // テストセットの存在確認
  const testSet = await prisma.testSet.findFirst({
    where: {
      id: BigInt(testSetId),
      projectId: BigInt(projectId),
    },
  });

  if (!testSet) {
    throw new Error('テストセットが見つかりません');
  }

  await prisma.$transaction(
    orders.map((order) =>
      prisma.testSetCase.updateMany({
        where: {
          testSetId: BigInt(testSetId),
          testCaseId: BigInt(order.testCaseId),
        },
        data: { sortOrder: order.sortOrder },
      })
    )
  );
}

/**
 * テストセットの並び順を更新
 */
export async function updateTestSetOrder(
  projectId: string,
  testSetId: string,
  newOrder: number
): Promise<void> {
  await prisma.testSet.update({
    where: {
      id: BigInt(testSetId),
      projectId: BigInt(projectId),
    },
    data: { sortOrder: newOrder },
  });
}

/**
 * テストセットの実行回数を増加
 */
export async function incrementTestSetExecutionCount(
  projectId: string,
  testSetId: string
): Promise<void> {
  await prisma.testSet.update({
    where: {
      id: BigInt(testSetId),
      projectId: BigInt(projectId),
    },
    data: {
      executionCount: { increment: 1 },
      lastExecutedAt: new Date(),
    },
  });
}
