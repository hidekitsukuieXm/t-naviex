/**
 * テストケース CSV インポート
 */

import type { CsvRow, CsvParseResult } from './csv-parser';
import { csvToObjects } from './csv-parser';
import type { TestCasePriority, TestType, TestTechnique } from '@/types/test-case';

// ============================================
// Types
// ============================================

export interface TestCaseImportData {
  title: string;
  description?: string;
  preconditions?: string;
  expectedResult?: string;
  checkpoint?: string;
  scenario?: string;
  testEnvironment?: string;
  notes?: string;
  priority?: TestCasePriority;
  testType?: TestType;
  testTechnique?: TestTechnique;
  classification?: string;
  referenceId?: string;
  estimatedTime?: number;
  tags?: string[];
  sectionName?: string;
  steps?: TestStepImportData[];
}

export interface TestStepImportData {
  stepNo: number;
  action: string;
  expected?: string;
}

export interface FieldMapping {
  csvHeader: string;
  targetField: string;
  transform?: (value: string) => unknown;
}

export interface ImportValidationResult {
  valid: boolean;
  row: number;
  errors: ImportValidationError[];
  data?: TestCaseImportData;
}

export interface ImportValidationError {
  field: string;
  message: string;
}

export interface TestCaseImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    errors: ImportValidationError[];
  }>;
}

// ============================================
// Constants
// ============================================

// 必須フィールド
export const REQUIRED_FIELDS = ['title'];

// 利用可能なターゲットフィールド
export const TARGET_FIELDS = [
  { key: 'title', label: 'タイトル', required: true },
  { key: 'description', label: '説明', required: false },
  { key: 'preconditions', label: '事前条件', required: false },
  { key: 'expectedResult', label: '期待結果', required: false },
  { key: 'checkpoint', label: 'チェックポイント', required: false },
  { key: 'scenario', label: 'シナリオ', required: false },
  { key: 'testEnvironment', label: 'テスト環境', required: false },
  { key: 'notes', label: '特記事項', required: false },
  { key: 'priority', label: '優先度', required: false },
  { key: 'testType', label: 'テストタイプ', required: false },
  { key: 'testTechnique', label: 'テスト技法', required: false },
  { key: 'classification', label: '分類', required: false },
  { key: 'referenceId', label: '参照ID', required: false },
  { key: 'estimatedTime', label: '見積時間(分)', required: false },
  { key: 'tags', label: 'タグ', required: false },
  { key: 'sectionName', label: 'セクション名', required: false },
];

// 優先度マッピング
export const PRIORITY_MAPPING: Record<string, TestCasePriority> = {
  最重要: 'CRITICAL',
  critical: 'CRITICAL',
  CRITICAL: 'CRITICAL',
  高: 'HIGH',
  high: 'HIGH',
  HIGH: 'HIGH',
  中: 'MEDIUM',
  medium: 'MEDIUM',
  MEDIUM: 'MEDIUM',
  低: 'LOW',
  low: 'LOW',
  LOW: 'LOW',
};

// テストタイプマッピング
export const TEST_TYPE_MAPPING: Record<string, TestType> = {
  機能テスト: 'FUNCTIONAL',
  functional: 'FUNCTIONAL',
  FUNCTIONAL: 'FUNCTIONAL',
  性能テスト: 'PERFORMANCE',
  performance: 'PERFORMANCE',
  PERFORMANCE: 'PERFORMANCE',
  セキュリティテスト: 'SECURITY',
  security: 'SECURITY',
  SECURITY: 'SECURITY',
  ユーザビリティテスト: 'USABILITY',
  usability: 'USABILITY',
  USABILITY: 'USABILITY',
  結合テスト: 'INTEGRATION',
  integration: 'INTEGRATION',
  INTEGRATION: 'INTEGRATION',
  単体テスト: 'FUNCTIONAL',
  unit: 'FUNCTIONAL',
  UNIT: 'FUNCTIONAL',
  回帰テスト: 'OTHER',
  regression: 'OTHER',
  REGRESSION: 'OTHER',
};

