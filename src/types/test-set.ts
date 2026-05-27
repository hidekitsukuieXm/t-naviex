/**
 * テストセット関連の型定義
 */

// =================================================================
// Enums
// =================================================================

/**
 * テストセットステータス
 */
export const TEST_SET_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const;
export type TestSetStatus = (typeof TEST_SET_STATUSES)[number];

/**
 * テストセットステータス情報
 */
export const TEST_SET_STATUS_INFO: Record<
  TestSetStatus,
  { label: string; description: string; color: string }
> = {
  DRAFT: { label: '下書き', description: '作成中のテストセット', color: '#6b7280' },
  ACTIVE: { label: '有効', description: '使用可能なテストセット', color: '#22c55e' },
  COMPLETED: { label: '完了', description: '実行が完了したテストセット', color: '#3b82f6' },
  ARCHIVED: { label: 'アーカイブ', description: 'アーカイブされたテストセット', color: '#ef4444' },
};

// =================================================================
// Types
// =================================================================

/**
 * タグ情報
 */
export interface TestSetTagInfo {
  id: string;
  name: string;
  color: string;
}

/**
 * テストケース情報（テストセット内）
 */
export interface TestSetCaseInfo {
  id: string;
  testCaseId: string;
  title: string;
  priority: string;
  testType: string;
  sortOrder: number;
}

/**
 * ユーザー情報
 */
export interface TestSetUserInfo {
  id: string;
  name: string;
  email: string;
}

/**
 * テストセット基本型
 */
export interface TestSet {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: TestSetStatus;
  version: string;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
  executionCount: number;
  lastExecutedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById: string | null;
}

/**
 * テストセット（タグ付き）
 */
export interface TestSetWithTags extends TestSet {
  tags: TestSetTagInfo[];
}

/**
 * テストセット（詳細情報付き）
 */
export interface TestSetDetail extends TestSetWithTags {
  testCases: TestSetCaseInfo[];
  testCaseCount: number;
  createdBy: TestSetUserInfo | null;
  updatedBy: TestSetUserInfo | null;
}

/**
 * テストセット作成入力
 */
export interface CreateTestSetInput {
  name: string;
  description?: string;
  status?: TestSetStatus;
  version?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
  tagIds?: string[];
  testCaseIds?: string[];
}

/**
 * テストセット更新入力
 */
export interface UpdateTestSetInput {
  name?: string;
  description?: string | null;
  status?: TestSetStatus;
  version?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown> | null;
  tagIds?: string[];
}

/**
 * テストケース追加・削除入力
 */
export interface TestSetCasesInput {
  testCaseIds: string[];
}

/**
 * テストセットケースの並び順更新入力
 */
export interface TestSetCaseOrderInput {
  testCaseId: string;
  sortOrder: number;
}

// =================================================================
// Validation
// =================================================================

/**
 * テストセット名の最大長
 */
export const TEST_SET_NAME_MAX_LENGTH = 255;

/**
 * テストセット説明の最大長
 */
export const TEST_SET_DESCRIPTION_MAX_LENGTH = 5000;

/**
 * テストセットバージョンの最大長
 */
export const TEST_SET_VERSION_MAX_LENGTH = 50;

/**
 * テストセット名のバリデーション
 */
export function validateTestSetName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'テストセット名は必須です' };
  }
  if (name.length > TEST_SET_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `テストセット名は${TEST_SET_NAME_MAX_LENGTH}文字以内で入力してください`,
    };
  }
  return { valid: true };
}

/**
 * テストセット説明のバリデーション
 */
export function validateTestSetDescription(description: string | null | undefined): {
  valid: boolean;
  error?: string;
} {
  if (description && description.length > TEST_SET_DESCRIPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `説明は${TEST_SET_DESCRIPTION_MAX_LENGTH}文字以内で入力してください`,
    };
  }
  return { valid: true };
}

/**
 * テストセットステータスのバリデーション
 */
export function validateTestSetStatus(status: string): { valid: boolean; error?: string } {
  if (!TEST_SET_STATUSES.includes(status as TestSetStatus)) {
    return { valid: false, error: '無効なステータスです' };
  }
  return { valid: true };
}

