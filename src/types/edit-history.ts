/**
 * Edit History Types
 *
 * テストケース編集履歴の型定義
 */

// ====================================
// Edit Operation Types
// ====================================

/**
 * 編集操作タイプ
 */
export const EditOperationType = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  RESTORE: 'RESTORE',
} as const;

export type EditOperationType = (typeof EditOperationType)[keyof typeof EditOperationType];

/**
 * フィールド変更
 */
export interface FieldChange {
  field: string;
  fieldLabel: string;
  previousValue?: unknown;
  newValue?: unknown;
}

/**
 * 編集履歴
 */
export interface EditHistory {
  id: string;
  testCaseId: string;
  operation: EditOperationType;
  fieldChanges: FieldChange[];
  summary?: string;
  editedBy?: string;
  editedByName?: string;
  editedAt: Date;
}

/**
 * 編集履歴作成リクエスト
 */
export interface CreateEditHistoryRequest {
  operation: EditOperationType;
  fieldChanges: FieldChange[];
  summary?: string;
}

// ====================================
// Diff Types
// ====================================

/**
 * 差分タイプ
 */
export const DiffType = {
  ADDED: 'ADDED',
  REMOVED: 'REMOVED',
  MODIFIED: 'MODIFIED',
  UNCHANGED: 'UNCHANGED',
} as const;

export type DiffType = (typeof DiffType)[keyof typeof DiffType];

/**
 * 差分行
 */
export interface DiffLine {
  lineNumber: number;
  content: string;
  type: DiffType;
}

/**
 * 差分結果
 */
export interface DiffResult {
  fieldName: string;
  fieldLabel: string;
  previousValue?: string;
  currentValue?: string;
  previousLines?: DiffLine[];
  currentLines?: DiffLine[];
  hasChanges: boolean;
}

/**
 * 比較結果
 */
export interface ComparisonResult {
  sourceId: string;
  targetId: string;
  diffs: DiffResult[];
  summary: {
    addedFields: number;
    removedFields: number;
    modifiedFields: number;
    totalChanges: number;
  };
}

// ====================================
// Utility Functions
// ====================================

/**
 * 編集操作タイプのラベルを取得
 */
export function getOperationTypeLabel(type: EditOperationType): string {
  const labels: Record<EditOperationType, string> = {
    [EditOperationType.CREATE]: '作成',
    [EditOperationType.UPDATE]: '更新',
    [EditOperationType.DELETE]: '削除',
    [EditOperationType.RESTORE]: '復元',
  };
  return labels[type] || type;
}

/**
 * 編集操作タイプの色を取得
 */
export function getOperationTypeColor(type: EditOperationType): string {
  const colors: Record<EditOperationType, string> = {
    [EditOperationType.CREATE]: 'text-green-600 bg-green-50',
    [EditOperationType.UPDATE]: 'text-blue-600 bg-blue-50',
    [EditOperationType.DELETE]: 'text-red-600 bg-red-50',
    [EditOperationType.RESTORE]: 'text-purple-600 bg-purple-50',
  };
  return colors[type] || '';
}

/**
 * 差分タイプのラベルを取得
 */
export function getDiffTypeLabel(type: DiffType): string {
  const labels: Record<DiffType, string> = {
    [DiffType.ADDED]: '追加',
    [DiffType.REMOVED]: '削除',
    [DiffType.MODIFIED]: '変更',
    [DiffType.UNCHANGED]: '変更なし',
  };
  return labels[type] || type;
}

/**
 * 差分タイプの色を取得
 */
export function getDiffTypeColor(type: DiffType): string {
  const colors: Record<DiffType, string> = {
    [DiffType.ADDED]: 'bg-green-100 text-green-800',
    [DiffType.REMOVED]: 'bg-red-100 text-red-800',
    [DiffType.MODIFIED]: 'bg-yellow-100 text-yellow-800',
    [DiffType.UNCHANGED]: 'bg-gray-50 text-gray-600',
  };
  return colors[type] || '';
}

/**
 * フィールド名のラベルを取得
 */
