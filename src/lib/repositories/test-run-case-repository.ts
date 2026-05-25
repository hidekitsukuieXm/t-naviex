/**
 * テストランケースリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  TestRunCase,
  TestRunCaseWithRelations,
  TestRunCaseStatus,
  CreateTestRunCaseInput,
  UpdateTestRunCaseInput,
  BulkCreateTestRunCaseInput,
  BulkUpdateTestRunCaseInput,
  TestRunCaseSearchParams,
} from '@/types/test-run-case';
import { TEST_RUN_CASE_STATUS } from '@/types/test-run-case';

// ============================================
// セレクト定義
// ============================================

const testRunCaseSelect = {
  id: true,
  testRunId: true,
  testCaseId: true,
  assignedToId: true,
  status: true,
  executedAt: true,
  executionTime: true,
  actualResult: true,
  defects: true,
  comment: true,
  reproducibility: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

const testRunCaseWithRelationsSelect = {
  ...testRunCaseSelect,
  testRun: {
    select: {
      id: true,
      name: true,
    },
  },
  testCase: {
    select: {
      id: true,
      title: true,
      priority: true,
      description: true,
      preconditions: true,
      expectedResult: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

// ============================================
// 変換関数
// ============================================

interface DbTestRunCase {
  id: bigint;
  testRunId: bigint;
  testCaseId: bigint;
  assignedToId: bigint | null;
  status: string;
  executedAt: Date | null;
  executionTime: number | null;
  actualResult: string | null;
  defects: string | null;
  comment: string | null;
  reproducibility: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DbTestRunCaseWithRelations extends DbTestRunCase {
  testRun: {
    id: bigint;
    name: string;
  };
  testCase: {
    id: bigint;
    title: string;
    priority: string;
    description: string | null;
    preconditions: string | null;
    expectedResult: string | null;
  };
  assignedTo: {
    id: bigint;
    name: string;
    email: string;
  } | null;
}

function serializeTestRunCase(testRunCase: DbTestRunCase): TestRunCase {
  return {
    id: testRunCase.id.toString(),
    testRunId: testRunCase.testRunId.toString(),
    testCaseId: testRunCase.testCaseId.toString(),
    assignedToId: testRunCase.assignedToId?.toString() ?? null,
    status: testRunCase.status as TestRunCaseStatus,
    executedAt: testRunCase.executedAt?.toISOString() ?? null,
    executionTime: testRunCase.executionTime,
    actualResult: testRunCase.actualResult,
    defects: testRunCase.defects,
    comment: testRunCase.comment,
    reproducibility: testRunCase.reproducibility,
    sortOrder: testRunCase.sortOrder,
    createdAt: testRunCase.createdAt.toISOString(),
    updatedAt: testRunCase.updatedAt.toISOString(),
  };
}

function serializeTestRunCaseWithRelations(
  testRunCase: DbTestRunCaseWithRelations
): TestRunCaseWithRelations {
  return {
    ...serializeTestRunCase(testRunCase),
    testRun: {
      id: testRunCase.testRun.id.toString(),
      name: testRunCase.testRun.name,
    },
    testCase: {
      id: testRunCase.testCase.id.toString(),
      title: testRunCase.testCase.title,
      priority: testRunCase.testCase.priority,
      description: testRunCase.testCase.description,
      preconditions: testRunCase.testCase.preconditions,
      expectedResult: testRunCase.testCase.expectedResult,
    },
    assignedTo: testRunCase.assignedTo
      ? {
          id: testRunCase.assignedTo.id.toString(),
          name: testRunCase.assignedTo.name,
          email: testRunCase.assignedTo.email,
        }
      : null,
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * テストランケース作成
 */
export async function createTestRunCase(input: CreateTestRunCaseInput): Promise<TestRunCase> {
  const testRunCase = await prisma.testRunCase.create({
    data: {
      testRunId: BigInt(input.testRunId),
      testCaseId: BigInt(input.testCaseId),
      assignedToId: input.assignedToId ? BigInt(input.assignedToId) : null,
      status: input.status ?? TEST_RUN_CASE_STATUS.NOT_RUN,
      sortOrder: input.sortOrder ?? 0,
    },
    select: testRunCaseSelect,
  });

  return serializeTestRunCase(testRunCase as DbTestRunCase);
}

/**
 * テストランケース一括作成
 */
export async function bulkCreateTestRunCases(
  input: BulkCreateTestRunCaseInput
): Promise<TestRunCase[]> {
  const testRunCases = await prisma.$transaction(
    input.testCaseIds.map((testCaseId, index) =>
      prisma.testRunCase.create({
        data: {
          testRunId: BigInt(input.testRunId),
          testCaseId: BigInt(testCaseId),
          assignedToId: input.assignedToId ? BigInt(input.assignedToId) : null,
          status: TEST_RUN_CASE_STATUS.NOT_RUN,
          sortOrder: index,
        },
        select: testRunCaseSelect,
      })
    )
  );

  return testRunCases.map((t) => serializeTestRunCase(t as DbTestRunCase));
}

