/**
 * Version Management Types
 *
 * テスト仕様書バージョン管理の型定義
 */

// ====================================
// Version Snapshot Types
// ====================================

/**
 * セクションスナップショット
 */
export interface SectionSnapshot {
  id: string;
  name: string;
  parentId?: string;
  sortOrder: number;
}

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
 * テストケーススナップショット
 */
export interface TestCaseSnapshot {
  id: string;
  sectionId: string;
  title: string;
  description?: string;
  preconditions?: string;
  steps: TestStepSnapshot[];
  priority?: string;
  status?: string;
  testType?: string;
  estimatedTime?: number;
  tags?: string[];
}

/**
 * バージョンコンテンツ（スナップショット全体）
 */
export interface VersionContent {
  sections: SectionSnapshot[];
  testCases: TestCaseSnapshot[];
  metadata?: {
    capturedAt: Date;
    capturedBy?: string;
  };
}

// ====================================
// Version Types
// ====================================

/**
 * バージョン
 */
export interface TestSpecVersion {
  id: string;
  testSpecId: string;
  version: string;
  changeNote?: string;
  content?: VersionContent;
  sectionCount?: number;
  testCaseCount?: number;
  createdBy?: string;
  createdAt: Date;
}

// ====================================
// Version Comparison Types
// ====================================

/**
 * 変更タイプ
 */
export const ChangeType = {
  ADDED: 'ADDED',
  REMOVED: 'REMOVED',
  MODIFIED: 'MODIFIED',
  UNCHANGED: 'UNCHANGED',
} as const;

export type ChangeType = (typeof ChangeType)[keyof typeof ChangeType];

/**
 * セクション変更
 */
export interface SectionChange {
  sectionId: string;
  sectionName: string;
  changeType: ChangeType;
  previousValue?: SectionSnapshot;
  currentValue?: SectionSnapshot;
  changes?: string[];
}

/**
 * テストケース変更
 */
export interface TestCaseChange {
  testCaseId: string;
  testCaseTitle: string;
  sectionId: string;
  changeType: ChangeType;
  previousValue?: TestCaseSnapshot;
  currentValue?: TestCaseSnapshot;
  fieldChanges?: FieldChange[];
}

/**
 * フィールド変更
 */
export interface FieldChange {
  fieldName: string;
  fieldLabel: string;
  previousValue?: unknown;
  currentValue?: unknown;
}

/**
 * バージョン比較結果
 */
export interface VersionComparison {
  sourceVersionId: string;
  sourceVersion: string;
  targetVersionId: string;
  targetVersion: string;
  sectionChanges: SectionChange[];
  testCaseChanges: TestCaseChange[];
  summary: VersionComparisonSummary;
}

/**
 * バージョン比較サマリー
 */
export interface VersionComparisonSummary {
  sectionsAdded: number;
  sectionsRemoved: number;
  sectionsModified: number;
  sectionsUnchanged: number;
  testCasesAdded: number;
  testCasesRemoved: number;
  testCasesModified: number;
  testCasesUnchanged: number;
}

// ====================================
// API Types
// ====================================

/**
 * バージョン作成リクエスト
 */
export interface CreateVersionRequest {
  version: string;
  changeNote?: string;
  includeContent?: boolean;
}

/**
 * バージョン作成レスポンス
 */
export interface CreateVersionResponse {
  version: TestSpecVersion;
  testSpec: {
    id: string;
    name: string;
    version: string;
  };
}

/**
 * バージョン比較リクエスト
 */
export interface CompareVersionsRequest {
  sourceVersionId: string;
  targetVersionId: string;
}

/**
 * バージョン復元リクエスト
 */
export interface RestoreVersionRequest {
  versionId: string;
  createNewVersion?: boolean;
  newVersionNumber?: string;
  changeNote?: string;
}

/**
 * バージョン復元レスポンス
 */
export interface RestoreVersionResponse {
  success: boolean;
  restoredSections: number;
  restoredTestCases: number;
  newVersion?: TestSpecVersion;
}

