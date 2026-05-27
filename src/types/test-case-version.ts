/**
 * Test Case Version Management Types
 *
 * テストケースバージョン管理の型定義
 */

// ====================================
// Snapshot Types
// ====================================

/**
 * テストステップスナップショット
 */
export interface TestStepSnapshot {
  id: string;
  stepNumber: number;
  action: string;
  expectedResult: string;
}

/**
 * テストケーススナップショット（バージョンコンテンツ）
 */
export interface TestCaseVersionContent {
  title: string;
  description?: string;
  preconditions?: string;
  expectedResult?: string;
  checkpoint?: string;
  scenario?: string;
  testEnvironment?: string;
  notes?: string;
  priority?: string;
  testType?: string;
  testTechnique?: string;
  estimatedTime?: number;
  tags?: string[];
  steps: TestStepSnapshot[];
}

// ====================================
// Version Types
// ====================================

/**
 * テストケースバージョン
 */
export interface TestCaseVersion {
  id: string;
  testCaseId: string;
  version: number;
  content: TestCaseVersionContent;
  changeNote?: string;
  createdBy?: string;
  createdAt: Date;
}

/**
 * バージョン作成リクエスト
 */
export interface CreateTestCaseVersionRequest {
  changeNote?: string;
}

/**
 * バージョン作成レスポンス
 */
export interface CreateTestCaseVersionResponse {
  version: TestCaseVersion;
  testCase: {
    id: string;
    title: string;
    currentVersion: number;
  };
}

// ====================================
// Version Comparison Types
// ====================================

/**
 * フィールド変更
 */
export interface TestCaseFieldChange {
  fieldName: string;
  fieldLabel: string;
  previousValue?: unknown;
  currentValue?: unknown;
}

/**
 * ステップ変更タイプ
 */
export const StepChangeType = {
  ADDED: 'ADDED',
  REMOVED: 'REMOVED',
  MODIFIED: 'MODIFIED',
  UNCHANGED: 'UNCHANGED',
} as const;

export type StepChangeType = (typeof StepChangeType)[keyof typeof StepChangeType];

/**
 * ステップ変更
 */
export interface StepChange {
  stepNumber: number;
  changeType: StepChangeType;
  previousStep?: TestStepSnapshot;
  currentStep?: TestStepSnapshot;
  fieldChanges?: { field: string; previous?: string; current?: string }[];
}

/**
 * バージョン比較結果
 */
export interface TestCaseVersionComparison {
  sourceVersionId: string;
  sourceVersion: number;
  targetVersionId: string;
  targetVersion: number;
  fieldChanges: TestCaseFieldChange[];
  stepChanges: StepChange[];
  summary: VersionComparisonSummary;
}

/**
 * 比較サマリー
 */
export interface VersionComparisonSummary {
  fieldsChanged: number;
  stepsAdded: number;
  stepsRemoved: number;
  stepsModified: number;
  stepsUnchanged: number;
  hasChanges: boolean;
}

// ====================================
// Restore Types
// ====================================

/**
 * バージョン復元リクエスト
 */
export interface RestoreTestCaseVersionRequest {
  versionId: string;
  createNewVersion?: boolean;
  changeNote?: string;
}

/**
 * バージョン復元レスポンス
 */
export interface RestoreTestCaseVersionResponse {
  success: boolean;
  message: string;
  newVersion?: TestCaseVersion;
}

// ====================================
// Utility Functions
// ====================================

/**
 * フィールドラベルを取得
 */
export function getTestCaseFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    title: 'タイトル',
    description: '説明',
    preconditions: '前提条件',
    expectedResult: '期待結果',
    checkpoint: 'チェックポイント',
    scenario: 'シナリオ',
    testEnvironment: 'テスト環境',
    notes: '備考',
    priority: '優先度',
    testType: 'テストタイプ',
    testTechnique: 'テスト技法',
    estimatedTime: '見積時間',
    tags: 'タグ',
    steps: 'テストステップ',
  };
  return labels[fieldName] || fieldName;
}

/**
 * ステップ変更タイプのラベルを取得
 */
export function getStepChangeTypeLabel(type: StepChangeType): string {
  const labels: Record<StepChangeType, string> = {
    [StepChangeType.ADDED]: '追加',
    [StepChangeType.REMOVED]: '削除',
    [StepChangeType.MODIFIED]: '変更',
    [StepChangeType.UNCHANGED]: '変更なし',
  };
  return labels[type] || type;
}

/**
 * ステップ変更タイプの色を取得
 */
export function getStepChangeTypeColor(type: StepChangeType): string {
  const colors: Record<StepChangeType, string> = {
    [StepChangeType.ADDED]: 'text-green-600 bg-green-50',
    [StepChangeType.REMOVED]: 'text-red-600 bg-red-50',
    [StepChangeType.MODIFIED]: 'text-yellow-600 bg-yellow-50',
    [StepChangeType.UNCHANGED]: 'text-gray-600 bg-gray-50',
  };
  return colors[type] || '';
}

/**
 * テストケースのスナップショットを作成
 */
