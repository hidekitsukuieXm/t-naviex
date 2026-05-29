/**
 * Matrix Test Case API
 *
 * テストケースのマトリクス形式管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { MatrixAxisType, MatrixCellValue } from '@/generated/prisma';
import {
  getMatrixTestCase,
  createMatrixTestCase,
  updateMatrixTestCase,
  deleteMatrixTestCase,
  updateMatrixCell,
  addMatrixRow,
  addMatrixColumn,
  removeMatrixRow,
  removeMatrixColumn,
  createExpandedCases,
  deleteExpandedCases,
  hasMatrixTestCase,
} from '@/repositories/matrix-repository';
import {
  MatrixAxisItem,
  MatrixCell,
  MatrixExpansionStrategy,
  generateTestCaseTitle,
  DEFAULT_TITLE_TEMPLATE,
  matrixToCsv,
} from '@/types/matrix';

interface RouteParams {
  params: Promise<{ testCaseId: string }>;
}

/**
 * GET /api/test-cases/[testCaseId]/matrix
 * マトリクステストケースを取得
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const testCaseIdBigInt = BigInt(testCaseId);

    const matrixTestCase = await getMatrixTestCase(testCaseIdBigInt);

    if (!matrixTestCase) {
      return NextResponse.json(
        { error: 'マトリクステストケースが見つかりません', hasMatrix: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...matrixTestCase,
      id: matrixTestCase.id.toString(),
      testCaseId: matrixTestCase.testCaseId.toString(),
      expandedCases: matrixTestCase.expandedCases.map((c) => ({
        ...c,
        id: c.id.toString(),
        matrixTestCaseId: c.matrixTestCaseId.toString(),
        generatedTestCaseId: c.generatedTestCaseId?.toString(),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch matrix test case:', error);
    return NextResponse.json(
      { error: 'マトリクステストケースの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/test-cases/[testCaseId]/matrix
 * マトリクステストケースを作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const testCaseIdBigInt = BigInt(testCaseId);
    const body = await request.json();

    // 既存チェック
    const exists = await hasMatrixTestCase(testCaseIdBigInt);
    if (exists) {
      return NextResponse.json(
        { error: 'このテストケースには既にマトリクスが設定されています' },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      rowAxisName,
      rowAxisType,
      rowAxisItems,
      columnAxisName,
      columnAxisType,
      columnAxisItems,
      defaultCellValue = 'EMPTY',
      metadata,
    } = body;

    // バリデーション
    if (!name?.trim()) {
      return NextResponse.json({ error: 'マトリクス名は必須です' }, { status: 400 });
    }

    if (!rowAxisName?.trim() || !columnAxisName?.trim()) {
      return NextResponse.json({ error: '軸名は必須です' }, { status: 400 });
    }

    if (!rowAxisItems?.length || !columnAxisItems?.length) {
      return NextResponse.json({ error: '軸アイテムは1つ以上必要です' }, { status: 400 });
    }

    // 軸タイプのバリデーション
    const validAxisTypes = Object.values(MatrixAxisType);
    if (rowAxisType && !validAxisTypes.includes(rowAxisType)) {
      return NextResponse.json({ error: '無効な行軸タイプです' }, { status: 400 });
    }
    if (columnAxisType && !validAxisTypes.includes(columnAxisType)) {
      return NextResponse.json({ error: '無効な列軸タイプです' }, { status: 400 });
    }

    // セルを初期化
    const cells: MatrixCell[][] = rowAxisItems.map((_: MatrixAxisItem, rowIndex: number) =>
      columnAxisItems.map((_: MatrixAxisItem, colIndex: number) => ({
        rowIndex,
        columnIndex: colIndex,
        value: defaultCellValue as MatrixCellValue,
      }))
    );

    const matrixTestCase = await createMatrixTestCase({
      testCaseId: testCaseIdBigInt,
      name,
      description,
      rowAxisName,
      rowAxisType: rowAxisType || 'TEXT',
      rowAxisItems,
      columnAxisName,
      columnAxisType: columnAxisType || 'TEXT',
      columnAxisItems,
      cells,
      metadata,
    });

    return NextResponse.json(
      {
        ...matrixTestCase,
        id: matrixTestCase.id.toString(),
        testCaseId: matrixTestCase.testCaseId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create matrix test case:', error);
    return NextResponse.json(
      { error: 'マトリクステストケースの作成に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/test-cases/[testCaseId]/matrix
 * マトリクステストケースを更新・操作
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const testCaseIdBigInt = BigInt(testCaseId);
    const body = await request.json();

    const { action } = body;

    // アクションに応じた処理
    switch (action) {
      case 'updateCell': {
        // セルを更新
        const { rowIndex, columnIndex, value, notes, status } = body;
        await updateMatrixCell(testCaseIdBigInt, rowIndex, columnIndex, {
          value,
          notes,
          status,
        });
        const updated = await getMatrixTestCase(testCaseIdBigInt);
        return NextResponse.json({
          ...updated,
          id: updated?.id.toString(),
          testCaseId: updated?.testCaseId.toString(),
        });
      }

      case 'addRow': {
        // 行を追加
        const { item } = body;
        const itemWithId: MatrixAxisItem = {
          ...item,
          id: `row_${Date.now()}`,
          sortOrder: item.sortOrder ?? 0,
        };
        await addMatrixRow(testCaseIdBigInt, itemWithId);
        const updated = await getMatrixTestCase(testCaseIdBigInt);
        return NextResponse.json({
          ...updated,
          id: updated?.id.toString(),
          testCaseId: updated?.testCaseId.toString(),
        });
      }

      case 'addColumn': {
        // 列を追加
        const { item } = body;
        const itemWithId: MatrixAxisItem = {
          ...item,
          id: `col_${Date.now()}`,
          sortOrder: item.sortOrder ?? 0,
        };
        await addMatrixColumn(testCaseIdBigInt, itemWithId);
        const updated = await getMatrixTestCase(testCaseIdBigInt);
        return NextResponse.json({
          ...updated,
          id: updated?.id.toString(),
          testCaseId: updated?.testCaseId.toString(),
        });
      }

      case 'removeRow': {
        // 行を削除
        const { rowIndex } = body;
        await removeMatrixRow(testCaseIdBigInt, rowIndex);
        const updated = await getMatrixTestCase(testCaseIdBigInt);
        return NextResponse.json({
          ...updated,
          id: updated?.id.toString(),
          testCaseId: updated?.testCaseId.toString(),
        });
      }

      case 'removeColumn': {
        // 列を削除
        const { columnIndex } = body;
        await removeMatrixColumn(testCaseIdBigInt, columnIndex);
        const updated = await getMatrixTestCase(testCaseIdBigInt);
        return NextResponse.json({
          ...updated,
          id: updated?.id.toString(),
          testCaseId: updated?.testCaseId.toString(),
        });
      }

      case 'expand': {
        // テストケースを展開
        const {
          strategy = 'YES_CELLS_ONLY',
          titleTemplate = DEFAULT_TITLE_TEMPLATE,
          selectedCells,
        } = body;

        const matrix = await getMatrixTestCase(testCaseIdBigInt);
        if (!matrix) {
          return NextResponse.json({ error: 'マトリクスが見つかりません' }, { status: 404 });
        }

        const rowItems = matrix.rowAxisItems as unknown as MatrixAxisItem[];
        const colItems = matrix.columnAxisItems as unknown as MatrixAxisItem[];
        const cells = matrix.cells as unknown as MatrixCell[][];

        // 展開対象のセルを決定
        const targetCells: { rowIndex: number; columnIndex: number; cell: MatrixCell }[] = [];

        for (let ri = 0; ri < cells.length; ri++) {
          const row = cells[ri];
          if (!row) continue;
          for (let ci = 0; ci < row.length; ci++) {
            const cell = row[ci];
            if (!cell) continue;
            let include = false;

            switch (strategy as MatrixExpansionStrategy) {
              case 'ALL_COMBINATIONS':
                include = true;
                break;
              case 'YES_CELLS_ONLY':
                include = cell.value === 'YES';
                break;
              case 'NON_EMPTY_CELLS':
                include = cell.value !== 'EMPTY';
                break;
              case 'MANUAL_SELECTION':
                include = selectedCells?.some(
                  (sc: { rowIndex: number; columnIndex: number }) =>
                    sc.rowIndex === ri && sc.columnIndex === ci
                );
                break;
            }

            if (include) {
              targetCells.push({ rowIndex: ri, columnIndex: ci, cell });
            }
          }
        }

        // 既存の展開を削除
        await deleteExpandedCases(matrix.id);

        // 展開テストケースを作成
        const expandedCases = targetCells
          .filter(({ rowIndex, columnIndex }) => rowItems[rowIndex] && colItems[columnIndex])
          .map(({ rowIndex, columnIndex }) => ({
            matrixTestCaseId: matrix.id,
            rowIndex,
            columnIndex,
            generatedTitle: generateTestCaseTitle(
              titleTemplate,
              rowItems[rowIndex]!,
              colItems[columnIndex]!,
              matrix.name
            ),
          }));

        await createExpandedCases(expandedCases);

        // マトリクスを更新
        await updateMatrixTestCase(testCaseIdBigInt, {
          isExpanded: true,
          expansionStrategy: strategy,
        });

        const updated = await getMatrixTestCase(testCaseIdBigInt);
        return NextResponse.json({
          ...updated,
          id: updated?.id.toString(),
          testCaseId: updated?.testCaseId.toString(),
          expandedCases: updated?.expandedCases.map((c) => ({
            ...c,
            id: c.id.toString(),
            matrixTestCaseId: c.matrixTestCaseId.toString(),
            generatedTestCaseId: c.generatedTestCaseId?.toString(),
          })),
          expandedCount: expandedCases.length,
        });
      }

      case 'exportCsv': {
        // CSV出力
        const matrix = await getMatrixTestCase(testCaseIdBigInt);
        if (!matrix) {
          return NextResponse.json({ error: 'マトリクスが見つかりません' }, { status: 404 });
        }

        const rowItems = matrix.rowAxisItems as unknown as MatrixAxisItem[];
        const colItems = matrix.columnAxisItems as unknown as MatrixAxisItem[];
        const cells = matrix.cells as unknown as MatrixCell[][];

        const csv = matrixToCsv({
          id: matrix.id.toString(),
          name: matrix.name,
          rowAxis: {
            id: 'row',
            name: matrix.rowAxisName,
            items: rowItems,
            type: matrix.rowAxisType as MatrixAxisType,
          },
          columnAxis: {
            id: 'col',
            name: matrix.columnAxisName,
            items: colItems,
            type: matrix.columnAxisType as MatrixAxisType,
          },
          cells,
          createdAt: matrix.createdAt,
          updatedAt: matrix.updatedAt,
        });

        return NextResponse.json({ csv });
      }

      default: {
        // 通常の更新
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
        } = body;

        const matrixTestCase = await updateMatrixTestCase(testCaseIdBigInt, {
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
        });

        return NextResponse.json({
          ...matrixTestCase,
          id: matrixTestCase.id.toString(),
          testCaseId: matrixTestCase.testCaseId.toString(),
        });
      }
    }
  } catch (error) {
    console.error('Failed to update matrix test case:', error);
    return NextResponse.json(
      { error: 'マトリクステストケースの更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/test-cases/[testCaseId]/matrix
 * マトリクステストケースを削除
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const testCaseIdBigInt = BigInt(testCaseId);

    const exists = await hasMatrixTestCase(testCaseIdBigInt);
    if (!exists) {
      return NextResponse.json(
        { error: 'マトリクステストケースが見つかりません' },
        { status: 404 }
      );
    }

    await deleteMatrixTestCase(testCaseIdBigInt);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete matrix test case:', error);
    return NextResponse.json(
      { error: 'マトリクステストケースの削除に失敗しました' },
      { status: 500 }
    );
  }
}