// テスト技法マッピング
export const TEST_TECHNIQUE_MAPPING: Record<string, TestTechnique> = {
  同値分割: 'EQUIVALENCE_PARTITIONING',
  equivalence: 'EQUIVALENCE_PARTITIONING',
  EQUIVALENCE: 'EQUIVALENCE_PARTITIONING',
  EQUIVALENCE_PARTITIONING: 'EQUIVALENCE_PARTITIONING',
  境界値分析: 'BOUNDARY_VALUE_ANALYSIS',
  boundary: 'BOUNDARY_VALUE_ANALYSIS',
  BOUNDARY: 'BOUNDARY_VALUE_ANALYSIS',
  BOUNDARY_VALUE_ANALYSIS: 'BOUNDARY_VALUE_ANALYSIS',
  デシジョンテーブル: 'DECISION_TABLE',
  decision_table: 'DECISION_TABLE',
  DECISION_TABLE: 'DECISION_TABLE',
  状態遷移: 'STATE_TRANSITION',
  state_transition: 'STATE_TRANSITION',
  STATE_TRANSITION: 'STATE_TRANSITION',
  エラー推測: 'EXPLORATORY',
  error_guessing: 'EXPLORATORY',
  ERROR_GUESSING: 'EXPLORATORY',
  探索的テスト: 'EXPLORATORY',
  exploratory: 'EXPLORATORY',
  EXPLORATORY: 'EXPLORATORY',
  ペアワイズテスト: 'OTHER',
  pair_wise: 'OTHER',
  PAIR_WISE: 'OTHER',
  回帰テスト: 'REGRESSION',
  regression: 'REGRESSION',
  REGRESSION: 'REGRESSION',
};

// ============================================
// Default Field Mapping
// ============================================

export const DEFAULT_FIELD_MAPPING: Record<string, string> = {
  タイトル: 'title',
  title: 'title',
  Title: 'title',
  説明: 'description',
  description: 'description',
  Description: 'description',
  事前条件: 'preconditions',
  preconditions: 'preconditions',
  Preconditions: 'preconditions',
  期待結果: 'expectedResult',
  expectedResult: 'expectedResult',
  'Expected Result': 'expectedResult',
  チェックポイント: 'checkpoint',
  checkpoint: 'checkpoint',
  シナリオ: 'scenario',
  scenario: 'scenario',
  テスト環境: 'testEnvironment',
  testEnvironment: 'testEnvironment',
  特記事項: 'notes',
  notes: 'notes',
  優先度: 'priority',
  priority: 'priority',
  Priority: 'priority',
  テストタイプ: 'testType',
  testType: 'testType',
  'Test Type': 'testType',
  テスト技法: 'testTechnique',
  testTechnique: 'testTechnique',
  'Test Technique': 'testTechnique',
  分類: 'classification',
  classification: 'classification',
  参照ID: 'referenceId',
  referenceId: 'referenceId',
  '見積時間(分)': 'estimatedTime',
  見積時間: 'estimatedTime',
  estimatedTime: 'estimatedTime',
  タグ: 'tags',
  tags: 'tags',
  Tags: 'tags',
  セクション名: 'sectionName',
  sectionName: 'sectionName',
};

// ============================================
// Functions
// ============================================

/**
 * CSVヘッダーから自動マッピングを推測
 */
export function autoDetectMapping(headers: string[]): FieldMapping[] {
  const mappings: FieldMapping[] = [];

  for (const header of headers) {
    const targetField = DEFAULT_FIELD_MAPPING[header];
    if (targetField) {
      mappings.push({
        csvHeader: header,
        targetField,
      });
    }
  }

  return mappings;
}

/**
 * マッピングの検証
 */
