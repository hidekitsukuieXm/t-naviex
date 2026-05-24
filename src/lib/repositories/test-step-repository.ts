/**
 * テスト手順リポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  TestStep,
  TestStepDetail,
  CreateTestStepInput,
  UpdateTestStepInput,
  TestStepSearchParams,
  ReorderTestStepsInput,
} from '@/types/test-step';
import { MAX_STEPS_PER_CASE } from '@/types/test-step';

// ============================================
// セレクト定義
// ============================================

const testStepSelect = {
  id: true,
  testCaseId: true,
  stepNo: true,
  actionMd: true,
  expectedMd: true,
  createdAt: true,
  updatedAt: true,
};

const testStepDetailSelect = {
  ...testStepSelect,
  testCase: {
    select: {
      id: true,
      title: true,
      testSpecId: true,
    },
  },
};

// ============================================
// 変換関数
// ============================================

interface DbTestStep {
  id: bigint;
  testCaseId: bigint;
  stepNo: number;
  actionMd: string;
  expectedMd: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DbTestStepDetail extends DbTestStep {
  testCase: {
    id: bigint;
    title: string;
    testSpecId: bigint;
  };
}

function serializeTestStep(step: DbTestStep): TestStep {
  return {
    id: step.id.toString(),
    testCaseId: step.testCaseId.toString(),
    stepNo: step.stepNo,
    actionMd: step.actionMd,
    expectedMd: step.expectedMd,
    createdAt: step.createdAt.toISOString(),
    updatedAt: step.updatedAt.toISOString(),
  };
}

function serializeTestStepDetail(step: DbTestStepDetail): TestStepDetail {
  return {
    id: step.id.toString(),
    testCaseId: step.testCaseId.toString(),
    stepNo: step.stepNo,
    actionMd: step.actionMd,
    expectedMd: step.expectedMd,
    createdAt: step.createdAt.toISOString(),
    updatedAt: step.updatedAt.toISOString(),
    testCase: {
      id: step.testCase.id.toString(),
      title: step.testCase.title,
      testSpecId: step.testCase.testSpecId.toString(),
    },
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * テスト手順作成
 */
export async function createTestStep(input: CreateTestStepInput): Promise<TestStep> {
  const trimmedAction = input.actionMd.trim();
  const trimmedExpected = input.expectedMd?.trim() || null;

  // 手順番号を決定（指定がなければ最後に追加）
  let stepNo = input.stepNo;
  if (stepNo === undefined) {
    const maxStepNo = await prisma.testStep.aggregate({
      where: {
        testCaseId: BigInt(input.testCaseId),
      },
      _max: {
        stepNo: true,
      },
    });
    stepNo = (maxStepNo._max.stepNo ?? 0) + 1;
  }

  const step = await prisma.testStep.create({
    data: {
      testCaseId: BigInt(input.testCaseId),
      stepNo,
      actionMd: trimmedAction,
      expectedMd: trimmedExpected,
    },
    select: testStepSelect,
  });

  return serializeTestStep(step);
}

/**
 * テスト手順一括作成
 */
export async function createTestStepsBulk(
  testCaseId: string,
  steps: Array<{ actionMd: string; expectedMd?: string | null }>
): Promise<TestStep[]> {
  const testCaseIdBigInt = BigInt(testCaseId);

  // 現在の最大手順番号を取得
  const maxStepNo = await prisma.testStep.aggregate({
    where: { testCaseId: testCaseIdBigInt },
    _max: { stepNo: true },
  });
  const startStepNo = (maxStepNo._max.stepNo ?? 0) + 1;

  // トランザクションで一括作成
  const createData = steps.map((step, index) => ({
    testCaseId: testCaseIdBigInt,
    stepNo: startStepNo + index,
    actionMd: step.actionMd.trim(),
    expectedMd: step.expectedMd?.trim() || null,
  }));

  await prisma.testStep.createMany({
    data: createData,
  });

  // 作成した手順を取得して返す
  const createdSteps = await prisma.testStep.findMany({
    where: {
      testCaseId: testCaseIdBigInt,
      stepNo: { gte: startStepNo },
    },
    select: testStepSelect,
    orderBy: { stepNo: 'asc' },
  });

  return createdSteps.map(serializeTestStep);
}

/**
 * テスト手順取得（ID指定）
 */
export async function getTestStepById(id: bigint): Promise<TestStepDetail | null> {
  const step = await prisma.testStep.findUnique({
    where: { id },
    select: testStepDetailSelect,
  });

  if (!step) {
    return null;
  }

  return serializeTestStepDetail(step as DbTestStepDetail);
}

/**
 * テスト手順一覧取得
 */
