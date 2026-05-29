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
  // テスト仕様書関連
  | 'TEST_SPEC_CREATE'
  | 'TEST_SPEC_UPDATE'
  | 'TEST_SPEC_DELETE'
  | 'TEST_SPEC_VERSION_CREATE'
  | 'TEST_SPEC_LOCK'
  | 'TEST_SPEC_UNLOCK'
  // テストセクション関連
  | 'TEST_SECTION_CREATE'
  | 'TEST_SECTION_UPDATE'
  | 'TEST_SECTION_DELETE'
  | 'TEST_SECTION_MOVE'
  | 'TEST_SECTION_REORDER'
  // テストケース関連
  | 'TEST_CASE_CREATE'
  | 'TEST_CASE_UPDATE'
  | 'TEST_CASE_DELETE'
  | 'TEST_CASE_COPY'
  | 'TEST_CASE_MOVE'
  | 'TEST_CASE_RESTORE'
  // タグ関連
  | 'TAG_CREATE'
  | 'TAG_UPDATE'
  | 'TAG_DELETE'
  // テスト手順関連
  | 'TEST_STEP_CREATE'
  | 'TEST_STEP_UPDATE'
  | 'TEST_STEP_DELETE'
  | 'TEST_STEP_REORDER'
  // テストパラメータ関連
  | 'TEST_PARAMETER_CREATE'
  | 'TEST_PARAMETER_UPDATE'
  | 'TEST_PARAMETER_DELETE'
  // 監査レビュー関連
  | 'AUDIT_REVIEW_SUBMIT'
  | 'AUDIT_REVIEW_APPROVE'
  | 'AUDIT_REVIEW_REJECT'
  // 設定関連
  | 'PASSWORD_POLICY_UPDATE'
  | 'SESSION_SETTINGS_UPDATE'
  | 'LANGUAGE_CHANGE'
  // プロジェクトレベル関連
  | 'PROJECT_LEVEL_CREATE'
  | 'PROJECT_LEVEL_UPDATE'
  | 'PROJECT_LEVEL_DELETE'
  // UIスクリプト関連
  | 'UI_SCRIPT_CREATE'
  | 'UI_SCRIPT_UPDATE'
  | 'UI_SCRIPT_DELETE'
  // ウォッチリスト関連
  | 'WATCHLIST_ADD'
  | 'WATCHLIST_UPDATE'
  | 'WATCHLIST_REMOVE'
  // その他
  | 'AUDIT_LOG_EXPORT';

// ターゲットタイプ
export type AuditTargetType =
  | 'USER'
  | 'ROLE'
  | 'PROJECT'
  | 'PROJECT_MEMBER'
  | 'PROJECT_LEVEL'
  | 'UI_SCRIPT'
  | 'TEST_SPEC'
  | 'TEST_SECTION'
  | 'TEST_CASE'
  | 'TEST_STEP'
  | 'TEST_PARAMETER'
  | 'AUDIT_REVIEW'
  | 'TAG'
  | 'PASSWORD_POLICY'
  | 'SESSION_SETTINGS'
  | 'AUDIT_LOG'
  | 'WATCHLIST'
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
  // テスト仕様書関連
  TEST_SPEC_CREATE: 'テスト仕様書作成',
  TEST_SPEC_UPDATE: 'テスト仕様書更新',
  TEST_SPEC_DELETE: 'テスト仕様書削除',
  TEST_SPEC_VERSION_CREATE: 'テスト仕様書バージョン作成',
  TEST_SPEC_LOCK: 'テスト仕様書ロック',
  TEST_SPEC_UNLOCK: 'テスト仕様書ロック解除',
  // テストセクション関連
  TEST_SECTION_CREATE: 'テストセクション作成',
  TEST_SECTION_UPDATE: 'テストセクション更新',
  TEST_SECTION_DELETE: 'テストセクション削除',
  TEST_SECTION_MOVE: 'テストセクション移動',
  TEST_SECTION_REORDER: 'テストセクション並び替え',
  // テストケース関連
  TEST_CASE_CREATE: 'テストケース作成',
  TEST_CASE_UPDATE: 'テストケース更新',
  TEST_CASE_DELETE: 'テストケース削除',
  TEST_CASE_COPY: 'テストケースコピー',
  TEST_CASE_MOVE: 'テストケース移動',
  TEST_CASE_RESTORE: 'テストケース復元',
  // タグ関連
  TAG_CREATE: 'タグ作成',
  TAG_UPDATE: 'タグ更新',
  TAG_DELETE: 'タグ削除',
  // テスト手順関連
  TEST_STEP_CREATE: 'テスト手順作成',
  TEST_STEP_UPDATE: 'テスト手順更新',
  TEST_STEP_DELETE: 'テスト手順削除',
  TEST_STEP_REORDER: 'テスト手順並び替え',
  // テストパラメータ関連
  TEST_PARAMETER_CREATE: 'テストパラメータ作成',
  TEST_PARAMETER_UPDATE: 'テストパラメータ更新',
  TEST_PARAMETER_DELETE: 'テストパラメータ削除',
  // 監査レビュー関連
  AUDIT_REVIEW_SUBMIT: '監査レビュー提出',
  AUDIT_REVIEW_APPROVE: '監査レビュー承認',
  AUDIT_REVIEW_REJECT: '監査レビュー却下',
  // 設定関連
  PASSWORD_POLICY_UPDATE: 'パスワードポリシー更新',
  SESSION_SETTINGS_UPDATE: 'セッション設定更新',
  LANGUAGE_CHANGE: '言語設定変更',
  // プロジェクトレベル関連
  PROJECT_LEVEL_CREATE: 'プロジェクトレベル作成',
  PROJECT_LEVEL_UPDATE: 'プロジェクトレベル更新',
  PROJECT_LEVEL_DELETE: 'プロジェクトレベル削除',
  // UIスクリプト関連
  UI_SCRIPT_CREATE: 'UIスクリプト作成',
  UI_SCRIPT_UPDATE: 'UIスクリプト更新',
  UI_SCRIPT_DELETE: 'UIスクリプト削除',
  // ウォッチリスト関連
  WATCHLIST_ADD: 'ウォッチリスト追加',
  WATCHLIST_UPDATE: 'ウォッチリスト更新',
  WATCHLIST_REMOVE: 'ウォッチリスト削除',
  // その他
  AUDIT_LOG_EXPORT: '監査ログエクスポート',
};

