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

// ============================================
// 全文検索
// ============================================

import type {
  FullTextSearchParams,
  FullTextSearchResponse,
  TestCaseSearchResult,
  SearchableField,
  SearchHighlight,
} from '@/types/test-case';
import { ALL_SEARCHABLE_FIELDS } from '@/types/test-case';
import { Prisma } from '@/generated/prisma/client';

/**
 * テストケース全文検索
 * PostgreSQLのLIKE検索を使用した全文検索（日本語対応）
 */
export async function searchTestCases(
  params: FullTextSearchParams
): Promise<FullTextSearchResponse> {
  const {
    testSpecId,
    query,
    sectionId,
    searchFields = ALL_SEARCHABLE_FIELDS,
    priority,
    testType,
    testTechnique,
    isMatrix,
    tags,
    classification,
    page = 1,
    limit = 20,
  } = params;

  const skip = (page - 1) * limit;
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return {
      results: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      query,
      searchFields,
    };
  }

  // Build WHERE conditions
  const conditions: Prisma.Sql[] = [
    Prisma.sql`tc.test_spec_id = ${BigInt(testSpecId)}`,
    Prisma.sql`tc.deleted_at IS NULL`,
  ];

  if (sectionId !== undefined) {
    if (sectionId === null) {
      conditions.push(Prisma.sql`tc.section_id IS NULL`);
    } else {
      conditions.push(Prisma.sql`tc.section_id = ${BigInt(sectionId)}`);
    }
  }

  if (priority) {
    conditions.push(Prisma.sql`tc.priority = ${priority}::text`);
  }

  if (testType) {
    conditions.push(Prisma.sql`tc.test_type = ${testType}::text`);
  }

  if (testTechnique) {
    conditions.push(Prisma.sql`tc.test_technique = ${testTechnique}::text`);
  }

  if (isMatrix !== undefined) {
    conditions.push(Prisma.sql`tc.is_matrix = ${isMatrix}`);
  }

  if (tags && tags.length > 0) {
    conditions.push(Prisma.sql`tc.tags && ${tags}::text[]`);
  }

  if (classification?.trim()) {
    conditions.push(
      Prisma.sql`LOWER(tc.classification) LIKE ${`%${classification.trim().toLowerCase()}%`}`
    );
  }

  // Build search conditions for each field
  const searchConditions: Prisma.Sql[] = [];
  const fieldMapping: Record<SearchableField, string> = {
    title: 'tc.title',
    description: 'tc.description',
    preconditions: 'tc.preconditions',
    expectedResult: 'tc.expected_result',
    checkpoint: 'tc.checkpoint',
    scenario: 'tc.scenario',
    testEnvironment: 'tc.test_environment',
    notes: 'tc.notes',
  };

  for (const field of searchFields) {
    const column = fieldMapping[field];
    if (column) {
      searchConditions.push(
        Prisma.sql`LOWER(${Prisma.raw(column)}) LIKE ${`%${normalizedQuery}%`}`
      );
    }
  }

  if (searchConditions.length === 0) {
    return {
      results: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      query,
      searchFields,
    };
  }

  // Combine search conditions with OR
  const searchWhere = Prisma.sql`(${Prisma.join(searchConditions, ' OR ')})`;
  conditions.push(searchWhere);

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

  // Count total
  const countQuery = Prisma.sql`
    SELECT COUNT(*)::int as total
    FROM test_cases tc
    ${whereClause}
  `;

  const countResult = await prisma.$queryRaw<{ total: number }[]>(countQuery);
  const total = countResult[0]?.total ?? 0;

  if (total === 0) {
    return {
      results: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      query,
      searchFields,
    };
  }

  // Calculate relevance score based on field matches
  const rankExpressions: string[] = [];
  const weights: Record<SearchableField, number> = {
    title: 10,
    description: 5,
    preconditions: 3,
    expectedResult: 3,
    checkpoint: 2,
    scenario: 2,
    testEnvironment: 1,
    notes: 1,
  };

  for (const field of searchFields) {
    const column = fieldMapping[field];
    const weight = weights[field];
    if (column) {
      rankExpressions.push(
        `CASE WHEN LOWER(${column}) LIKE '%${normalizedQuery.replace(/'/g, "''")}%' THEN ${weight} ELSE 0 END`
      );
    }
  }

  const rankExpression = rankExpressions.length > 0 ? rankExpressions.join(' + ') : '0';

  // Search query
  const searchQuery = Prisma.sql`
    SELECT
      tc.id,
      tc.test_spec_id,
      tc.section_id,
      tc.title,
      tc.description,
      tc.preconditions,
      tc.expected_result,
      tc.checkpoint,
      tc.scenario,
      tc.test_environment,
      tc.notes,
      tc.tags,
      tc.classification,
      tc.reference_id,
      tc.estimated_time,
      tc.priority,
      tc.test_type,
      tc.test_technique,
      tc.is_matrix,
      tc.sort_order,
      tc.created_at,
      tc.updated_at,
      tc.deleted_at,
      (${Prisma.raw(rankExpression)}) as rank
    FROM test_cases tc
    ${whereClause}
    ORDER BY rank DESC, tc.sort_order ASC
    LIMIT ${limit}
    OFFSET ${skip}
  `;

  interface RawTestCase {
    id: bigint;
    test_spec_id: bigint;
    section_id: bigint | null;
    title: string;
    description: string | null;
    preconditions: string | null;
    expected_result: string | null;
    checkpoint: string | null;
    scenario: string | null;
    test_environment: string | null;
    notes: string | null;
    tags: string[];
    classification: string | null;
    reference_id: string | null;
    estimated_time: number | null;
    priority: string;
    test_type: string;
    test_technique: string;
    is_matrix: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    rank: number;
  }

  const rawResults = await prisma.$queryRaw<RawTestCase[]>(searchQuery);

  // Generate highlights for each result
  const results: TestCaseSearchResult[] = rawResults.map((row) => {
    const highlights = generateHighlights(row, normalizedQuery, searchFields);

    return {
      id: row.id.toString(),
      testSpecId: row.test_spec_id.toString(),
      sectionId: row.section_id?.toString() ?? null,
      title: row.title,
      description: row.description,
      preconditions: row.preconditions,
      expectedResult: row.expected_result,
      checkpoint: row.checkpoint,
      scenario: row.scenario,
      testEnvironment: row.test_environment,
      notes: row.notes,
      tags: row.tags,
      classification: row.classification,
      referenceId: row.reference_id,
      estimatedTime: row.estimated_time,
      priority: row.priority as TestCasePriority,
      testType: row.test_type as TestType,
      testTechnique: row.test_technique as TestTechnique,
      isMatrix: row.is_matrix,
      sortOrder: row.sort_order,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      deletedAt: row.deleted_at?.toISOString() ?? null,
      rank: row.rank,
      highlights,
    };
  });

  return {
    results,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    query,
    searchFields,
  };
}

