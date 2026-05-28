// APIトークンスコープ
export type ApiTokenScope =
  | 'READ_PROJECTS'
  | 'WRITE_PROJECTS'
  | 'READ_TEST_SPECS'
  | 'WRITE_TEST_SPECS'
  | 'READ_TEST_CASES'
  | 'WRITE_TEST_CASES'
  | 'READ_TEST_RUNS'
  | 'WRITE_TEST_RUNS'
  | 'READ_BUGS'
  | 'WRITE_BUGS'
  | 'READ_USERS'
  | 'WRITE_USERS'
  | 'ADMIN';

// スコープラベル
export const API_TOKEN_SCOPE_LABELS: Record<ApiTokenScope, string> = {
  READ_PROJECTS: 'プロジェクト読み取り',
  WRITE_PROJECTS: 'プロジェクト書き込み',
  READ_TEST_SPECS: 'テスト仕様書読み取り',
  WRITE_TEST_SPECS: 'テスト仕様書書き込み',
  READ_TEST_CASES: 'テストケース読み取り',
  WRITE_TEST_CASES: 'テストケース書き込み',
  READ_TEST_RUNS: 'テストラン読み取り',
  WRITE_TEST_RUNS: 'テストラン書き込み',
  READ_BUGS: 'バグ読み取り',
  WRITE_BUGS: 'バグ書き込み',
  READ_USERS: 'ユーザー読み取り',
  WRITE_USERS: 'ユーザー書き込み',
  ADMIN: '管理者権限（全アクセス）',
};

// スコープの説明
export const API_TOKEN_SCOPE_DESCRIPTIONS: Record<ApiTokenScope, string> = {
  READ_PROJECTS: 'プロジェクト一覧・詳細の取得',
  WRITE_PROJECTS: 'プロジェクトの作成・更新・削除',
  READ_TEST_SPECS: 'テスト仕様書一覧・詳細の取得',
  WRITE_TEST_SPECS: 'テスト仕様書の作成・更新・削除',
  READ_TEST_CASES: 'テストケース一覧・詳細の取得',
  WRITE_TEST_CASES: 'テストケースの作成・更新・削除',
  READ_TEST_RUNS: 'テストラン一覧・結果の取得',
  WRITE_TEST_RUNS: 'テストランの作成・結果登録',
  READ_BUGS: 'バグ一覧・詳細の取得',
  WRITE_BUGS: 'バグの作成・更新・削除',
  READ_USERS: 'ユーザー一覧・詳細の取得',
  WRITE_USERS: 'ユーザーの作成・更新・削除',
  ADMIN: 'すべてのリソースへのフルアクセス',
};

// スコープグループ
export const API_TOKEN_SCOPE_GROUPS: { name: string; scopes: ApiTokenScope[] }[] = [
  {
    name: 'プロジェクト',
    scopes: ['READ_PROJECTS', 'WRITE_PROJECTS'],
  },
  {
    name: 'テスト仕様書',
    scopes: ['READ_TEST_SPECS', 'WRITE_TEST_SPECS'],
  },
  {
    name: 'テストケース',
    scopes: ['READ_TEST_CASES', 'WRITE_TEST_CASES'],
  },
  {
    name: 'テストラン',
    scopes: ['READ_TEST_RUNS', 'WRITE_TEST_RUNS'],
  },
  {
    name: 'バグ',
    scopes: ['READ_BUGS', 'WRITE_BUGS'],
  },
  {
    name: 'ユーザー',
    scopes: ['READ_USERS', 'WRITE_USERS'],
  },
  {
    name: '管理者',
    scopes: ['ADMIN'],
  },
];

// 全スコープ一覧
export const ALL_API_TOKEN_SCOPES: ApiTokenScope[] = [
  'READ_PROJECTS',
  'WRITE_PROJECTS',
  'READ_TEST_SPECS',
  'WRITE_TEST_SPECS',
  'READ_TEST_CASES',
  'WRITE_TEST_CASES',
  'READ_TEST_RUNS',
  'WRITE_TEST_RUNS',
  'READ_BUGS',
  'WRITE_BUGS',
  'READ_USERS',
  'WRITE_USERS',
  'ADMIN',
];