/**
 * テストセットバージョンのバリデーション
 */
export function validateTestSetVersion(version: string): { valid: boolean; error?: string } {
  if (!version || version.trim().length === 0) {
    return { valid: false, error: 'バージョンは必須です' };
  }
  if (version.length > TEST_SET_VERSION_MAX_LENGTH) {
    return {
      valid: false,
      error: `バージョンは${TEST_SET_VERSION_MAX_LENGTH}文字以内で入力してください`,
    };
  }
  // セマンティックバージョニング形式のチェック（オプショナル）
  const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
  if (!semverRegex.test(version)) {
    return {
      valid: false,
      error: 'バージョンはセマンティックバージョニング形式（例: 1.0.0）で入力してください',
    };
  }
  return { valid: true };
}

/**
 * テストセット並び順のバリデーション
 */
export function validateTestSetSortOrder(sortOrder: number): { valid: boolean; error?: string } {
  if (typeof sortOrder !== 'number' || !Number.isInteger(sortOrder)) {
    return { valid: false, error: '並び順は整数で入力してください' };
  }
  if (sortOrder < 0) {
    return { valid: false, error: '並び順は0以上の整数で入力してください' };
  }
  return { valid: true };
}

/**
 * テストセット作成入力のバリデーション
 */
export function validateCreateTestSetInput(input: CreateTestSetInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const nameResult = validateTestSetName(input.name);
  if (!nameResult.valid && nameResult.error) {
    errors.push(nameResult.error);
  }

  if (input.description !== undefined) {
    const descResult = validateTestSetDescription(input.description);
    if (!descResult.valid && descResult.error) {
      errors.push(descResult.error);
    }
  }

  if (input.status !== undefined) {
    const statusResult = validateTestSetStatus(input.status);
    if (!statusResult.valid && statusResult.error) {
      errors.push(statusResult.error);
    }
  }

  if (input.version !== undefined) {
    const versionResult = validateTestSetVersion(input.version);
    if (!versionResult.valid && versionResult.error) {
      errors.push(versionResult.error);
    }
  }

  if (input.sortOrder !== undefined) {
    const sortOrderResult = validateTestSetSortOrder(input.sortOrder);
    if (!sortOrderResult.valid && sortOrderResult.error) {
      errors.push(sortOrderResult.error);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * テストセット更新入力のバリデーション
 */
export function validateUpdateTestSetInput(input: UpdateTestSetInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (input.name !== undefined) {
    const nameResult = validateTestSetName(input.name);
    if (!nameResult.valid && nameResult.error) {
      errors.push(nameResult.error);
    }
  }

  if (input.description !== undefined) {
    const descResult = validateTestSetDescription(input.description);
    if (!descResult.valid && descResult.error) {
      errors.push(descResult.error);
    }
  }

  if (input.status !== undefined) {
    const statusResult = validateTestSetStatus(input.status);
    if (!statusResult.valid && statusResult.error) {
      errors.push(statusResult.error);
    }
  }

  if (input.version !== undefined) {
    const versionResult = validateTestSetVersion(input.version);
    if (!versionResult.valid && versionResult.error) {
      errors.push(versionResult.error);
    }
  }

  if (input.sortOrder !== undefined) {
    const sortOrderResult = validateTestSetSortOrder(input.sortOrder);
    if (!sortOrderResult.valid && sortOrderResult.error) {
      errors.push(sortOrderResult.error);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * テストケース追加・削除入力のバリデーション
 */
export function validateTestSetCasesInput(input: TestSetCasesInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(input.testCaseIds)) {
    errors.push('testCaseIdsは配列である必要があります');
  } else if (input.testCaseIds.length === 0) {
    errors.push('少なくとも1つのテストケースIDを指定してください');
  } else {
    for (const id of input.testCaseIds) {
      if (typeof id !== 'string' || id.trim().length === 0) {
        errors.push('テストケースIDは空でない文字列である必要があります');
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
