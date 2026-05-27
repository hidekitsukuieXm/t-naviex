/**
 * ベストプラクティス型定義
 *
 * テストのベストプラクティスをナレッジとして管理するための型定義
 */

// ========================================
// Enum Types (Prismaと互換性のある型定義)
// ========================================

/**
 * ベストプラクティスの複雑度
 */
export type BestPracticeComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * ベストプラクティスのステータス
 */
export type BestPracticeStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

/**
 * Prisma JSON型の代替
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Prisma Decimal型の代替
 */
export type Decimal = number | { toString(): string };

// ========================================
// 基本型定義
// ========================================

/**
 * ベストプラクティスの基本情報
 */
export interface BestPracticeBase {
  title: string;
  description?: string | null;
  content: string;
  category: string;
  complexity: BestPracticeComplexity;
  status: BestPracticeStatus;
  applicability: string[];
  examples: string[];
  benefits: string[];
  risks: string[];
  version?: string;
  metadata?: JsonValue;
}

/**
 * ベストプラクティスの完全な情報（DB取得後）
 */
export interface BestPractice extends BestPracticeBase {
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
 * タグ情報を含むベストプラクティス
 */
export interface BestPracticeWithTags extends BestPractice {
  tags: Array<{
    id: bigint;
    name: string;
    color: string;
  }>;
}

/**
 * 作成者・更新者情報を含むベストプラクティス
 */
export interface BestPracticeWithUsers extends BestPracticeWithTags {
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
 * フィードバック情報を含むベストプラクティス
 */
export interface BestPracticeWithFeedbacks extends BestPracticeWithUsers {
  feedbacks: BestPracticeFeedback[];
}

/**
 * ベストプラクティスフィードバック
 */
export interface BestPracticeFeedback {
  id: bigint;
  bestPracticeId: bigint;
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
 * ベストプラクティス作成入力
 */
export interface CreateBestPracticeInput {
  projectId?: bigint;
  title: string;
  description?: string;
  content: string;
  category: string;
  complexity?: BestPracticeComplexity;
  status?: BestPracticeStatus;
  applicability?: string[];
  examples?: string[];
  benefits?: string[];
  risks?: string[];
  version?: string;
  metadata?: JsonValue;
  tagIds?: bigint[];
  createdById?: bigint;
}

/**
 * ベストプラクティス更新入力
 */
export interface UpdateBestPracticeInput {
  title?: string;
  description?: string | null;
  content?: string;
  category?: string;
  complexity?: BestPracticeComplexity;
  status?: BestPracticeStatus;
  applicability?: string[];
  examples?: string[];
  benefits?: string[];
  risks?: string[];
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
 * ベストプラクティス検索フィルター
 */
export interface BestPracticeFilter {
  projectId?: bigint;
  category?: string;
  complexity?: BestPracticeComplexity;
  status?: BestPracticeStatus;
  tagIds?: bigint[];
  search?: string;
  minRating?: number;
  includeGlobal?: boolean; // projectId=nullのグローバルベストプラクティスを含む
}

/**
 * ソートオプション
 */
export type BestPracticeSortField =
  | 'title'
  | 'category'
  | 'complexity'
  | 'rating'
  | 'usageCount'
  | 'createdAt'
  | 'updatedAt';

export interface BestPracticeSortOption {
  field: BestPracticeSortField;
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
// カテゴリ定義
// ========================================

/**
 * デフォルトのベストプラクティスカテゴリ
 */
export const DEFAULT_CATEGORIES = [
  'テスト設計',
  'テスト実行',
  'バグ管理',
  'テスト自動化',
  'パフォーマンステスト',
  'セキュリティテスト',
  'ユーザビリティテスト',
  'API/統合テスト',
  'データベーステスト',
  'モバイルテスト',
  'レビュープロセス',
  'ドキュメント',
  'その他',
] as const;

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number];

// ========================================
// バリデーション
// ========================================

/**
 * タイトルの最小文字数
 */
export const TITLE_MIN_LENGTH = 3;

/**
 * タイトルの最大文字数
 */
export const TITLE_MAX_LENGTH = 255;

/**
 * カテゴリの最大文字数
 */
export const CATEGORY_MAX_LENGTH = 100;

/**
 * バージョンの最大文字数
 */
export const VERSION_MAX_LENGTH = 20;

/**
 * 評価の最小値
 */
export const RATING_MIN = 1;

/**
 * 評価の最大値
 */
export const RATING_MAX = 5;

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
 * カテゴリをバリデート
 */
export function validateCategory(category: string): { valid: boolean; error?: string } {
  if (!category || category.trim().length === 0) {
    return { valid: false, error: 'カテゴリは必須です' };
  }
  if (category.length > CATEGORY_MAX_LENGTH) {
    return { valid: false, error: `カテゴリは${CATEGORY_MAX_LENGTH}文字以下で入力してください` };
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
 * バージョン形式をバリデート（セマンティックバージョニング）
 */
export function validateVersion(version: string): { valid: boolean; error?: string } {
  if (!version || version.trim().length === 0) {
    return { valid: true }; // オプショナル
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
 * ベストプラクティス作成入力をバリデート
 */
export function validateCreateInput(input: CreateBestPracticeInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const titleResult = validateTitle(input.title);
  if (!titleResult.valid && titleResult.error) {
    errors.push(titleResult.error);
  }

  const categoryResult = validateCategory(input.category);
  if (!categoryResult.valid && categoryResult.error) {
    errors.push(categoryResult.error);
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
 * 複雑度のラベルを取得
 */
export function getComplexityLabel(complexity: BestPracticeComplexity): string {
  const labels: Record<BestPracticeComplexity, string> = {
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
  };
  return labels[complexity];
}

/**
 * ステータスのラベルを取得
 */
export function getStatusLabel(status: BestPracticeStatus): string {
  const labels: Record<BestPracticeStatus, string> = {
    DRAFT: '下書き',
    ACTIVE: 'アクティブ',
    DEPRECATED: '非推奨',
    ARCHIVED: 'アーカイブ',
  };
  return labels[status];
}

/**
 * 複雑度の色を取得
 */
export function getComplexityColor(complexity: BestPracticeComplexity): string {
  const colors: Record<BestPracticeComplexity, string> = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-red-100 text-red-800',
  };
  return colors[complexity];
}

/**
 * ステータスの色を取得
 */
export function getStatusColor(status: BestPracticeStatus): string {
  const colors: Record<BestPracticeStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    DEPRECATED: 'bg-yellow-100 text-yellow-800',
    ARCHIVED: 'bg-red-100 text-red-800',
  };
  return colors[status];
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
 * ベストプラクティス一覧APIレスポンス
 */
export interface BestPracticeListResponse {
  items: BestPracticeWithTags[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * ベストプラクティス詳細APIレスポンス
 */
export type BestPracticeDetailResponse = BestPracticeWithFeedbacks;

/**
 * カテゴリ一覧APIレスポンス
 */
export interface CategoriesResponse {
  categories: string[];
}

/**
 * コンテキストベースの推奨レスポンス
 */
export interface RecommendationResponse {
  recommendations: BestPracticeWithTags[];
  context: {
    testType?: string;
    category?: string;
    keywords?: string[];
  };
}

// ========================================
// Enum Constants
// ========================================

/**
 * ベストプラクティスの複雑度値
 */
export const COMPLEXITY_VALUES = ['LOW', 'MEDIUM', 'HIGH'] as const;

/**
 * ベストプラクティスのステータス値
 */
export const STATUS_VALUES = ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'] as const;

/**
 * 複雑度の型（Prismaと互換）
 */
export type LocalBestPracticeComplexity = (typeof COMPLEXITY_VALUES)[number];

/**
 * ステータスの型（Prismaと互換）
 */
export type LocalBestPracticeStatus = (typeof STATUS_VALUES)[number];
