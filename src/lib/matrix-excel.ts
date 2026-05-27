/**
 * Matrix Excel Import/Export
 *
 * マトリクスのExcelインポート/エクスポート機能
 */

import * as XLSX from 'xlsx';
import {
  MatrixDefinition,
  MatrixAxisItem,
  MatrixCell,
  MatrixCellValue,
  MatrixExcelExportOptions,
  MatrixExcelImportResult,
  MatrixImportError,
  getCellValueLabel,
} from '@/types/matrix';

/**
 * マトリクスをExcelにエクスポート
 */
export function exportMatrixToExcel(
  matrix: MatrixDefinition,
  options: MatrixExcelExportOptions = {}
): Blob {
  const { includeMetadata = true, includeNotes = true, sheetName = 'Matrix' } = options;

  // ワークブックを作成
  const workbook = XLSX.utils.book_new();

  // メインのマトリクスシートを作成
  const matrixData: (string | number)[][] = [];

  // ヘッダー行（左上に軸名、列ヘッダー）
  const headerRow = [
    `${matrix.rowAxis.name} / ${matrix.columnAxis.name}`,
    ...matrix.columnAxis.items.map((item) => item.value),
  ];
  matrixData.push(headerRow);

  // データ行
  matrix.rowAxis.items.forEach((rowItem, rowIndex) => {
    const row = [
      rowItem.value,
      ...matrix.cells[rowIndex].map((cell) => getCellValueLabel(cell.value)),
    ];
    matrixData.push(row);
  });

  const matrixSheet = XLSX.utils.aoa_to_sheet(matrixData);

  // 列幅を設定
  const colWidths = [
    { wch: Math.max(20, matrix.rowAxis.name.length + matrix.columnAxis.name.length + 3) },
    ...matrix.columnAxis.items.map((item) => ({
      wch: Math.max(10, item.value.length + 2),
    })),
  ];
  matrixSheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, matrixSheet, sheetName);

  // メタデータシートを追加
  if (includeMetadata) {
    const metaData = [
      ['プロパティ', '値'],
      ['マトリクス名', matrix.name],
      ['説明', matrix.description || ''],
      ['行軸名', matrix.rowAxis.name],
      ['行軸タイプ', matrix.rowAxis.type],
      ['列軸名', matrix.columnAxis.name],
      ['列軸タイプ', matrix.columnAxis.type],
      ['作成日', matrix.createdAt.toISOString()],
      ['更新日', matrix.updatedAt.toISOString()],
    ];

    if (matrix.metadata) {
      if (matrix.metadata.version) metaData.push(['バージョン', matrix.metadata.version]);
      if (matrix.metadata.author) metaData.push(['作成者', matrix.metadata.author]);
      if (matrix.metadata.tags?.length) metaData.push(['タグ', matrix.metadata.tags.join(', ')]);
      if (matrix.metadata.category) metaData.push(['カテゴリ', matrix.metadata.category]);
    }

    const metaSheet = XLSX.utils.aoa_to_sheet(metaData);
    metaSheet['!cols'] = [{ wch: 15 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, metaSheet, 'Metadata');
  }

  // ノートシートを追加
  if (includeNotes) {
    const notesData: (string | number)[][] = [['行', '列', 'セル値', 'メモ']];

    matrix.cells.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell.notes) {
          notesData.push([
            matrix.rowAxis.items[rowIndex].value,
            matrix.columnAxis.items[colIndex].value,
            getCellValueLabel(cell.value),
            cell.notes,
          ]);
        }
      });
    });

    if (notesData.length > 1) {
      const notesSheet = XLSX.utils.aoa_to_sheet(notesData);
      notesSheet['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, notesSheet, 'Notes');
    }
  }

  // Blobとして出力
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * ExcelからマトリクスをImport
 */