// APIトークン基本情報
export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  tokenPrefix: string;
  scopes: ApiTokenScope[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  isActive: boolean;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// APIトークン作成リクエスト
export interface CreateApiTokenRequest {
  name: string;
  scopes: ApiTokenScope[];
  expiresAt?: string | null; // ISO日付文字列
  ipWhitelists?: string[]; // IPアドレスまたはCIDRのリスト
}

// APIトークン作成レスポンス（トークン値は作成時のみ返却）
export interface CreateApiTokenResponse {
  token: ApiToken;
  plainToken: string; // プレーンテキストのトークン（一度だけ表示）
}

// APIトークン更新リクエスト
export interface UpdateApiTokenRequest {
  name?: string;
  scopes?: ApiTokenScope[];
  expiresAt?: string | null;
  isActive?: boolean;
}

// APIトークン失効リクエスト
export interface RevokeApiTokenRequest {
  reason?: string;
}

// APIトークン一覧レスポンス
export interface ApiTokenListResponse {
  tokens: ApiToken[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// APIトークン使用ログ
export interface ApiTokenUsageLog {
  id: string;
  tokenId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;
  responseTime: number | null;
  errorMessage: string | null;
  createdAt: string;
}

// APIトークン使用ログ一覧レスポンス
export interface ApiTokenUsageLogListResponse {
  logs: ApiTokenUsageLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// APIトークン使用統計
export interface ApiTokenUsageStats {
  tokenId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsByEndpoint: { endpoint: string; count: number }[];
  requestsByMethod: { method: string; count: number }[];
  requestsByDay: { date: string; count: number }[];
}

// IPホワイトリスト
export interface ApiTokenIpWhitelist {
  id: string;
  tokenId: string;
  ipAddress: string;
  description: string | null;
  createdAt: string;
}

// レート制限情報
export interface ApiRateLimitInfo {
  tokenId: string;
  windowStart: string;
  requestCount: number;
  maxRequests: number;
  windowMinutes: number;
  remaining: number;
  resetAt: string;
}

// トークン有効期限オプション
export const TOKEN_EXPIRATION_OPTIONS: { label: string; value: string | null }[] = [
  { label: '無期限', value: null },
  { label: '7日', value: '7d' },
  { label: '30日', value: '30d' },
  { label: '90日', value: '90d' },
  { label: '1年', value: '365d' },
];

// バリデーション関数

/**
 * トークン名のバリデーション
 */
export function validateTokenName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'トークン名は必須です。' };
  }
  if (name.length > 255) {
    return { valid: false, error: 'トークン名は255文字以内で入力してください。' };
  }
  if (name.length < 3) {
    return { valid: false, error: 'トークン名は3文字以上で入力してください。' };
  }
  return { valid: true };
}

/**
 * スコープのバリデーション
 */
export function validateScopes(scopes: ApiTokenScope[]): { valid: boolean; error?: string } {
  if (!scopes || scopes.length === 0) {
    return { valid: false, error: '少なくとも1つのスコープを選択してください。' };
  }
  const invalidScopes = scopes.filter((scope) => !ALL_API_TOKEN_SCOPES.includes(scope));
  if (invalidScopes.length > 0) {
    return { valid: false, error: `無効なスコープが含まれています: ${invalidScopes.join(', ')}` };
  }
  return { valid: true };
}

/**
 * 有効期限のバリデーション
 */
export function validateExpiresAt(expiresAt: string | null): { valid: boolean; error?: string } {
  if (expiresAt === null) {
    return { valid: true }; // 無期限は有効
  }
  const date = new Date(expiresAt);
  if (isNaN(date.getTime())) {
    return { valid: false, error: '有効期限の日付形式が正しくありません。' };
  }
  if (date <= new Date()) {
    return { valid: false, error: '有効期限は現在より後の日付を指定してください。' };
  }
  return { valid: true };
}

/**
 * IPアドレス/CIDRのバリデーション
 */
export function validateIpAddress(ip: string): { valid: boolean; error?: string } {
  // IPv4
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv4 CIDR
  const ipv4CidrRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[12][0-9]|3[0-2])$/;
  // IPv6（簡易版）
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  // IPv6 CIDR（簡易版）
  const ipv6CidrRegex =
    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\/(?:[0-9]|[1-9][0-9]|1[0-2][0-8])$/;

  if (
    ipv4Regex.test(ip) ||
    ipv4CidrRegex.test(ip) ||
    ipv6Regex.test(ip) ||
    ipv6CidrRegex.test(ip)
  ) {
    return { valid: true };
  }
  return { valid: false, error: '有効なIPアドレスまたはCIDR形式で入力してください。' };
}

/**
 * 有効期限オプションから日付を計算
 */
export function calculateExpirationDate(option: string | null): Date | null {
  if (option === null) {
    return null;
  }
  const match = option.match(/^(\d+)d$/);
  if (!match) {
    return null;
  }
  const days = parseInt(match[1], 10);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * トークンが有効かどうかをチェック
 */
export function isTokenValid(token: ApiToken): boolean {
  if (!token.isActive) {
    return false;
  }
  if (token.revokedAt) {
    return false;
  }
  if (token.expiresAt && new Date(token.expiresAt) <= new Date()) {
    return false;
  }
  return true;
}

/**
 * トークンの残り有効期間を取得（日数）
 */
export function getTokenRemainingDays(token: ApiToken): number | null {
  if (!token.expiresAt) {
    return null; // 無期限
  }
  const expiresAt = new Date(token.expiresAt);
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * スコープにリソースへの読み取り権限があるかチェック
 */
export function hasReadScope(scopes: ApiTokenScope[], resource: string): boolean {
  if (scopes.includes('ADMIN')) {
    return true;
  }
  const readScope = `READ_${resource.toUpperCase()}` as ApiTokenScope;
  return scopes.includes(readScope);
}

/**
 * スコープにリソースへの書き込み権限があるかチェック
 */
export function hasWriteScope(scopes: ApiTokenScope[], resource: string): boolean {
  if (scopes.includes('ADMIN')) {
    return true;
  }
  const writeScope = `WRITE_${resource.toUpperCase()}` as ApiTokenScope;
  return scopes.includes(writeScope);
}

/**
 * 必要なスコープを持っているかチェック
 */
export function hasRequiredScopes(
  tokenScopes: ApiTokenScope[],
  requiredScopes: ApiTokenScope[],
  requireAll: boolean = true
): boolean {
  if (tokenScopes.includes('ADMIN')) {
    return true;
  }
  if (requireAll) {
    return requiredScopes.every((scope) => tokenScopes.includes(scope));
  }
  return requiredScopes.some((scope) => tokenScopes.includes(scope));
}
