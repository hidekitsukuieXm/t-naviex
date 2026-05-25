/**
 * 共有テスト手順関連の型定義
 */

// ============================================
// 基本型定義
// ============================================

/**
 * 共有テスト手順
 */
export interface SharedStep {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  contentMd: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 共有手順詳細（使用回数付き）
 */
export interface SharedStepDetail extends SharedStep {
  usageCount: number;
}

// ============================================
// 入力型定義
// ============================================

/**
 * 共有手順作成入力
 */
export interface CreateSharedStepInput {
  name: string;
  description?: string | null;
  contentMd: string;
  sortOrder?: number;
}

/**
 * 共有手順更新入力
 */
export interface UpdateSharedStepInput {
  name?: string;
  description?: string | null;
  contentMd?: string;
  sortOrder?: number;
}

// ============================================
// レスポンス型定義
// ============================================

/**
 * 共有手順一覧レスポンス
 */
export interface SharedStepListResponse {
  sharedSteps: SharedStep[];
  total: number;
}

// ============================================
// バリデーション関数
// ============================================

/**
 * 共有手順名のバリデーション
 */
export function validateSharedStepName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim() === '') {
    return { valid: false, error: '共有手順名は必須です。' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length > 255) {
    return { valid: false, error: '共有手順名は255文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * 共有手順説明のバリデーション
 */
export function validateSharedStepDescription(description: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (description === null || description === undefined) {
    return { valid: true };
  }

  if (description.length > 5000) {
    return { valid: false, error: '共有手順の説明は5000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * 共有手順内容のバリデーション
 */
export function validateSharedStepContent(contentMd: string): {
  valid: boolean;
  error?: string;
} {
  if (!contentMd || contentMd.trim() === '') {
    return { valid: false, error: '共有手順の内容は必須です。' };
  }

  if (contentMd.length > 50000) {
    return { valid: false, error: '共有手順の内容は50000文字以内で入力してください。' };
  }

  return { valid: true };
}

/**
 * 共有手順並び順のバリデーション
 */
export function validateSharedStepSortOrder(sortOrder: number | undefined): {
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
 * 共有手順作成入力のバリデーション
 */
export function validateCreateSharedStepInput(input: CreateSharedStepInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 名前
  const nameValidation = validateSharedStepName(input.name);
  if (!nameValidation.valid && nameValidation.error) {
    errors.push(nameValidation.error);
  }

  // 説明
  const descriptionValidation = validateSharedStepDescription(input.description);
  if (!descriptionValidation.valid && descriptionValidation.error) {
    errors.push(descriptionValidation.error);
  }

  // 内容
  const contentValidation = validateSharedStepContent(input.contentMd);
  if (!contentValidation.valid && contentValidation.error) {
    errors.push(contentValidation.error);
  }

  // 並び順
  const sortOrderValidation = validateSharedStepSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid && sortOrderValidation.error) {
    errors.push(sortOrderValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 共有手順更新入力のバリデーション
 */
export function validateUpdateSharedStepInput(input: UpdateSharedStepInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 名前（指定されている場合）
  if (input.name !== undefined) {
    const nameValidation = validateSharedStepName(input.name);
    if (!nameValidation.valid && nameValidation.error) {
      errors.push(nameValidation.error);
    }
  }

  // 説明
  const descriptionValidation = validateSharedStepDescription(input.description);
  if (!descriptionValidation.valid && descriptionValidation.error) {
    errors.push(descriptionValidation.error);
  }

  // 内容（指定されている場合）
  if (input.contentMd !== undefined) {
    const contentValidation = validateSharedStepContent(input.contentMd);
    if (!contentValidation.valid && contentValidation.error) {
      errors.push(contentValidation.error);
    }
  }

  // 並び順
  const sortOrderValidation = validateSharedStepSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid && sortOrderValidation.error) {
    errors.push(sortOrderValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
