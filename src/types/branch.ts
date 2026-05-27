/**
 * Branch Management Types
 *
 * テスト仕様書のブランチ管理の型定義
 */

// ====================================
// Enums
// ====================================

/**
 * ブランチステータス
 */
export const BranchStatus = {
  /** アクティブ */
  ACTIVE: 'ACTIVE',
  /** マージ済み */
  MERGED: 'MERGED',
  /** 削除済み */
  DELETED: 'DELETED',
  /** 凍結 */
  FROZEN: 'FROZEN',
} as const;

export type BranchStatus = (typeof BranchStatus)[keyof typeof BranchStatus];

/**
 * ブランチタイプ
 */
export const BranchType = {
  /** マスター */
  MASTER: 'MASTER',
  /** フィーチャー */
  FEATURE: 'FEATURE',
  /** リリース */
  RELEASE: 'RELEASE',
  /** ホットフィックス */
  HOTFIX: 'HOTFIX',
  /** 実験 */
  EXPERIMENTAL: 'EXPERIMENTAL',
} as const;

export type BranchType = (typeof BranchType)[keyof typeof BranchType];

/**
 * マージステータス
 */
export const MergeStatus = {
  /** 保留中 */
  PENDING: 'PENDING',
  /** 進行中 */
  IN_PROGRESS: 'IN_PROGRESS',
  /** 完了 */
  COMPLETED: 'COMPLETED',
  /** コンフリクト */
  CONFLICT: 'CONFLICT',
  /** キャンセル */
  CANCELLED: 'CANCELLED',
} as const;

export type MergeStatus = (typeof MergeStatus)[keyof typeof MergeStatus];

/**
 * コンフリクトタイプ
 */
export const ConflictType = {
  /** コンテンツ変更 */
  CONTENT_MODIFIED: 'CONTENT_MODIFIED',
  /** 削除と変更 */
  DELETE_MODIFY: 'DELETE_MODIFY',
  /** 両方追加 */
  BOTH_ADDED: 'BOTH_ADDED',
  /** 名前変更 */
  RENAME: 'RENAME',
} as const;

export type ConflictType = (typeof ConflictType)[keyof typeof ConflictType];

/**
 * 解決策タイプ
 */
export const ResolutionType = {
  /** ソースを使用 */
  USE_SOURCE: 'USE_SOURCE',
  /** ターゲットを使用 */
  USE_TARGET: 'USE_TARGET',
  /** 手動マージ */
  MANUAL_MERGE: 'MANUAL_MERGE',
  /** スキップ */
  SKIP: 'SKIP',
} as const;

export type ResolutionType = (typeof ResolutionType)[keyof typeof ResolutionType];

// ====================================
// Core Types
// ====================================

/**
 * ブランチ
 */
