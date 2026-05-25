/**
 * テストケースリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  TestCase,
  TestCaseDetail,
  TestCasePriority,
  TestType,
  TestTechnique,
  CreateTestCaseInput,
  UpdateTestCaseInput,
  TestCaseSearchParams,
  TestCaseListResponse,
} from '@/types/test-case';

// ============================================
// セレクト定義
// ============================================

const testCaseSelect = {
  id: true,
  testSpecId: true,
  sectionId: true,
  title: true,
  description: true,
  preconditions: true,
  expectedResult: true,
  checkpoint: true,
  scenario: true,
  testEnvironment: true,
  notes: true,
  tags: true,
  classification: true,
  referenceId: true,
  estimatedTime: true,
  priority: true,
  testType: true,
  testTechnique: true,
  isMatrix: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

const testCaseDetailSelect = {
  ...testCaseSelect,
  section: {
    select: {
      id: true,
      name: true,
    },
  },
  testSpec: {
    select: {
      id: true,
      name: true,
    },
  },
};

// ============================================
// 変換関数
// ============================================

interface DbTestCase {
  id: bigint;
  testSpecId: bigint;
  sectionId: bigint | null;
  title: string;
  description: string | null;
  preconditions: string | null;
  expectedResult: string | null;
  checkpoint: string | null;
  scenario: string | null;
  testEnvironment: string | null;
  notes: string | null;
  tags: string[];
  classification: string | null;
  referenceId: string | null;
  estimatedTime: number | null;
  priority: string;
  testType: string;
  testTechnique: string;
  isMatrix: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface DbTestCaseDetail extends DbTestCase {
  section: {
    id: bigint;
    name: string;
  } | null;
  testSpec: {
    id: bigint;
    name: string;
  };
}

function serializeTestCase(testCase: DbTestCase): TestCase {
  return {
    id: testCase.id.toString(),
    testSpecId: testCase.testSpecId.toString(),
    sectionId: testCase.sectionId?.toString() ?? null,
    title: testCase.title,
    description: testCase.description,
    preconditions: testCase.preconditions,
    expectedResult: testCase.expectedResult,
    checkpoint: testCase.checkpoint,
    scenario: testCase.scenario,
    testEnvironment: testCase.testEnvironment,
    notes: testCase.notes,
    tags: testCase.tags,
    classification: testCase.classification,
    referenceId: testCase.referenceId,
    estimatedTime: testCase.estimatedTime,
    priority: testCase.priority as TestCasePriority,
    testType: testCase.testType as TestType,
    testTechnique: testCase.testTechnique as TestTechnique,
    isMatrix: testCase.isMatrix,
    sortOrder: testCase.sortOrder,
    createdAt: testCase.createdAt.toISOString(),
    updatedAt: testCase.updatedAt.toISOString(),
    deletedAt: testCase.deletedAt?.toISOString() ?? null,
  };
}

function serializeTestCaseDetail(testCase: DbTestCaseDetail): TestCaseDetail {
  return {
    id: testCase.id.toString(),
    testSpecId: testCase.testSpecId.toString(),
    sectionId: testCase.sectionId?.toString() ?? null,
    title: testCase.title,
    description: testCase.description,
    preconditions: testCase.preconditions,
    expectedResult: testCase.expectedResult,
    checkpoint: testCase.checkpoint,
    scenario: testCase.scenario,
    testEnvironment: testCase.testEnvironment,
    notes: testCase.notes,
    tags: testCase.tags,
    classification: testCase.classification,
    referenceId: testCase.referenceId,
    estimatedTime: testCase.estimatedTime,
    priority: testCase.priority as TestCasePriority,
    testType: testCase.testType as TestType,
    testTechnique: testCase.testTechnique as TestTechnique,
    isMatrix: testCase.isMatrix,
    sortOrder: testCase.sortOrder,
    createdAt: testCase.createdAt.toISOString(),
    updatedAt: testCase.updatedAt.toISOString(),
    deletedAt: testCase.deletedAt?.toISOString() ?? null,
    section: testCase.section
      ? {
          id: testCase.section.id.toString(),
          name: testCase.section.name,
        }
      : null,
    testSpec: {
      id: testCase.testSpec.id.toString(),
      name: testCase.testSpec.name,
    },
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * テストケース作成
 */
