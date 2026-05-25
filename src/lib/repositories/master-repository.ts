/**
 * テストタイプ・技法・観点マスタのリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  TestTypeMaster,
  TestTechniqueMaster,
  TestPerspective,
  MasterItem,
  CreateMasterItemInput,
  UpdateMasterItemInput,
  MasterItemListResponse,
  MasterType,
} from '@/types/master';
import {
  DEFAULT_TEST_TYPES,
  DEFAULT_TEST_TECHNIQUES,
  DEFAULT_TEST_PERSPECTIVES,
} from '@/types/master';

// ============================================
// 共通ヘルパー関数
// ============================================

/**
 * BigIntをstringに変換するシリアライズ関数
 */
function serializeMasterItem<T extends MasterItem>(item: {
  id: bigint;
  projectId: bigint;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): T {
  return {
    id: item.id.toString(),
    projectId: item.projectId.toString(),
    code: item.code,
    name: item.name,
    description: item.description,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    isDefault: item.isDefault,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  } as T;
}

// ============================================
// テストタイプマスタ
// ============================================

/**
 * プロジェクトのテストタイプ一覧を取得
 */
export async function getTestTypeMasters(
  projectId: string,
  options?: { activeOnly?: boolean }
): Promise<MasterItemListResponse<TestTypeMaster>> {
  const where = {
    projectId: BigInt(projectId),
    ...(options?.activeOnly ? { isActive: true } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.testTypeMaster.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.testTypeMaster.count({ where }),
  ]);

  return {
    items: items.map((item) => serializeMasterItem<TestTypeMaster>(item)),
    total,
  };
}

/**
 * テストタイプを取得
 */
export async function getTestTypeMaster(
  projectId: string,
  id: string
): Promise<TestTypeMaster | null> {
  const item = await prisma.testTypeMaster.findFirst({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });

  return item ? serializeMasterItem<TestTypeMaster>(item) : null;
}

/**
 * コードでテストタイプを取得
 */
export async function getTestTypeMasterByCode(
  projectId: string,
  code: string
): Promise<TestTypeMaster | null> {
  const item = await prisma.testTypeMaster.findUnique({
    where: {
      projectId_code: {
        projectId: BigInt(projectId),
        code,
      },
    },
  });

  return item ? serializeMasterItem<TestTypeMaster>(item) : null;
}

/**
 * テストタイプを作成
 */
export async function createTestTypeMaster(
  projectId: string,
  input: CreateMasterItemInput
): Promise<TestTypeMaster> {
  const item = await prisma.testTypeMaster.create({
    data: {
      projectId: BigInt(projectId),
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
    },
  });

  return serializeMasterItem<TestTypeMaster>(item);
}

/**
 * テストタイプを更新
 */
export async function updateTestTypeMaster(
  projectId: string,
  id: string,
  input: UpdateMasterItemInput
): Promise<TestTypeMaster> {
  const item = await prisma.testTypeMaster.update({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
    data: {
      ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    },
  });

  return serializeMasterItem<TestTypeMaster>(item);
}

/**
 * テストタイプを削除
 */
export async function deleteTestTypeMaster(projectId: string, id: string): Promise<void> {
  await prisma.testTypeMaster.delete({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });
}

// ============================================
// テスト技法マスタ
// ============================================

/**
 * プロジェクトのテスト技法一覧を取得
 */
export async function getTestTechniqueMasters(
  projectId: string,
  options?: { activeOnly?: boolean }
): Promise<MasterItemListResponse<TestTechniqueMaster>> {
  const where = {
    projectId: BigInt(projectId),
    ...(options?.activeOnly ? { isActive: true } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.testTechniqueMaster.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.testTechniqueMaster.count({ where }),
  ]);

  return {
    items: items.map((item) => serializeMasterItem<TestTechniqueMaster>(item)),
    total,
  };
}

/**
 * テスト技法を取得
 */
export async function getTestTechniqueMaster(
  projectId: string,
  id: string
): Promise<TestTechniqueMaster | null> {
  const item = await prisma.testTechniqueMaster.findFirst({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });

  return item ? serializeMasterItem<TestTechniqueMaster>(item) : null;
}

/**
 * コードでテスト技法を取得
 */
export async function getTestTechniqueMasterByCode(
  projectId: string,
  code: string
): Promise<TestTechniqueMaster | null> {
  const item = await prisma.testTechniqueMaster.findUnique({
    where: {
      projectId_code: {
        projectId: BigInt(projectId),
        code,
      },
    },
  });

  return item ? serializeMasterItem<TestTechniqueMaster>(item) : null;
}

/**
 * テスト技法を作成
 */
export async function createTestTechniqueMaster(
  projectId: string,
  input: CreateMasterItemInput
): Promise<TestTechniqueMaster> {
  const item = await prisma.testTechniqueMaster.create({
    data: {
      projectId: BigInt(projectId),
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
    },
  });

  return serializeMasterItem<TestTechniqueMaster>(item);
}

/**
 * テスト技法を更新
 */
export async function updateTestTechniqueMaster(
  projectId: string,
  id: string,
  input: UpdateMasterItemInput
): Promise<TestTechniqueMaster> {
  const item = await prisma.testTechniqueMaster.update({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
    data: {
      ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    },
  });

  return serializeMasterItem<TestTechniqueMaster>(item);
}

/**
 * テスト技法を削除
 */
export async function deleteTestTechniqueMaster(projectId: string, id: string): Promise<void> {
  await prisma.testTechniqueMaster.delete({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });
}

// ============================================
// テスト観点マスタ
// ============================================

/**
 * プロジェクトのテスト観点一覧を取得
 */
export async function getTestPerspectives(
  projectId: string,
  options?: { activeOnly?: boolean }
): Promise<MasterItemListResponse<TestPerspective>> {
  const where = {
    projectId: BigInt(projectId),
    ...(options?.activeOnly ? { isActive: true } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.testPerspective.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.testPerspective.count({ where }),
  ]);

  return {
    items: items.map((item) => serializeMasterItem<TestPerspective>(item)),
    total,
  };
}

/**
 * テスト観点を取得
 */
export async function getTestPerspective(
  projectId: string,
  id: string
): Promise<TestPerspective | null> {
  const item = await prisma.testPerspective.findFirst({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });

  return item ? serializeMasterItem<TestPerspective>(item) : null;
}

/**
 * コードでテスト観点を取得
 */
export async function getTestPerspectiveByCode(
  projectId: string,
  code: string
): Promise<TestPerspective | null> {
  const item = await prisma.testPerspective.findUnique({
    where: {
      projectId_code: {
        projectId: BigInt(projectId),
        code,
      },
    },
  });

  return item ? serializeMasterItem<TestPerspective>(item) : null;
}

/**
 * テスト観点を作成
 */
export async function createTestPerspective(
  projectId: string,
  input: CreateMasterItemInput
): Promise<TestPerspective> {
  const item = await prisma.testPerspective.create({
    data: {
      projectId: BigInt(projectId),
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      isDefault: input.isDefault ?? false,
    },
  });

  return serializeMasterItem<TestPerspective>(item);
}

/**
 * テスト観点を更新
 */
export async function updateTestPerspective(
  projectId: string,
  id: string,
  input: UpdateMasterItemInput
): Promise<TestPerspective> {
  const item = await prisma.testPerspective.update({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
    data: {
      ...(input.code !== undefined ? { code: input.code.toUpperCase() } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    },
  });

  return serializeMasterItem<TestPerspective>(item);
}

/**
 * テスト観点を削除
 */
export async function deleteTestPerspective(projectId: string, id: string): Promise<void> {
  await prisma.testPerspective.delete({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });
}

// ============================================
// 初期化・シード関数
// ============================================

/**
 * プロジェクトのテストタイプマスタが存在するか確認
 */
export async function hasTestTypeMasters(projectId: string): Promise<boolean> {
  const count = await prisma.testTypeMaster.count({
    where: { projectId: BigInt(projectId) },
  });
  return count > 0;
}

/**
 * プロジェクトのテスト技法マスタが存在するか確認
 */
export async function hasTestTechniqueMasters(projectId: string): Promise<boolean> {
  const count = await prisma.testTechniqueMaster.count({
    where: { projectId: BigInt(projectId) },
  });
  return count > 0;
}

/**
 * プロジェクトのテスト観点マスタが存在するか確認
 */
export async function hasTestPerspectives(projectId: string): Promise<boolean> {
  const count = await prisma.testPerspective.count({
    where: { projectId: BigInt(projectId) },
  });
  return count > 0;
}

/**
 * プロジェクトにデフォルトのテストタイプを作成
 */
export async function initializeTestTypeMasters(projectId: string): Promise<void> {
  const hasItems = await hasTestTypeMasters(projectId);
  if (hasItems) return;

  await prisma.testTypeMaster.createMany({
    data: DEFAULT_TEST_TYPES.map((item) => ({
      projectId: BigInt(projectId),
      code: item.code.toUpperCase(),
      name: item.name,
      description: item.description ?? null,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
      isDefault: item.isDefault ?? false,
    })),
  });
}

/**
 * プロジェクトにデフォルトのテスト技法を作成
 */
export async function initializeTestTechniqueMasters(projectId: string): Promise<void> {
  const hasItems = await hasTestTechniqueMasters(projectId);
  if (hasItems) return;

  await prisma.testTechniqueMaster.createMany({
    data: DEFAULT_TEST_TECHNIQUES.map((item) => ({
      projectId: BigInt(projectId),
      code: item.code.toUpperCase(),
      name: item.name,
      description: item.description ?? null,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
      isDefault: item.isDefault ?? false,
    })),
  });
}

/**
 * プロジェクトにデフォルトのテスト観点を作成
 */
export async function initializeTestPerspectives(projectId: string): Promise<void> {
  const hasItems = await hasTestPerspectives(projectId);
  if (hasItems) return;

  await prisma.testPerspective.createMany({
    data: DEFAULT_TEST_PERSPECTIVES.map((item) => ({
      projectId: BigInt(projectId),
      code: item.code.toUpperCase(),
      name: item.name,
      description: item.description ?? null,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
      isDefault: item.isDefault ?? false,
    })),
  });
}

/**
 * プロジェクトの全マスタを初期化
 */
export async function initializeAllMasters(projectId: string): Promise<void> {
  await Promise.all([
    initializeTestTypeMasters(projectId),
    initializeTestTechniqueMasters(projectId),
    initializeTestPerspectives(projectId),
  ]);
}

// ============================================
// 汎用関数（マスタタイプで切り替え）
// ============================================

/**
 * マスタアイテム一覧を取得（タイプ指定）
 */
export async function getMasterItems(
  projectId: string,
  masterType: MasterType,
  options?: { activeOnly?: boolean }
): Promise<MasterItemListResponse<MasterItem>> {
  switch (masterType) {
    case 'testType':
      return getTestTypeMasters(projectId, options);
    case 'testTechnique':
      return getTestTechniqueMasters(projectId, options);
    case 'testPerspective':
      return getTestPerspectives(projectId, options);
  }
}

/**
 * マスタアイテムを取得（タイプ指定）
 */
export async function getMasterItem(
  projectId: string,
  masterType: MasterType,
  id: string
): Promise<MasterItem | null> {
  switch (masterType) {
    case 'testType':
      return getTestTypeMaster(projectId, id);
    case 'testTechnique':
      return getTestTechniqueMaster(projectId, id);
    case 'testPerspective':
      return getTestPerspective(projectId, id);
  }
}

/**
 * コードでマスタアイテムを取得（タイプ指定）
 */
export async function getMasterItemByCode(
  projectId: string,
  masterType: MasterType,
  code: string
): Promise<MasterItem | null> {
  switch (masterType) {
    case 'testType':
      return getTestTypeMasterByCode(projectId, code);
    case 'testTechnique':
      return getTestTechniqueMasterByCode(projectId, code);
    case 'testPerspective':
      return getTestPerspectiveByCode(projectId, code);
  }
}

/**
 * マスタアイテムを作成（タイプ指定）
 */
export async function createMasterItem(
  projectId: string,
  masterType: MasterType,
  input: CreateMasterItemInput
): Promise<MasterItem> {
  switch (masterType) {
    case 'testType':
      return createTestTypeMaster(projectId, input);
    case 'testTechnique':
      return createTestTechniqueMaster(projectId, input);
    case 'testPerspective':
      return createTestPerspective(projectId, input);
  }
}

/**
 * マスタアイテムを更新（タイプ指定）
 */
export async function updateMasterItem(
  projectId: string,
  masterType: MasterType,
  id: string,
  input: UpdateMasterItemInput
): Promise<MasterItem> {
  switch (masterType) {
    case 'testType':
      return updateTestTypeMaster(projectId, id, input);
    case 'testTechnique':
      return updateTestTechniqueMaster(projectId, id, input);
    case 'testPerspective':
      return updateTestPerspective(projectId, id, input);
  }
}

/**
 * マスタアイテムを削除（タイプ指定）
 */
export async function deleteMasterItem(
  projectId: string,
  masterType: MasterType,
  id: string
): Promise<void> {
  switch (masterType) {
    case 'testType':
      return deleteTestTypeMaster(projectId, id);
    case 'testTechnique':
      return deleteTestTechniqueMaster(projectId, id);
    case 'testPerspective':
      return deleteTestPerspective(projectId, id);
  }
}

/**
 * マスタの初期化（タイプ指定）
 */
export async function initializeMaster(projectId: string, masterType: MasterType): Promise<void> {
  switch (masterType) {
    case 'testType':
      return initializeTestTypeMasters(projectId);
    case 'testTechnique':
      return initializeTestTechniqueMasters(projectId);
    case 'testPerspective':
      return initializeTestPerspectives(projectId);
  }
}