export interface Branch {
  id: string;
  testSpecId: string;
  name: string;
  description?: string;
  type: BranchType;
  status: BranchStatus;
  parentBranchId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * ブランチスナップショット
 */
export interface BranchSnapshot {
  id: string;
  branchId: string;
  version: number;
  commitMessage: string;
  testCases: TestCaseSnapshot[];
  createdBy: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * テストケーススナップショット
 */
export interface TestCaseSnapshot {
  testCaseId: string;
  title: string;
  description?: string;
  preconditions?: string;
  steps: TestStepSnapshot[];
  expectedResult?: string;
  priority?: number;
  testType?: string;
  tags: string[];
  checksum: string;
}

/**
 * テストステップスナップショット
 */
export interface TestStepSnapshot {
  stepNumber: number;
  action: string;
  expectedResult?: string;
  data?: string;
}

/**
 * マージリクエスト
 */
export interface MergeRequest {
  id: string;
  testSpecId: string;
  sourceBranchId: string;
  targetBranchId: string;
  title: string;
  description?: string;
  status: MergeStatus;
  conflicts: MergeConflict[];
  createdBy: string;
  createdAt: Date;
  mergedAt?: Date;
  mergedBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * マージコンフリクト
 */
export interface MergeConflict {
  id: string;
  testCaseId: string;
  testCaseName: string;
  conflictType: ConflictType;
  sourceContent: TestCaseSnapshot;
  targetContent: TestCaseSnapshot;
  resolution?: ConflictResolution;
  isResolved: boolean;
}

/**
 * コンフリクト解決
 */
export interface ConflictResolution {
  type: ResolutionType;
  resolvedContent?: TestCaseSnapshot;
  resolvedBy: string;
  resolvedAt: Date;
  comment?: string;
}

/**
 * ブランチ比較結果
 */
export interface BranchComparison {
  sourceBranchId: string;
  targetBranchId: string;
  addedTestCases: TestCaseSnapshot[];
  removedTestCases: TestCaseSnapshot[];
  modifiedTestCases: TestCaseModification[];
  unchangedCount: number;
}

/**
 * テストケース変更
 */
export interface TestCaseModification {
  testCaseId: string;
  testCaseName: string;
  sourceSnapshot: TestCaseSnapshot;
  targetSnapshot: TestCaseSnapshot;
  changes: string[];
}

/**
 * ブランチ履歴
 */
export interface BranchHistory {
  id: string;
  branchId: string;
  action: 'CREATE' | 'UPDATE' | 'MERGE' | 'DELETE' | 'FREEZE';
  description: string;
  userId: string;
  userName?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ====================================
// API Types
// ====================================

/**
 * ブランチ作成リクエスト
 */
export interface CreateBranchRequest {
  name: string;
  description?: string;
  type: BranchType;
  parentBranchId?: string;
  copyTestCases?: boolean;
}

/**
 * マージリクエスト作成
 */
export interface CreateMergeRequest {
  sourceBranchId: string;
  targetBranchId: string;
  title: string;
  description?: string;
}

/**
 * コンフリクト解決リクエスト
 */
export interface ResolveConflictRequest {
  conflictId: string;
  resolutionType: ResolutionType;
  resolvedContent?: TestCaseSnapshot;
  comment?: string;
}

/**
 * ブランチレスポンス
 */
export interface BranchResponse {
  id: string;
  testSpecId: string;
  name: string;
  description?: string;
  type: BranchType;
  status: BranchStatus;
  parentBranchId?: string;
  parentBranchName?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  testCaseCount?: number;
  latestSnapshot?: BranchSnapshot;
  metadata?: Record<string, unknown>;
}

/**
 * マージリクエストレスポンス
 */
export interface MergeRequestResponse {
  id: string;
  testSpecId: string;
  sourceBranch: BranchResponse;
  targetBranch: BranchResponse;
  title: string;
  description?: string;
  status: MergeStatus;
  conflicts: MergeConflict[];
  conflictCount: number;
  resolvedCount: number;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  mergedAt?: string;
  mergedBy?: string;
  mergedByName?: string;
}

// ====================================
// Utility Functions
// ====================================

/**
 * ブランチステータスのラベルを取得
 */
export function getBranchStatusLabel(status: BranchStatus): string {
  const labels: Record<BranchStatus, string> = {
    [BranchStatus.ACTIVE]: 'アクティブ',
    [BranchStatus.MERGED]: 'マージ済み',
    [BranchStatus.DELETED]: '削除済み',
    [BranchStatus.FROZEN]: '凍結',
  };
  return labels[status] || status;
}

/**
 * ブランチステータスの色を取得
 */
export function getBranchStatusColor(status: BranchStatus): string {
  const colors: Record<BranchStatus, string> = {
    [BranchStatus.ACTIVE]: 'green',
    [BranchStatus.MERGED]: 'blue',
    [BranchStatus.DELETED]: 'gray',
    [BranchStatus.FROZEN]: 'orange',
  };
  return colors[status] || 'gray';
}

/**
 * ブランチタイプのラベルを取得
 */
export function getBranchTypeLabel(type: BranchType): string {
  const labels: Record<BranchType, string> = {
    [BranchType.MASTER]: 'マスター',
    [BranchType.FEATURE]: 'フィーチャー',
    [BranchType.RELEASE]: 'リリース',
    [BranchType.HOTFIX]: 'ホットフィックス',
    [BranchType.EXPERIMENTAL]: '実験',
  };
  return labels[type] || type;
}

/**
 * ブランチタイプの色を取得
 */
export function getBranchTypeColor(type: BranchType): string {
  const colors: Record<BranchType, string> = {
    [BranchType.MASTER]: 'purple',
    [BranchType.FEATURE]: 'blue',
    [BranchType.RELEASE]: 'green',
    [BranchType.HOTFIX]: 'red',
    [BranchType.EXPERIMENTAL]: 'orange',
  };
  return colors[type] || 'gray';
}

/**
 * マージステータスのラベルを取得
 */
export function getMergeStatusLabel(status: MergeStatus): string {
  const labels: Record<MergeStatus, string> = {
    [MergeStatus.PENDING]: '保留中',
    [MergeStatus.IN_PROGRESS]: '進行中',
    [MergeStatus.COMPLETED]: '完了',
    [MergeStatus.CONFLICT]: 'コンフリクト',
    [MergeStatus.CANCELLED]: 'キャンセル',
  };
  return labels[status] || status;
}

/**
 * マージステータスの色を取得
 */
export function getMergeStatusColor(status: MergeStatus): string {
  const colors: Record<MergeStatus, string> = {
    [MergeStatus.PENDING]: 'yellow',
    [MergeStatus.IN_PROGRESS]: 'blue',
    [MergeStatus.COMPLETED]: 'green',
    [MergeStatus.CONFLICT]: 'red',
    [MergeStatus.CANCELLED]: 'gray',
  };
  return colors[status] || 'gray';
}

/**
 * コンフリクトタイプのラベルを取得
 */
export function getConflictTypeLabel(type: ConflictType): string {
  const labels: Record<ConflictType, string> = {
    [ConflictType.CONTENT_MODIFIED]: 'コンテンツ変更',
    [ConflictType.DELETE_MODIFY]: '削除と変更',
    [ConflictType.BOTH_ADDED]: '両方追加',
    [ConflictType.RENAME]: '名前変更',
  };
  return labels[type] || type;
}

/**
 * 解決策タイプのラベルを取得
 */
export function getResolutionTypeLabel(type: ResolutionType): string {
  const labels: Record<ResolutionType, string> = {
    [ResolutionType.USE_SOURCE]: 'ソースを使用',
    [ResolutionType.USE_TARGET]: 'ターゲットを使用',
    [ResolutionType.MANUAL_MERGE]: '手動マージ',
    [ResolutionType.SKIP]: 'スキップ',
  };
  return labels[type] || type;
}

/**
 * 空のブランチを作成
 */
export function createEmptyBranch(
  testSpecId: string
): Omit<Branch, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    testSpecId,
    name: '',
    type: BranchType.FEATURE,
    status: BranchStatus.ACTIVE,
    createdBy: '',
  };
}

/**
 * ブランチ名のバリデーション
 */
export function validateBranchName(name: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!name || name.trim().length === 0) {
    errors.push('ブランチ名は必須です');
  } else {
    if (name.length < 2) {
      errors.push('ブランチ名は2文字以上で入力してください');
    }
    if (name.length > 100) {
      errors.push('ブランチ名は100文字以内で入力してください');
    }
    if (!/^[a-zA-Z0-9_\-\/\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/.test(name)) {
      errors.push('ブランチ名に使用できない文字が含まれています');
    }
    if (name.toLowerCase() === 'master' || name.toLowerCase() === 'main') {
      errors.push('master/mainは予約語のため使用できません');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ブランチのバリデーション
 */
export function validateBranch(branch: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const nameValidation = validateBranchName(branch.name);
  if (!nameValidation.valid) {
    errors.push(...nameValidation.errors);
  }

  if (!branch.testSpecId) {
    errors.push('テスト仕様書IDは必須です');
  }

  if (!Object.values(BranchType).includes(branch.type)) {
    errors.push('無効なブランチタイプです');
  }

  if (!Object.values(BranchStatus).includes(branch.status)) {
    errors.push('無効なブランチステータスです');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * テストケースのチェックサムを計算
 */
export function calculateTestCaseChecksum(testCase: Omit<TestCaseSnapshot, 'checksum'>): string {
  const content = JSON.stringify({
    title: testCase.title,
    description: testCase.description,
    preconditions: testCase.preconditions,
    steps: testCase.steps,
    expectedResult: testCase.expectedResult,
    priority: testCase.priority,
    testType: testCase.testType,
    tags: testCase.tags.sort(),
  });

  // Simple hash function for browser compatibility
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * 2つのテストケーススナップショットを比較
 */
export function compareTestCases(
  source: TestCaseSnapshot,
  target: TestCaseSnapshot
): { equal: boolean; changes: string[] } {
  const changes: string[] = [];

  if (source.title !== target.title) {
    changes.push('タイトルが変更されました');
  }
  if (source.description !== target.description) {
    changes.push('説明が変更されました');
  }
  if (source.preconditions !== target.preconditions) {
    changes.push('前提条件が変更されました');
  }
  if (source.expectedResult !== target.expectedResult) {
    changes.push('期待結果が変更されました');
  }
  if (source.priority !== target.priority) {
    changes.push('優先度が変更されました');
  }
  if (source.testType !== target.testType) {
    changes.push('テストタイプが変更されました');
  }

  // Compare steps
  if (source.steps.length !== target.steps.length) {
    changes.push(`ステップ数が変更されました (${source.steps.length} -> ${target.steps.length})`);
  } else {
    for (let i = 0; i < source.steps.length; i++) {
      if (
        source.steps[i].action !== target.steps[i].action ||
        source.steps[i].expectedResult !== target.steps[i].expectedResult ||
        source.steps[i].data !== target.steps[i].data
      ) {
        changes.push(`ステップ${i + 1}が変更されました`);
      }
    }
  }

  // Compare tags
  const sourceTags = new Set(source.tags);
  const targetTags = new Set(target.tags);
  if (sourceTags.size !== targetTags.size || ![...sourceTags].every((tag) => targetTags.has(tag))) {
    changes.push('タグが変更されました');
  }

  return {
    equal: changes.length === 0,
    changes,
  };
}

/**
 * ブランチパスを生成（親ブランチ階層）
 */
export function generateBranchPath(
  branches: Branch[],
  branchId: string
): { id: string; name: string }[] {
  const path: { id: string; name: string }[] = [];
  let current = branches.find((b) => b.id === branchId);

  while (current) {
    path.unshift({ id: current.id, name: current.name });
    current = current.parentBranchId
      ? branches.find((b) => b.id === current!.parentBranchId)
      : undefined;
  }

  return path;
}
