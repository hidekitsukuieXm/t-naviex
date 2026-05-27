/**
 * バグ対策ナレッジ型定義
 *
 * バグ対策パターン・ノウハウをナレッジとして管理するための型定義
 */

// ========================================
// Enum Types
// ========================================

/**
 * バグ対策カテゴリ
 */
export type BugCountermeasureCategory =
  | 'PREVENTION'
  | 'DETECTION'
  | 'CORRECTION'
  | 'ROOT_CAUSE'
  | 'PROCESS'
  | 'TOOL'
  | 'OTHER';

/**
 * バグ対策ナレッジステータス
 */
export type BugCountermeasureStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

/**
 * バグ深刻度レベル
 */
export type BugSeverityLevel = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'TRIVIAL';

/**
 * JSON型の代替
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Decimal型の代替
 */
export type Decimal = number | { toString(): string };

// ========================================
// 基本型定義
// ========================================

/**
 * バグ対策ナレッジの基本情報
 */
export interface BugCountermeasureBase {
  title: string;
  description?: string | null;
  content: string;
  bugPattern: string;
  category: BugCountermeasureCategory;
  status: BugCountermeasureStatus;
  severityLevel?: BugSeverityLevel | null;
  rootCauses: string[];
  symptoms: string[];
  preventionMeasures: string[];
  detectionMethods: string[];
  correctionSteps: string[];
  affectedAreas: string[];
  testCoverage: string[];
  examples: string[];
  references: string[];
  version?: string;
  metadata?: JsonValue;
}

/**
 * バグ対策ナレッジの完全な情報（DB取得後）
 */
export interface BugCountermeasure extends BugCountermeasureBase {
  id: bigint;
  projectId: bigint | null;
  rating: Decimal;
  ratingCount: number;
  usageCount: number;
  lastUsedAt: Date | null;
  createdById: bigint | null;
  updatedById: bigint | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * タグ情報を含むバグ対策ナレッジ
 */
export interface BugCountermeasureWithTags extends BugCountermeasure {
  tags: Array<{
    id: bigint;
    name: string;
    color: string;
  }>;
}

/**
 * 作成者・更新者情報を含むバグ対策ナレッジ
 */
export interface BugCountermeasureWithUsers extends BugCountermeasureWithTags {
  createdBy?: {
    id: bigint;
    name: string;
    email: string;
  } | null;
  updatedBy?: {
    id: bigint;
    name: string;
    email: string;
  } | null;
}

/**
 * フィードバック情報を含むバグ対策ナレッジ
 */
export interface BugCountermeasureWithFeedbacks extends BugCountermeasureWithUsers {
  feedbacks: BugCountermeasureFeedback[];
}

/**
 * バグ対策ナレッジフィードバック
 */
export interface BugCountermeasureFeedback {
  id: bigint;
  bugCountermeasureId: bigint;
  userId: bigint;
  rating: number;
  comment?: string | null;
  isHelpful?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: bigint;
    name: string;
    email: string;
  };
}

// ========================================
// 入力型定義
// ========================================

/**
 * バグ対策ナレッジ作成入力
 */
export interface CreateBugCountermeasureInput {
  projectId?: bigint;
  title: string;
  description?: string;
  content: string;
  bugPattern: string;
  category?: BugCountermeasureCategory;
  status?: BugCountermeasureStatus;
  severityLevel?: BugSeverityLevel;
  rootCauses?: string[];
  symptoms?: string[];
  preventionMeasures?: string[];
  detectionMethods?: string[];
  correctionSteps?: string[];
  affectedAreas?: string[];
  testCoverage?: string[];
  examples?: string[];
  references?: string[];
  version?: string;
  metadata?: JsonValue;
  tagIds?: bigint[];
  createdById?: bigint;
}

/**
 * バグ対策ナレッジ更新入力
 */
export interface UpdateBugCountermeasureInput {
  title?: string;
  description?: string | null;
  content?: string;
  bugPattern?: string;
  category?: BugCountermeasureCategory;
  status?: BugCountermeasureStatus;
  severityLevel?: BugSeverityLevel | null;
  rootCauses?: string[];
  symptoms?: string[];
  preventionMeasures?: string[];
  detectionMethods?: string[];
  correctionSteps?: string[];
  affectedAreas?: string[];
  testCoverage?: string[];
  examples?: string[];
  references?: string[];
  version?: string;
  metadata?: JsonValue;
  tagIds?: bigint[];
  updatedById?: bigint;
}

/**
 * フィードバック入力
 */
