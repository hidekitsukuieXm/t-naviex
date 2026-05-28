/**
 * Migration関連の型定義
 * テスト管理ツール間のデータ移行に使用する共通型
 */

// ============================================
// 移行元ツール種別
// ============================================

/**
 * 移行元ツールの種別
 */
export type MigrationSource = 'TESTLINK' | 'ZEPHYR' | 'QTEST' | 'XRAY' | 'XML' | 'TD_TOOL';

/**
 * 移行ステータス
 */
export type MigrationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// ============================================
// TestLink移行関連
// ============================================

/**
 * TestLink テストスイート
 */
export interface TestLinkTestSuite {
  id: string;
  name: string;
  details?: string;
  parentId?: string;
  order?: number;
  testCases?: TestLinkTestCase[];
  childSuites?: TestLinkTestSuite[];
}

/**
 * TestLink テストケース
 */
export interface TestLinkTestCase {
  id: string;
  externalId?: string;
  name: string;
  summary?: string;
  preconditions?: string;
  steps?: TestLinkTestStep[];
  importance?: 'HIGH' | 'MEDIUM' | 'LOW';
  executionType?: 'MANUAL' | 'AUTOMATED';
  status?: string;
  customFields?: Record<string, string>;
  keywords?: string[];
}

/**
 * TestLink テストステップ
 */
export interface TestLinkTestStep {
  stepNumber: number;
  actions: string;
  expectedResults: string;
  executionType?: 'MANUAL' | 'AUTOMATED';
}

/**
 * TestLink インポートオプション
 */
export interface TestLinkImportOptions {
  projectId: string;
  testSpecId?: string;
  createTestSpec?: boolean;
  testSpecName?: string;
  preserveHierarchy?: boolean;
  importCustomFields?: boolean;
  importKeywordsAsTags?: boolean;
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  defaultTestType?: string;
  defaultTestTechnique?: string;
}

/**
 * TestLink XMLパースオプション
 */
export interface TestLinkXmlParseOptions {
  encoding?: string;
  validateDtd?: boolean;
}

// ============================================
// 共通マッピング定義
// ============================================

/**
 * フィールドマッピング
 */
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: 'DIRECT' | 'UPPERCASE' | 'LOWERCASE' | 'CUSTOM';
  customTransform?: string;
  defaultValue?: string;
}

/**
 * 優先度マッピング
 */
export interface PriorityMapping {
  sourcePriority: string;
  targetPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * ステータスマッピング
 */
export interface StatusMapping {
  sourceStatus: string;
  targetStatus: string;
}

// ============================================
// 移行結果
// ============================================

/**
 * 移行結果サマリー
 */
export interface MigrationSummary {
  totalTestSuites: number;
  totalTestCases: number;
  totalTestSteps: number;
  importedTestSuites: number;
  importedTestCases: number;
  importedTestSteps: number;
  skippedItems: number;
  errors: MigrationError[];
  warnings: MigrationWarning[];
}

/**
 * 移行エラー
 */
export interface MigrationError {
  itemType: 'SUITE' | 'CASE' | 'STEP';
  itemId: string;
  itemName: string;
  errorMessage: string;
  errorCode?: string;
}

/**
 * 移行警告
 */
export interface MigrationWarning {
  itemType: 'SUITE' | 'CASE' | 'STEP';
  itemId: string;
  itemName: string;
  warningMessage: string;
  warningCode?: string;
}

/**
 * 移行結果
 */
export interface MigrationResult {
  success: boolean;
  migrationId: string;
  source: MigrationSource;
  status: MigrationStatus;
  summary: MigrationSummary;
  startedAt: string;
  completedAt?: string;
  projectId: string;
  testSpecId?: string;
  createdTestSpecId?: string;
}

// ============================================
// 移行ジョブ
// ============================================

/**
 * 移行ジョブ
 */
export interface MigrationJob {
  id: string;
  source: MigrationSource;
  status: MigrationStatus;
  projectId: string;
  testSpecId?: string;
  options: Record<string, unknown>;
  summary?: MigrationSummary;
  startedAt: string;
  completedAt?: string;
  createdById: string;
  error?: string;
}

/**
 * 移行ジョブ作成入力
 */
export interface CreateMigrationJobInput {
  source: MigrationSource;
  projectId: string;
  testSpecId?: string;
  options: Record<string, unknown>;
  file?: File;
  apiConfig?: {
    baseUrl: string;
    apiKey?: string;
    username?: string;
    password?: string;
  };
}

// ============================================
// プレビュー
// ============================================

/**
 * インポートプレビュー
 */
export interface ImportPreview {
  testSuites: TestLinkTestSuite[];
  totalTestCases: number;
  totalTestSteps: number;
  estimatedTime: number;
  warnings: MigrationWarning[];
}

/**
 * マッピングプレビュー
 */
export interface MappingPreview {
  sampleData: Array<{
    original: Record<string, unknown>;
    mapped: Record<string, unknown>;
  }>;
  unmappedFields: string[];
  mappingWarnings: string[];
}

// ============================================
// バリデーション
// ============================================

/**
 * 移行ソースのバリデーション
 */
export function validateMigrationSource(source: string): {
  valid: boolean;
  error?: string;
} {
  const validSources: MigrationSource[] = ['TESTLINK', 'ZEPHYR', 'QTEST', 'XRAY', 'XML', 'TD_TOOL'];

  if (!validSources.includes(source as MigrationSource)) {
    return { valid: false, error: '無効な移行元ツールです。' };
  }

  return { valid: true };
}

/**
 * TestLinkインポートオプションのバリデーション
 */
export function validateTestLinkImportOptions(options: TestLinkImportOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!options.projectId || options.projectId.trim() === '') {
    errors.push('プロジェクトIDは必須です。');
  }

  if (options.createTestSpec && (!options.testSpecName || options.testSpecName.trim() === '')) {
    errors.push('テスト仕様書を新規作成する場合は、名前を指定してください。');
  }

  if (!options.createTestSpec && (!options.testSpecId || options.testSpecId.trim() === '')) {
    errors.push('既存のテスト仕様書を使用する場合は、テスト仕様書IDを指定してください。');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * 移行ステータスのラベル
 */
export const MIGRATION_STATUS_LABELS: Record<MigrationStatus, string> = {
  PENDING: '待機中',
  IN_PROGRESS: '実行中',
  COMPLETED: '完了',
  FAILED: '失敗',
  CANCELLED: 'キャンセル',
};

/**
 * 移行ソースのラベル
 */
export const MIGRATION_SOURCE_LABELS: Record<MigrationSource, string> = {
  TESTLINK: 'TestLink',
  ZEPHYR: 'Zephyr',
  QTEST: 'qTest',
  XRAY: 'Xray',
  XML: 'XML',
  TD_TOOL: 'TDテスト設計ツール',
};

/**
 * TestLink優先度をT-NaviEx優先度に変換
 */
export function mapTestLinkPriority(
  importance?: 'HIGH' | 'MEDIUM' | 'LOW'
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (importance) {
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    case 'LOW':
      return 'LOW';
    default:
      return 'MEDIUM';
  }
}