export async function createTestCase(input: CreateTestCaseInput): Promise<TestCase> {
  const trimmedTitle = input.title.trim();

  // 並び順を決定（指定がなければ最後に追加）
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const maxSortOrder = await prisma.testCase.aggregate({
      where: {
        testSpecId: BigInt(input.testSpecId),
        sectionId: input.sectionId ? BigInt(input.sectionId) : null,
      },
      _max: {
        sortOrder: true,
      },
    });
    sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
  }

  const testCase = await prisma.testCase.create({
    data: {
      testSpecId: BigInt(input.testSpecId),
      sectionId: input.sectionId ? BigInt(input.sectionId) : null,
      title: trimmedTitle,
      description: input.description?.trim() || null,
      preconditions: input.preconditions?.trim() || null,
      expectedResult: input.expectedResult?.trim() || null,
      checkpoint: input.checkpoint?.trim() || null,
      scenario: input.scenario?.trim() || null,
      testEnvironment: input.testEnvironment?.trim() || null,
      notes: input.notes?.trim() || null,
      tags: input.tags || [],
      classification: input.classification?.trim() || null,
      referenceId: input.referenceId?.trim() || null,
      estimatedTime: input.estimatedTime ?? null,
      priority: input.priority || 'MEDIUM',
      testType: input.testType || 'FUNCTIONAL',
      testTechnique: input.testTechnique || 'OTHER',
      isMatrix: input.isMatrix || false,
      sortOrder,
    },
    select: testCaseSelect,
  });

  return serializeTestCase(testCase);
}

/**
 * テストケース取得（ID指定）
 */
export async function getTestCaseById(id: bigint): Promise<TestCaseDetail | null> {
  const testCase = await prisma.testCase.findUnique({
    where: { id },
    select: testCaseDetailSelect,
  });

  if (!testCase) {
    return null;
  }

  return serializeTestCaseDetail(testCase as DbTestCaseDetail);
}

/**
 * テストケース一覧取得（ページネーション付き）
 */
