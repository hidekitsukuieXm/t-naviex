/**
 * テストセクションリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  TestSection,
  TestSectionDetail,
  TestSectionWithChildren,
  CreateTestSectionInput,
  UpdateTestSectionInput,
  UpdateSortOrderInput,
  TestSectionSearchParams,
  MoveTestSectionInput,
} from '@/types/test-section';
import { buildSectionTree, getDescendantIds, hasCircularReference } from '@/types/test-section';

// ============================================
// セレクト定義
// ============================================

const testSectionSelect = {
  id: true,
  testSpecId: true,
  parentId: true,
  name: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

const testSectionDetailSelect = {
  ...testSectionSelect,
  parent: {
    select: testSectionSelect,
  },
  children: {
    select: testSectionSelect,
    orderBy: { sortOrder: 'asc' as const },
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

interface DbTestSection {
  id: bigint;
  testSpecId: bigint;
  parentId: bigint | null;
  name: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DbTestSectionDetail extends DbTestSection {
  parent: DbTestSection | null;
  children: DbTestSection[];
  testSpec: {
    id: bigint;
    name: string;
  };
}

function serializeTestSection(section: DbTestSection): TestSection {
  return {
    id: section.id.toString(),
    testSpecId: section.testSpecId.toString(),
    parentId: section.parentId?.toString() ?? null,
    name: section.name,
    sortOrder: section.sortOrder,
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString(),
  };
}

function serializeTestSectionDetail(section: DbTestSectionDetail): TestSectionDetail {
  return {
    id: section.id.toString(),
    testSpecId: section.testSpecId.toString(),
    parentId: section.parentId?.toString() ?? null,
    name: section.name,
    sortOrder: section.sortOrder,
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString(),
    parent: section.parent ? serializeTestSection(section.parent) : null,
    children: section.children.map(serializeTestSection),
    testSpec: {
      id: section.testSpec.id.toString(),
      name: section.testSpec.name,
    },
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * テストセクション作成
 */
export async function createTestSection(input: CreateTestSectionInput): Promise<TestSection> {
  const trimmedName = input.name.trim();

  // 並び順を決定（指定がなければ最後に追加）
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const maxSortOrder = await prisma.testSection.aggregate({
      where: {
        testSpecId: BigInt(input.testSpecId),
        parentId: input.parentId ? BigInt(input.parentId) : null,
      },
      _max: {
        sortOrder: true,
      },
    });
    sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
  }

  const section = await prisma.testSection.create({
    data: {
      testSpecId: BigInt(input.testSpecId),
      parentId: input.parentId ? BigInt(input.parentId) : null,
      name: trimmedName,
      sortOrder,
    },
    select: testSectionSelect,
  });

  return serializeTestSection(section);
}

/**
 * テストセクション取得（ID指定）
 */
export async function getTestSectionById(id: bigint): Promise<TestSectionDetail | null> {
  const section = await prisma.testSection.findUnique({
    where: { id },
    select: testSectionDetailSelect,
  });

  if (!section) {
    return null;
  }

  return serializeTestSectionDetail(section as DbTestSectionDetail);
}

/**
 * テストセクション一覧取得（フラット）
 */
export async function getTestSections(params: TestSectionSearchParams): Promise<TestSection[]> {
  const where: {
    testSpecId: bigint;
    parentId?: bigint | null;
    OR?: { name: { contains: string; mode: 'insensitive' } }[];
  } = {
    testSpecId: BigInt(params.testSpecId),
  };

  // 親ID指定
  if (params.parentId !== undefined) {
    where.parentId = params.parentId ? BigInt(params.parentId) : null;
  }

  // 検索クエリ
  if (params.query) {
    where.OR = [{ name: { contains: params.query, mode: 'insensitive' } }];
  }

  const sections = await prisma.testSection.findMany({
    where,
    select: testSectionSelect,
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
  });

  return sections.map(serializeTestSection);
}

/**
 * テストセクションツリー取得
 */
export async function getTestSectionTree(testSpecId: string): Promise<TestSectionWithChildren[]> {
  const sections = await getTestSections({ testSpecId });
  return buildSectionTree(sections);
}

/**
 * テストセクション更新
 */
export async function updateTestSection(
  id: bigint,
  input: UpdateTestSectionInput
): Promise<TestSection | null> {
  // 既存のセクションを確認
  const existing = await prisma.testSection.findUnique({
    where: { id },
    select: { id: true, testSpecId: true, parentId: true },
  });

  if (!existing) {
    return null;
  }

  // parentIdが変更される場合、循環参照チェック
  if (input.parentId !== undefined && input.parentId !== existing.parentId?.toString()) {
    if (input.parentId !== null) {
      // 全セクションを取得して循環参照チェック
      const allSections = await getTestSections({
        testSpecId: existing.testSpecId.toString(),
      });

      if (hasCircularReference(id.toString(), input.parentId, allSections)) {
        throw new Error('循環参照が発生するため、この親セクションには移動できません。');
      }
    }
  }

  const updateData: {
    name?: string;
    parentId?: bigint | null;
    sortOrder?: number;
  } = {};

  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }

  if (input.parentId !== undefined) {
    updateData.parentId = input.parentId ? BigInt(input.parentId) : null;
  }

  if (input.sortOrder !== undefined) {
    updateData.sortOrder = input.sortOrder;
  }

  const section = await prisma.testSection.update({
    where: { id },
    data: updateData,
    select: testSectionSelect,
  });

  return serializeTestSection(section);
}

