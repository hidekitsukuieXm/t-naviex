/**
 * Matrix Test Case Types
 *
 * マトリクス形式テストケースの型定義
 */

// ========================================
// マトリクス構造型
// ========================================

/**
 * マトリクス定義
 */
export interface MatrixDefinition {
  id: string;
  name: string;
  description?: string;
  rowAxis: MatrixAxis;
  columnAxis: MatrixAxis;
  cells: MatrixCell[][];
  metadata?: MatrixMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * マトリクス軸
 */
export interface MatrixAxis {
  id: string;
  name: string;
  description?: string;
  items: MatrixAxisItem[];
  type: MatrixAxisType;
}

/**
 * 軸タイプ
 */
export const MatrixAxisType = {
  TEXT: 'TEXT', // テキスト軸
  CONDITION: 'CONDITION', // 条件軸
  INPUT: 'INPUT', // 入力値軸
  STATE: 'STATE', // 状態軸
  ENVIRONMENT: 'ENVIRONMENT', // 環境軸
  USER_TYPE: 'USER_TYPE', // ユーザータイプ軸
  FEATURE: 'FEATURE', // 機能軸
  CUSTOM: 'CUSTOM', // カスタム軸
} as const;

export type MatrixAxisType = (typeof MatrixAxisType)[keyof typeof MatrixAxisType];

/**
 * 軸アイテム
 */
export interface MatrixAxisItem {
  id: string;
  value: string;
  description?: string;
  color?: string;
  sortOrder: number;
}

/**
 * マトリクスセル
 */
export interface MatrixCell {
  rowIndex: number;
  columnIndex: number;
  value: MatrixCellValue;
  testCaseIds?: number[]; // 展開されたテストケースID
  notes?: string;
  status?: MatrixCellStatus;
}

/**
 * セル値タイプ
 */
export const MatrixCellValue = {
  EMPTY: 'EMPTY', // 空（テスト不要）
  YES: 'YES', // テスト必要
  NO: 'NO', // テスト不要
  NA: 'NA', // 該当なし
  PASS: 'PASS', // 合格
  FAIL: 'FAIL', // 不合格
  PENDING: 'PENDING', // 保留
  CUSTOM: 'CUSTOM', // カスタム値
} as const;

export type MatrixCellValue = (typeof MatrixCellValue)[keyof typeof MatrixCellValue];

/**
 * セルステータス
 */
export const MatrixCellStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  SKIPPED: 'SKIPPED',
} as const;

export type MatrixCellStatus = (typeof MatrixCellStatus)[keyof typeof MatrixCellStatus];

/**
 * マトリクスメタデータ
 */
export interface MatrixMetadata {
  version?: string;
  author?: string;
  lastEditedBy?: string;
  tags?: string[];
  category?: string;
  priority?: string;
  linkedRequirements?: string[];
}

// ========================================
// マトリクステンプレート
// ========================================

/**
 * マトリクステンプレート
 */