export async function getTestCases(params: TestCaseSearchParams): Promise<TestCaseListResponse> {
  const {
    testSpecId,
    sectionId,
    query,
    priority,
    testType,
    testTechnique,
    isMatrix,
    tags,
    classification,
    page = 1,
    limit = 20,
    sortBy = 'sortOrder',
    sortOrder = 'asc',
  } = params;

  const skip = (page - 1) * limit;

  // 検索条件を構築（削除済みを除外）
  const where: {
    testSpecId: bigint;
    deletedAt: null;
    sectionId?: bigint | null;
    priority?: TestCasePriority;
    testType?: TestType;
    testTechnique?: TestTechnique;
    isMatrix?: boolean;
    tags?: { hasSome: string[] };
    classification?: { contains: string; mode: 'insensitive' };
    OR?: Array<
      | { title: { contains: string; mode: 'insensitive' } }
      | { description: { contains: string; mode: 'insensitive' } }
    >;
  } = {
    testSpecId: BigInt(testSpecId),
    deletedAt: null,
  };

  // セクションID指定
  if (sectionId !== undefined) {
    where.sectionId = sectionId === null ? null : BigInt(sectionId);
  }

  // 優先度フィルタ
  if (priority) {
    where.priority = priority;
  }

  // テストタイプフィルタ
  if (testType) {
    where.testType = testType;
  }

  // テスト技法フィルタ
  if (testTechnique) {
    where.testTechnique = testTechnique;
  }

  // マトリクスフィルタ
  if (isMatrix !== undefined) {
    where.isMatrix = isMatrix;
  }

  // タグフィルタ（いずれかのタグを含む）
  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  // 分類フィルタ（部分一致）
  if (classification?.trim()) {
    where.classification = { contains: classification.trim(), mode: 'insensitive' };
  }

  // 検索クエリ
  if (query?.trim()) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }

  // テストケース数をカウント
  const total = await prisma.testCase.count({ where });

  // テストケース一覧を取得
  const testCases = await prisma.testCase.findMany({
    where,
    select: testCaseSelect,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  return {
    testCases: testCases.map(serializeTestCase),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * テストケース更新
 */
export async function updateTestCase(
  id: bigint,
  input: UpdateTestCaseInput
): Promise<TestCase | null> {
  // 既存のテストケースを確認
  const existing = await prisma.testCase.findUnique({
    where: { id },
    select: { id: true, testSpecId: true },
  });

  if (!existing) {
    return null;
  }

  const updateData: {
    sectionId?: bigint | null;
    title?: string;
    description?: string | null;
    preconditions?: string | null;
    expectedResult?: string | null;
    checkpoint?: string | null;
    scenario?: string | null;
    testEnvironment?: string | null;
    notes?: string | null;
    tags?: string[];
    classification?: string | null;
    referenceId?: string | null;
    estimatedTime?: number | null;
    priority?: TestCasePriority;
    testType?: TestType;
    testTechnique?: TestTechnique;
    isMatrix?: boolean;
    sortOrder?: number;
  } = {};

  if (input.sectionId !== undefined) {
    updateData.sectionId = input.sectionId ? BigInt(input.sectionId) : null;
  }

  if (input.title !== undefined) {
    updateData.title = input.title.trim();
  }

  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }

  if (input.preconditions !== undefined) {
    updateData.preconditions = input.preconditions?.trim() || null;
  }

  if (input.expectedResult !== undefined) {
    updateData.expectedResult = input.expectedResult?.trim() || null;
  }

  if (input.checkpoint !== undefined) {
    updateData.checkpoint = input.checkpoint?.trim() || null;
  }

  if (input.scenario !== undefined) {
    updateData.scenario = input.scenario?.trim() || null;
  }

  if (input.testEnvironment !== undefined) {
    updateData.testEnvironment = input.testEnvironment?.trim() || null;
  }

  if (input.notes !== undefined) {
    updateData.notes = input.notes?.trim() || null;
  }

  if (input.tags !== undefined) {
    updateData.tags = input.tags;
  }

  if (input.classification !== undefined) {
    updateData.classification = input.classification?.trim() || null;
  }

  if (input.referenceId !== undefined) {
    updateData.referenceId = input.referenceId?.trim() || null;
  }

  if (input.estimatedTime !== undefined) {
    updateData.estimatedTime = input.estimatedTime;
  }

  if (input.priority !== undefined) {
    updateData.priority = input.priority;
  }

  if (input.testType !== undefined) {
    updateData.testType = input.testType;
  }

  if (input.testTechnique !== undefined) {
    updateData.testTechnique = input.testTechnique;
  }

  if (input.isMatrix !== undefined) {
    updateData.isMatrix = input.isMatrix;
  }

  if (input.sortOrder !== undefined) {
    updateData.sortOrder = input.sortOrder;
  }

  const testCase = await prisma.testCase.update({
    where: { id },
    data: updateData,
    select: testCaseSelect,
  });

  return serializeTestCase(testCase);
}

/**
 * テストケース削除（ソフトデリート）
 */
export async function deleteTestCase(id: bigint): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.testCase.findUnique({
    where: { id },
    select: { id: true, deletedAt: true },
  });

  if (!existing) {
    return { success: false, error: 'テストケースが見つかりません。' };
  }

  if (existing.deletedAt) {
    return { success: false, error: 'テストケースは既に削除されています。' };
  }

  await prisma.testCase.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}

/**
 * テストケース完全削除（ハードデリート）
 */
export async function hardDeleteTestCase(
  id: bigint
): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.testCase.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, error: 'テストケースが見つかりません。' };
  }

  await prisma.testCase.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * テストケース復元
 */