export function getFieldLabel(fieldName: string): string {
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
    classification: '分類',
    referenceId: '参照ID',
    sectionId: 'セクション',
    isMatrix: 'マトリクス',
    sortOrder: '表示順',
  };
  return labels[fieldName] || fieldName;
}

/**
 * 値を文字列に変換
 */
export function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * テキストの差分を計算（行単位）
 */
export function computeLineDiff(
  previous: string,
  current: string
): {
  previousLines: DiffLine[];
  currentLines: DiffLine[];
} {
  const prevLines = previous.split('\n');
  const currLines = current.split('\n');

  const previousLines: DiffLine[] = [];
  const currentLines: DiffLine[] = [];

  // 簡易的な行単位の差分計算
  const maxLength = Math.max(prevLines.length, currLines.length);

  for (let i = 0; i < maxLength; i++) {
    const prevLine = prevLines[i];
    const currLine = currLines[i];

    if (prevLine === undefined && currLine !== undefined) {
      // 追加された行
      currentLines.push({
        lineNumber: i + 1,
        content: currLine,
        type: DiffType.ADDED,
      });
    } else if (prevLine !== undefined && currLine === undefined) {
      // 削除された行
      previousLines.push({
        lineNumber: i + 1,
        content: prevLine,
        type: DiffType.REMOVED,
      });
    } else if (prevLine !== currLine) {
      // 変更された行
      previousLines.push({
        lineNumber: i + 1,
        content: prevLine || '',
        type: DiffType.MODIFIED,
      });
      currentLines.push({
        lineNumber: i + 1,
        content: currLine || '',
        type: DiffType.MODIFIED,
      });
    } else {
      // 変更なし
      previousLines.push({
        lineNumber: i + 1,
        content: prevLine || '',
        type: DiffType.UNCHANGED,
      });
      currentLines.push({
        lineNumber: i + 1,
        content: currLine || '',
        type: DiffType.UNCHANGED,
      });
    }
  }

  return { previousLines, currentLines };
}

/**
 * フィールド値の差分を計算
 */
export function computeFieldDiff(
  fieldName: string,
  previousValue: unknown,
  currentValue: unknown
): DiffResult {
  const prevStr = valueToString(previousValue);
  const currStr = valueToString(currentValue);
  const hasChanges = prevStr !== currStr;

  // 長いテキストの場合は行単位の差分を計算
  const isLongText =
    prevStr.includes('\n') ||
    currStr.includes('\n') ||
    prevStr.length > 100 ||
    currStr.length > 100;

  if (isLongText && hasChanges) {
    const { previousLines, currentLines } = computeLineDiff(prevStr, currStr);
    return {
      fieldName,
      fieldLabel: getFieldLabel(fieldName),
      previousValue: prevStr,
      currentValue: currStr,
      previousLines,
      currentLines,
      hasChanges,
    };
  }

  return {
    fieldName,
    fieldLabel: getFieldLabel(fieldName),
    previousValue: prevStr,
    currentValue: currStr,
    hasChanges,
  };
}

/**
 * 編集履歴のサマリーを生成
 */
export function generateEditSummary(
  operation: EditOperationType,
  fieldChanges: FieldChange[]
): string {
  if (operation === EditOperationType.CREATE) {
    return 'テストケースを作成しました';
  }
  if (operation === EditOperationType.DELETE) {
    return 'テストケースを削除しました';
  }
  if (operation === EditOperationType.RESTORE) {
    return 'テストケースを復元しました';
  }

  if (fieldChanges.length === 0) {
    return '変更なし';
  }
  if (fieldChanges.length === 1) {
    return `${fieldChanges[0].fieldLabel}を更新しました`;
  }
  return `${fieldChanges.length}件のフィールドを更新しました`;
}

/**
 * 日時をフォーマット
 */
export function formatEditDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 相対時間を取得
 */
export function getRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'たった今';
  }
  if (diffMin < 60) {
    return `${diffMin}分前`;
  }
  if (diffHour < 24) {
    return `${diffHour}時間前`;
  }
  if (diffDay < 7) {
    return `${diffDay}日前`;
  }
  return formatEditDate(date);
}
