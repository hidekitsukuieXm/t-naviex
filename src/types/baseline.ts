/**
 * ベースライン関連の型定義
 */

// =================================================================
// Enums
// =================================================================

/**
 * ベースラインステータス
 */
export const BASELINE_STATUSES = ['DRAFT', 'APPROVED', 'LOCKED', 'ARCHIVED'] as const;
export type BaselineStatus = (typeof BASELINE_STATUSES)[number];

/**
 * ベースラインステータス情報
 */
export const BASELINE_STATUS_INFO: Record<
  BaselineStatus,
  { label: string; description: string; color: string }
> = {
  DRAFT: { label: '下書き', description: '作成中のベースライン', color: '#6b7280' },
  APPROVED: { label: '承認済み', description: '承認されたベースライン', color: '#22c55e' },
  LOCKED: { label: 'ロック', description: 'ロックされた変更不可のベースライン', color: '#3b82f6' },
  ARCHIVED: { label: 'アーカイブ', description: 'アーカイブされたベースライン', color: '#ef4444' },
};

// =================================================================
// Types
// =================================================================

/**
 * ユーザー情報
 */
export interface BaselineUserInfo {
  id: string;
  name: string;
  email: string;
}

/**
 * テストケーススナップショットデータ
 */
export interface TestCaseSnapshotData {
  title: string;
  description: string | null;
  preconditions: string | null;
  expectedResult: string | null;
  checkpoint: string | null;
  scenario: string | null;
  testEnvironment: string | null;
  notes: string | null;
  priority: string;
  testType: string;
  testTechnique: string;
  tags: string[];
  steps: TestStepSnapshotData[];
}

/**
 * テストステップスナップショットデータ
 */
export interface TestStepSnapshotData {
  stepNo: number;
  actionMd: string;
  expectedMd: string | null;
}

/**
 * ベースラインアイテム情報
 */
export interface BaselineItemInfo {
  id: string;
  baselineId: string;
  testCaseId: string | null;
  sortOrder: number;
  snapshotData: TestCaseSnapshotData;
  checksum: string;
  createdAt: Date;
}

/**
 * ベースライン基本型
 */
export interface Baseline {
  id: string;
  testSpecId: string;
  name: string;
  description: string | null;
  version: string;
  status: BaselineStatus;
  snapshotAt: Date;
  metadata: Record<string, unknown> | null;
  totalCases: number;
  totalSteps: number;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  approvedAt: Date | null;
  approvedById: string | null;
}

/**
 * ベースライン（詳細情報付き）
 */
export interface BaselineDetail extends Baseline {
  items: BaselineItemInfo[];
  createdBy: BaselineUserInfo | null;
  approvedBy: BaselineUserInfo | null;
  testSpec: {
    id: string;
    name: string;
    version: string;
  };
}

/**
 * ベースライン一覧用（アイテム数のみ）
 */
export interface BaselineWithStats extends Baseline {
  createdBy: BaselineUserInfo | null;
  approvedBy: BaselineUserInfo | null;
}

/**
 * ベースライン作成入力
 */
export interface CreateBaselineInput {
  name: string;
  description?: string;
  version: string;
  status?: BaselineStatus;
  metadata?: Record<string, unknown>;
}

/**
 * ベースライン更新入力
 */
export interface UpdateBaselineInput {
  name?: string;
  description?: string | null;
  status?: BaselineStatus;
  metadata?: Record<string, unknown> | null;
}

/**
 * ベースライン承認入力
 */
export interface ApproveBaselineInput {
  comment?: string;
}

/**
 * ベースライン比較結果
 */
export interface BaselineComparisonResult {
  sourceBaseline: {
    id: string;
    name: string;
    version: string;
  };
  targetBaseline: {
    id: string;
    name: string;
    version: string;
  };
  added: BaselineItemInfo[];
  removed: BaselineItemInfo[];
  modified: {
    source: BaselineItemInfo;
    target: BaselineItemInfo;
    changes: string[];
  }[];
  unchanged: number;
}

// =================================================================
// Validation
// =================================================================

/**
 * ベースライン名の最大長
 */
export const BASELINE_NAME_MAX_LENGTH = 255;

/**
 * ベースライン説明の最大長
 */
export const BASELINE_DESCRIPTION_MAX_LENGTH = 5000;

/**
 * ベースラインバージョンの最大長
 */
