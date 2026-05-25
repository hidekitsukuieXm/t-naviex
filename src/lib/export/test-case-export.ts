/**
 * テストケース CSV エクスポート
 */

import type { CsvColumn } from './csv';
import { formatDateLocal, formatArray, formatMultilineText } from './csv';

// ============================================
// Types
// ============================================

export interface TestCaseExportData {
  id: string;
  testCaseNumber?: string;
  referenceId: string | null;
  title: string;
  description: string | null;
  precondition: string | null;
  expectedResult: string | null;
  checkpoint: string | null;
  scenario: string | null;
  testEnvironment: string | null;
  notes: string | null;
  priority: string;
  testType: string | null;
  testTechnique: string | null;
  classification: string | null;
  estimatedTime: number | null;
  tags: string[];
  sectionName: string | null;
  sectionPath: string | null;
  createdAt: string;
  updatedAt: string;
  steps?: TestStepExportData[];
}

export interface TestStepExportData {
  stepNo: number;
  action: string;
  expected: string | null;
}

export interface TestCaseExportOptions {
  includeSteps?: boolean;
  includeMetadata?: boolean;
  columns?: string[];
}

// ============================================
// Labels
// ============================================

export const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: '最重要',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

export const TEST_TYPE_LABELS: Record<string, string> = {
  FUNCTIONAL: '機能テスト',
  PERFORMANCE: '性能テスト',
  SECURITY: 'セキュリティテスト',
  USABILITY: 'ユーザビリティテスト',
  INTEGRATION: '結合テスト',
  UNIT: '単体テスト',
  REGRESSION: '回帰テスト',
};

export const TEST_TECHNIQUE_LABELS: Record<string, string> = {
  EQUIVALENCE: '同値分割',
  BOUNDARY: '境界値分析',
  DECISION_TABLE: 'デシジョンテーブル',
  STATE_TRANSITION: '状態遷移',
  ERROR_GUESSING: 'エラー推測',
  EXPLORATORY: '探索的テスト',
  PAIR_WISE: 'ペアワイズテスト',
};

// ============================================
// Column Definitions
// ============================================

// 全カラム定義
export const ALL_COLUMNS: CsvColumn<TestCaseExportData>[] = [
  {
    key: 'id',
    header: 'ID',
    getValue: (row) => row.id,
  },
  {
    key: 'testCaseNumber',
    header: 'テストケース番号',
    getValue: (row) => row.testCaseNumber || '',
  },
  {
    key: 'referenceId',
    header: '参照ID',
    getValue: (row) => row.referenceId,
  },
  {
    key: 'title',
    header: 'タイトル',
    getValue: (row) => row.title,
  },
  {
    key: 'description',
    header: '説明',
    getValue: (row) => formatMultilineText(row.description),
  },
  {
    key: 'precondition',
    header: '事前条件',
    getValue: (row) => formatMultilineText(row.precondition),
  },
  {
    key: 'expectedResult',
    header: '期待結果',
    getValue: (row) => formatMultilineText(row.expectedResult),
  },
  {
    key: 'checkpoint',
    header: 'チェックポイント',
    getValue: (row) => formatMultilineText(row.checkpoint),
  },
  {
    key: 'scenario',
    header: 'シナリオ',
    getValue: (row) => formatMultilineText(row.scenario),
  },
  {
    key: 'testEnvironment',
    header: 'テスト環境',
    getValue: (row) => formatMultilineText(row.testEnvironment),
  },
  {
    key: 'notes',
    header: '特記事項',
    getValue: (row) => formatMultilineText(row.notes),
  },
  {
    key: 'priority',
    header: '優先度',
    getValue: (row) => PRIORITY_LABELS[row.priority] || row.priority,
  },
  {
    key: 'testType',
    header: 'テストタイプ',
    getValue: (row) => (row.testType ? TEST_TYPE_LABELS[row.testType] || row.testType : ''),
  },
  {
    key: 'testTechnique',
    header: 'テスト技法',
    getValue: (row) =>
      row.testTechnique ? TEST_TECHNIQUE_LABELS[row.testTechnique] || row.testTechnique : '',
  },
  {
    key: 'classification',
    header: '分類',
    getValue: (row) => row.classification,
  },
  {
    key: 'estimatedTime',
    header: '見積時間(分)',
    getValue: (row) => row.estimatedTime,
  },
  {
    key: 'tags',
    header: 'タグ',
    getValue: (row) => formatArray(row.tags),
  },
  {
    key: 'sectionName',
    header: 'セクション名',
    getValue: (row) => row.sectionName,
  },
  {
    key: 'sectionPath',
    header: 'セクションパス',
    getValue: (row) => row.sectionPath,
  },
  {
    key: 'createdAt',
    header: '作成日時',
    getValue: (row) => formatDateLocal(row.createdAt),
  },
  {
    key: 'updatedAt',
    header: '更新日時',
    getValue: (row) => formatDateLocal(row.updatedAt),
  },
];

// デフォルトカラム（基本フィールドのみ）
export const DEFAULT_COLUMNS = [
  'id',
  'testCaseNumber',
  'title',
  'description',
  'precondition',
  'expectedResult',
  'priority',
  'testType',
  'testTechnique',
  'sectionName',
  'tags',
];

// 拡張カラム（全フィールド）
export const EXTENDED_COLUMNS = ALL_COLUMNS.map((col) => col.key);

// ============================================
// Functions
// ============================================

/**
 * カラムキーからカラム定義を取得
 */
export function getColumnsByKeys(keys: string[]): CsvColumn<TestCaseExportData>[] {
  return keys
    .map((key) => ALL_COLUMNS.find((col) => col.key === key))
    .filter((col): col is CsvColumn<TestCaseExportData> => col !== undefined);
}

/**
 * テストステップを含めたエクスポートデータ用のカラムを生成
 */
export function getColumnsWithSteps(
  baseColumns: CsvColumn<TestCaseExportData>[],
  maxSteps: number
): CsvColumn<TestCaseExportData>[] {
  const stepColumns: CsvColumn<TestCaseExportData>[] = [];

  for (let i = 1; i <= maxSteps; i++) {
    stepColumns.push({
      key: `step${i}_action`,
      header: `手順${i}_操作`,
      getValue: (row) => {
        const step = row.steps?.find((s) => s.stepNo === i);
        return step ? formatMultilineText(step.action) : '';
      },
    });
    stepColumns.push({
      key: `step${i}_expected`,
      header: `手順${i}_期待結果`,
      getValue: (row) => {
        const step = row.steps?.find((s) => s.stepNo === i);
        return step ? formatMultilineText(step.expected) : '';
      },
    });
  }

  return [...baseColumns, ...stepColumns];
}

/**
 * データから最大ステップ数を取得
 */
export function getMaxStepCount(data: TestCaseExportData[]): number {
  return data.reduce((max, item) => {
    const stepCount = item.steps?.length || 0;
    return Math.max(max, stepCount);
  }, 0);
}

/**
 * セクションパスを構築（階層を「>」で連結）
 */
export function buildSectionPath(
  sectionId: string | null,
  sectionsMap: Map<string, { name: string; parentId: string | null }>
): string {
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
