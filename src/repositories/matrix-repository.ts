/**
 * Matrix Repository
 *
 * マトリクステストケース関連のデータアクセス層
 */

import { Prisma, MatrixAxisType, MatrixCellValue } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type {
  MatrixAxisItem,
  MatrixCell,
  MatrixMetadata,
  MatrixExpansionStrategy,
} from '@/types/matrix';

// ========================================
// マトリクステンプレート関連
// ========================================

/**
 * テンプレート作成パラメータ
 */
export interface CreateMatrixTemplateParams {
  projectId: bigint;
  name: string;
  description?: string;
  rowAxisName: string;
  rowAxisType: MatrixAxisType;
  rowAxisItems: MatrixAxisItem[];
  columnAxisName: string;
  columnAxisType: MatrixAxisType;
  columnAxisItems: MatrixAxisItem[];
  defaultCellValue?: MatrixCellValue;
  isDefault?: boolean;
}

/**
 * テンプレート更新パラメータ
 */
export interface UpdateMatrixTemplateParams {
  name?: string;
  description?: string;
  rowAxisName?: string;
  rowAxisType?: MatrixAxisType;
  rowAxisItems?: MatrixAxisItem[];
  columnAxisName?: string;
  columnAxisType?: MatrixAxisType;
  columnAxisItems?: MatrixAxisItem[];
  defaultCellValue?: MatrixCellValue;
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * テンプレート検索オプション
 */
export interface FindMatrixTemplatesOptions {
  projectId: bigint;
  isDefault?: boolean;
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

/**
 * マトリクステンプレートを作成
 */
export async function createMatrixTemplate(params: CreateMatrixTemplateParams) {
  const {
    projectId,
    name,
    description,
    rowAxisName,
    rowAxisType,
    rowAxisItems,
    columnAxisName,
    columnAxisType,
    columnAxisItems,
    defaultCellValue = 'EMPTY',
    isDefault = false,
  } = params;

  // isDefaultがtrueの場合、他のデフォルトテンプレートを解除
  if (isDefault) {
    await prisma.matrixTemplate.updateMany({
      where: { projectId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.matrixTemplate.create({
    data: {
      projectId,
      name,
      description,
      rowAxisName,
      rowAxisType,
      rowAxisItems: rowAxisItems as unknown as Prisma.InputJsonValue,
      columnAxisName,
      columnAxisType,
      columnAxisItems: columnAxisItems as unknown as Prisma.InputJsonValue,
      defaultCellValue,
      isDefault,
    },
  });
}

/**
 * マトリクステンプレートを取得
 */
export async function getMatrixTemplate(id: bigint) {
  return prisma.matrixTemplate.findUnique({
    where: { id },
  });
}

/**
 * マトリクステンプレートを検索
 */
export async function findMatrixTemplates(options: FindMatrixTemplatesOptions) {
  const { projectId, isDefault, isActive = true, search, skip, take } = options;

  const where: Prisma.MatrixTemplateWhereInput = {
    projectId,
    isActive,
    ...(isDefault !== undefined && { isDefault }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.matrixTemplate.findMany({
      where,
      skip,
      take,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    }),
    prisma.matrixTemplate.count({ where }),
  ]);

  return { items, total };
}

/**
 * マトリクステンプレートを更新
 */
export async function updateMatrixTemplate(id: bigint, params: UpdateMatrixTemplateParams) {
  const {
    name,
    description,
    rowAxisName,
    rowAxisType,
    rowAxisItems,
    columnAxisName,
    columnAxisType,
    columnAxisItems,
    defaultCellValue,
    isDefault,
    isActive,
  } = params;

  // isDefaultがtrueの場合、他のデフォルトテンプレートを解除
  if (isDefault) {
    const template = await prisma.matrixTemplate.findUnique({ where: { id } });
    if (template) {
      await prisma.matrixTemplate.updateMany({
        where: { projectId: template.projectId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
  }

  return prisma.matrixTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(rowAxisName !== undefined && { rowAxisName }),
      ...(rowAxisType !== undefined && { rowAxisType }),
      ...(rowAxisItems !== undefined && {
        rowAxisItems: rowAxisItems as unknown as Prisma.InputJsonValue,
      }),
      ...(columnAxisName !== undefined && { columnAxisName }),
      ...(columnAxisType !== undefined && { columnAxisType }),
      ...(columnAxisItems !== undefined && {
        columnAxisItems: columnAxisItems as unknown as Prisma.InputJsonValue,
      }),
      ...(defaultCellValue !== undefined && { defaultCellValue }),
      ...(isDefault !== undefined && { isDefault }),
      ...(isActive !== undefined && { isActive }),
    },
  });
}

/**
 * マトリクステンプレートを削除（論理削除）
 */
export async function deleteMatrixTemplate(id: bigint) {
  return prisma.matrixTemplate.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * テンプレート使用回数をインクリメント
 */
export async function incrementTemplateUsage(id: bigint) {
  return prisma.matrixTemplate.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  });
}

// ========================================
// マトリクステストケース関連
// ========================================

/**
 * マトリクステストケース作成パラメータ
 */
export interface CreateMatrixTestCaseParams {
  testCaseId: bigint;
  name: string;
  description?: string;
  rowAxisName: string;
  rowAxisType: MatrixAxisType;
  rowAxisItems: MatrixAxisItem[];
  columnAxisName: string;
  columnAxisType: MatrixAxisType;
  columnAxisItems: MatrixAxisItem[];
  cells: MatrixCell[][];
  metadata?: MatrixMetadata;
}

/**
 * マトリクステストケース更新パラメータ
 */
export interface UpdateMatrixTestCaseParams {
  name?: string;
  description?: string;
  rowAxisName?: string;
  rowAxisType?: MatrixAxisType;
  rowAxisItems?: MatrixAxisItem[];
  columnAxisName?: string;
  columnAxisType?: MatrixAxisType;
  columnAxisItems?: MatrixAxisItem[];
  cells?: MatrixCell[][];
  metadata?: MatrixMetadata;
  isExpanded?: boolean;
  expansionStrategy?: string;
}

/**
 * マトリクステストケースを作成
 */
export async function createMatrixTestCase(params: CreateMatrixTestCaseParams) {
  const {
    testCaseId,
    name,
    description,
    rowAxisName,
    rowAxisType,
    rowAxisItems,
    columnAxisName,
    columnAxisType,
    columnAxisItems,
    cells,
    metadata,
  } = params;

  return prisma.matrixTestCase.create({
    data: {
      testCaseId,
      name,
      description,
      rowAxisName,
      rowAxisType,
      rowAxisItems: rowAxisItems as unknown as Prisma.InputJsonValue,
      columnAxisName,
      columnAxisType,
      columnAxisItems: columnAxisItems as unknown as Prisma.InputJsonValue,
      cells: cells as unknown as Prisma.InputJsonValue,
      metadata: metadata as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * マトリクステストケースを取得
 */
export async function getMatrixTestCase(testCaseId: bigint) {
  return prisma.matrixTestCase.findUnique({
    where: { testCaseId },
    include: {
      expandedCases: true,
    },
  });
}

/**
 * マトリクステストケースを更新
 */
export async function updateMatrixTestCase(testCaseId: bigint, params: UpdateMatrixTestCaseParams) {
  const {
    name,
    description,
    rowAxisName,
    rowAxisType,
    rowAxisItems,
    columnAxisName,
    columnAxisType,
    columnAxisItems,
    cells,
    metadata,
    isExpanded,
    expansionStrategy,
  } = params;

  return prisma.matrixTestCase.update({
    where: { testCaseId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(rowAxisName !== undefined && { rowAxisName }),
      ...(rowAxisType !== undefined && { rowAxisType }),
      ...(rowAxisItems !== undefined && {
        rowAxisItems: rowAxisItems as unknown as Prisma.InputJsonValue,
      }),
      ...(columnAxisName !== undefined && { columnAxisName }),
      ...(columnAxisType !== undefined && { columnAxisType }),
      ...(columnAxisItems !== undefined && {
        columnAxisItems: columnAxisItems as unknown as Prisma.InputJsonValue,
      }),
      ...(cells !== undefined && { cells: cells as unknown as Prisma.InputJsonValue }),
      ...(metadata !== undefined && { metadata: metadata as unknown as Prisma.InputJsonValue }),
      ...(isExpanded !== undefined && { isExpanded }),
      ...(expansionStrategy !== undefined && { expansionStrategy }),
    },
  });
}

/**
 * マトリクステストケースを削除
 */
export async function deleteMatrixTestCase(testCaseId: bigint) {
  return prisma.matrixTestCase.delete({
    where: { testCaseId },
  });
}

/**
 * マトリクスセルを更新
 */
export async function updateMatrixCell(
  testCaseId: bigint,
  rowIndex: number,
  columnIndex: number,
  updates: Partial<MatrixCell>
) {
  const matrix = await prisma.matrixTestCase.findUnique({
    where: { testCaseId },
    select: { cells: true },
  });

  if (!matrix) {
    throw new Error('Matrix test case not found');
  }

  const cells = matrix.cells as unknown as MatrixCell[][];

  if (!cells[rowIndex] || !cells[rowIndex][columnIndex]) {
    throw new Error('Cell not found');
  }

  cells[rowIndex][columnIndex] = {
    ...cells[rowIndex][columnIndex],
    ...updates,
  };

  return prisma.matrixTestCase.update({
    where: { testCaseId },
    data: { cells: cells as unknown as Prisma.InputJsonValue },
  });
}

/**
 * マトリクスに行を追加
 */
export async function addMatrixRow(testCaseId: bigint, item: MatrixAxisItem) {
  const matrix = await prisma.matrixTestCase.findUnique({
    where: { testCaseId },
    select: { rowAxisItems: true, columnAxisItems: true, cells: true },
  });

  if (!matrix) {
    throw new Error('Matrix test case not found');
  }

  const rowAxisItems = matrix.rowAxisItems as unknown as MatrixAxisItem[];
  const columnAxisItems = matrix.columnAxisItems as unknown as MatrixAxisItem[];
  const cells = matrix.cells as unknown as MatrixCell[][];

  // 新しい行を追加
  rowAxisItems.push(item);

  // 新しい行のセルを追加
  const newRow: MatrixCell[] = columnAxisItems.map((_, colIndex) => ({
    rowIndex: cells.length,
    columnIndex: colIndex,
    value: 'EMPTY' as const,
  }));
  cells.push(newRow);

  return prisma.matrixTestCase.update({
    where: { testCaseId },
    data: {
      rowAxisItems: rowAxisItems as unknown as Prisma.InputJsonValue,
      cells: cells as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * マトリクスに列を追加
 */
export async function addMatrixColumn(testCaseId: bigint, item: MatrixAxisItem) {
  const matrix = await prisma.matrixTestCase.findUnique({
    where: { testCaseId },
    select: { columnAxisItems: true, cells: true },
  });

  if (!matrix) {
    throw new Error('Matrix test case not found');
  }

  const columnAxisItems = matrix.columnAxisItems as unknown as MatrixAxisItem[];
  const cells = matrix.cells as unknown as MatrixCell[][];

  // 新しい列を追加
  columnAxisItems.push(item);

  // 各行に新しいセルを追加
  const newColIndex = columnAxisItems.length - 1;
  cells.forEach((row, rowIndex) => {
    row.push({
      rowIndex,
      columnIndex: newColIndex,
      value: 'EMPTY' as const,
    });
  });

  return prisma.matrixTestCase.update({
    where: { testCaseId },
    data: {
      columnAxisItems: columnAxisItems as unknown as Prisma.InputJsonValue,
      cells: cells as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * マトリクスから行を削除
 */
export async function removeMatrixRow(testCaseId: bigint, rowIndex: number) {
  const matrix = await prisma.matrixTestCase.findUnique({
    where: { testCaseId },
    select: { rowAxisItems: true, cells: true },
  });

  if (!matrix) {
    throw new Error('Matrix test case not found');
  }

  const rowAxisItems = matrix.rowAxisItems as unknown as MatrixAxisItem[];
  const cells = matrix.cells as unknown as MatrixCell[][];

  // 行を削除
  rowAxisItems.splice(rowIndex, 1);
  cells.splice(rowIndex, 1);

  // インデックスを更新
  cells.forEach((row, ri) => {
    row.forEach((cell) => {
      cell.rowIndex = ri;
    });
  });

  return prisma.matrixTestCase.update({
    where: { testCaseId },
    data: {
      rowAxisItems: rowAxisItems as unknown as Prisma.InputJsonValue,
      cells: cells as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * マトリクスから列を削除
 */
export async function removeMatrixColumn(testCaseId: bigint, columnIndex: number) {
  const matrix = await prisma.matrixTestCase.findUnique({
    where: { testCaseId },
    select: { columnAxisItems: true, cells: true },
  });

  if (!matrix) {
    throw new Error('Matrix test case not found');
  }

  const columnAxisItems = matrix.columnAxisItems as unknown as MatrixAxisItem[];
  const cells = matrix.cells as unknown as MatrixCell[][];

  // 列を削除
  columnAxisItems.splice(columnIndex, 1);
  cells.forEach((row) => {
    row.splice(columnIndex, 1);
  });

  // インデックスを更新
  cells.forEach((row) => {
    row.forEach((cell, ci) => {
      cell.columnIndex = ci;
    });
  });

  return prisma.matrixTestCase.update({
    where: { testCaseId },
    data: {
      columnAxisItems: columnAxisItems as unknown as Prisma.InputJsonValue,
      cells: cells as unknown as Prisma.InputJsonValue,
    },
  });
}

// ========================================
// マトリクス展開テストケース関連
// ========================================

/**
 * 展開テストケース作成パラメータ
 */
export interface CreateExpandedCaseParams {
  matrixTestCaseId: bigint;
  rowIndex: number;
  columnIndex: number;
  generatedTitle: string;
  generatedSteps?: string[];
  generatedTestCaseId?: bigint;
}

/**
 * 展開テストケースを作成
 */
export async function createExpandedCase(params: CreateExpandedCaseParams) {
  const {
    matrixTestCaseId,
    rowIndex,
    columnIndex,
    generatedTitle,
    generatedSteps,
    generatedTestCaseId,
  } = params;

  return prisma.matrixExpandedCase.create({
    data: {
      matrixTestCaseId,
      rowIndex,
      columnIndex,
      generatedTitle,
      generatedSteps: generatedSteps as unknown as Prisma.InputJsonValue,
      generatedTestCaseId,
    },
  });
}

/**
 * 展開テストケースを一括作成
 */
export async function createExpandedCases(cases: CreateExpandedCaseParams[]) {
  return prisma.matrixExpandedCase.createMany({
    data: cases.map((c) => ({
      matrixTestCaseId: c.matrixTestCaseId,
      rowIndex: c.rowIndex,
      columnIndex: c.columnIndex,
      generatedTitle: c.generatedTitle,
      generatedSteps: c.generatedSteps as unknown as Prisma.InputJsonValue,
      generatedTestCaseId: c.generatedTestCaseId,
    })),
  });
}

/**
 * 展開テストケースを取得
 */
export async function getExpandedCases(matrixTestCaseId: bigint) {
  return prisma.matrixExpandedCase.findMany({
    where: { matrixTestCaseId },
    orderBy: [{ rowIndex: 'asc' }, { columnIndex: 'asc' }],
  });
}

/**
 * 展開テストケースを削除（マトリクス単位）
 */
export async function deleteExpandedCases(matrixTestCaseId: bigint) {
  return prisma.matrixExpandedCase.deleteMany({
    where: { matrixTestCaseId },
  });
}

/**
 * 展開テストケースにテストケースIDをリンク
 */
export async function linkExpandedCaseToTestCase(
  expandedCaseId: bigint,
  generatedTestCaseId: bigint
) {
  return prisma.matrixExpandedCase.update({
    where: { id: expandedCaseId },
    data: { generatedTestCaseId },
  });
}

// ========================================
// 統計関連
// ========================================

/**
 * プロジェクトのマトリクステストケース統計を取得
 */
export async function getMatrixStats(projectId: bigint) {
  const [templateCount, testCaseCount, expandedCount] = await Promise.all([
    prisma.matrixTemplate.count({
      where: { projectId, isActive: true },
    }),
    prisma.matrixTestCase.count({
      where: { testCase: { testSpec: { projectId } } },
    }),
    prisma.matrixExpandedCase.count({
      where: { matrixTestCase: { testCase: { testSpec: { projectId } } } },
    }),
  ]);

  return {
    templateCount,
    testCaseCount,
    expandedCount,
  };
}

/**
 * マトリクステストケースの存在確認
 */
export async function hasMatrixTestCase(testCaseId: bigint): Promise<boolean> {
  const count = await prisma.matrixTestCase.count({
    where: { testCaseId },
  });
  return count > 0;
}
