/**
 * テストランリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  TestRun,
  TestRunWithRelations,
  TestRunStatus,
  CreateTestRunInput,
  UpdateTestRunInput,
  TestRunSearchParams,
} from '@/types/test-run';
import type { Prisma } from '@/generated/prisma';
import { TEST_RUN_STATUS } from '@/types/test-run';

// Re-export types for external use
export type { TestRunSearchParams, CreateTestRunInput, TestRunStatus };

// ============================================
// セレクト定義
// ============================================

const testRunSelect = {
  id: true,
  projectId: true,
  milestoneId: true,
  configurationId: true,
  name: true,
  description: true,
  status: true,
  plannedStartDate: true,
  plannedEndDate: true,
  actualStartDate: true,
  actualEndDate: true,
  totalCases: true,
  passedCases: true,
  failedCases: true,
  blockedCases: true,
  skippedCases: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

const testRunWithRelationsSelect = {
  ...testRunSelect,
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  milestone: {
    select: {
      id: true,
      name: true,
    },
  },
  configuration: {
    select: {
      id: true,
      name: true,
    },
  },
};

// ============================================
// 変換関数
// ============================================

interface DbTestRun {
  id: bigint;
  projectId: bigint;
  milestoneId: bigint | null;
  configurationId: bigint | null;
  name: string;
  description: string | null;
  status: string;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  skippedCases: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DbTestRunWithRelations extends DbTestRun {
  project: {
    id: bigint;
    name: string;
  };
  milestone: {
    id: bigint;
    name: string;
  } | null;
  configuration: {
    id: bigint;
    name: string;
  } | null;
}

function serializeTestRun(testRun: DbTestRun): TestRun {
  return {
    id: testRun.id.toString(),
    projectId: testRun.projectId.toString(),
    milestoneId: testRun.milestoneId?.toString() ?? null,
    configurationId: testRun.configurationId?.toString() ?? null,
    name: testRun.name,
    description: testRun.description,
    status: testRun.status as TestRunStatus,
    plannedStartDate: testRun.plannedStartDate?.toISOString().split('T')[0] ?? null,
    plannedEndDate: testRun.plannedEndDate?.toISOString().split('T')[0] ?? null,
    actualStartDate: testRun.actualStartDate?.toISOString().split('T')[0] ?? null,
    actualEndDate: testRun.actualEndDate?.toISOString().split('T')[0] ?? null,
    totalCases: testRun.totalCases,
    passedCases: testRun.passedCases,
    failedCases: testRun.failedCases,
    blockedCases: testRun.blockedCases,
    skippedCases: testRun.skippedCases,
    notes: testRun.notes,
    createdAt: testRun.createdAt.toISOString(),
    updatedAt: testRun.updatedAt.toISOString(),
  };
}

function serializeTestRunWithRelations(testRun: DbTestRunWithRelations): TestRunWithRelations {
  return {
    ...serializeTestRun(testRun),
    project: {
      id: testRun.project.id.toString(),
      name: testRun.project.name,
    },
    milestone: testRun.milestone
      ? {
          id: testRun.milestone.id.toString(),
          name: testRun.milestone.name,
        }
      : null,
    configuration: testRun.configuration
      ? {
          id: testRun.configuration.id.toString(),
          name: testRun.configuration.name,
        }
      : null,
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * テストラン作成
 */
export async function createTestRun(input: CreateTestRunInput): Promise<TestRun> {
  const trimmedName = input.name.trim();

  const testRun = await prisma.testRun.create({
    data: {
      projectId: BigInt(input.projectId),
      milestoneId: input.milestoneId ? BigInt(input.milestoneId) : null,
      configurationId: input.configurationId ? BigInt(input.configurationId) : null,
      name: trimmedName,
      description: input.description ?? null,
      status: input.status ?? TEST_RUN_STATUS.PLANNED,
      plannedStartDate: input.plannedStartDate ? new Date(input.plannedStartDate) : null,
      plannedEndDate: input.plannedEndDate ? new Date(input.plannedEndDate) : null,
      notes: input.notes ?? null,
    },
    select: testRunSelect,
  });

  return serializeTestRun(testRun as DbTestRun);
}

/**
 * テストラン取得（ID指定）
 */
