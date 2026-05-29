/**
 * テスト結果リポジトリ
 */

import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type { TestRunCaseStatus } from '@/types/test-run-case';
import type {
  TestResult,
  TestResultWithRelations,
  TestResultDetail,
  CreateTestResultInput,
  UpdateTestResultInput,
  TestResultSearchParams,
  TestResultHistory,
  TestResultHistoryWithEditor,
  CreateTestResultHistoryInput,
} from '@/types/test-result';

// ============================================
// セレクト定義
// ============================================

const testResultSelect = {
  id: true,
  testRunCaseId: true,
  executedById: true,
  status: true,
  executedAt: true,
  executionTime: true,
  actualResult: true,
  defects: true,
  comment: true,
  environment: true,
  browserInfo: true,
  version: true,
  createdAt: true,
};

const testResultWithRelationsSelect = {
  ...testResultSelect,
  executedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

const testResultDetailSelect = {
  ...testResultWithRelationsSelect,
  testRunCase: {
    select: {
      id: true,
      testCase: {
        select: {
          id: true,
          title: true,
          priority: true,
        },
      },
      testRun: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
};

// ============================================
// 変換関数
// ============================================

function toTestResult(data: {
  id: bigint;
  testRunCaseId: bigint;
  executedById: bigint | null;
  status: string;
  executedAt: Date;
  executionTime: number | null;
  actualResult: string | null;
  defects: string | null;
  comment: string | null;
  environment: string | null;
  browserInfo: string | null;
  version: number;
  createdAt: Date;
}): TestResult {
  return {
    id: data.id.toString(),
    testRunCaseId: data.testRunCaseId.toString(),
    executedById: data.executedById?.toString() ?? null,
    status: data.status as TestRunCaseStatus,
    executedAt: data.executedAt.toISOString(),
    executionTime: data.executionTime,
    actualResult: data.actualResult,
    defects: data.defects,
    comment: data.comment,
    environment: data.environment,
    browserInfo: data.browserInfo,
    version: data.version,
    createdAt: data.createdAt.toISOString(),
  };
}

function toTestResultWithRelations(data: {
  id: bigint;
  testRunCaseId: bigint;
  executedById: bigint | null;
  status: string;
  executedAt: Date;
  executionTime: number | null;
  actualResult: string | null;
  defects: string | null;
  comment: string | null;
  environment: string | null;
  browserInfo: string | null;
  version: number;
  createdAt: Date;
  executedBy: {
    id: bigint;
    name: string;
    email: string;
  } | null;
}): TestResultWithRelations {
  return {
    ...toTestResult(data),
    executedBy: data.executedBy
      ? {
          id: data.executedBy.id.toString(),
          name: data.executedBy.name,
          email: data.executedBy.email,
        }
      : null,
  };
}

function toTestResultDetail(data: {
  id: bigint;
  testRunCaseId: bigint;
  executedById: bigint | null;
  status: string;
  executedAt: Date;
  executionTime: number | null;
  actualResult: string | null;
  defects: string | null;
  comment: string | null;
  environment: string | null;
  browserInfo: string | null;
  version: number;
  createdAt: Date;
  executedBy: {
    id: bigint;
    name: string;
    email: string;
  } | null;
  testRunCase: {
    id: bigint;
    testCase: {
      id: bigint;
      title: string;
      priority: string;
    };
    testRun: {
      id: bigint;
      name: string;
    };
  };
}): TestResultDetail {
  return {
    ...toTestResultWithRelations(data),
    testRunCase: {
      id: data.testRunCase.id.toString(),
      testCase: {
        id: data.testRunCase.testCase.id.toString(),
        title: data.testRunCase.testCase.title,
        priority: data.testRunCase.testCase.priority,
      },
      testRun: {
        id: data.testRunCase.testRun.id.toString(),
        name: data.testRunCase.testRun.name,
      },
    },
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * テスト結果を取得
 */
export async function getTestResult(id: bigint): Promise<TestResultWithRelations | null> {
  const result = await prisma.testResult.findUnique({
    where: { id },
    select: testResultWithRelationsSelect,
  });

  if (!result) return null;

  return toTestResultWithRelations(result);
}

/**
 * テスト結果詳細を取得
 */
export async function getTestResultDetail(id: bigint): Promise<TestResultDetail | null> {
  const result = await prisma.testResult.findUnique({
    where: { id },
    select: testResultDetailSelect,
  });

  if (!result) return null;

  return toTestResultDetail(result);
}

/**
 * テストランケースの結果履歴を取得
 */
export async function getTestResultsByTestRunCase(
  testRunCaseId: bigint,
  params: { limit?: number; offset?: number } = {}
): Promise<TestResultWithRelations[]> {
  const { limit = 50, offset = 0 } = params;

  const results = await prisma.testResult.findMany({
    where: { testRunCaseId },
    select: testResultWithRelationsSelect,
    orderBy: { executedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return results.map(toTestResultWithRelations);
}

/**
 * テスト結果を検索
 */
export async function searchTestResults(
  params: TestResultSearchParams
): Promise<{ data: TestResultWithRelations[]; total: number }> {
  const { testRunCaseId, executedById, status, fromDate, toDate, limit = 50, offset = 0 } = params;

  const where: Prisma.TestResultWhereInput = {};

  if (testRunCaseId) {
    where.testRunCaseId = BigInt(testRunCaseId);
  }
  if (executedById) {
    where.executedById = BigInt(executedById);
  }
  if (status) {
    where.status = status;
  }
  if (fromDate || toDate) {
    where.executedAt = {};
    if (fromDate) {
      where.executedAt.gte = new Date(fromDate);
    }
    if (toDate) {
      where.executedAt.lte = new Date(toDate);
    }
  }

  const [results, total] = await Promise.all([
    prisma.testResult.findMany({
      where,
      select: testResultWithRelationsSelect,
      orderBy: { executedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.testResult.count({ where }),
  ]);

  return {
    data: results.map(toTestResultWithRelations),
    total,
  };
}

/**
 * テスト結果を作成
 */
export async function createTestResult(
  input: CreateTestResultInput
): Promise<TestResultWithRelations> {
  // 現在のバージョン番号を取得
  const latestResult = await prisma.testResult.findFirst({
    where: { testRunCaseId: BigInt(input.testRunCaseId) },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const nextVersion = (latestResult?.version ?? 0) + 1;

  const result = await prisma.testResult.create({
    data: {
      testRunCaseId: BigInt(input.testRunCaseId),
      executedById: input.executedById ? BigInt(input.executedById) : null,
      status: input.status,
      executionTime: input.executionTime ?? null,
      actualResult: input.actualResult ?? null,
      defects: input.defects ?? null,
      comment: input.comment ?? null,
      environment: input.environment ?? null,
      browserInfo: input.browserInfo ?? null,
      version: nextVersion,
    },
    select: testResultWithRelationsSelect,
  });

  return toTestResultWithRelations(result);
}

/**
 * テスト結果を削除
 */
export async function deleteTestResult(id: bigint): Promise<boolean> {
  const existing = await prisma.testResult.findUnique({
    where: { id },
  });

  if (!existing) {
    return false;
  }

  await prisma.testResult.delete({
    where: { id },
  });

  return true;
}

/**
 * テストランケースの結果履歴をすべて削除
 */
export async function deleteTestResultsByTestRunCase(testRunCaseId: bigint): Promise<number> {
  const result = await prisma.testResult.deleteMany({
    where: { testRunCaseId },
  });

  return result.count;
}

// ============================================
// 統計情報
// ============================================

/**
 * テストランケースの結果数を取得
 */
export async function getTestResultCount(testRunCaseId: bigint): Promise<number> {
  return prisma.testResult.count({
    where: { testRunCaseId },
  });
}

/**
 * テストランケースの最新結果を取得
 */
export async function getLatestTestResult(
  testRunCaseId: bigint
): Promise<TestResultWithRelations | null> {
  const result = await prisma.testResult.findFirst({
    where: { testRunCaseId },
    orderBy: { executedAt: 'desc' },
    select: testResultWithRelationsSelect,
  });

  if (!result) return null;

  return toTestResultWithRelations(result);
}

// ============================================
// 存在確認
// ============================================

/**
 * テスト結果が存在するか確認
 */
export async function testResultExists(id: bigint): Promise<boolean> {
  const count = await prisma.testResult.count({
    where: { id },
  });
  return count > 0;
}

/**
 * テストランケースが存在するか確認
 */
export async function testRunCaseExists(id: bigint): Promise<boolean> {
  const count = await prisma.testRunCase.count({
    where: { id },
  });
  return count > 0;
}

// ============================================
// 更新操作
// ============================================

/**
 * テスト結果を更新（履歴記録付き）
 */
export async function updateTestResult(
  id: bigint,
  input: UpdateTestResultInput,
  editedById: bigint
): Promise<TestResultWithRelations | null> {
  // 現在のテスト結果を取得
  const current = await prisma.testResult.findUnique({
    where: { id },
  });

  if (!current) {
    return null;
  }

  // 変更履歴を記録するためのデータを準備
  const historyEntries: { fieldName: string; oldValue: string | null; newValue: string | null }[] =
    [];

  // 各フィールドの変更をチェック
  if (input.status !== undefined && input.status !== current.status) {
    historyEntries.push({
      fieldName: 'status',
      oldValue: current.status,
      newValue: input.status,
    });
  }
  if (input.executionTime !== undefined && input.executionTime !== current.executionTime) {
    historyEntries.push({
      fieldName: 'executionTime',
      oldValue: current.executionTime?.toString() ?? null,
      newValue: input.executionTime?.toString() ?? null,
    });
  }
  if (input.actualResult !== undefined && input.actualResult !== current.actualResult) {
    historyEntries.push({
      fieldName: 'actualResult',
      oldValue: current.actualResult,
      newValue: input.actualResult,
    });
  }
  if (input.defects !== undefined && input.defects !== current.defects) {
    historyEntries.push({
      fieldName: 'defects',
      oldValue: current.defects,
      newValue: input.defects,
    });
  }
  if (input.comment !== undefined && input.comment !== current.comment) {
    historyEntries.push({
      fieldName: 'comment',
      oldValue: current.comment,
      newValue: input.comment,
    });
  }
  if (input.environment !== undefined && input.environment !== current.environment) {
    historyEntries.push({
      fieldName: 'environment',
      oldValue: current.environment,
      newValue: input.environment,
    });
  }
  if (input.browserInfo !== undefined && input.browserInfo !== current.browserInfo) {
    historyEntries.push({
      fieldName: 'browserInfo',
      oldValue: current.browserInfo,
      newValue: input.browserInfo,
    });
  }

  // トランザクションで更新と履歴記録を実行
  const result = await prisma.$transaction(async (tx) => {
    // テスト結果を更新
    const updated = await tx.testResult.update({
      where: { id },
      data: {
        status: input.status,
        executionTime: input.executionTime,
        actualResult: input.actualResult,
        defects: input.defects,
        comment: input.comment,
        environment: input.environment,
        browserInfo: input.browserInfo,
      },
      select: testResultWithRelationsSelect,
    });

    // 変更履歴を記録
    if (historyEntries.length > 0) {
      await tx.testResultHistory.createMany({
        data: historyEntries.map((entry) => ({
          testResultId: id,
          editedById,
          fieldName: entry.fieldName,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
        })),
      });
    }

    return updated;
  });

  return toTestResultWithRelations(result);
}

// ============================================
// 履歴操作
// ============================================

/**
 * 履歴データを変換
 */
function toTestResultHistory(data: {
  id: bigint;
  testResultId: bigint;
  editedById: bigint;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  editedAt: Date;
}): TestResultHistory {
  return {
    id: data.id.toString(),
    testResultId: data.testResultId.toString(),
    editedById: data.editedById.toString(),
    fieldName: data.fieldName,
    oldValue: data.oldValue,
    newValue: data.newValue,
    editedAt: data.editedAt.toISOString(),
  };
}

/**
 * 履歴データを編集者情報付きで変換
 */
function toTestResultHistoryWithEditor(data: {
  id: bigint;
  testResultId: bigint;
  editedById: bigint;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  editedAt: Date;
  editedBy: {
    id: bigint;
    name: string;
    email: string;
  };
}): TestResultHistoryWithEditor {
  return {
    ...toTestResultHistory(data),
    editedBy: {
      id: data.editedBy.id.toString(),
      name: data.editedBy.name,
      email: data.editedBy.email,
    },
  };
}

/**
 * テスト結果の編集履歴を取得
 */
export async function getTestResultHistories(
  testResultId: bigint,
  params: { limit?: number; offset?: number } = {}
): Promise<{ data: TestResultHistoryWithEditor[]; total: number }> {
  const { limit = 50, offset = 0 } = params;

  const [histories, total] = await Promise.all([
    prisma.testResultHistory.findMany({
      where: { testResultId },
      select: {
        id: true,
        testResultId: true,
        editedById: true,
        fieldName: true,
        oldValue: true,
        newValue: true,
        editedAt: true,
        editedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { editedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.testResultHistory.count({ where: { testResultId } }),
  ]);

  return {
    data: histories.map(toTestResultHistoryWithEditor),
    total,
  };
}

/**
 * テスト結果の編集履歴を作成
 */
export async function createTestResultHistory(
  input: CreateTestResultHistoryInput
): Promise<TestResultHistory> {
  const history = await prisma.testResultHistory.create({
    data: {
      testResultId: BigInt(input.testResultId),
      editedById: BigInt(input.editedById),
      fieldName: input.fieldName,
      oldValue: input.oldValue,
      newValue: input.newValue,
    },
  });

  return toTestResultHistory(history);
}