export async function restoreTestCase(id: bigint): Promise<TestCase | null> {
  const existing = await prisma.testCase.findUnique({
    where: { id },
    select: { id: true, deletedAt: true },
  });

  if (!existing) {
    return null;
  }

  if (!existing.deletedAt) {
    return null; // 削除されていないため復元不要
  }

  const testCase = await prisma.testCase.update({
    where: { id },
    data: { deletedAt: null },
    select: testCaseSelect,
  });

  return serializeTestCase(testCase);
}

/**
 * テストケースコピー
 */
export async function copyTestCase(
  id: bigint,
  targetTestSpecId?: string,
  targetSectionId?: string | null
): Promise<TestCase | null> {
  // 元のテストケースを取得
  const original = await prisma.testCase.findUnique({
    where: { id },
    include: {
      testSteps: {
        orderBy: { stepNo: 'asc' },
      },
    },
  });

  if (!original || original.deletedAt) {
    return null;
  }

  // コピー先のテスト仕様書IDとセクションIDを決定
  const destTestSpecId = targetTestSpecId ? BigInt(targetTestSpecId) : original.testSpecId;
  const destSectionId =
    targetSectionId !== undefined
      ? targetSectionId
        ? BigInt(targetSectionId)
        : null
      : original.sectionId;

  // コピー先での並び順を決定
  const maxSortOrder = await prisma.testCase.aggregate({
    where: {
      testSpecId: destTestSpecId,
      sectionId: destSectionId,
      deletedAt: null,
    },
    _max: {
      sortOrder: true,
    },
  });
  const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

  // タイトルの重複を避けるためにサフィックスを追加
  let newTitle = `${original.title} (コピー)`;
  let counter = 1;
  while (await isTestCaseTitleTaken(destTestSpecId, destSectionId, newTitle)) {
    counter++;
    newTitle = `${original.title} (コピー ${counter})`;
  }

  // テストケースをコピー
  const copiedTestCase = await prisma.testCase.create({
    data: {
      testSpecId: destTestSpecId,
      sectionId: destSectionId,
      title: newTitle,
      description: original.description,
      preconditions: original.preconditions,
      expectedResult: original.expectedResult,
      checkpoint: original.checkpoint,
      scenario: original.scenario,
      testEnvironment: original.testEnvironment,
      notes: original.notes,
      tags: original.tags,
      classification: original.classification,
      referenceId: null, // 参照IDはコピーしない
      estimatedTime: original.estimatedTime,
      priority: original.priority,
      testType: original.testType,
      testTechnique: original.testTechnique,
      isMatrix: original.isMatrix,
      sortOrder,
      testSteps: {
        create: original.testSteps.map((step) => ({
          stepNo: step.stepNo,
          actionMd: step.actionMd,
          expectedMd: step.expectedMd,
        })),
      },
    },
    select: testCaseSelect,
  });

  return serializeTestCase(copiedTestCase);
}

/**
 * テストケース移動
 */