export interface MatrixTemplate {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  rowAxis: MatrixAxis;
  columnAxis: MatrixAxis;
  defaultCellValue: MatrixCellValue;
  isDefault: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * テンプレート作成リクエスト
 */
export interface CreateMatrixTemplateRequest {
  name: string;
  description?: string;
  rowAxis: Omit<MatrixAxis, 'id'>;
  columnAxis: Omit<MatrixAxis, 'id'>;
  defaultCellValue?: MatrixCellValue;
  isDefault?: boolean;
}

/**
 * テンプレート更新リクエスト
 */
export interface UpdateMatrixTemplateRequest {
  name?: string;
  description?: string;
  rowAxis?: Omit<MatrixAxis, 'id'>;
  columnAxis?: Omit<MatrixAxis, 'id'>;
  defaultCellValue?: MatrixCellValue;
  isDefault?: boolean;
}

// ========================================
// マトリクステストケース
// ========================================

/**
 * マトリクステストケース（テストケースの拡張）
 */
export interface MatrixTestCase {
  testCaseId: number;
  matrixData: MatrixDefinition;
  expandedCases: ExpandedTestCase[];
  isExpanded: boolean;
  expansionStrategy: MatrixExpansionStrategy;
}

/**
 * 展開されたテストケース
 */
export interface ExpandedTestCase {
  id: string;
  rowItem: MatrixAxisItem;
  columnItem: MatrixAxisItem;
  cell: MatrixCell;
  generatedTitle: string;
  generatedSteps?: string[];
  testCaseId?: number; // 実際に作成されたテストケースID
}

/**
 * 展開戦略
 */
export const MatrixExpansionStrategy = {
  ALL_COMBINATIONS: 'ALL_COMBINATIONS', // すべての組み合わせ
  YES_CELLS_ONLY: 'YES_CELLS_ONLY', // YESセルのみ
  NON_EMPTY_CELLS: 'NON_EMPTY_CELLS', // 空でないセルすべて
  MANUAL_SELECTION: 'MANUAL_SELECTION', // 手動選択
} as const;

export type MatrixExpansionStrategy =
  (typeof MatrixExpansionStrategy)[keyof typeof MatrixExpansionStrategy];

// ========================================
// API関連の型
// ========================================

/**
 * マトリクス作成リクエスト
 */
export interface CreateMatrixRequest {
  testCaseId: number;
  name: string;
  description?: string;
  rowAxis: Omit<MatrixAxis, 'id'>;
  columnAxis: Omit<MatrixAxis, 'id'>;
  defaultCellValue?: MatrixCellValue;
}

/**
 * マトリクス更新リクエスト
 */
export interface UpdateMatrixRequest {
  name?: string;
  description?: string;
  rowAxis?: MatrixAxis;
  columnAxis?: MatrixAxis;
  cells?: MatrixCell[][];
  metadata?: MatrixMetadata;
}

/**
 * セル更新リクエスト
 */
export interface UpdateMatrixCellRequest {
  rowIndex: number;
  columnIndex: number;
  value?: MatrixCellValue;
  notes?: string;
  status?: MatrixCellStatus;
}

/**
 * テストケース展開リクエスト
 */
export interface ExpandMatrixRequest {
  strategy: MatrixExpansionStrategy;
  selectedCells?: { rowIndex: number; columnIndex: number }[];
  titleTemplate?: string;
  includeSteps?: boolean;
}

/**
 * テストケース展開結果
 */
export interface ExpandMatrixResult {
  expandedCases: ExpandedTestCase[];
  totalCount: number;
  createdTestCaseIds?: number[];
}

// ========================================
// Excel インポート/エクスポート
// ========================================

/**
 * Excelエクスポートオプション
 */
export interface MatrixExcelExportOptions {
  includeMetadata?: boolean;
  includeNotes?: boolean;
  includeStatus?: boolean;
  sheetName?: string;
}

/**
 * Excelインポート結果
 */
export interface MatrixExcelImportResult {
  success: boolean;
  matrix?: MatrixDefinition;
  errors?: MatrixImportError[];
  warnings?: string[];
}

/**
 * インポートエラー
 */
export interface MatrixImportError {
  row?: number;
  column?: number;
  message: string;
  type: 'STRUCTURE' | 'DATA' | 'VALIDATION';
}

// ========================================
// ユーティリティ型
// ========================================

/**
 * マトリクス統計
 */
export interface MatrixStats {
  totalCells: number;
  yesCells: number;
  noCells: number;
  naCells: number;
  emptyCells: number;
  expandedTestCases: number;
  completedCells: number;
  passedCells: number;
  failedCells: number;
}

/**
 * マトリクスフィルター
 */
export interface MatrixFilter {
  cellValues?: MatrixCellValue[];
  cellStatuses?: MatrixCellStatus[];
  hasTestCase?: boolean;
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * セル値のラベルを取得
 */
export function getCellValueLabel(value: MatrixCellValue): string {
  const labels: Record<MatrixCellValue, string> = {
    EMPTY: '空',
    YES: 'はい',
    NO: 'いいえ',
    NA: '該当なし',
    PASS: '合格',
    FAIL: '不合格',
    PENDING: '保留',
    CUSTOM: 'カスタム',
  };
  return labels[value] || value;
}

/**
 * セル値の色を取得
 */
export function getCellValueColor(value: MatrixCellValue): string {
  const colors: Record<MatrixCellValue, string> = {
    EMPTY: '#e5e7eb', // gray-200
    YES: '#22c55e', // green-500
    NO: '#ef4444', // red-500
    NA: '#9ca3af', // gray-400
    PASS: '#22c55e', // green-500
    FAIL: '#ef4444', // red-500
    PENDING: '#f59e0b', // amber-500
    CUSTOM: '#3b82f6', // blue-500
  };
  return colors[value] || '#e5e7eb';
}

/**
 * セルステータスのラベルを取得
 */
export function getCellStatusLabel(status: MatrixCellStatus): string {
  const labels: Record<MatrixCellStatus, string> = {
    NOT_STARTED: '未着手',
    IN_PROGRESS: '進行中',
    COMPLETED: '完了',
    SKIPPED: 'スキップ',
  };
  return labels[status] || status;
}

/**
 * 軸タイプのラベルを取得
 */
export function getAxisTypeLabel(type: MatrixAxisType): string {
  const labels: Record<MatrixAxisType, string> = {
    TEXT: 'テキスト',
    CONDITION: '条件',
    INPUT: '入力値',
    STATE: '状態',
    ENVIRONMENT: '環境',
    USER_TYPE: 'ユーザータイプ',
    FEATURE: '機能',
    CUSTOM: 'カスタム',
  };
  return labels[type] || type;
}

/**
 * 展開戦略のラベルを取得
 */
export function getExpansionStrategyLabel(strategy: MatrixExpansionStrategy): string {
  const labels: Record<MatrixExpansionStrategy, string> = {
    ALL_COMBINATIONS: 'すべての組み合わせ',
    YES_CELLS_ONLY: 'YESセルのみ',
    NON_EMPTY_CELLS: '空でないセルすべて',
    MANUAL_SELECTION: '手動選択',
  };
  return labels[strategy] || strategy;
}

/**
 * ユニークなIDを生成
 */
function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 空のマトリクスを生成
 */
export function createEmptyMatrix(
  name: string,
  rowCount: number = 3,
  columnCount: number = 3
): MatrixDefinition {
  const matrixId = generateUniqueId('matrix');

  const rowItems: MatrixAxisItem[] = Array.from({ length: rowCount }, (_, i) => ({
    id: generateUniqueId('row'),
    value: `行 ${i + 1}`,
    sortOrder: i,
  }));

  const columnItems: MatrixAxisItem[] = Array.from({ length: columnCount }, (_, i) => ({
    id: generateUniqueId('col'),
    value: `列 ${i + 1}`,
    sortOrder: i,
  }));

  const cells: MatrixCell[][] = rowItems.map((_, rowIndex) =>
    columnItems.map((_, colIndex) => ({
      rowIndex,
      columnIndex: colIndex,
      value: 'EMPTY' as MatrixCellValue,
    }))
  );

  return {
    id: matrixId,
    name,
    rowAxis: {
      id: generateUniqueId('axis_row'),
      name: '行',
      items: rowItems,
      type: 'TEXT',
    },
    columnAxis: {
      id: generateUniqueId('axis_col'),
      name: '列',
      items: columnItems,
      type: 'TEXT',
    },
    cells,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * マトリクス統計を計算
 */
export function calculateMatrixStats(matrix: MatrixDefinition): MatrixStats {
  let totalCells = 0;
  let yesCells = 0;
  let noCells = 0;
  let naCells = 0;
  let emptyCells = 0;
  let expandedTestCases = 0;
  let completedCells = 0;
  let passedCells = 0;
  let failedCells = 0;

  for (const row of matrix.cells) {
    for (const cell of row) {
      totalCells++;

      switch (cell.value) {
        case 'YES':
          yesCells++;
          break;
        case 'NO':
          noCells++;
          break;
        case 'NA':
          naCells++;
          break;
        case 'EMPTY':
          emptyCells++;
          break;
        case 'PASS':
          passedCells++;
          break;
        case 'FAIL':
          failedCells++;
          break;
      }

      if (cell.testCaseIds?.length) {
        expandedTestCases += cell.testCaseIds.length;
      }

      if (cell.status === 'COMPLETED') {
        completedCells++;
      }
    }
  }

  return {
    totalCells,
    yesCells,
    noCells,
    naCells,
    emptyCells,
    expandedTestCases,
    completedCells,
    passedCells,
    failedCells,
  };
}

/**
 * テストケースタイトルを生成
 */
export function generateTestCaseTitle(
  template: string,
  rowItem: MatrixAxisItem,
  columnItem: MatrixAxisItem,
  matrixName?: string
): string {
  return template
    .replace('{row}', rowItem.value)
    .replace('{column}', columnItem.value)
    .replace('{matrix}', matrixName || 'マトリクス');
}

/**
 * デフォルトのタイトルテンプレート
 */
export const DEFAULT_TITLE_TEMPLATE = '{row} × {column}';

/**
 * マトリクスをCSV文字列に変換
 */
export function matrixToCsv(matrix: MatrixDefinition): string {
  const headers = ['', ...matrix.columnAxis.items.map((item) => item.value)];
  const rows = matrix.rowAxis.items.map((rowItem, rowIndex) => {
    const values = matrix.cells[rowIndex].map((cell) => getCellValueLabel(cell.value));
    return [rowItem.value, ...values];
  });

  return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}