/**
 * 検索結果のハイライト生成
 */
function generateHighlights(
  row: {
    title: string;
    description: string | null;
    preconditions: string | null;
    expected_result: string | null;
    checkpoint: string | null;
    scenario: string | null;
    test_environment: string | null;
    notes: string | null;
  },
  query: string,
  searchFields: SearchableField[]
): SearchHighlight[] {
  const highlights: SearchHighlight[] = [];

  const fieldValues: Record<SearchableField, string | null> = {
    title: row.title,
    description: row.description,
    preconditions: row.preconditions,
    expectedResult: row.expected_result,
    checkpoint: row.checkpoint,
    scenario: row.scenario,
    testEnvironment: row.test_environment,
    notes: row.notes,
  };

  for (const field of searchFields) {
    const value = fieldValues[field];
    if (value && value.toLowerCase().includes(query)) {
      const snippet = createHighlightSnippet(value, query);
      highlights.push({ field, snippet });
    }
  }

  return highlights;
}

/**
 * ハイライト付きスニペットを生成
 * マッチした部分を <mark> タグで囲む
 */
function createHighlightSnippet(text: string, query: string, maxLength = 150): string {
  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf(query);

  if (matchIndex === -1) {
    return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Calculate snippet boundaries
  const snippetStart = Math.max(0, matchIndex - 40);
  const snippetEnd = Math.min(text.length, matchIndex + query.length + 60);

  let snippet = '';
  if (snippetStart > 0) snippet += '...';
  snippet += text.slice(snippetStart, matchIndex);
  snippet += `<mark>${text.slice(matchIndex, matchIndex + query.length)}</mark>`;
  snippet += text.slice(matchIndex + query.length, snippetEnd);
  if (snippetEnd < text.length) snippet += '...';

  return snippet;
}

// ============================================
// エクスポート用
// ============================================

import type { TestCaseExportData, TestStepExportData } from '@/lib/export/test-case-export';

export interface TestCaseExportParams {
  testSpecId: string;
  sectionId?: string | null;
  priority?: TestCasePriority;
  testType?: TestType;
  testTechnique?: TestTechnique;
  isMatrix?: boolean;
  tags?: string[];
  classification?: string;
  includeSteps?: boolean;
}

/**
 * テストケースをエクスポート用に取得（ページネーションなし）
 */
export async function getTestCasesForExport(
  params: TestCaseExportParams
): Promise<TestCaseExportData[]> {
  const {
    testSpecId,
    sectionId,
    priority,
    testType,
    testTechnique,
    isMatrix,
    tags,
    classification,
    includeSteps = true,
  } = params;

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
  } = {
    testSpecId: BigInt(testSpecId),
    deletedAt: null,
  };

  if (sectionId !== undefined) {
    where.sectionId = sectionId === null ? null : BigInt(sectionId);
  }

  if (priority) {
    where.priority = priority;
  }

  if (testType) {
    where.testType = testType;
  }

  if (testTechnique) {
    where.testTechnique = testTechnique;
  }

  if (isMatrix !== undefined) {
    where.isMatrix = isMatrix;
  }

  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  if (classification?.trim()) {
    where.classification = { contains: classification.trim(), mode: 'insensitive' };
  }

  // テストケース一覧を取得
  const testCases = await prisma.testCase.findMany({
    where,
    include: {
      section: {
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      },
      testSteps: includeSteps
        ? {
            select: {
              stepNo: true,
              actionMd: true,
              expectedMd: true,
            },
            orderBy: { stepNo: 'asc' },
          }
        : false,
    },
    orderBy: [{ section: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    take: 10000, // エクスポート最大件数を制限
  });

  // セクションのマップを作成（パス構築用）
  const allSections = await prisma.testSection.findMany({
    where: { testSpecId: BigInt(testSpecId) },
    select: { id: true, name: true, parentId: true },
  });

  const sectionsMap = new Map<string, { name: string; parentId: string | null }>();
  for (const section of allSections) {
    sectionsMap.set(section.id.toString(), {
      name: section.name,
      parentId: section.parentId?.toString() ?? null,
    });
  }

  // セクションパスを構築
  function buildSectionPath(sectionId: string | null): string {
    if (!sectionId) return '';

    const path: string[] = [];
    let currentId: string | null = sectionId;

    while (currentId) {
      const section = sectionsMap.get(currentId);
      if (!section) break;
      path.unshift(section.name);
      currentId = section.parentId;
    }

    return path.join(' > ');
  }

  // テストケースをエクスポート用形式に変換
  return testCases.map((tc, index): TestCaseExportData => {
    const sectionIdStr = tc.sectionId?.toString() ?? null;

    const steps: TestStepExportData[] | undefined =
      includeSteps && tc.testSteps
        ? tc.testSteps.map((step) => ({
            stepNo: step.stepNo,
            action: step.actionMd,
            expected: step.expectedMd,
          }))
        : undefined;

    return {
      id: tc.id.toString(),
      testCaseNumber: `TC-${String(index + 1).padStart(4, '0')}`,
      referenceId: tc.referenceId,
      title: tc.title,
      description: tc.description,
      precondition: tc.preconditions,
      expectedResult: tc.expectedResult,
      checkpoint: tc.checkpoint,
      scenario: tc.scenario,
      testEnvironment: tc.testEnvironment,
      notes: tc.notes,
      priority: tc.priority,
      testType: tc.testType,
      testTechnique: tc.testTechnique,
      classification: tc.classification,
      estimatedTime: tc.estimatedTime,
      tags: tc.tags,
      sectionName: tc.section?.name ?? null,
      sectionPath: buildSectionPath(sectionIdStr),
      createdAt: tc.createdAt.toISOString(),
      updatedAt: tc.updatedAt.toISOString(),
      steps,
    };
  });
}
