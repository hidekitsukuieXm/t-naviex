// 監査ログアクション
export type AuditAction =
  // 認証関連
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET'
  // ユーザー関連
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_LOCK'
  | 'USER_UNLOCK'
  // ロール関連
  | 'ROLE_CREATE'
  | 'ROLE_UPDATE'
  | 'ROLE_DELETE'
  // プロジェクト関連
  | 'PROJECT_CREATE'
  | 'PROJECT_UPDATE'
  | 'PROJECT_DELETE'
  | 'PROJECT_MEMBER_ADD'
  | 'PROJECT_MEMBER_UPDATE'
  | 'PROJECT_MEMBER_REMOVE'
  // 設定関連
  | 'PASSWORD_POLICY_UPDATE'
  | 'SESSION_SETTINGS_UPDATE'
  // その他
  | 'AUDIT_LOG_EXPORT';

// ターゲットタイプ
export type AuditTargetType =
  | 'USER'
  | 'ROLE'
  | 'PROJECT'
  | 'PROJECT_MEMBER'
  | 'PASSWORD_POLICY'
  | 'SESSION_SETTINGS'
  | 'AUDIT_LOG'
  | 'SYSTEM';

// 監査ログエントリ
export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// 監査ログ作成用データ
export interface CreateAuditLogInput {
  userId?: bigint | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: bigint | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// 監査ログ検索パラメータ
export interface AuditLogSearchParams {
  userId?: string;
  action?: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'action' | 'targetType';
  sortOrder?: 'asc' | 'desc';
}

// 監査ログ一覧レスポンス
export interface AuditLogListResponse {
  auditLogs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// アクションラベル
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  // 認証関連
  LOGIN: 'ログイン',
  LOGOUT: 'ログアウト',
  LOGIN_FAILED: 'ログイン失敗',
  PASSWORD_CHANGE: 'パスワード変更',
  PASSWORD_RESET_REQUEST: 'パスワードリセット要求',
  PASSWORD_RESET: 'パスワードリセット',
  // ユーザー関連
  USER_CREATE: 'ユーザー作成',
  USER_UPDATE: 'ユーザー更新',
  USER_DELETE: 'ユーザー削除',
  USER_LOCK: 'アカウントロック',
  USER_UNLOCK: 'アカウントロック解除',
  // ロール関連
  ROLE_CREATE: 'ロール作成',
  ROLE_UPDATE: 'ロール更新',
  ROLE_DELETE: 'ロール削除',
  // プロジェクト関連
  PROJECT_CREATE: 'プロジェクト作成',
  PROJECT_UPDATE: 'プロジェクト更新',
  PROJECT_DELETE: 'プロジェクト削除',
  PROJECT_MEMBER_ADD: 'プロジェクトメンバー追加',
  PROJECT_MEMBER_UPDATE: 'プロジェクトメンバー更新',
  PROJECT_MEMBER_REMOVE: 'プロジェクトメンバー削除',
  // 設定関連
  PASSWORD_POLICY_UPDATE: 'パスワードポリシー更新',
  SESSION_SETTINGS_UPDATE: 'セッション設定更新',
  // その他
  AUDIT_LOG_EXPORT: '監査ログエクスポート',
};

// ターゲットタイプラベル
export const AUDIT_TARGET_TYPE_LABELS: Record<AuditTargetType, string> = {
  USER: 'ユーザー',
  ROLE: 'ロール',
  PROJECT: 'プロジェクト',
  PROJECT_MEMBER: 'プロジェクトメンバー',
  PASSWORD_POLICY: 'パスワードポリシー',
  SESSION_SETTINGS: 'セッション設定',
  AUDIT_LOG: '監査ログ',
  SYSTEM: 'システム',
};

// アクションカテゴリ
export type AuditActionCategory = 'auth' | 'user' | 'role' | 'project' | 'settings' | 'other';

// アクションのカテゴリを取得
export function getActionCategory(action: AuditAction): AuditActionCategory {
  if (
    action === 'LOGIN' ||
    action === 'LOGOUT' ||
    action === 'LOGIN_FAILED' ||
    action === 'PASSWORD_CHANGE' ||
    action === 'PASSWORD_RESET_REQUEST' ||
    action === 'PASSWORD_RESET'
  ) {
    return 'auth';
  }
  if (
    action === 'USER_CREATE' ||
    action === 'USER_UPDATE' ||
    action === 'USER_DELETE' ||
    action === 'USER_LOCK' ||
    action === 'USER_UNLOCK'
  ) {
    return 'user';
  }
  if (action === 'ROLE_CREATE' || action === 'ROLE_UPDATE' || action === 'ROLE_DELETE') {
    return 'role';
  }
  if (
    action === 'PROJECT_CREATE' ||
    action === 'PROJECT_UPDATE' ||
    action === 'PROJECT_DELETE' ||
    action === 'PROJECT_MEMBER_ADD' ||
    action === 'PROJECT_MEMBER_UPDATE' ||
    action === 'PROJECT_MEMBER_REMOVE'
  ) {
    return 'project';
  }
  if (action === 'PASSWORD_POLICY_UPDATE' || action === 'SESSION_SETTINGS_UPDATE') {
    return 'settings';
  }
  return 'other';
}

// アクションカテゴリラベル
export const AUDIT_ACTION_CATEGORY_LABELS: Record<AuditActionCategory, string> = {
  auth: '認証',
  user: 'ユーザー',
  role: 'ロール',
  project: 'プロジェクト',
  settings: '設定',
  other: 'その他',
};
