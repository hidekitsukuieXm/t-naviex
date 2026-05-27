/**
 * カタログアイテム関連の型定義
 */

// ============================================
// 基本型定義
// ============================================

/**
 * カタログアイテムタイプ
 */
export type CatalogItemType =
  | 'TEST_CASE'
  | 'TEST_PROCEDURE'
  | 'TEST_DATA'
  | 'PRECONDITION'
  | 'EXPECTED_RESULT'
  | 'SHARED_STEP'
  | 'TEMPLATE'
  | 'OTHER';

/**
 * カタログアイテムステータス
 */
export type CatalogItemStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

/**
 * カタログアイテム
 */
export interface CatalogItem {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  type: CatalogItemType;
  status: CatalogItemStatus;
  category: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  version: string;
  usageCount: number;
  lastUsedAt: string | null;
  createdById: string | null;
  updatedById: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * カタログアイテム（タグ付き）
 */
export interface CatalogItemWithTags extends CatalogItem {
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

/**
 * カタログアイテム詳細
 */
export interface CatalogItemDetail extends CatalogItemWithTags {
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// ============================================
// 入力型定義
// ============================================

/**
 * カタログアイテム作成入力
 */
export interface CreateCatalogItemInput {
  name: string;
  description?: string | null;
  type: CatalogItemType;
  status?: CatalogItemStatus;
  category?: string | null;
  content: string;
  metadata?: Record<string, unknown> | null;
  version?: string;
  sortOrder?: number;
  tagIds?: string[];
}

/**
 * カタログアイテム更新入力
 */
export interface UpdateCatalogItemInput {
  name?: string;
  description?: string | null;
  type?: CatalogItemType;
  status?: CatalogItemStatus;
  category?: string | null;
  content?: string;
  metadata?: Record<string, unknown> | null;
  version?: string;
  sortOrder?: number;
  tagIds?: string[];
}

// ============================================
// レスポンス型定義
// ============================================

/**
 * カタログアイテム一覧レスポンス
 */
export interface CatalogItemListResponse {
  items: CatalogItemWithTags[];
  total: number;
  page: number;
  limit: number;
}

/**
 * カタログカテゴリ一覧レスポンス
 */
export interface CatalogCategoryListResponse {
  categories: Array<{
    name: string;
    count: number;
  }>;
}

// ============================================
// 定数定義
// ============================================

/**
 * カタログアイテムタイプ情報
 */
export const CATALOG_ITEM_TYPE_INFO: Record<
  CatalogItemType,
  { label: string; description: string }
> = {
  TEST_CASE: { label: 'テストケース', description: '再利用可能なテストケース' },
  TEST_PROCEDURE: { label: 'テスト手順', description: '再利用可能なテスト手順' },
  TEST_DATA: { label: 'テストデータ', description: 'テスト用のデータセット' },
  PRECONDITION: { label: '前提条件', description: '再利用可能な前提条件' },
  EXPECTED_RESULT: { label: '期待結果', description: '再利用可能な期待結果' },
  SHARED_STEP: { label: '共有ステップ', description: '共有テストステップ' },
  TEMPLATE: { label: 'テンプレート', description: 'テストテンプレート' },
  OTHER: { label: 'その他', description: 'その他のテスト資産' },
};

/**
 * カタログアイテムステータス情報
 */
export const CATALOG_ITEM_STATUS_INFO: Record<CatalogItemStatus, { label: string; color: string }> =
  {
    DRAFT: { label: '下書き', color: 'gray' },
    ACTIVE: { label: '有効', color: 'green' },
    DEPRECATED: { label: '非推奨', color: 'yellow' },
    ARCHIVED: { label: 'アーカイブ', color: 'red' },
  };

/**
 * 有効なカタログアイテムタイプ一覧
 */
export const CATALOG_ITEM_TYPES: CatalogItemType[] = [
  'TEST_CASE',
  'TEST_PROCEDURE',
  'TEST_DATA',
  'PRECONDITION',
  'EXPECTED_RESULT',
  'SHARED_STEP',
  'TEMPLATE',
  'OTHER',
];

/**
 * 有効なカタログアイテムステータス一覧
 */
export const CATALOG_ITEM_STATUSES: CatalogItemStatus[] = [
  'DRAFT',
  'ACTIVE',
  'DEPRECATED',
  'ARCHIVED',
];

// ============================================
// バリデーション関数
// ============================================

/**
 * カタログアイテム名のバリデーション
 */
export function validateCatalogItemName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'カタログアイテム名は必須です。' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length > 255) {
    return { valid: false, error: 'カタログアイテム名は255文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * カタログアイテム説明のバリデーション
 */
export function validateCatalogItemDescription(description: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (description === null || description === undefined) {
    return { valid: true };
  }

  if (description.length > 10000) {
    return { valid: false, error: 'カタログアイテムの説明は10000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * カタログアイテム内容のバリデーション
 */
export function validateCatalogItemContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content || content.trim() === '') {
    return { valid: false, error: 'カタログアイテムの内容は必須です。' };
  }

  if (content.length > 100000) {
    return { valid: false, error: 'カタログアイテムの内容は100000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * カタログアイテムタイプのバリデーション
 */
export function validateCatalogItemType(type: string): {
  valid: boolean;
  error?: string;
} {
  if (!CATALOG_ITEM_TYPES.includes(type as CatalogItemType)) {
    return { valid: false, error: '無効なカタログアイテムタイプです。' };
  }

  return { valid: true };
}

/**
 * カタログアイテムステータスのバリデーション
 */
export function validateCatalogItemStatus(status: string): {
  valid: boolean;
  error?: string;
} {
  if (!CATALOG_ITEM_STATUSES.includes(status as CatalogItemStatus)) {
    return { valid: false, error: '無効なカタログアイテムステータスです。' };
  }

  return { valid: true };
}

/**
 * カタログアイテムカテゴリのバリデーション
 */
export function validateCatalogItemCategory(category: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (category === null || category === undefined) {
    return { valid: true };
  }

  if (category.length > 100) {
    return { valid: false, error: 'カテゴリは100文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * カタログアイテムバージョンのバリデーション
 */
export function validateCatalogItemVersion(version: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (version === undefined) {
    return { valid: true };
  }

  if (version.length > 20) {
    return { valid: false, error: 'バージョンは20文字以内で入力してください。' };
  }

  // Semantic versioning pattern (loose)
  const versionPattern = /^[\w.+-]+$/;
  if (!versionPattern.test(version)) {
    return { valid: false, error: 'バージョン形式が無効です。' };
  }

  return { valid: true };
}

/**
 * カタログアイテム並び順のバリデーション
 */
export function validateCatalogItemSortOrder(sortOrder: number | undefined): {
  valid: boolean;
  error?: string;
} {
  if (sortOrder === undefined) {
    return { valid: true };
  }

  if (!Number.isInteger(sortOrder)) {
    return { valid: false, error: '並び順は整数で指定してください。' };
  }

  if (sortOrder < 0) {
    return { valid: false, error: '並び順は0以上の値を指定してください。' };
  }

  if (sortOrder > 99999) {
    return { valid: false, error: '並び順は99999以下の値を指定してください。' };
  }

  return { valid: true };
}

/**
 * カタログアイテム作成入力のバリデーション
 */
export function validateCreateCatalogItemInput(input: CreateCatalogItemInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 名前
  const nameValidation = validateCatalogItemName(input.name);
  if (!nameValidation.valid && nameValidation.error) {
    errors.push(nameValidation.error);
  }

  // 説明
  const descriptionValidation = validateCatalogItemDescription(input.description);
  if (!descriptionValidation.valid && descriptionValidation.error) {
    errors.push(descriptionValidation.error);
  }

  // タイプ
  const typeValidation = validateCatalogItemType(input.type);
  if (!typeValidation.valid && typeValidation.error) {
    errors.push(typeValidation.error);
  }

  // ステータス
  if (input.status) {
    const statusValidation = validateCatalogItemStatus(input.status);
    if (!statusValidation.valid && statusValidation.error) {
      errors.push(statusValidation.error);
    }
  }

  // カテゴリ
  const categoryValidation = validateCatalogItemCategory(input.category);
  if (!categoryValidation.valid && categoryValidation.error) {
    errors.push(categoryValidation.error);
  }

  // 内容
  const contentValidation = validateCatalogItemContent(input.content);
  if (!contentValidation.valid && contentValidation.error) {
    errors.push(contentValidation.error);
  }

  // バージョン
  const versionValidation = validateCatalogItemVersion(input.version);
  if (!versionValidation.valid && versionValidation.error) {
    errors.push(versionValidation.error);
  }

  // 並び順
  const sortOrderValidation = validateCatalogItemSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid && sortOrderValidation.error) {
    errors.push(sortOrderValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * カタログアイテム更新入力のバリデーション
 */
export function validateUpdateCatalogItemInput(input: UpdateCatalogItemInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 名前
  if (input.name !== undefined) {
    const nameValidation = validateCatalogItemName(input.name);
    if (!nameValidation.valid && nameValidation.error) {
      errors.push(nameValidation.error);
    }
  }

  // 説明
  const descriptionValidation = validateCatalogItemDescription(input.description);
  if (!descriptionValidation.valid && descriptionValidation.error) {
    errors.push(descriptionValidation.error);
  }

  // タイプ
  if (input.type !== undefined) {
    const typeValidation = validateCatalogItemType(input.type);
    if (!typeValidation.valid && typeValidation.error) {
      errors.push(typeValidation.error);
    }
  }

  // ステータス
  if (input.status !== undefined) {
    const statusValidation = validateCatalogItemStatus(input.status);
    if (!statusValidation.valid && statusValidation.error) {
      errors.push(statusValidation.error);
    }
  }

  // カテゴリ
  const categoryValidation = validateCatalogItemCategory(input.category);
  if (!categoryValidation.valid && categoryValidation.error) {
    errors.push(categoryValidation.error);
  }

  // 内容
  if (input.content !== undefined) {
    const contentValidation = validateCatalogItemContent(input.content);
    if (!contentValidation.valid && contentValidation.error) {
      errors.push(contentValidation.error);
    }
  }

  // バージョン
  const versionValidation = validateCatalogItemVersion(input.version);
  if (!versionValidation.valid && versionValidation.error) {
    errors.push(versionValidation.error);
  }

  // 並び順
  const sortOrderValidation = validateCatalogItemSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid && sortOrderValidation.error) {
    errors.push(sortOrderValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
