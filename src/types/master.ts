/**
 * テストタイプ・技法・観点マスタ関連の型定義
 */

// ============================================
// 基本型定義
// ============================================

/**
 * マスタアイテムの基本インターフェース
 */
export interface MasterItem {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * テストタイプマスタ
 */
export type TestTypeMaster = MasterItem;

/**
 * テスト技法マスタ
 */
export type TestTechniqueMaster = MasterItem;

/**
 * テスト観点マスタ
 */
export type TestPerspective = MasterItem;

// ============================================
// 入力型定義
// ============================================

/**
 * マスタアイテム作成入力
 */
export interface CreateMasterItemInput {
  code: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * マスタアイテム更新入力
 */
export interface UpdateMasterItemInput {
  code?: string;
  name?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  isDefault?: boolean;
}

// ============================================
// レスポンス型定義
// ============================================

/**
 * マスタアイテム一覧レスポンス
 */
export interface MasterItemListResponse<T extends MasterItem = MasterItem> {
  items: T[];
  total: number;
}

// ============================================
// マスタタイプ定義
// ============================================

/**
 * マスタタイプ
 */
export type MasterType = 'testType' | 'testTechnique' | 'testPerspective';

/**
 * マスタタイプラベル
 */
export const MASTER_TYPE_LABELS: Record<MasterType, string> = {
  testType: 'テストタイプ',
  testTechnique: 'テスト技法',
  testPerspective: 'テスト観点',
};

// ============================================
// デフォルト値定義
// ============================================

/**
 * デフォルトテストタイプ
 */
export const DEFAULT_TEST_TYPES: CreateMasterItemInput[] = [
  {
    code: 'FUNCTIONAL',
    name: '機能テスト',
    description: '機能要件を確認するテスト',
    sortOrder: 1,
    isDefault: true,
  },
  {
    code: 'INTEGRATION',
    name: '結合テスト',
    description: 'モジュール間の連携を確認するテスト',
    sortOrder: 2,
  },
  {
    code: 'E2E',
    name: 'E2Eテスト',
    description: 'エンドツーエンドのユーザーシナリオを確認するテスト',
    sortOrder: 3,
  },
  {
    code: 'PERFORMANCE',
    name: '性能テスト',
    description: 'パフォーマンス要件を確認するテスト',
    sortOrder: 4,
  },
  {
    code: 'SECURITY',
    name: 'セキュリティテスト',
    description: 'セキュリティ要件を確認するテスト',
    sortOrder: 5,
  },
  {
    code: 'USABILITY',
    name: 'ユーザビリティテスト',
    description: '使いやすさを確認するテスト',
    sortOrder: 6,
  },
  { code: 'OTHER', name: 'その他', description: 'その他のテストタイプ', sortOrder: 99 },
];

/**
 * デフォルトテスト技法
 */
export const DEFAULT_TEST_TECHNIQUES: CreateMasterItemInput[] = [
  {
    code: 'EQUIVALENCE_PARTITIONING',
    name: '同値分割',
    description: '同値クラスに基づくテスト',
    sortOrder: 1,
    isDefault: true,
  },
  {
    code: 'BOUNDARY_VALUE_ANALYSIS',
    name: '境界値分析',
    description: '境界値に基づくテスト',
    sortOrder: 2,
  },
  {
    code: 'DECISION_TABLE',
    name: 'デシジョンテーブル',
    description: '条件と動作の組み合わせに基づくテスト',
    sortOrder: 3,
  },
  {
    code: 'STATE_TRANSITION',
    name: '状態遷移',
    description: '状態遷移に基づくテスト',
    sortOrder: 4,
  },
  {
    code: 'EXPLORATORY',
    name: '探索的テスト',
    description: '経験と直感に基づく探索的テスト',
    sortOrder: 5,
  },
  {
    code: 'REGRESSION',
    name: '回帰テスト',
    description: '変更による影響を確認するテスト',
    sortOrder: 6,
  },
  { code: 'OTHER', name: 'その他', description: 'その他のテスト技法', sortOrder: 99 },
];

/**
 * デフォルトテスト観点
 */
export const DEFAULT_TEST_PERSPECTIVES: CreateMasterItemInput[] = [
  {
    code: 'NORMAL',
    name: '正常系',
    description: '正常な入力・操作に対する動作確認',
    sortOrder: 1,
    isDefault: true,
  },
  {
    code: 'ABNORMAL',
    name: '異常系',
    description: '異常な入力・操作に対する動作確認',
    sortOrder: 2,
  },
  { code: 'BOUNDARY', name: '境界', description: '境界値付近の動作確認', sortOrder: 3 },
  { code: 'ERROR', name: 'エラー処理', description: 'エラーハンドリングの確認', sortOrder: 4 },
  { code: 'PERFORMANCE', name: '性能', description: 'パフォーマンスの確認', sortOrder: 5 },
  { code: 'SECURITY', name: 'セキュリティ', description: 'セキュリティの確認', sortOrder: 6 },
  { code: 'USABILITY', name: 'ユーザビリティ', description: '使いやすさの確認', sortOrder: 7 },
  { code: 'COMPATIBILITY', name: '互換性', description: '互換性の確認', sortOrder: 8 },
  { code: 'OTHER', name: 'その他', description: 'その他の観点', sortOrder: 99 },
];

// ============================================
// バリデーション関数
// ============================================

/**
 * マスタコードのバリデーション
 */
export function validateMasterCode(code: string): {
  valid: boolean;
  error?: string;
} {
  if (!code || code.trim() === '') {
    return { valid: false, error: 'コードは必須です。' };
  }

  const trimmedCode = code.trim();

  if (trimmedCode.length > 50) {
    return { valid: false, error: 'コードは50文字以内で入力してください。' };
  }

  // 英数字とアンダースコアのみ許可
  if (!/^[A-Z0-9_]+$/.test(trimmedCode)) {
    return { valid: false, error: 'コードは大文字英数字とアンダースコアのみ使用できます。' };
  }

  return { valid: true };
}

/**
 * マスタ名のバリデーション
 */
export function validateMasterName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim() === '') {
    return { valid: false, error: '名前は必須です。' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length > 100) {
    return { valid: false, error: '名前は100文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * マスタ説明のバリデーション
 */
export function validateMasterDescription(description: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (description === null || description === undefined) {
    return { valid: true };
  }

  if (description.length > 500) {
    return { valid: false, error: '説明は500文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * マスタ並び順のバリデーション
 */
export function validateMasterSortOrder(sortOrder: number | undefined): {
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

  if (sortOrder > 9999) {
    return { valid: false, error: '並び順は9999以下の値を指定してください。' };
  }

  return { valid: true };
}

/**
 * マスタアイテム作成入力のバリデーション
 */
export function validateCreateMasterItemInput(input: CreateMasterItemInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // コード
  const codeValidation = validateMasterCode(input.code);
  if (!codeValidation.valid && codeValidation.error) {
    errors.push(codeValidation.error);
  }

  // 名前
  const nameValidation = validateMasterName(input.name);
  if (!nameValidation.valid && nameValidation.error) {
    errors.push(nameValidation.error);
  }

  // 説明
  const descriptionValidation = validateMasterDescription(input.description);
  if (!descriptionValidation.valid && descriptionValidation.error) {
    errors.push(descriptionValidation.error);
  }

  // 並び順
  const sortOrderValidation = validateMasterSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid && sortOrderValidation.error) {
    errors.push(sortOrderValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * マスタアイテム更新入力のバリデーション
 */
export function validateUpdateMasterItemInput(input: UpdateMasterItemInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // コード（指定されている場合）
  if (input.code !== undefined) {
    const codeValidation = validateMasterCode(input.code);
    if (!codeValidation.valid && codeValidation.error) {
      errors.push(codeValidation.error);
    }
  }

  // 名前（指定されている場合）
  if (input.name !== undefined) {
    const nameValidation = validateMasterName(input.name);
    if (!nameValidation.valid && nameValidation.error) {
      errors.push(nameValidation.error);
    }
  }

  // 説明
  const descriptionValidation = validateMasterDescription(input.description);
  if (!descriptionValidation.valid && descriptionValidation.error) {
    errors.push(descriptionValidation.error);
  }

  // 並び順
  const sortOrderValidation = validateMasterSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid && sortOrderValidation.error) {
    errors.push(sortOrderValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