export async function getTestRunById(id: bigint): Promise<TestRunWithRelations | null> {
  const testRun = await prisma.testRun.findUnique({
    where: { id },
    select: testRunWithRelationsSelect,
  });

  if (!testRun) {
    return null;
  }

  return serializeTestRunWithRelations(testRun as DbTestRunWithRelations);
}

/**
 * テストラン一覧取得
 */
export async function getTestRuns(
  projectId: string,
  params: Partial<TestRunSearchParams> = {}
): Promise<TestRunWithRelations[]> {
  const where: Prisma.TestRunWhereInput = {
    projectId: BigInt(projectId),
  };

  // マイルストーンフィルター
  if (params.milestoneId !== undefined) {
    where.milestoneId = params.milestoneId ? BigInt(params.milestoneId) : null;
  }

  // コンフィギュレーションフィルター
  if (params.configurationId !== undefined) {
    where.configurationId = params.configurationId ? BigInt(params.configurationId) : null;
  }

  // ステータスフィルター
  if (params.status) {
    where.status = params.status as Prisma.EnumTestRunStatusFilter;
  }

  // 検索クエリ
  if (params.query) {
    where.OR = [{ name: { contains: params.query, mode: 'insensitive' } }];
  }

  const testRuns = await prisma.testRun.findMany({
    where,
    select: testRunWithRelationsSelect,
    orderBy: { createdAt: 'desc' },
  });

  return testRuns.map((t) => serializeTestRunWithRelations(t as DbTestRunWithRelations));
}

/**
 * テストラン更新
 */
export async function updateTestRun(
  id: bigint,
  input: UpdateTestRunInput
): Promise<TestRun | null> {
  const existing = await prisma.testRun.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return null;
  }

  const updateData: {
    milestoneId?: bigint | null;
    configurationId?: bigint | null;
    name?: string;
    description?: string | null;
    status?: string;
    plannedStartDate?: Date | null;
    plannedEndDate?: Date | null;
    actualStartDate?: Date | null;
    actualEndDate?: Date | null;
    totalCases?: number;
    passedCases?: number;
    failedCases?: number;
    blockedCases?: number;
    skippedCases?: number;
    notes?: string | null;
  } = {};

  if (input.milestoneId !== undefined) {
    updateData.milestoneId = input.milestoneId ? BigInt(input.milestoneId) : null;
  }

  if (input.configurationId !== undefined) {
    updateData.configurationId = input.configurationId ? BigInt(input.configurationId) : null;
  }

  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;

    // ステータス変更時の自動日付設定
    if (input.status === TEST_RUN_STATUS.IN_PROGRESS && !existing.status?.includes('IN_PROGRESS')) {
      // 実行開始時にactualStartDateを設定
      if (input.actualStartDate === undefined) {
        updateData.actualStartDate = new Date();
      }
    }
    if (input.status === TEST_RUN_STATUS.COMPLETED || input.status === TEST_RUN_STATUS.ABORTED) {
      // 完了/中止時にactualEndDateを設定
      if (input.actualEndDate === undefined) {
        updateData.actualEndDate = new Date();
      }
    }
  }

  if (input.plannedStartDate !== undefined) {
    updateData.plannedStartDate = input.plannedStartDate ? new Date(input.plannedStartDate) : null;
  }

  if (input.plannedEndDate !== undefined) {
    updateData.plannedEndDate = input.plannedEndDate ? new Date(input.plannedEndDate) : null;
  }

  if (input.actualStartDate !== undefined) {
    updateData.actualStartDate = input.actualStartDate ? new Date(input.actualStartDate) : null;
  }

  if (input.actualEndDate !== undefined) {
    updateData.actualEndDate = input.actualEndDate ? new Date(input.actualEndDate) : null;
  }

  if (input.totalCases !== undefined) {
    updateData.totalCases = input.totalCases;
  }

  if (input.passedCases !== undefined) {
    updateData.passedCases = input.passedCases;
  }

  if (input.failedCases !== undefined) {
    updateData.failedCases = input.failedCases;
  }

  if (input.blockedCases !== undefined) {
    updateData.blockedCases = input.blockedCases;
  }

  if (input.skippedCases !== undefined) {
    updateData.skippedCases = input.skippedCases;
  }

  if (input.notes !== undefined) {
    updateData.notes = input.notes;
  }

  const testRun = await prisma.testRun.update({
    where: { id },
    data: updateData as Prisma.TestRunUpdateInput,
    select: testRunSelect,
  });

  return serializeTestRun(testRun as DbTestRun);
}

