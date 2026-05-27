/**
 * テスト設計ナレッジ型定義
 *
 * テスト設計パターン・技法をナレッジとして管理するための型定義
 */

// ========================================
// Enum Types
// ========================================

/**
 * テスト技法カテゴリ
 */
export type TestTechniqueCategory =
  | 'BLACK_BOX'
  | 'WHITE_BOX'
  | 'EXPERIENCE_BASED'
  | 'STRUCTURE_BASED';

/**
 * テスト設計ナレッジステータス
 */
export type TestDesignKnowledgeStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

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
 * テスト設計ナレッジの基本情報
 */
export interface TestDesignKnowledgeBase {
  title: string;
  description?: string | null;
  content: string;
  technique: string;
  category: TestTechniqueCategory;
  status: TestDesignKnowledgeStatus;
  applicableScenarios: string[];
  considerations: string[];
  examples: string[];
  tools: string[];
  references: string[];
  inputTypes: string[];
  outputTypes: string[];
  version?: string;
  metadata?: JsonValue;
}

/**
 * テスト設計ナレッジの完全な情報（DB取得後）
 */
export interface TestDesignKnowledge extends TestDesignKnowledgeBase {
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
 * タグ情報を含むテスト設計ナレッジ
 */
export interface TestDesignKnowledgeWithTags extends TestDesignKnowledge {
  tags: Array<{
    id: bigint;
    name: string;
    color: string;
  }>;
}

/**
 * 作成者・更新者情報を含むテスト設計ナレッジ
 */
export interface TestDesignKnowledgeWithUsers extends TestDesignKnowledgeWithTags {
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
 * フィードバック情報を含むテスト設計ナレッジ
 */
export interface TestDesignKnowledgeWithFeedbacks extends TestDesignKnowledgeWithUsers {
  feedbacks: TestDesignKnowledgeFeedback[];
}

/**
 * テスト設計ナレッジフィードバック
 */
export interface TestDesignKnowledgeFeedback {
  id: bigint;
  testDesignKnowledgeId: bigint;
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
 * テスト設計ナレッジ作成入力
 */
export interface CreateTestDesignKnowledgeInput {
  projectId?: bigint;
  title: string;
  description?: string;
  content: string;
  technique: string;
  category?: TestTechniqueCategory;
  status?: TestDesignKnowledgeStatus;
  applicableScenarios?: string[];
  considerations?: string[];
  examples?: string[];
  tools?: string[];
  references?: string[];
  inputTypes?: string[];
  outputTypes?: string[];
  version?: string;
  metadata?: JsonValue;
  tagIds?: bigint[];
  createdById?: bigint;
}

/**
 * テスト設計ナレッジ更新入力
 */
export interface UpdateTestDesignKnowledgeInput {
  title?: string;
  description?: string | null;
  content?: string;
  technique?: string;
  category?: TestTechniqueCategory;
  status?: TestDesignKnowledgeStatus;
  applicableScenarios?: string[];
  considerations?: string[];
  examples?: string[];
  tools?: string[];
  references?: string[];
  inputTypes?: string[];
  outputTypes?: string[];
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
 * テスト設計ナレッジ検索フィルター
 */
export interface TestDesignKnowledgeFilter {
  projectId?: bigint;
  technique?: string;
  category?: TestTechniqueCategory;
  status?: TestDesignKnowledgeStatus;
  tagIds?: bigint[];
  search?: string;
  minRating?: number;
  includeGlobal?: boolean;
}

/**
 * ソートオプション
 */
export type TestDesignKnowledgeSortField =
  | 'title'
  | 'technique'
  | 'category'
  | 'rating'
  | 'usageCount'
  | 'createdAt'
  | 'updatedAt';

export interface TestDesignKnowledgeSortOption {
  field: TestDesignKnowledgeSortField;
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
 * テスト技法カテゴリ値
 */
export const TECHNIQUE_CATEGORY_VALUES = [
  'BLACK_BOX',
  'WHITE_BOX',
  'EXPERIENCE_BASED',
  'STRUCTURE_BASED',
] as const;

/**
 * ステータス値
 */
export const STATUS_VALUES = ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'] as const;

/**
 * デフォルトのテスト技法
 */
export const DEFAULT_TECHNIQUES = [
  // ブラックボックス技法
  '同値分割',
  '境界値分析',
  'デシジョンテーブル',
  '状態遷移テスト',
  'ユースケーステスト',
  'ペアワイズテスト',
  // ホワイトボックス技法
  'ステートメントカバレッジ',
  'ブランチカバレッジ',
  'パスカバレッジ',
  // 経験ベース技法
  'エラー推測',
  '探索的テスト',
  'チェックリストベース',
] as const;

export type DefaultTechnique = (typeof DEFAULT_TECHNIQUES)[number];

// ========================================
// バリデーション定数
// ========================================

export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 255;
export const TECHNIQUE_MAX_LENGTH = 100;
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
 * テスト技法をバリデート
 */
export function validateTechnique(technique: string): { valid: boolean; error?: string } {
  if (!technique || technique.trim().length === 0) {
    return { valid: false, error: 'テスト技法は必須です' };
  }
  if (technique.length > TECHNIQUE_MAX_LENGTH) {
    return { valid: false, error: `テスト技法は${TECHNIQUE_MAX_LENGTH}文字以下で入力してください` };
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
export function validateCreateInput(input: CreateTestDesignKnowledgeInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const titleResult = validateTitle(input.title);
  if (!titleResult.valid && titleResult.error) {
    errors.push(titleResult.error);
  }

  const techniqueResult = validateTechnique(input.technique);
  if (!techniqueResult.valid && techniqueResult.error) {
    errors.push(techniqueResult.error);
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
export function getCategoryLabel(category: TestTechniqueCategory): string {
  const labels: Record<TestTechniqueCategory, string> = {
    BLACK_BOX: 'ブラックボックス',
    WHITE_BOX: 'ホワイトボックス',
    EXPERIENCE_BASED: '経験ベース',
    STRUCTURE_BASED: '構造ベース',
  };
  return labels[category];
}

/**
 * ステータスのラベルを取得
 */
export function getStatusLabel(status: TestDesignKnowledgeStatus): string {
  const labels: Record<TestDesignKnowledgeStatus, string> = {
    DRAFT: '下書き',
    ACTIVE: 'アクティブ',
    DEPRECATED: '非推奨',
    ARCHIVED: 'アーカイブ',
  };
  return labels[status];
}

/**
 * カテゴリの色を取得
 */
export function getCategoryColor(category: TestTechniqueCategory): string {
  const colors: Record<TestTechniqueCategory, string> = {
    BLACK_BOX: 'bg-blue-100 text-blue-800',
    WHITE_BOX: 'bg-purple-100 text-purple-800',
    EXPERIENCE_BASED: 'bg-orange-100 text-orange-800',
    STRUCTURE_BASED: 'bg-green-100 text-green-800',
  };
  return colors[category];
}

/**
 * ステータスの色を取得
 */
export function getStatusColor(status: TestDesignKnowledgeStatus): string {
  const colors: Record<TestDesignKnowledgeStatus, string> = {
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
 * テスト設計ナレッジ一覧APIレスポンス
 */
export interface TestDesignKnowledgeListResponse {
  items: TestDesignKnowledgeWithTags[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * テスト設計ナレッジ詳細APIレスポンス
 */
export type TestDesignKnowledgeDetailResponse = TestDesignKnowledgeWithFeedbacks;

/**
 * テスト技法一覧APIレスポンス
 */
export interface TechniquesResponse {
  techniques: string[];
}

/**
 * コンテキストベースの推奨レスポンス
 */
export interface RecommendationResponse {
  recommendations: TestDesignKnowledgeWithTags[];
  context: {
    testType?: string;
    category?: string;
    keywords?: string[];
  };
}