export function validateMapping(mappings: FieldMapping[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const mappedFields = mappings.map((m) => m.targetField);

  // 必須フィールドのチェック
  for (const required of REQUIRED_FIELDS) {
    if (!mappedFields.includes(required)) {
      errors.push(`必須フィールド「${required}」がマッピングされていません。`);
    }
  }

  // 重複チェック
  const duplicates = mappedFields.filter((field, index) => mappedFields.indexOf(field) !== index);
  if (duplicates.length > 0) {
    errors.push(`フィールドが重複しています: ${[...new Set(duplicates)].join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * CSVデータをテストケースデータに変換
 */
export function convertCsvToTestCases(
  parseResult: CsvParseResult,
  mappings: FieldMapping[]
): ImportValidationResult[] {
  const objects = csvToObjects(parseResult);
  const results: ImportValidationResult[] = [];

  objects.forEach((row, index) => {
    const result = convertRowToTestCase(row, mappings, index + 2); // 1-indexed, header is line 1
    results.push(result);
  });

  return results;
}

/**
 * CSV行をテストケースデータに変換
 */
function convertRowToTestCase(
  row: CsvRow,
  mappings: FieldMapping[],
  rowNumber: number
): ImportValidationResult {
  const errors: ImportValidationError[] = [];
  const data: Partial<TestCaseImportData> = {};

  for (const mapping of mappings) {
    const value = row[mapping.csvHeader];
    if (value === undefined || value === '') {
      continue;
    }

    try {
      const converted = convertFieldValue(mapping.targetField, value);
      if (converted !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any)[mapping.targetField] = converted;
      }
    } catch (error) {
      errors.push({
        field: mapping.targetField,
        message: error instanceof Error ? error.message : '変換エラー',
      });
    }
  }

  // 必須フィールドの検証
  if (!data.title || data.title.trim() === '') {
    errors.push({
      field: 'title',
      message: 'タイトルは必須です。',
    });
  }

  return {
    valid: errors.length === 0,
    row: rowNumber,
    errors,
    data: errors.length === 0 ? (data as TestCaseImportData) : undefined,
  };
}

/**
 * フィールド値を適切な型に変換
 */
function convertFieldValue(field: string, value: string): unknown {
  switch (field) {
    case 'priority': {
      const mapped = PRIORITY_MAPPING[value];
      if (!mapped && value.trim() !== '') {
        throw new Error(`不正な優先度: ${value}`);
      }
      return mapped || undefined;
    }

    case 'testType': {
      const mapped = TEST_TYPE_MAPPING[value];
      if (!mapped && value.trim() !== '') {
        throw new Error(`不正なテストタイプ: ${value}`);
      }
      return mapped || undefined;
    }

    case 'testTechnique': {
      const mapped = TEST_TECHNIQUE_MAPPING[value];
      if (!mapped && value.trim() !== '') {
        throw new Error(`不正なテスト技法: ${value}`);
      }
      return mapped || undefined;
    }

    case 'estimatedTime': {
      if (value.trim() === '') return undefined;
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 0) {
        throw new Error(`不正な見積時間: ${value}`);
      }
      return num;
    }

    case 'tags': {
      if (value.trim() === '') return undefined;
      // カンマ区切りまたはスペース区切りで分割
      const tags = value
        .split(/[,、\s]+/)
        .map((t) => t.trim())
        .filter((t) => t !== '');
      return tags.length > 0 ? tags : undefined;
    }

    default:
      return value.trim() || undefined;
  }
}

/**
 * インポート結果のサマリーを生成
 */
export function generateImportSummary(results: ImportValidationResult[]): {
  valid: number;
  invalid: number;
  total: number;
} {
  const valid = results.filter((r) => r.valid).length;
  return {
    valid,
    invalid: results.length - valid,
    total: results.length,
  };
}

/**
 * 利用可能なステップカラムを検出（手順1_操作、手順1_期待結果など）
 */
export function detectStepColumns(headers: string[]): {
  maxSteps: number;
  stepMappings: Array<{ stepNo: number; actionHeader: string; expectedHeader?: string }>;
} {
  const stepMappings: Array<{ stepNo: number; actionHeader: string; expectedHeader?: string }> = [];
  const stepPattern = /^手順(\d+)_(操作|期待結果)$/;
  const stepPatternEn = /^step(\d+)_(action|expected)$/i;

  const actionHeaders = new Map<number, string>();
  const expectedHeaders = new Map<number, string>();

  for (const header of headers) {
    let match = header.match(stepPattern);
    if (match) {
      const stepNo = parseInt(match[1], 10);
      if (match[2] === '操作') {
        actionHeaders.set(stepNo, header);
      } else {
        expectedHeaders.set(stepNo, header);
      }
      continue;
    }

    match = header.match(stepPatternEn);
    if (match) {
      const stepNo = parseInt(match[1], 10);
      if (match[2].toLowerCase() === 'action') {
        actionHeaders.set(stepNo, header);
      } else {
        expectedHeaders.set(stepNo, header);
      }
    }
  }

  // ステップマッピングを構築
  const stepNumbers = [...actionHeaders.keys()].sort((a, b) => a - b);
  for (const stepNo of stepNumbers) {
    const actionHeader = actionHeaders.get(stepNo);
    if (actionHeader) {
      stepMappings.push({
        stepNo,
        actionHeader,
        expectedHeader: expectedHeaders.get(stepNo),
      });
    }
  }

  return {
    maxSteps: stepNumbers.length > 0 ? Math.max(...stepNumbers) : 0,
    stepMappings,
  };
}

/**
 * CSV行からステップデータを抽出
 */
export function extractSteps(
  row: CsvRow,
  stepMappings: Array<{ stepNo: number; actionHeader: string; expectedHeader?: string }>
): TestStepImportData[] {
  const steps: TestStepImportData[] = [];

  for (const mapping of stepMappings) {
    const action = row[mapping.actionHeader]?.trim();
    if (action) {
      steps.push({
        stepNo: mapping.stepNo,
        action,
        expected: mapping.expectedHeader ? row[mapping.expectedHeader]?.trim() : undefined,
      });
    }
  }

  return steps;
}