export function createTestCaseSnapshot(testCase: {
  title: string;
  description?: string | null;
  preconditions?: string | null;
  expectedResult?: string | null;
  checkpoint?: string | null;
  scenario?: string | null;
  testEnvironment?: string | null;
  notes?: string | null;
  priority?: string;
  testType?: string;
  testTechnique?: string;
  estimatedTime?: number | null;
  tags?: { tag: { name: string } }[] | string[];
  steps?: {
    id: string | bigint;
    stepNumber: number;
    action: string;
    expectedResult: string;
  }[];
}): TestCaseVersionContent {
  return {
    title: testCase.title,
    description: testCase.description || undefined,
    preconditions: testCase.preconditions || undefined,
    expectedResult: testCase.expectedResult || undefined,
    checkpoint: testCase.checkpoint || undefined,
    scenario: testCase.scenario || undefined,
    testEnvironment: testCase.testEnvironment || undefined,
    notes: testCase.notes || undefined,
    priority: testCase.priority,
    testType: testCase.testType,
    testTechnique: testCase.testTechnique,
    estimatedTime: testCase.estimatedTime || undefined,
    tags: Array.isArray(testCase.tags)
      ? testCase.tags.map((t) => (typeof t === 'string' ? t : t.tag.name))
      : undefined,
    steps: (testCase.steps || []).map((step) => ({
      id: step.id.toString(),
      stepNumber: step.stepNumber,
      action: step.action,
      expectedResult: step.expectedResult,
    })),
  };
}

/**
 * テストケースの差分を検出
 */
export function diffTestCaseVersions(
  previous: TestCaseVersionContent | undefined,
  current: TestCaseVersionContent | undefined
): { fieldChanges: TestCaseFieldChange[]; stepChanges: StepChange[] } {
  if (!previous || !current) {
    return { fieldChanges: [], stepChanges: [] };
  }

  const fieldChanges: TestCaseFieldChange[] = [];

  // 基本フィールドを比較
  const fieldsToCompare: (keyof TestCaseVersionContent)[] = [
    'title',
    'description',
    'preconditions',
    'expectedResult',
    'checkpoint',
    'scenario',
    'testEnvironment',
    'notes',
    'priority',
    'testType',
    'testTechnique',
    'estimatedTime',
  ];

  fieldsToCompare.forEach((field) => {
    if (previous[field] !== current[field]) {
      fieldChanges.push({
        fieldName: field,
        fieldLabel: getTestCaseFieldLabel(field),
        previousValue: previous[field],
        currentValue: current[field],
      });
    }
  });

  // タグを比較
  const prevTags = previous.tags || [];
  const currTags = current.tags || [];
  if (JSON.stringify(prevTags.sort()) !== JSON.stringify(currTags.sort())) {
    fieldChanges.push({
      fieldName: 'tags',
      fieldLabel: getTestCaseFieldLabel('tags'),
      previousValue: prevTags,
      currentValue: currTags,
    });
  }

  // ステップを比較
  const stepChanges = diffSteps(previous.steps || [], current.steps || []);

  return { fieldChanges, stepChanges };
}

/**
 * ステップの差分を検出
 */
function diffSteps(
  previousSteps: TestStepSnapshot[],
  currentSteps: TestStepSnapshot[]
): StepChange[] {
  const changes: StepChange[] = [];
  const prevMap = new Map(previousSteps.map((s) => [s.stepNumber, s]));
  const currMap = new Map(currentSteps.map((s) => [s.stepNumber, s]));

  // 全てのステップ番号を収集
  const allStepNumbers = new Set([
    ...previousSteps.map((s) => s.stepNumber),
    ...currentSteps.map((s) => s.stepNumber),
  ]);

  for (const stepNumber of Array.from(allStepNumbers).sort((a, b) => a - b)) {
    const prev = prevMap.get(stepNumber);
    const curr = currMap.get(stepNumber);

    if (!prev && curr) {
      // 追加
      changes.push({
        stepNumber,
        changeType: StepChangeType.ADDED,
        currentStep: curr,
      });
    } else if (prev && !curr) {
      // 削除
      changes.push({
        stepNumber,
        changeType: StepChangeType.REMOVED,
        previousStep: prev,
      });
    } else if (prev && curr) {
      // 変更チェック
      const fieldChanges: { field: string; previous?: string; current?: string }[] = [];
      if (prev.action !== curr.action) {
        fieldChanges.push({ field: 'action', previous: prev.action, current: curr.action });
      }
      if (prev.expectedResult !== curr.expectedResult) {
        fieldChanges.push({
          field: 'expectedResult',
          previous: prev.expectedResult,
          current: curr.expectedResult,
        });
      }

      if (fieldChanges.length > 0) {
        changes.push({
          stepNumber,
          changeType: StepChangeType.MODIFIED,
          previousStep: prev,
          currentStep: curr,
          fieldChanges,
        });
      } else {
        changes.push({
          stepNumber,
          changeType: StepChangeType.UNCHANGED,
          previousStep: prev,
          currentStep: curr,
        });
      }
    }
  }

  return changes;
}

/**
 * 比較サマリーを計算
 */
export function calculateVersionComparisonSummary(
  fieldChanges: TestCaseFieldChange[],
  stepChanges: StepChange[]
): VersionComparisonSummary {
  return {
    fieldsChanged: fieldChanges.length,
    stepsAdded: stepChanges.filter((c) => c.changeType === StepChangeType.ADDED).length,
    stepsRemoved: stepChanges.filter((c) => c.changeType === StepChangeType.REMOVED).length,
    stepsModified: stepChanges.filter((c) => c.changeType === StepChangeType.MODIFIED).length,
    stepsUnchanged: stepChanges.filter((c) => c.changeType === StepChangeType.UNCHANGED).length,
    hasChanges:
      fieldChanges.length > 0 || stepChanges.some((c) => c.changeType !== StepChangeType.UNCHANGED),
  };
}

export default {
  StepChangeType,
  getTestCaseFieldLabel,
  getStepChangeTypeLabel,
  getStepChangeTypeColor,
  createTestCaseSnapshot,
  diffTestCaseVersions,
  calculateVersionComparisonSummary,
};