// ターゲットタイプラベル
export const AUDIT_TARGET_TYPE_LABELS: Record<AuditTargetType, string> = {
  USER: 'ユーザー',
  ROLE: 'ロール',
  PROJECT: 'プロジェクト',
  PROJECT_MEMBER: 'プロジェクトメンバー',
  PROJECT_LEVEL: 'プロジェクトレベル',
  UI_SCRIPT: 'UIスクリプト',
  TEST_SPEC: 'テスト仕様書',
  TEST_SECTION: 'テストセクション',
  TEST_CASE: 'テストケース',
  TEST_STEP: 'テスト手順',
  TEST_PARAMETER: 'テストパラメータ',
  AUDIT_REVIEW: '監査レビュー',
  TAG: 'タグ',
  PASSWORD_POLICY: 'パスワードポリシー',
  SESSION_SETTINGS: 'セッション設定',
  AUDIT_LOG: '監査ログ',
  WATCHLIST: 'ウォッチリスト',
  SYSTEM: 'システム',
};

// アクションカテゴリ
export type AuditActionCategory =
  | 'auth'
  | 'user'
  | 'role'
  | 'project'
  | 'test_spec'
  | 'test_section'
  | 'test_case'
  | 'test_step'
  | 'test_parameter'
  | 'audit_review'
  | 'tag'
  | 'settings'
  | 'other';

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
  if (
    action === 'TEST_SPEC_CREATE' ||
    action === 'TEST_SPEC_UPDATE' ||
    action === 'TEST_SPEC_DELETE' ||
    action === 'TEST_SPEC_VERSION_CREATE' ||
    action === 'TEST_SPEC_LOCK' ||
    action === 'TEST_SPEC_UNLOCK'
  ) {
    return 'test_spec';
  }
  if (
    action === 'TEST_SECTION_CREATE' ||
    action === 'TEST_SECTION_UPDATE' ||
    action === 'TEST_SECTION_DELETE' ||
    action === 'TEST_SECTION_MOVE' ||
    action === 'TEST_SECTION_REORDER'
  ) {
    return 'test_section';
  }
  if (
    action === 'TEST_CASE_CREATE' ||
    action === 'TEST_CASE_UPDATE' ||
    action === 'TEST_CASE_DELETE' ||
    action === 'TEST_CASE_COPY' ||
    action === 'TEST_CASE_MOVE' ||
    action === 'TEST_CASE_RESTORE'
  ) {
    return 'test_case';
  }
  if (
    action === 'TEST_STEP_CREATE' ||
    action === 'TEST_STEP_UPDATE' ||
    action === 'TEST_STEP_DELETE' ||
    action === 'TEST_STEP_REORDER'
  ) {
    return 'test_step';
  }
  if (
    action === 'TEST_PARAMETER_CREATE' ||
    action === 'TEST_PARAMETER_UPDATE' ||
    action === 'TEST_PARAMETER_DELETE'
  ) {
    return 'test_parameter';
  }
  if (
    action === 'AUDIT_REVIEW_SUBMIT' ||
    action === 'AUDIT_REVIEW_APPROVE' ||
    action === 'AUDIT_REVIEW_REJECT'
  ) {
    return 'audit_review';
  }
  if (action === 'TAG_CREATE' || action === 'TAG_UPDATE' || action === 'TAG_DELETE') {
    return 'tag';
  }
  if (
    action === 'PASSWORD_POLICY_UPDATE' ||
    action === 'SESSION_SETTINGS_UPDATE' ||
    action === 'LANGUAGE_CHANGE' ||
    action === 'PROJECT_LEVEL_CREATE' ||
    action === 'PROJECT_LEVEL_UPDATE' ||
    action === 'PROJECT_LEVEL_DELETE' ||
    action === 'UI_SCRIPT_CREATE' ||
    action === 'UI_SCRIPT_UPDATE' ||
    action === 'UI_SCRIPT_DELETE'
  ) {
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
  test_spec: 'テスト仕様書',
  test_section: 'テストセクション',
  test_case: 'テストケース',
  test_step: 'テスト手順',
  test_parameter: 'テストパラメータ',
  audit_review: '監査レビュー',
  tag: 'タグ',
  settings: '設定',
  other: 'その他',
};