export interface CreateFeedbackInput {
  rating: number;
  comment?: string;
  isHelpful?: boolean;
  userId: bigint;
}

/**
 * フィードバック更新入力
 */
export interface UpdateFeedbackInput {
  rating?: number;
  comment?: string | null;
  isHelpful?: boolean | null;
}

// ========================================
// フィルター・検索型定義
// ========================================

/**
 * バグ対策ナレッジ検索フィルター
 */
export interface BugCountermeasureFilter {
  projectId?: bigint;
  bugPattern?: string;
  category?: BugCountermeasureCategory;
  status?: BugCountermeasureStatus;
  severityLevel?: BugSeverityLevel;
  tagIds?: bigint[];
  search?: string;
  minRating?: number;
  includeGlobal?: boolean;
}

/**
 * ソートオプション
 */
export type BugCountermeasureSortField =
  | 'title'
  | 'bugPattern'
  | 'category'
  | 'rating'
  | 'usageCount'
  | 'createdAt'
  | 'updatedAt';

export interface BugCountermeasureSortOption {
  field: BugCountermeasureSortField;
  order: 'asc' | 'desc';
}

/**
 * ページネーションオプション
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * ページネーション結果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ========================================
// 定数定義
// ========================================

/**
 * バグ対策カテゴリ値
 */
export const COUNTERMEASURE_CATEGORY_VALUES = [
  'PREVENTION',
  'DETECTION',
  'CORRECTION',
  'ROOT_CAUSE',
  'PROCESS',
  'TOOL',
  'OTHER',
] as const;

/**
 * ステータス値
 */
export const STATUS_VALUES = ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'] as const;

/**
 * バグ深刻度レベル値
 */
export const SEVERITY_LEVEL_VALUES = ['CRITICAL', 'MAJOR', 'MINOR', 'TRIVIAL'] as const;

/**
 * デフォルトのバグパターン
 */
export const DEFAULT_BUG_PATTERNS = [
  // コーディングエラー
  'Null参照エラー',
  '境界値エラー',
  'Off-by-oneエラー',
  '型変換エラー',
  // ロジックエラー
  '条件分岐エラー',
  'ループエラー',
  '状態管理エラー',
  // 並行処理エラー
  'レースコンディション',
  'デッドロック',
  // リソースエラー
  'メモリリーク',
  'リソース解放漏れ',
  // セキュリティ
  'インジェクション',
  '認証・認可エラー',
] as const;

export type DefaultBugPattern = (typeof DEFAULT_BUG_PATTERNS)[number];

// ========================================
// バリデーション定数
// ========================================

export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 255;
export const BUG_PATTERN_MAX_LENGTH = 100;
export const VERSION_MAX_LENGTH = 20;
export const RATING_MIN = 1;
export const RATING_MAX = 5;

// ========================================
// バリデーション関数
// ========================================

/**
 * タイトルをバリデート
 */
export function validateTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'タイトルは必須です' };
  }
  if (title.length < TITLE_MIN_LENGTH) {
    return { valid: false, error: `タイトルは${TITLE_MIN_LENGTH}文字以上で入力してください` };
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return { valid: false, error: `タイトルは${TITLE_MAX_LENGTH}文字以下で入力してください` };
  }
  return { valid: true };
}

/**
 * バグパターンをバリデート
 */
export function validateBugPattern(bugPattern: string): { valid: boolean; error?: string } {
  if (!bugPattern || bugPattern.trim().length === 0) {
    return { valid: false, error: 'バグパターンは必須です' };
  }
  if (bugPattern.length > BUG_PATTERN_MAX_LENGTH) {
    return {
      valid: false,
      error: `バグパターンは${BUG_PATTERN_MAX_LENGTH}文字以下で入力してください`,
    };
  }
  return { valid: true };
}

/**
 * コンテンツをバリデート
 */
export function validateContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'コンテンツは必須です' };
  }
  return { valid: true };
}

/**
 * 評価をバリデート
 */
export function validateRating(rating: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(rating)) {
    return { valid: false, error: '評価は整数で入力してください' };
  }
  if (rating < RATING_MIN || rating > RATING_MAX) {
    return { valid: false, error: `評価は${RATING_MIN}から${RATING_MAX}の間で入力してください` };
  }
  return { valid: true };
}

/**
 * バージョン形式をバリデート
 */