export async function importMatrixFromExcel(file: File): Promise<MatrixExcelImportResult> {
  const errors: MatrixImportError[] = [];
  const warnings: string[] = [];

  try {
    // ファイルを読み込み
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // メインシートを取得（最初のシート）
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        errors: [{ message: 'ワークブックにシートがありません', type: 'STRUCTURE' }],
      };
    }

    const sheet = workbook.Sheets[sheetName];
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    });

    if (data.length < 2) {
      return {
        success: false,
        errors: [
          {
            message: 'マトリクスデータが不足しています（最低2行必要）',
            type: 'STRUCTURE',
          },
        ],
      };
    }

    // ヘッダー行を解析
    const headerRow = data[0];
    if (!headerRow || headerRow.length < 2) {
      return {
        success: false,
        errors: [
          {
            message: 'ヘッダー行が不正です',
            row: 1,
            type: 'STRUCTURE',
          },
        ],
      };
    }

    // 軸名を解析
    const axisNames = String(headerRow[0] || '')
      .split('/')
      .map((s) => s.trim());
    const rowAxisName = axisNames[0] || '行';
    const columnAxisName = axisNames[1] || '列';

    // 列アイテムを抽出
    const columnItems: MatrixAxisItem[] = [];
    for (let i = 1; i < headerRow.length; i++) {
      const value = headerRow[i];
      if (value !== null && value !== undefined && String(value).trim()) {
        columnItems.push({
          id: `col_${Date.now()}_${i - 1}`,
          value: String(value).trim(),
          sortOrder: i - 1,
        });
      }
    }

    if (columnItems.length === 0) {
      return {
        success: false,
        errors: [
          {
            message: '列ヘッダーがありません',
            row: 1,
            type: 'STRUCTURE',
          },
        ],
      };
    }

    // データ行を解析
    const rowItems: MatrixAxisItem[] = [];
    const cells: MatrixCell[][] = [];

    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || row.length === 0) continue;

      const rowHeader = row[0];
      if (rowHeader === null || rowHeader === undefined || !String(rowHeader).trim()) {
        warnings.push(`${rowIndex + 1}行目: 行ヘッダーが空のためスキップしました`);
        continue;
      }

      rowItems.push({
        id: `row_${Date.now()}_${rowItems.length}`,
        value: String(rowHeader).trim(),
        sortOrder: rowItems.length,
      });

      const rowCells: MatrixCell[] = [];
      for (let colIndex = 0; colIndex < columnItems.length; colIndex++) {
        const cellValue = row[colIndex + 1];
        const parsedValue = parseCellValue(cellValue);

        if (parsedValue === null && cellValue !== null && cellValue !== undefined) {
          warnings.push(
            `${rowIndex + 1}行${colIndex + 2}列: 不明な値「${cellValue}」を空として扱いました`
          );
        }

        rowCells.push({
          rowIndex: rowItems.length - 1,
          columnIndex: colIndex,
          value: parsedValue || 'EMPTY',
        });
      }

      cells.push(rowCells);
    }

    if (rowItems.length === 0) {
      return {
        success: false,
        errors: [
          {
            message: 'データ行がありません',
            type: 'STRUCTURE',
          },
        ],
      };
    }

    // メタデータシートを読み込み（存在する場合）
    let name = file.name.replace(/\.(xlsx?|csv)$/i, '');
    let description: string | undefined;

    if (workbook.SheetNames.includes('Metadata')) {
      const metaSheet = workbook.Sheets['Metadata'];
      const metaData: (string | number | null)[][] = XLSX.utils.sheet_to_json(metaSheet, {
        header: 1,
        defval: null,
      });

      for (const row of metaData) {
        if (!row || row.length < 2) continue;
        const key = String(row[0] || '').trim();
        const value = String(row[1] || '').trim();

        if (key === 'マトリクス名' && value) name = value;
        if (key === '説明' && value) description = value;
      }
    }

    // マトリクス定義を作成
    const matrix: MatrixDefinition = {
      id: `matrix_${Date.now()}`,
      name,
      description,
      rowAxis: {
        id: `axis_row_${Date.now()}`,
        name: rowAxisName,
        items: rowItems,
        type: 'TEXT',
      },
      columnAxis: {
        id: `axis_col_${Date.now()}`,
        name: columnAxisName,
        items: columnItems,
        type: 'TEXT',
      },
      cells,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      matrix,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          message: `ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
          type: 'STRUCTURE',
        },
      ],
    };
  }
}

/**
 * セル値を解析
 */
function parseCellValue(value: unknown): MatrixCellValue | null {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'EMPTY';
  }

  const normalized = String(value).trim().toUpperCase();

  // 直接マッチ
  const directMap: Record<string, MatrixCellValue> = {
    EMPTY: 'EMPTY',
    YES: 'YES',
    NO: 'NO',
    NA: 'NA',
    'N/A': 'NA',
    PASS: 'PASS',
    FAIL: 'FAIL',
    PENDING: 'PENDING',
  };

  if (normalized in directMap) {
    return directMap[normalized];
  }

  // 日本語マッチ
  const japaneseMap: Record<string, MatrixCellValue> = {
    空: 'EMPTY',
    はい: 'YES',
    いいえ: 'NO',
    該当なし: 'NA',
    合格: 'PASS',
    不合格: 'FAIL',
    保留: 'PENDING',
    '○': 'YES',
    '×': 'NO',
    '-': 'NA',
    '−': 'NA',
  };

  const lowercaseValue = String(value).trim().toLowerCase();
  if (lowercaseValue in japaneseMap) {
    return japaneseMap[lowercaseValue];
  }

  return null;
}

/**
 * マトリクスをCSVにエクスポート
 */
export function exportMatrixToCsv(matrix: MatrixDefinition): string {
  const rows: string[][] = [];

  // ヘッダー行
  rows.push([
    `${matrix.rowAxis.name} / ${matrix.columnAxis.name}`,
    ...matrix.columnAxis.items.map((item) => item.value),
  ]);

  // データ行
  matrix.rowAxis.items.forEach((rowItem, rowIndex) => {
    rows.push([
      rowItem.value,
      ...matrix.cells[rowIndex].map((cell) => getCellValueLabel(cell.value)),
    ]);
  });

  // CSV文字列に変換（カンマと改行をエスケープ）
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * CSVからマトリクスをImport
 */
export function importMatrixFromCsv(csvText: string, name: string): MatrixExcelImportResult {
  const warnings: string[] = [];

  try {
    // CSVを解析
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let inQuotes = false;
    let currentCell = '';

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentCell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentCell);
          currentCell = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          currentRow.push(currentCell);
          rows.push(currentRow);
          currentRow = [];
          currentCell = '';
          if (char === '\r') i++;
        } else if (char !== '\r') {
          currentCell += char;
        }
      }
    }

    // 最後のセルと行を追加
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell);
      rows.push(currentRow);
    }

    if (rows.length < 2) {
      return {
        success: false,
        errors: [{ message: 'データが不足しています', type: 'STRUCTURE' }],
      };
    }

    // ヘッダー行を解析
    const headerRow = rows[0];
    const axisNames = headerRow[0].split('/').map((s) => s.trim());
    const rowAxisName = axisNames[0] || '行';
    const columnAxisName = axisNames[1] || '列';

    // 列アイテム
    const columnItems: MatrixAxisItem[] = headerRow.slice(1).map((value, i) => ({
      id: `col_${Date.now()}_${i}`,
      value: value.trim() || `列${i + 1}`,
      sortOrder: i,
    }));

    // データ行
    const rowItems: MatrixAxisItem[] = [];
    const cells: MatrixCell[][] = [];

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!row[0]?.trim()) continue;

      rowItems.push({
        id: `row_${Date.now()}_${rowItems.length}`,
        value: row[0].trim(),
        sortOrder: rowItems.length,
      });

      const rowCells: MatrixCell[] = columnItems.map((_, colIndex) => {
        const cellValue = row[colIndex + 1];
        const parsedValue = parseCellValue(cellValue);
        if (parsedValue === null && cellValue) {
          warnings.push(
            `${rowIndex + 1}行${colIndex + 2}列: 不明な値「${cellValue}」を空として扱いました`
          );
        }
        return {
          rowIndex: rowItems.length - 1,
          columnIndex: colIndex,
          value: parsedValue || 'EMPTY',
        };
      });

      cells.push(rowCells);
    }

    const matrix: MatrixDefinition = {
      id: `matrix_${Date.now()}`,
      name,
      rowAxis: {
        id: `axis_row_${Date.now()}`,
        name: rowAxisName,
        items: rowItems,
        type: 'TEXT',
      },
      columnAxis: {
        id: `axis_col_${Date.now()}`,
        name: columnAxisName,
        items: columnItems,
        type: 'TEXT',
      },
      cells,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      matrix,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          message: `CSVの解析に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
          type: 'STRUCTURE',
        },
      ],
    };
  }
}

/**
 * ダウンロード用ファイルを生成
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