// ====================================
// Utility Functions
// ====================================

/**
 * 変更タイプのラベルを取得
 */
export function getChangeTypeLabel(type: ChangeType): string {
  const labels: Record<ChangeType, string> = {
    [ChangeType.ADDED]: '追加',
    [ChangeType.REMOVED]: '削除',
    [ChangeType.MODIFIED]: '変更',
    [ChangeType.UNCHANGED]: '変更なし',
  };
  return labels[type] || type;
}

/**
 * 変更タイプの色を取得
 */
export function getChangeTypeColor(type: ChangeType): string {
  const colors: Record<ChangeType, string> = {
    [ChangeType.ADDED]: 'text-green-600 bg-green-50',
    [ChangeType.REMOVED]: 'text-red-600 bg-red-50',
    [ChangeType.MODIFIED]: 'text-yellow-600 bg-yellow-50',
    [ChangeType.UNCHANGED]: 'text-gray-600 bg-gray-50',
  };
  return colors[type] || '';
}

/**
 * フィールドラベルを取得
 */
export function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    title: 'タイトル',
    description: '説明',
    preconditions: '前提条件',
    steps: 'テストステップ',
    priority: '優先度',
    status: 'ステータス',
    testType: 'テストタイプ',
    estimatedTime: '見積時間',
    tags: 'タグ',
    name: '名前',
    parentId: '親セクション',
    sortOrder: '表示順',
    action: '操作',
    expectedResult: '期待結果',
  };
  return labels[fieldName] || fieldName;
}

/**
 * セクションをツリー構造に変換
 */
export function buildSectionTree(
  sections: SectionSnapshot[]
): (SectionSnapshot & { children: SectionSnapshot[] })[] {
  const sectionMap = new Map<
    string | undefined,
    (SectionSnapshot & { children: SectionSnapshot[] })[]
  >();

  // 親IDでグループ化
  sections.forEach((section) => {
    const parentId = section.parentId || undefined;
    if (!sectionMap.has(parentId)) {
      sectionMap.set(parentId, []);
    }
    sectionMap.get(parentId)!.push({ ...section, children: [] });
  });

  // 子を親に接続
  const buildTree = (
    parentId: string | undefined
  ): (SectionSnapshot & { children: SectionSnapshot[] })[] => {
    const children = sectionMap.get(parentId) || [];
    children.forEach((child) => {
      child.children = buildTree(child.id);
    });
    return children.sort((a, b) => a.sortOrder - b.sortOrder);
  };

  return buildTree(undefined);
}

/**
 * バージョン比較サマリーを計算
 */
export function calculateComparisonSummary(
  sectionChanges: SectionChange[],
  testCaseChanges: TestCaseChange[]
): VersionComparisonSummary {
  return {
    sectionsAdded: sectionChanges.filter((c) => c.changeType === ChangeType.ADDED).length,
    sectionsRemoved: sectionChanges.filter((c) => c.changeType === ChangeType.REMOVED).length,
    sectionsModified: sectionChanges.filter((c) => c.changeType === ChangeType.MODIFIED).length,
    sectionsUnchanged: sectionChanges.filter((c) => c.changeType === ChangeType.UNCHANGED).length,
    testCasesAdded: testCaseChanges.filter((c) => c.changeType === ChangeType.ADDED).length,
    testCasesRemoved: testCaseChanges.filter((c) => c.changeType === ChangeType.REMOVED).length,
    testCasesModified: testCaseChanges.filter((c) => c.changeType === ChangeType.MODIFIED).length,
    testCasesUnchanged: testCaseChanges.filter((c) => c.changeType === ChangeType.UNCHANGED).length,
  };
}

/**
 * テストケースの差分を検出
 */