/**
 * テストランケース取得（ID指定）
 */
export async function getTestRunCaseById(id: bigint): Promise<TestRunCaseWithRelations | null> {
  const testRunCase = await prisma.testRunCase.findUnique({
    where: { id },
    select: testRunCaseWithRelationsSelect,
  });

  if (!testRunCase) {
    return null;
  }

  return serializeTestRunCaseWithRelations(testRunCase as DbTestRunCaseWithRelations);
}

/**
 * テストランケース一覧取得
 */
export async function getTestRunCases(
  testRunId: string,
  params: Partial<TestRunCaseSearchParams> = {}
): Promise<TestRunCaseWithRelations[]> {
  type WhereClause = {
    testRunId: bigint;
    testCaseId?: bigint;
    assignedToId?: bigint | null;
    status?: string;
    OR?: Array<{ testCase: { title: { contains: string; mode: 'insensitive' } } }>;
  };

  const where: WhereClause = {
    testRunId: BigInt(testRunId),
  };

  // テストケースフィルター
  if (params.testCaseId) {
    where.testCaseId = BigInt(params.testCaseId);
  }

  // 担当者フィルター
  if (params.assignedToId !== undefined) {
    where.assignedToId = params.assignedToId ? BigInt(params.assignedToId) : null;
  }

  // ステータスフィルター
  if (params.status) {
    where.status = params.status;
  }

  // 検索クエリ
  if (params.query) {
    where.OR = [{ testCase: { title: { contains: params.query, mode: 'insensitive' } } }];
  }

  const testRunCases = await prisma.testRunCase.findMany({
    where,
    select: testRunCaseWithRelationsSelect,
    orderBy: { sortOrder: 'asc' },
  });

  return testRunCases.map((t) =>
    serializeTestRunCaseWithRelations(t as DbTestRunCaseWithRelations)
  );
}

/**
 * テストランケース更新
 */
export async function updateTestRunCase(
  id: bigint,
  input: UpdateTestRunCaseInput
): Promise<TestRunCase | null> {
  const existing = await prisma.testRunCase.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return null;
  }

  const updateData: {
    assignedToId?: bigint | null;
    status?: string;
    executedAt?: Date | null;
    executionTime?: number | null;
    actualResult?: string | null;
    defects?: string | null;
    comment?: string | null;
    reproducibility?: string | null;
    sortOrder?: number;
  } = {};

  if (input.assignedToId !== undefined) {
    updateData.assignedToId = input.assignedToId ? BigInt(input.assignedToId) : null;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;

    // ステータス変更時の自動日時設定
    const isExecuted =
      input.status === TEST_RUN_CASE_STATUS.PASSED ||
      input.status === TEST_RUN_CASE_STATUS.FAILED ||
      input.status === TEST_RUN_CASE_STATUS.BLOCKED ||
      input.status === TEST_RUN_CASE_STATUS.SKIPPED ||
      input.status === TEST_RUN_CASE_STATUS.RETEST;

    if (isExecuted && input.executedAt === undefined) {
      updateData.executedAt = new Date();
    }
  }

  if (input.executedAt !== undefined) {
    updateData.executedAt = input.executedAt ? new Date(input.executedAt) : null;
  }

  if (input.executionTime !== undefined) {
    updateData.executionTime = input.executionTime;
  }

  if (input.actualResult !== undefined) {
    updateData.actualResult = input.actualResult;
  }

  if (input.defects !== undefined) {
    updateData.defects = input.defects;
  }

  if (input.comment !== undefined) {
    updateData.comment = input.comment;
  }

  if (input.reproducibility !== undefined) {
    updateData.reproducibility = input.reproducibility;
  }

  if (input.sortOrder !== undefined) {
    updateData.sortOrder = input.sortOrder;
  }

  const testRunCase = await prisma.testRunCase.update({
    where: { id },
    data: updateData,
    select: testRunCaseSelect,
  });

  return serializeTestRunCase(testRunCase as DbTestRunCase);
}

/**
 * テストランケース一括更新
 */