export async function moveTestCase(
  id: bigint,
  targetTestSpecId?: string,
  targetSectionId?: string | null
): Promise<TestCase | null> {
  // 元のテストケースを取得
  const original = await prisma.testCase.findUnique({
    where: { id },
    select: {
      id: true,
      testSpecId: true,
      sectionId: true,
      title: true,
      deletedAt: true,
    },
  });

  if (!original || original.deletedAt) {
    return null;
  }

  // 移動先のテスト仕様書IDとセクションIDを決定
  const destTestSpecId = targetTestSpecId ? BigInt(targetTestSpecId) : original.testSpecId;
  const destSectionId =
    targetSectionId !== undefined
      ? targetSectionId
        ? BigInt(targetSectionId)
        : null
      : original.sectionId;

  // 同じ場所への移動は何もしない
  if (destTestSpecId === original.testSpecId && destSectionId === original.sectionId) {
    const testCase = await prisma.testCase.findUnique({
      where: { id },
      select: testCaseSelect,
    });
    return testCase ? serializeTestCase(testCase) : null;
  }

  // タイトルの重複チェック
  const titleTaken = await isTestCaseTitleTaken(destTestSpecId, destSectionId, original.title, id);

  if (titleTaken) {
    return null; // タイトルが重複している場合は移動できない
  }

  // 移動先での並び順を決定
  const maxSortOrder = await prisma.testCase.aggregate({
    where: {
      testSpecId: destTestSpecId,
      sectionId: destSectionId,
      deletedAt: null,
    },
    _max: {
      sortOrder: true,
    },
  });
  const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

  // テストケースを移動
  const movedTestCase = await prisma.testCase.update({
    where: { id },
    data: {
      testSpecId: destTestSpecId,
      sectionId: destSectionId,
      sortOrder,
    },
    select: testCaseSelect,
  });

  return serializeTestCase(movedTestCase);
}

/**
 * 削除済みテストケース一覧取得
 */
export async function getDeletedTestCases(
  testSpecId: string,
  page = 1,
  limit = 20
): Promise<TestCaseListResponse> {
  const skip = (page - 1) * limit;

  const where = {
    testSpecId: BigInt(testSpecId),
    deletedAt: { not: null },
  };

  const total = await prisma.testCase.count({ where });

  const testCases = await prisma.testCase.findMany({
    where,
    select: testCaseSelect,
    skip,
    take: limit,
    orderBy: { deletedAt: 'desc' },
  });

  return {
    testCases: testCases.map(serializeTestCase),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * テスト仕様書が存在するか確認
 */
export async function testSpecExists(testSpecId: bigint): Promise<boolean> {
  const testSpec = await prisma.testSpec.findUnique({
    where: { id: testSpecId },
    select: { id: true },
  });

  return testSpec !== null;
}

/**
 * テスト仕様書がロックされているか確認
 */
export async function isTestSpecLocked(testSpecId: bigint): Promise<boolean> {
  const testSpec = await prisma.testSpec.findUnique({
    where: { id: testSpecId },
    select: { isLocked: true },
  });

  return testSpec?.isLocked ?? false;
}

/**
 * セクションが存在するか確認（同一テスト仕様書内）
 */
export async function sectionExists(testSpecId: bigint, sectionId: bigint): Promise<boolean> {
  const section = await prisma.testSection.findFirst({
    where: {
      id: sectionId,
      testSpecId,
    },
    select: { id: true },
  });

  return section !== null;
}

/**
 * テストケースタイトルが同じセクション内で重複しているか確認
 */
export async function isTestCaseTitleTaken(
  testSpecId: bigint,
  sectionId: bigint | null,
  title: string,
  excludeId?: bigint
): Promise<boolean> {
  const where: {
    testSpecId: bigint;
    sectionId: bigint | null;
    title: { equals: string; mode: 'insensitive' };
    id?: { not: bigint };
  } = {
    testSpecId,
    sectionId,
    title: { equals: title.trim(), mode: 'insensitive' },
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existing = await prisma.testCase.findFirst({
    where,
    select: { id: true },
  });

  return existing !== null;
}

/**
 * セクション内のテストケース数を取得
 */
export async function getTestCaseCountBySection(
  testSpecId: bigint,
  sectionId: bigint | null
): Promise<number> {
  const count = await prisma.testCase.count({
    where: {
      testSpecId,
      sectionId,
    },
  });

  return count;
}

/**
 * テスト仕様書内のテストケース総数を取得
 */
export async function getTestCaseCountByTestSpec(testSpecId: bigint): Promise<number> {
  const count = await prisma.testCase.count({
    where: {
      testSpecId,
    },
  });

  return count;
}