/**
 * テストセクション移動
 */
export async function moveTestSection(
  id: bigint,
  input: MoveTestSectionInput
): Promise<TestSection | null> {
  // 既存のセクションを確認
  const existing = await prisma.testSection.findUnique({
    where: { id },
    select: { id: true, testSpecId: true, parentId: true },
  });

  if (!existing) {
    return null;
  }

  // 循環参照チェック
  if (input.parentId !== null) {
    const allSections = await getTestSections({
      testSpecId: existing.testSpecId.toString(),
    });

    if (hasCircularReference(id.toString(), input.parentId, allSections)) {
      throw new Error('循環参照が発生するため、この親セクションには移動できません。');
    }
  }

  // 並び順を決定
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const maxSortOrder = await prisma.testSection.aggregate({
      where: {
        testSpecId: existing.testSpecId,
        parentId: input.parentId ? BigInt(input.parentId) : null,
        id: { not: id },
      },
      _max: {
        sortOrder: true,
      },
    });
    sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
  }

  const section = await prisma.testSection.update({
    where: { id },
    data: {
      parentId: input.parentId ? BigInt(input.parentId) : null,
      sortOrder,
    },
    select: testSectionSelect,
  });

  return serializeTestSection(section);
}

/**
 * テストセクション削除
 */
export async function deleteTestSection(
  id: bigint
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  const existing = await prisma.testSection.findUnique({
    where: { id },
    select: { id: true, testSpecId: true },
  });

  if (!existing) {
    return { success: false, error: 'テストセクションが見つかりません。' };
  }

  // 子孫セクションのIDを取得
  const allSections = await getTestSections({
    testSpecId: existing.testSpecId.toString(),
  });
  const descendantIds = getDescendantIds(id.toString(), allSections);
  const idsToDelete = [id.toString(), ...descendantIds];

  // 削除（カスケード削除により子孫も削除される）
  await prisma.testSection.delete({
    where: { id },
  });

  return { success: true, deletedCount: idsToDelete.length };
}

/**
 * 並び順一括更新
 */
export async function updateSortOrders(
  testSpecId: string,
  items: UpdateSortOrderInput[]
): Promise<TestSection[]> {
  // トランザクションで一括更新
  const updates = items.map((item) =>
    prisma.testSection.update({
      where: {
        id: BigInt(item.id),
        testSpecId: BigInt(testSpecId),
      },
      data: {
        sortOrder: item.sortOrder,
      },
      select: testSectionSelect,
    })
  );

  const sections = await prisma.$transaction(updates);

  return sections.map(serializeTestSection);
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
 * セクション名が同じ階層で重複しているか確認
 */
export async function isSectionNameTaken(
  testSpecId: bigint,
  parentId: bigint | null,
  name: string,
  excludeId?: bigint
): Promise<boolean> {
  const where: {
    testSpecId: bigint;
    parentId: bigint | null;
    name: string;
    id?: { not: bigint };
  } = {
    testSpecId,
    parentId,
    name: name.trim(),
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existing = await prisma.testSection.findFirst({
    where,
    select: { id: true },
  });

  return existing !== null;
}

/**
 * 親セクションが存在するか確認
 */
export async function parentSectionExists(testSpecId: bigint, parentId: bigint): Promise<boolean> {
  const parent = await prisma.testSection.findFirst({
    where: {
      id: parentId,
      testSpecId,
    },
    select: { id: true },
  });

  return parent !== null;
}

/**
 * セクションの子孫数を取得
 */
export async function getDescendantCount(id: bigint): Promise<number> {
  const section = await prisma.testSection.findUnique({
    where: { id },
    select: { testSpecId: true },
  });

  if (!section) {
    return 0;
  }

  const allSections = await getTestSections({
    testSpecId: section.testSpecId.toString(),
  });

  return getDescendantIds(id.toString(), allSections).length;
}

/**
 * セクション名でセクションを検索または作成
 */
export async function findOrCreateSection(
  testSpecId: bigint,
  sectionName: string
): Promise<TestSection> {
  const trimmedName = sectionName.trim();

  // 既存のセクションを検索（ルートレベル）
  const existing = await prisma.testSection.findFirst({
    where: {
      testSpecId,
      parentId: null,
      name: trimmedName,
    },
    select: testSectionSelect,
  });

  if (existing) {
    return serializeTestSection(existing);
  }

  // 新規作成
  const maxSortOrder = await prisma.testSection.aggregate({
    where: {
      testSpecId,
      parentId: null,
    },
    _max: {
      sortOrder: true,
    },
  });

  const section = await prisma.testSection.create({
    data: {
      testSpecId,
      parentId: null,
      name: trimmedName,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
    select: testSectionSelect,
  });

  return serializeTestSection(section);
}