/**
 * テストラン削除
 */
export async function deleteTestRun(id: bigint): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.testRun.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, error: 'テストランが見つかりません。' };
  }

  await prisma.testRun.delete({
    where: { id },
  });

  return { success: true };
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
 * テストランがプロジェクトに属しているか確認
 */
export async function testRunExistsInProject(
  projectId: bigint,
  testRunId: bigint
): Promise<boolean> {
  const testRun = await prisma.testRun.findFirst({
    where: {
      id: testRunId,
      projectId,
    },
    select: { id: true },
  });

  return testRun !== null;
}

/**
 * マイルストーンが同じプロジェクトに存在するか確認
 */
export async function milestoneExistsInProject(
  projectId: bigint,
  milestoneId: bigint
): Promise<boolean> {
  const milestone = await prisma.milestone.findFirst({
    where: {
      id: milestoneId,
      projectId,
    },
    select: { id: true },
  });

  return milestone !== null;
}

/**
 * コンフィギュレーションが同じプロジェクトに存在するか確認
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
 * プロジェクトのテストラン数を取得
 */
export async function getTestRunCount(projectId: bigint, status?: TestRunStatus): Promise<number> {
  const where: Prisma.TestRunWhereInput = {
    projectId,
  };

  if (status) {
    where.status = status as Prisma.EnumTestRunStatusFilter;
  }

  return prisma.testRun.count({ where });
}

/**
 * マイルストーンに紐づくテストラン一覧を取得
 */
export async function getTestRunsByMilestone(milestoneId: bigint): Promise<TestRun[]> {
  const testRuns = await prisma.testRun.findMany({
    where: { milestoneId },
    select: testRunSelect,
    orderBy: { createdAt: 'desc' },
  });

  return testRuns.map((t) => serializeTestRun(t as DbTestRun));
}

/**
 * コンフィギュレーションに紐づくテストラン一覧を取得
 */
export async function getTestRunsByConfiguration(configurationId: bigint): Promise<TestRun[]> {
  const testRuns = await prisma.testRun.findMany({
    where: { configurationId },
    select: testRunSelect,
    orderBy: { createdAt: 'desc' },
  });

  return testRuns.map((t) => serializeTestRun(t as DbTestRun));
}

// ============================================
// Re-Run機能
// ============================================

/**
 * Re-Run入力型
 */
export interface CreateReRunInput {
  name?: string;
  description?: string;
  includeStatuses: string[];
  assigneeId?: string;
}

/**
 * 失敗/ブロックケースを抽出して新しいテストランを作成
 */
export async function createReRun(
  projectId: bigint,
  sourceTestRunId: bigint,
  input: CreateReRunInput
): Promise<TestRunWithRelations> {
  // 元のテストランを取得
  const sourceTestRunBase = await prisma.testRun.findUnique({
    where: { id: sourceTestRunId },
  });

  if (!sourceTestRunBase || sourceTestRunBase.projectId !== projectId) {
    throw new Error('テストランが見つかりません');
  }

  // テストランケースを取得
  const testRunCases = await prisma.testRunCase.findMany({
    where: {
      testRunId: sourceTestRunId,
      status: {
        in: input.includeStatuses as import('@/generated/prisma').TestRunCaseStatus[],
      },
    },
    select: {
      testCaseId: true,
      assignedToId: true,
    },
  });

  if (testRunCases.length === 0) {
    throw new Error('対象のテストケースがありません');
  }

  // 新しいテストランを作成
  const newTestRun = await prisma.$transaction(async (tx) => {
    // テストランを作成
    const testRun = await tx.testRun.create({
      data: {
        projectId,
        milestoneId: sourceTestRunBase.milestoneId,
        configurationId: sourceTestRunBase.configurationId,
        name: input.name || `${sourceTestRunBase.name} - Re-Run`,
        description: input.description || `Re-Run of ${sourceTestRunBase.name}`,
        status: TEST_RUN_STATUS.PLANNED,
        totalCases: testRunCases.length,
        passedCases: 0,
        failedCases: 0,
        blockedCases: 0,
        skippedCases: 0,
        notes: `Re-Run from Test Run #${sourceTestRunId}`,
      },
      select: testRunWithRelationsSelect,
    });

    // テストランケースを作成
    await tx.testRunCase.createMany({
      data: testRunCases.map((tc, index) => ({
        testRunId: testRun.id,
        testCaseId: tc.testCaseId,
        assignedToId: input.assigneeId ? BigInt(input.assigneeId) : tc.assignedToId,
        status: 'NOT_RUN' as const,
        sortOrder: index + 1,
      })),
    });

    return testRun;
  });

  return serializeTestRunWithRelations(newTestRun as DbTestRunWithRelations);
}

