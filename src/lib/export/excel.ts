/**
 * Excel エクスポートユーティリティ
 */

import * as XLSX from 'xlsx';
import type { CsvColumn } from './csv';
import { formatDateLocal, formatMultilineText } from './csv';

// ============================================
// Types
// ============================================

export interface ExcelColumn<T> extends CsvColumn<T> {
  width?: number;
}

export interface ExcelExportOptions {
  sheetName?: string;
  filename?: string;
  headerStyle?: ExcelCellStyle;
  dataStyle?: ExcelCellStyle;
  columnWidths?: number[];
  freezeHeader?: boolean;
  autoFilter?: boolean;
}

export interface ExcelCellStyle {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fill?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom';
  wrapText?: boolean;
}

export interface ExcelWorkbookOptions {
  creator?: string;
  title?: string;
  subject?: string;
}

// ============================================
// Constants
// ============================================

const DEFAULT_COLUMN_WIDTH = 15;
const DEFAULT_SHEET_NAME = 'Sheet1';

// ============================================
// Excel Generation Functions
// ============================================

/**
 * データ配列からExcelワークブックを生成
 */
export function generateExcelWorkbook<T>(
  data: T[],
  columns: ExcelColumn<T>[],
  options: ExcelExportOptions = {}
): XLSX.WorkBook {
  const {
    sheetName = DEFAULT_SHEET_NAME,
    freezeHeader = true,
    autoFilter = true,
    columnWidths,
  } = options;

  // ヘッダー行
  const headers = columns.map((col) => col.header);

  // データ行
  const rows = data.map((row) => columns.map((col) => col.getValue(row) ?? ''));

  // ワークシートを作成
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 列幅を設定
  ws['!cols'] = columns.map((col, index) => ({
    wch: columnWidths?.[index] ?? col.width ?? DEFAULT_COLUMN_WIDTH,
  }));

  // ヘッダー固定
  if (freezeHeader) {
    ws['!freeze'] = { xSplit: 0, ySplit: 1, state: 'frozen' };
  }

  // オートフィルター設定
  if (autoFilter && data.length > 0) {
    const lastCol = XLSX.utils.encode_col(columns.length - 1);
    const lastRow = data.length + 1;
    ws['!autofilter'] = { ref: `A1:${lastCol}${lastRow}` };
  }

  // ワークブックを作成
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  return wb;
}

/**
 * 複数シートを持つExcelワークブックを生成
 */
export function generateExcelWorkbookWithSheets(
  sheets: Array<{
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: ExcelColumn<any>[];
    options?: ExcelExportOptions;
  }>
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const { name, data, columns, options = {} } = sheet;

    // ヘッダー行
    const headers = columns.map((col) => col.header);

    // データ行
    const rows = data.map((row) => columns.map((col) => col.getValue(row) ?? ''));

    // ワークシートを作成
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 列幅を設定
    ws['!cols'] = columns.map((col, index) => ({
      wch: options.columnWidths?.[index] ?? col.width ?? DEFAULT_COLUMN_WIDTH,
    }));

    // ヘッダー固定
    if (options.freezeHeader !== false) {
      ws['!freeze'] = { xSplit: 0, ySplit: 1, state: 'frozen' };
    }

    // オートフィルター設定
    if (options.autoFilter !== false && data.length > 0) {
      const lastCol = XLSX.utils.encode_col(columns.length - 1);
      const lastRow = data.length + 1;
      ws['!autofilter'] = { ref: `A1:${lastCol}${lastRow}` };
    }

    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  return wb;
}

/**
 * ワークブックをバッファに変換
 */
export function workbookToBuffer(wb: XLSX.WorkBook): Buffer {
  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return xlsxBuffer;
}

/**
 * ワークブックをUint8Arrayに変換
 */
export function workbookToUint8Array(wb: XLSX.WorkBook): Uint8Array {
  const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(xlsxBuffer);
}

/**
 * Excelダウンロード用のレスポンスを生成
 */
export function createExcelResponse(wb: XLSX.WorkBook, filename: string): Response {
  const buffer = workbookToBuffer(wb);

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'no-cache',
    },
  });
}

// ============================================
// Helper Functions
// ============================================

/**
 * ExcelのA1形式のセル参照を生成
 */
export function cellRef(row: number, col: number): string {
  return XLSX.utils.encode_cell({ r: row, c: col });
}

/**
 * Excelの列文字を取得（0=A, 1=B, ...）
 */
export function colName(col: number): string {
  return XLSX.utils.encode_col(col);
}

/**
 * 日付をExcelのシリアル値に変換
 */
export function dateToExcelSerial(date: Date): number {
  // Excel epoch: December 30, 1899
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const diffMs = date.getTime() - excelEpoch.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays;
}

// ============================================
// Test Case Specific Functions
// ============================================

import type { TestCaseExportData } from './test-case-export';
import {
  ALL_COLUMNS,
  DEFAULT_COLUMNS,
  PRIORITY_LABELS,
  TEST_TYPE_LABELS,
  TEST_TECHNIQUE_LABELS,
} from './test-case-export';

/**
 * テストケース用Excelカラム定義
 */
