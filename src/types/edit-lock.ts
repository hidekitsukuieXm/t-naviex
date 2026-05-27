/**
 * Edit Lock Types
 *
 * 編集ロック機能の型定義
 */

// ====================================
// Enums
// ====================================

/**
 * ロック対象タイプ
 */
export const LockTargetType = {
  TEST_CASE: 'TEST_CASE',
  TEST_SPEC: 'TEST_SPEC',
  TEST_SECTION: 'TEST_SECTION',
} as const;

export type LockTargetType = (typeof LockTargetType)[keyof typeof LockTargetType];

// ====================================
// Core Types
// ====================================

/**
 * 編集ロック
 */
export interface EditLock {
  id: string;
  targetType: LockTargetType;
  targetId: string;
  userId: string;
  userName?: string;
  lockedAt: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * ロック取得リクエスト
 */
export interface AcquireLockRequest {
  targetType: LockTargetType;
  targetId: string;
  duration?: number; // ロック時間（分）、デフォルト30分
}

/**
 * ロック取得レスポンス
 */
export interface AcquireLockResponse {
  lock: EditLock;
  acquired: boolean;
  message?: string;
}

/**
 * ロック解放リクエスト
 */
export interface ReleaseLockRequest {
  targetType: LockTargetType;
  targetId: string;
}

/**
 * ロック状態チェックレスポンス
 */
export interface LockStatusResponse {
  isLocked: boolean;
  lock?: EditLock;
  isOwnLock?: boolean;
  remainingTime?: number; // 残り時間（秒）
}

/**
 * 強制ロック解除リクエスト
 */
export interface ForceReleaseLockRequest {
  targetType: LockTargetType;
  targetId: string;
  reason?: string;
}

// ====================================
// Utility Functions
// ====================================

/**
 * ロック対象タイプのラベルを取得
 */
export function getLockTargetTypeLabel(type: LockTargetType): string {
  const labels: Record<LockTargetType, string> = {
    [LockTargetType.TEST_CASE]: 'テストケース',
    [LockTargetType.TEST_SPEC]: 'テスト仕様書',
    [LockTargetType.TEST_SECTION]: 'テストセクション',
  };
  return labels[type] || type;
}

/**
 * ロックが有効かどうかを判定
 */
export function isLockValid(lock: EditLock | undefined): boolean {
  if (!lock) return false;
  return new Date(lock.expiresAt) > new Date();
}

/**
 * ロックの残り時間を計算（秒）
 */
export function getRemainingLockTime(lock: EditLock | undefined): number {
  if (!lock) return 0;
  const now = new Date();
  const expires = new Date(lock.expiresAt);
  const remaining = Math.max(0, (expires.getTime() - now.getTime()) / 1000);
  return Math.floor(remaining);
}

/**
 * 残り時間をフォーマット
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '期限切れ';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  }

  if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  }

  return `${secs}秒`;
}

/**
 * ロック期限までの時間を計算
 */
export function getLockExpirationTime(durationMinutes: number = 30): Date {
  const now = new Date();
  return new Date(now.getTime() + durationMinutes * 60 * 1000);
}

/**
 * デフォルトのロック時間（分）
 */
export const DEFAULT_LOCK_DURATION = 30;

/**
 * 最大ロック時間（分）
 */
export const MAX_LOCK_DURATION = 120;

/**
 * ロック更新間隔（秒）- クライアント側でハートビートを送る間隔
 */
export const LOCK_HEARTBEAT_INTERVAL = 60;

/**
 * ロック警告閾値（秒）- 残り時間がこれ以下になったら警告
 */
export const LOCK_WARNING_THRESHOLD = 300;