/**
 * テストランのケースのステータス別カウントを取得
 */
export async function getTestRunCaseStatusCounts(
  testRunId: bigint
): Promise<Record<string, number>> {
  const counts = await prisma.testRunCase.groupBy({
    by: ['status'],
    where: { testRunId },
    _count: true,
  });

  const result: Record<string, number> = {
    NOT_RUN: 0,
    PASSED: 0,
    FAILED: 0,
    BLOCKED: 0,
    SKIPPED: 0,
    RETEST: 0,
  };

  for (const count of counts) {
    result[count.status] = count._count;
  }

  return result;
}

// ============================================
// クローズ機能
// ============================================

/**
 * テストランクローズ入力型
 */
export interface CloseTestRunInput {
  notes?: string;
}

/**
 * テストランをクローズ
 */
export async function closeTestRun(
  projectId: bigint,
  testRunId: bigint,
  input?: CloseTestRunInput
): Promise<TestRunWithRelations> {
  // テストランを取得
  const testRun = await prisma.testRun.findUnique({
    where: { id: testRunId },
  });

  if (!testRun || testRun.projectId !== projectId) {
    throw new Error('テストランが見つかりません');
  }

  if (testRun.status === TEST_RUN_STATUS.COMPLETED) {
    throw new Error('テストランは既にクローズされています');
  }

  // ステータス別カウントを取得
  const statusCounts = await getTestRunCaseStatusCounts(testRunId);

  // テストランを更新
  const updatedTestRun = await prisma.testRun.update({
    where: { id: testRunId },
    data: {
      status: TEST_RUN_STATUS.COMPLETED,
      actualEndDate: new Date(),
      passedCases: statusCounts.PASSED,
      failedCases: statusCounts.FAILED,
      blockedCases: statusCounts.BLOCKED,
      skippedCases: statusCounts.SKIPPED,
      notes: input?.notes
        ? `${testRun.notes || ''}\n\n[クローズ時メモ]\n${input.notes}`
        : testRun.notes,
    },
    select: testRunWithRelationsSelect,
  });

  return serializeTestRunWithRelations(updatedTestRun as DbTestRunWithRelations);
}

/**
 * テストランがクローズされているかチェック
 */
export async function isTestRunClosed(testRunId: bigint): Promise<boolean> {
  const testRun = await prisma.testRun.findUnique({
    where: { id: testRunId },
    select: { status: true },
  });

  return testRun?.status === TEST_RUN_STATUS.COMPLETED;
}

/**
 * テストランを再オープン
 */
export async function reopenTestRun(
  projectId: bigint,
  testRunId: bigint
): Promise<TestRunWithRelations> {
  // テストランを取得
  const testRun = await prisma.testRun.findUnique({
    where: { id: testRunId },
  });

  if (!testRun || testRun.projectId !== projectId) {
    throw new Error('テストランが見つかりません');
  }

  if (testRun.status !== TEST_RUN_STATUS.COMPLETED) {
    throw new Error('テストランはクローズされていません');
  }

  // テストランを更新
  const updatedTestRun = await prisma.testRun.update({
    where: { id: testRunId },
    data: {
      status: TEST_RUN_STATUS.IN_PROGRESS,
      actualEndDate: null,
    },
    select: testRunWithRelationsSelect,
  });

  return serializeTestRunWithRelations(updatedTestRun as DbTestRunWithRelations);
}