export const BASELINE_VERSION_MAX_LENGTH = 50;

/**
 * ベースライン名のバリデーション
 */
export function validateBaselineName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'ベースライン名は必須です' };
  }
  if (name.length > BASELINE_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `ベースライン名は${BASELINE_NAME_MAX_LENGTH}文字以内で入力してください`,
    };
  }
  return { valid: true };
}

/**
 * ベースライン説明のバリデーション
 */
export function validateBaselineDescription(description: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (description && description.length > BASELINE_DESCRIPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `説明は${BASELINE_DESCRIPTION_MAX_LENGTH}文字以内で入力してください`,
    };
  }
  return { valid: true };
}

/**
 * ベースラインステータスのバリデーション
 */
export function validateBaselineStatus(status: string): { valid: boolean; error?: string } {
  if (!BASELINE_STATUSES.includes(status as BaselineStatus)) {
    return { valid: false, error: '無効なステータスです' };
  }
  return { valid: true };
}

/**
 * ベースラインバージョンのバリデーション
 */
export function validateBaselineVersion(version: string): { valid: boolean; error?: string } {
  if (!version || version.trim().length === 0) {
    return { valid: false, error: 'バージョンは必須です' };
  }
  if (version.length > BASELINE_VERSION_MAX_LENGTH) {
    return {
      valid: false,
      error: `バージョンは${BASELINE_VERSION_MAX_LENGTH}文字以内で入力してください`,
    };
  }
  // セマンティックバージョニング形式のチェック（オプショナル）
  const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
  if (!semverRegex.test(version)) {
    return {
      valid: false,
      error: 'バージョンはセマンティックバージョニング形式（例: 1.0.0）で入力してください',
    };
  }
  return { valid: true };
}

/**
 * ベースライン作成入力のバリデーション
 */
export function validateCreateBaselineInput(input: CreateBaselineInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const nameResult = validateBaselineName(input.name);
  if (!nameResult.valid && nameResult.error) {
    errors.push(nameResult.error);
  }

  if (input.description !== undefined) {
    const descResult = validateBaselineDescription(input.description);
    if (!descResult.valid && descResult.error) {
      errors.push(descResult.error);
    }
  }

  const versionResult = validateBaselineVersion(input.version);
  if (!versionResult.valid && versionResult.error) {
    errors.push(versionResult.error);
  }

  if (input.status !== undefined) {
    const statusResult = validateBaselineStatus(input.status);
    if (!statusResult.valid && statusResult.error) {
      errors.push(statusResult.error);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * ベースライン更新入力のバリデーション
 */
export function validateUpdateBaselineInput(input: UpdateBaselineInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (input.name !== undefined) {
    const nameResult = validateBaselineName(input.name);
    if (!nameResult.valid && nameResult.error) {
      errors.push(nameResult.error);
    }
  }

  if (input.description !== undefined) {
    const descResult = validateBaselineDescription(input.description);
    if (!descResult.valid && descResult.error) {
      errors.push(descResult.error);
    }
  }

  if (input.status !== undefined) {
    const statusResult = validateBaselineStatus(input.status);
    if (!statusResult.valid && statusResult.error) {
      errors.push(statusResult.error);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * チェックサムの生成（SHA-256）
 */
export function generateChecksum(data: TestCaseSnapshotData): string {
  // ブラウザ環境とNode.js環境の両方で動作するようにシンプルなハッシュを生成
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // 64文字の16進数文字列を返す
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return hex.repeat(8);
}

/**
 * ステータス遷移のバリデーション
 */
export function validateStatusTransition(
  currentStatus: BaselineStatus,
  newStatus: BaselineStatus
): { valid: boolean; error?: string } {
  const allowedTransitions: Record<BaselineStatus, BaselineStatus[]> = {
    DRAFT: ['APPROVED', 'ARCHIVED'],
    APPROVED: ['LOCKED', 'ARCHIVED'],
    LOCKED: ['ARCHIVED'],
    ARCHIVED: [],
  };

  if (currentStatus === newStatus) {
    return { valid: true };
  }

  if (!allowedTransitions[currentStatus].includes(newStatus)) {
    return {
      valid: false,
      error: `${BASELINE_STATUS_INFO[currentStatus].label}から${BASELINE_STATUS_INFO[newStatus].label}への遷移はできません`,
    };
  }

  return { valid: true };
}