export function getExcelColumnsForTestCases(
  columnKeys: string[],
  includeSteps: boolean,
  maxSteps: number
): ExcelColumn<TestCaseExportData>[] {
  // ベースカラムを取得
  const baseColumns: ExcelColumn<TestCaseExportData>[] = columnKeys
    .map((key) => {
      const col = ALL_COLUMNS.find((c) => c.key === key);
      if (!col) return null;

      // 幅を設定
      const widths: Record<string, number> = {
        id: 10,
        testCaseNumber: 15,
        referenceId: 15,
        title: 40,
        description: 50,
        precondition: 40,
        expectedResult: 40,
        checkpoint: 30,
        scenario: 30,
        testEnvironment: 30,
        notes: 30,
        priority: 10,
        testType: 15,
        testTechnique: 15,
        classification: 15,
        estimatedTime: 12,
        tags: 25,
        sectionName: 25,
        sectionPath: 35,
        createdAt: 20,
        updatedAt: 20,
      };

      return {
        ...col,
        width: widths[key] ?? DEFAULT_COLUMN_WIDTH,
      } as ExcelColumn<TestCaseExportData>;
    })
    .filter((col): col is ExcelColumn<TestCaseExportData> => col !== null);

  // テスト手順カラムを追加
  if (includeSteps && maxSteps > 0) {
    for (let i = 1; i <= maxSteps; i++) {
      baseColumns.push({
        key: `step${i}_action`,
        header: `手順${i}_操作`,
        getValue: (row) => {
          const step = row.steps?.find((s) => s.stepNo === i);
          return step ? formatMultilineText(step.action) : '';
        },
        width: 40,
      });
      baseColumns.push({
        key: `step${i}_expected`,
        header: `手順${i}_期待結果`,
        getValue: (row) => {
          const step = row.steps?.find((s) => s.stepNo === i);
          return step ? formatMultilineText(step.expected) : '';
        },
        width: 40,
      });
    }
  }

  return baseColumns;
}

/**
 * テストケースデータをExcel用に変換
 */
export function prepareTestCasesForExcel(testCases: TestCaseExportData[]): TestCaseExportData[] {
  return testCases.map((tc) => ({
    ...tc,
    // ラベルに変換
    priority: PRIORITY_LABELS[tc.priority] || tc.priority,
    testType: tc.testType ? TEST_TYPE_LABELS[tc.testType] || tc.testType : null,
    testTechnique: tc.testTechnique
      ? TEST_TECHNIQUE_LABELS[tc.testTechnique] || tc.testTechnique
      : null,
    // 配列を文字列に
    tags: tc.tags,
  }));
}

/**
 * テスト仕様書用のExcelを生成（複数シート対応）
 */
export function generateTestSpecExcel(
  testSpecName: string,
  testCases: TestCaseExportData[],
  options: {
    columnKeys?: string[];
    includeSteps?: boolean;
    includeSummary?: boolean;
  } = {}
): XLSX.WorkBook {
  const { columnKeys = DEFAULT_COLUMNS, includeSteps = true, includeSummary = true } = options;

  const sheets: Array<{
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    columns: ExcelColumn<any>[];
    options?: ExcelExportOptions;
  }> = [];

  // サマリーシートを追加
  if (includeSummary) {
    const summary = generateTestSpecSummary(testSpecName, testCases);
    sheets.push({
      name: 'サマリー',
      data: summary.data,
      columns: summary.columns,
      options: { autoFilter: false, freezeHeader: false },
    });
  }

  // テストケースシートを追加
  const maxSteps = testCases.reduce((max, tc) => Math.max(max, tc.steps?.length || 0), 0);
  const columns = getExcelColumnsForTestCases(columnKeys, includeSteps, maxSteps);

  sheets.push({
    name: 'テストケース',
    data: testCases,
    columns,
    options: { freezeHeader: true, autoFilter: true },
  });

  return generateExcelWorkbookWithSheets(sheets);
}

/**
 * テスト仕様書サマリーを生成
 */
function generateTestSpecSummary(
  testSpecName: string,
  testCases: TestCaseExportData[]
): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ExcelColumn<any>[];
} {
  // 優先度別カウント
  const priorityCounts: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  // テストタイプ別カウント
  const testTypeCounts: Record<string, number> = {};

  for (const tc of testCases) {
    priorityCounts[tc.priority] = (priorityCounts[tc.priority] || 0) + 1;
    if (tc.testType) {
      testTypeCounts[tc.testType] = (testTypeCounts[tc.testType] || 0) + 1;
    }
  }

  // サマリーデータを構築
  const summaryData = [
    { label: 'テスト仕様書名', value: testSpecName },
    { label: '総テストケース数', value: testCases.length },
    { label: '', value: '' },
    { label: '【優先度別】', value: '' },
    { label: '最重要 (CRITICAL)', value: priorityCounts.CRITICAL },
    { label: '高 (HIGH)', value: priorityCounts.HIGH },
    { label: '中 (MEDIUM)', value: priorityCounts.MEDIUM },
    { label: '低 (LOW)', value: priorityCounts.LOW },
    { label: '', value: '' },
    { label: '【テストタイプ別】', value: '' },
    ...Object.entries(testTypeCounts).map(([type, count]) => ({
      label: TEST_TYPE_LABELS[type] || type,
      value: count,
    })),
    { label: '', value: '' },
    { label: 'エクスポート日時', value: formatDateLocal(new Date()) },
  ];

  const columns: ExcelColumn<{ label: string; value: string | number }>[] = [
    { key: 'label', header: '項目', getValue: (row) => row.label, width: 25 },
    { key: 'value', header: '値', getValue: (row) => row.value, width: 40 },
  ];

  return { data: summaryData, columns };
}