export async function bulkUpdateTestRunCases(
  input: BulkUpdateTestRunCaseInput
): Promise<TestRunCase[]> {
  const updateData: {
    assignedToId?: bigint | null;
    status?: string;
    executedAt?: Date | null;
    actualResult?: string | null;
    comment?: string | null;
    reproducibility?: string | null;
  } = {};

  if (input.assignedToId !== undefined) {
    updateData.assignedToId = input.assignedToId ? BigInt(input.assignedToId) : null;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;

    // ステータス変更時の自動日時設定
    const isExecuted =
      input.status === TEST_RUN_CASE_STATUS.PASSED ||
      input.status === TEST_RUN_CASE_STATUS.FAILED ||
      input.status === TEST_RUN_CASE_STATUS.BLOCKED ||
      input.status === TEST_RUN_CASE_STATUS.SKIPPED ||
      input.status === TEST_RUN_CASE_STATUS.RETEST;

    if (isExecuted) {
      updateData.executedAt = new Date();
    }
  }

  if (input.actualResult !== undefined) {
    updateData.actualResult = input.actualResult;
  }

  if (input.comment !== undefined) {
    updateData.comment = input.comment;
  }

  if (input.reproducibility !== undefined) {
    updateData.reproducibility = input.reproducibility;
  }

  const testRunCases = await prisma.$transaction(
    input.ids.map((id) =>
      prisma.testRunCase.update({
        where: { id: BigInt(id) },
        data: updateData,
        select: testRunCaseSelect,
      })
    )
  );

  return testRunCases.map((t) => serializeTestRunCase(t as DbTestRunCase));
}

/**
 * テストランケース削除
 */
export async function deleteTestRunCase(id: bigint): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.testRunCase.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, error: 'テストランケースが見つかりません。' };
  }

  await prisma.testRunCase.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * テストランケース一括削除
 */
export async function bulkDeleteTestRunCases(
  ids: string[]
): Promise<{ success: boolean; count: number }> {
  const result = await prisma.testRunCase.deleteMany({
    where: {
      id: {
        in: ids.map((id) => BigInt(id)),
      },
    },
  });

  return { success: true, count: result.count };
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * テストランが存在するか確認
 */
export async function testRunExists(testRunId: bigint): Promise<boolean> {
  const testRun = await prisma.testRun.findUnique({
    where: { id: testRunId },
    select: { id: true },
  });

  return testRun !== null;
}

/**
 * テストケースが存在するか確認
 */
export async function testCaseExists(testCaseId: bigint): Promise<boolean> {
  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    select: { id: true },
  });

  return testCase !== null;
}

/**
 * ユーザーが存在するか確認
 */
export async function userExists(userId: bigint): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  return user !== null;
}

/**
 * テストランケースがテストランに属しているか確認
 */
export async function testRunCaseExistsInTestRun(
  testRunId: bigint,
  testRunCaseId: bigint
): Promise<boolean> {
  const testRunCase = await prisma.testRunCase.findFirst({
    where: {
      id: testRunCaseId,
      testRunId,
    },
    select: { id: true },
  });

  return testRunCase !== null;
}

/**
 * テストランとテストケースの組み合わせが既に存在するか確認
 */
export async function testRunCaseAlreadyExists(
  testRunId: bigint,
  testCaseId: bigint
): Promise<boolean> {
  const testRunCase = await prisma.testRunCase.findUnique({
    where: {
      testRunId_testCaseId: {
        testRunId,
        testCaseId,
      },
    },
    select: { id: true },
  });

  return testRunCase !== null;
}

/**
 * テストランのケース数を取得
 */
export async function getTestRunCaseCount(
  testRunId: bigint,
  status?: TestRunCaseStatus
): Promise<number> {
  const where: { testRunId: bigint; status?: string } = {
    testRunId,
  };

  if (status) {
    where.status = status;
  }

  return prisma.testRunCase.count({ where });
}

/**
 * テストランのステータス別カウントを取得
 */
export async function getTestRunCaseStatusCounts(
  testRunId: bigint
): Promise<Record<TestRunCaseStatus, number>> {
  const counts = await prisma.testRunCase.groupBy({
    by: ['status'],
    where: { testRunId },
    _count: true,
  });

  const result: Record<TestRunCaseStatus, number> = {
    NOT_RUN: 0,
    PASSED: 0,
    FAILED: 0,
    BLOCKED: 0,
    SKIPPED: 0,
    RETEST: 0,
  };

  for (const count of counts) {
    result[count.status as TestRunCaseStatus] = count._count;
  }

  return result;
}

/**
 * 担当者に割り当てられたテストランケース一覧を取得
 */
export async function getTestRunCasesByAssignee(assignedToId: bigint): Promise<TestRunCase[]> {
  const testRunCases = await prisma.testRunCase.findMany({
    where: { assignedToId },
    select: testRunCaseSelect,
    orderBy: { createdAt: 'desc' },
  });

  return testRunCases.map((t) => serializeTestRunCase(t as DbTestRunCase));
}