export async function getTestSteps(params: TestStepSearchParams): Promise<TestStep[]> {
  const where: {
    testCaseId: bigint;
    OR?: Array<
      | { actionMd: { contains: string; mode: 'insensitive' } }
      | { expectedMd: { contains: string; mode: 'insensitive' } }
    >;
  } = {
    testCaseId: BigInt(params.testCaseId),
  };

  // 検索クエリ
  if (params.query?.trim()) {
    where.OR = [
      { actionMd: { contains: params.query, mode: 'insensitive' } },
      { expectedMd: { contains: params.query, mode: 'insensitive' } },
    ];
  }

  const steps = await prisma.testStep.findMany({
    where,
    select: testStepSelect,
    orderBy: { stepNo: 'asc' },
  });

  return steps.map(serializeTestStep);
}

/**
 * テスト手順更新
 */
export async function updateTestStep(
  id: bigint,
  input: UpdateTestStepInput
): Promise<TestStep | null> {
  // 既存の手順を確認
  const existing = await prisma.testStep.findUnique({
    where: { id },
    select: { id: true, testCaseId: true, stepNo: true },
  });

  if (!existing) {
    return null;
  }

  const updateData: {
    stepNo?: number;
    actionMd?: string;
    expectedMd?: string | null;
  } = {};

  if (input.stepNo !== undefined) {
    updateData.stepNo = input.stepNo;
  }

  if (input.actionMd !== undefined) {
    updateData.actionMd = input.actionMd.trim();
  }

  if (input.expectedMd !== undefined) {
    updateData.expectedMd = input.expectedMd?.trim() || null;
  }

  const step = await prisma.testStep.update({
    where: { id },
    data: updateData,
    select: testStepSelect,
  });

  return serializeTestStep(step);
}

/**
 * テスト手順削除
 */
export async function deleteTestStep(id: bigint): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.testStep.findUnique({
    where: { id },
    select: { id: true, testCaseId: true, stepNo: true },
  });

  if (!existing) {
    return { success: false, error: 'テスト手順が見つかりません。' };
  }

  // 手順を削除
  await prisma.testStep.delete({
    where: { id },
  });

  // 削除した手順より後の手順番号を繰り上げ
  await prisma.testStep.updateMany({
    where: {
      testCaseId: existing.testCaseId,
      stepNo: { gt: existing.stepNo },
    },
    data: {
      stepNo: { decrement: 1 },
    },
  });

  return { success: true };
}

/**
 * テストケースの全手順削除
 */
export async function deleteAllTestSteps(testCaseId: bigint): Promise<{ deletedCount: number }> {
  const result = await prisma.testStep.deleteMany({
    where: { testCaseId },
  });

  return { deletedCount: result.count };
}

/**
 * 手順番号の並び替え
 */
export async function reorderTestSteps(
  testCaseId: string,
  input: ReorderTestStepsInput
): Promise<TestStep[]> {
  const testCaseIdBigInt = BigInt(testCaseId);

  // トランザクションで一括更新
  const updates = input.items.map((item) =>
    prisma.testStep.update({
      where: {
        id: BigInt(item.id),
        testCaseId: testCaseIdBigInt,
      },
      data: {
        stepNo: item.stepNo,
      },
      select: testStepSelect,
    })
  );

  const steps = await prisma.$transaction(updates);

  return steps.map(serializeTestStep);
}

// ============================================
// ヘルパー関数
// ============================================

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
 * テストケースの所属するテスト仕様書がロックされているか確認
 */
export async function isTestCaseLocked(testCaseId: bigint): Promise<boolean> {
  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    select: {
      testSpec: {
        select: { isLocked: true },
      },
    },
  });

  return testCase?.testSpec.isLocked ?? false;
}

/**
 * テストケースの所属するテスト仕様書IDを取得
 */
export async function getTestSpecIdByTestCaseId(testCaseId: bigint): Promise<string | null> {
  const testCase = await prisma.testCase.findUnique({
    where: { id: testCaseId },
    select: { testSpecId: true },
  });

  return testCase?.testSpecId.toString() ?? null;
}

/**
 * テストケースの手順数を取得
 */
export async function getTestStepCount(testCaseId: bigint): Promise<number> {
  const count = await prisma.testStep.count({
    where: { testCaseId },
  });

  return count;
}

/**
 * 手順数が上限に達しているか確認
 */
export async function hasReachedMaxSteps(testCaseId: bigint): Promise<boolean> {
  const count = await getTestStepCount(testCaseId);
  return count >= MAX_STEPS_PER_CASE;
}

/**
 * 手順番号が重複しているか確認
 */
export async function isStepNoTaken(
  testCaseId: bigint,
  stepNo: number,
  excludeId?: bigint
): Promise<boolean> {
  const where: {
    testCaseId: bigint;
    stepNo: number;
    id?: { not: bigint };
  } = {
    testCaseId,
    stepNo,
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existing = await prisma.testStep.findFirst({
    where,
    select: { id: true },
  });

  return existing !== null;
}

/**
 * 次の手順番号を取得
 */
export async function getNextStepNo(testCaseId: bigint): Promise<number> {
  const maxStepNo = await prisma.testStep.aggregate({
    where: { testCaseId },
    _max: { stepNo: true },
  });

  return (maxStepNo._max.stepNo ?? 0) + 1;
}
