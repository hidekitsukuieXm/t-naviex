/**
 * テスト結果（実行履歴）の型定義
 */

import type { TestRunCaseStatus } from './test-run-case';

// ============================================
// 基本型定義
// ============================================

/**
 * テスト結果
 */
export interface TestResult {
  id: string;
  testRunCaseId: string;
  executedById: string | null;
  status: TestRunCaseStatus;
  executedAt: string;
  executionTime: number | null;
  actualResult: string | null;
  defects: string | null;
  comment: string | null;
  environment: string | null;
  browserInfo: string | null;
  version: number;
  createdAt: string;
}

/**
 * テスト結果（実行者情報付き）
 */
export interface TestResultWithRelations extends TestResult {
  executedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * テスト結果（詳細情報付き）
 */
export interface TestResultDetail extends TestResultWithRelations {
  testRunCase: {
    id: string;
    testCase: {
      id: string;
      title: string;
      priority: string;
    };
    testRun: {
      id: string;
      name: string;
    };
  };
}

// ============================================
// 入力・更新型定義
// ============================================

/**
 * テスト結果作成入力
 */
export interface CreateTestResultInput {
  testRunCaseId: string;
  executedById?: string | null;
  status: TestRunCaseStatus;
  executionTime?: number | null;
  actualResult?: string | null;
  defects?: string | null;
  comment?: string | null;
  environment?: string | null;
  browserInfo?: string | null;
}

/**
 * テスト結果検索パラメータ
 */
export interface TestResultSearchParams {
  testRunCaseId?: string;
  executedById?: string;
  status?: TestRunCaseStatus;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * テスト結果更新入力
 */
export interface UpdateTestResultInput {
  status?: TestRunCaseStatus;
  executionTime?: number | null;
  actualResult?: string | null;
  defects?: string | null;
  comment?: string | null;
  environment?: string | null;
  browserInfo?: string | null;
}

// ============================================
// 編集履歴型定義
// ============================================

/**
 * テスト結果編集履歴
 */
export interface TestResultHistory {
  id: string;
  testResultId: string;
  editedById: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  editedAt: string;
}

/**
 * テスト結果編集履歴（編集者情報付き）
 */
export interface TestResultHistoryWithEditor extends TestResultHistory {
  editedBy: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * テスト結果編集履歴作成入力
 */
export interface CreateTestResultHistoryInput {
  testResultId: string;
  editedById: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}