export function diffTestCases(
  previous: TestCaseSnapshot | undefined,
  current: TestCaseSnapshot | undefined
): FieldChange[] {
  if (!previous || !current) return [];

  const changes: FieldChange[] = [];

  // 基本フィールドを比較
  const fieldsToCompare: (keyof TestCaseSnapshot)[] = [
    'title',
    'description',
    'preconditions',
    'priority',
    'status',
    'testType',
    'estimatedTime',
  ];

  fieldsToCompare.forEach((field) => {
    if (previous[field] !== current[field]) {
      changes.push({
        fieldName: field,
        fieldLabel: getFieldLabel(field),
        previousValue: previous[field],
        currentValue: current[field],
      });
    }
  });

  // タグを比較
  const prevTags = previous.tags || [];
  const currTags = current.tags || [];
  if (JSON.stringify(prevTags.sort()) !== JSON.stringify(currTags.sort())) {
    changes.push({
      fieldName: 'tags',
      fieldLabel: getFieldLabel('tags'),
      previousValue: prevTags,
      currentValue: currTags,
    });
  }

  // ステップを比較
  const prevSteps = previous.steps || [];
  const currSteps = current.steps || [];
  if (
    prevSteps.length !== currSteps.length ||
    JSON.stringify(prevSteps) !== JSON.stringify(currSteps)
  ) {
    changes.push({
      fieldName: 'steps',
      fieldLabel: getFieldLabel('steps'),
      previousValue: prevSteps,
      currentValue: currSteps,
    });
  }

  return changes;
}

/**
 * セクションの差分を検出
 */
export function diffSections(
  previous: SectionSnapshot | undefined,
  current: SectionSnapshot | undefined
): string[] {
  if (!previous || !current) return [];

  const changes: string[] = [];

  if (previous.name !== current.name) {
    changes.push(`名前: "${previous.name}" → "${current.name}"`);
  }

  if (previous.parentId !== current.parentId) {
    changes.push('親セクション変更');
  }

  if (previous.sortOrder !== current.sortOrder) {
    changes.push(`表示順: ${previous.sortOrder} → ${current.sortOrder}`);
  }

  return changes;
}

/**
 * バージョン文字列をバリデーション
 */
export function validateVersionString(version: string): { valid: boolean; message?: string } {
  if (!version || version.trim() === '') {
    return { valid: false, message: 'バージョンは必須です' };
  }

  // セマンティックバージョニング形式を推奨（x.y.z）
  const semverPattern = /^\d+\.\d+(\.\d+)?$/;
  if (!semverPattern.test(version.trim())) {
    // 許容する他の形式
    const alternatePatterns = [
      /^v?\d+$/i, // v1, 1
      /^v?\d+\.\d+$/i, // v1.0, 1.0
      /^v?\d+\.\d+\.\d+$/i, // v1.0.0, 1.0.0
      /^v?\d+\.\d+\.\d+-\w+$/i, // v1.0.0-beta, 1.0.0-rc1
    ];

    const isValid = alternatePatterns.some((p) => p.test(version.trim()));
    if (!isValid) {
      return {
        valid: false,
        message: 'バージョン形式が無効です（例: 1.0.0, v1.0, 1.0.0-beta）',
      };
    }
  }

  return { valid: true };
}

/**
 * バージョンを比較（1=greater, 0=equal, -1=less）
 */
export function compareVersionStrings(a: string, b: string): number {
  const normalize = (v: string) =>
    v
      .replace(/^v/i, '')
      .split(/[.-]/)
      .map((p) => {
        const num = parseInt(p, 10);
        return isNaN(num) ? p : num;
      });

  const partsA = normalize(a);
  const partsB = normalize(b);

  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const partA = partsA[i] ?? 0;
    const partB = partsB[i] ?? 0;

    if (typeof partA === 'number' && typeof partB === 'number') {
      if (partA > partB) return 1;
      if (partA < partB) return -1;
    } else {
      const strA = String(partA);
      const strB = String(partB);
      if (strA > strB) return 1;
      if (strA < strB) return -1;
    }
  }

  return 0;
}

export default {
  ChangeType,
  getChangeTypeLabel,
  getChangeTypeColor,
  getFieldLabel,
  buildSectionTree,
  calculateComparisonSummary,
  diffTestCases,
  diffSections,
  validateVersionString,
  compareVersionStrings,
};
