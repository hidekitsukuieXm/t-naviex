// ウォッチリストの型定義

// ウォッチリストエンティティタイプ
export type WatchlistEntityType = 'PROJECT' | 'TEST_SPEC' | 'TEST_CASE' | 'TEST_RUN' | 'BUG';

// エンティティタイプラベル
export const WATCHLIST_ENTITY_TYPE_LABELS: Record<WatchlistEntityType, string> = {
  PROJECT: 'プロジェクト',
  TEST_SPEC: 'テスト仕様書',
  TEST_CASE: 'テストケース',
  TEST_RUN: 'テストラン',
  BUG: 'バグ',
};

// ウォッチリスト項目
export interface WatchlistItem {
  id: string;
  userId: string;
  entityType: WatchlistEntityType;
  entityId: string;
  entityName?: string; // 表示用（結合で取得）
  notifyEmail: boolean;
  notifyInApp: boolean;
  createdAt: string;
}

// ウォッチリスト追加用データ
export interface AddWatchlistData {
  entityType: WatchlistEntityType;
  entityId: string;
  notifyEmail?: boolean;
  notifyInApp?: boolean;
}

// ウォッチリスト更新用データ
export interface UpdateWatchlistData {
  notifyEmail?: boolean;
  notifyInApp?: boolean;
}

// ウォッチリスト一覧レスポンス
export interface WatchlistResponse {
  items: WatchlistItem[];
  total: number;
}

// ウォッチステータス
export interface WatchStatus {
  isWatching: boolean;
  item: WatchlistItem | null;
}

// バリデーション
export function validateWatchlistData(data: AddWatchlistData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.entityType) {
    errors.push('エンティティタイプは必須です。');
  } else if (!['PROJECT', 'TEST_SPEC', 'TEST_CASE', 'TEST_RUN', 'BUG'].includes(data.entityType)) {
    errors.push('無効なエンティティタイプです。');
  }

  if (!data.entityId) {
    errors.push('エンティティIDは必須です。');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ウォッチ通知設定の検証
export function isNotificationEnabled(
  item: WatchlistItem,
  notificationType: 'email' | 'inApp'
): boolean {
  if (notificationType === 'email') {
    return item.notifyEmail;
  }
  return item.notifyInApp;
}