export function validateVersion(version: string): { valid: boolean; error?: string } {
  if (!version || version.trim().length === 0) {
    return { valid: true };
  }
  if (version.length > VERSION_MAX_LENGTH) {
    return { valid: false, error: `バージョンは${VERSION_MAX_LENGTH}文字以下で入力してください` };
  }
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
  if (!semverRegex.test(version)) {
    return {
      valid: false,
      error: 'バージョンはセマンティックバージョニング形式（例: 1.0.0）で入力してください',
    };
  }
  return { valid: true };
}

/**
 * 作成入力をバリデート
 */
export function validateCreateInput(input: CreateBugCountermeasureInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const titleResult = validateTitle(input.title);
  if (!titleResult.valid && titleResult.error) {
    errors.push(titleResult.error);
  }

  const bugPatternResult = validateBugPattern(input.bugPattern);
  if (!bugPatternResult.valid && bugPatternResult.error) {
    errors.push(bugPatternResult.error);
  }

  const contentResult = validateContent(input.content);
  if (!contentResult.valid && contentResult.error) {
    errors.push(contentResult.error);
  }

  if (input.version) {
    const versionResult = validateVersion(input.version);
    if (!versionResult.valid && versionResult.error) {
      errors.push(versionResult.error);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * カテゴリのラベルを取得
 */
export function getCategoryLabel(category: BugCountermeasureCategory): string {
  const labels: Record<BugCountermeasureCategory, string> = {
    PREVENTION: '予防策',
    DETECTION: '検出策',
    CORRECTION: '修正策',
    ROOT_CAUSE: '根本原因対策',
    PROCESS: 'プロセス改善',
    TOOL: 'ツール活用',
    OTHER: 'その他',
  };
  return labels[category];
}

/**
 * ステータスのラベルを取得
 */
export function getStatusLabel(status: BugCountermeasureStatus): string {
  const labels: Record<BugCountermeasureStatus, string> = {
    DRAFT: '下書き',
    ACTIVE: 'アクティブ',
    DEPRECATED: '非推奨',
    ARCHIVED: 'アーカイブ',
  };
  return labels[status];
}

/**
 * 深刻度レベルのラベルを取得
 */
export function getSeverityLevelLabel(level: BugSeverityLevel): string {
  const labels: Record<BugSeverityLevel, string> = {
    CRITICAL: '致命的',
    MAJOR: '重大',
    MINOR: '軽微',
    TRIVIAL: '軽度',
  };
  return labels[level];
}

/**
 * カテゴリの色を取得
 */
export function getCategoryColor(category: BugCountermeasureCategory): string {
  const colors: Record<BugCountermeasureCategory, string> = {
    PREVENTION: 'bg-green-100 text-green-800',
    DETECTION: 'bg-blue-100 text-blue-800',
    CORRECTION: 'bg-orange-100 text-orange-800',
    ROOT_CAUSE: 'bg-purple-100 text-purple-800',
    PROCESS: 'bg-cyan-100 text-cyan-800',
    TOOL: 'bg-indigo-100 text-indigo-800',
    OTHER: 'bg-gray-100 text-gray-800',
  };
  return colors[category];
}

/**
 * ステータスの色を取得
 */
export function getStatusColor(status: BugCountermeasureStatus): string {
  const colors: Record<BugCountermeasureStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    DEPRECATED: 'bg-yellow-100 text-yellow-800',
    ARCHIVED: 'bg-red-100 text-red-800',
  };
  return colors[status];
}

/**
 * 深刻度レベルの色を取得
 */
export function getSeverityLevelColor(level: BugSeverityLevel): string {
  const colors: Record<BugSeverityLevel, string> = {
    CRITICAL: 'bg-red-100 text-red-800',
    MAJOR: 'bg-orange-100 text-orange-800',
    MINOR: 'bg-yellow-100 text-yellow-800',
    TRIVIAL: 'bg-gray-100 text-gray-800',
  };
  return colors[level];
}

/**
 * 評価を星に変換
 */
export function ratingToStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
}

// ========================================
// API レスポンス型
// ========================================

/**
 * バグ対策ナレッジ一覧APIレスポンス
 */
export interface BugCountermeasureListResponse {
  items: BugCountermeasureWithTags[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * バグ対策ナレッジ詳細APIレスポンス
 */
export type BugCountermeasureDetailResponse = BugCountermeasureWithFeedbacks;

/**
 * バグパターン一覧APIレスポンス
 */
export interface BugPatternsResponse {
  bugPatterns: string[];
}

/**
 * コンテキストベースの推奨レスポンス
 */
export interface RecommendationResponse {
  recommendations: BugCountermeasureWithTags[];
  context: {
    bugType?: string;
    category?: string;
    keywords?: string[];
  };
}
