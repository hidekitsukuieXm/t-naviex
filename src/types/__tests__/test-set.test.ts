/**
 * テストセット型定義のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  TEST_SET_STATUSES,
  TEST_SET_STATUS_INFO,
  TEST_SET_NAME_MAX_LENGTH,
  TEST_SET_DESCRIPTION_MAX_LENGTH,
  TEST_SET_VERSION_MAX_LENGTH,
  validateTestSetName,
  validateTestSetDescription,
  validateTestSetStatus,
  validateTestSetVersion,
  validateTestSetSortOrder,
  validateCreateTestSetInput,
  validateUpdateTestSetInput,
  validateTestSetCasesInput,
} from '../test-set';

describe('TEST_SET_STATUSES', () => {
  it('should have all expected statuses', () => {
    expect(TEST_SET_STATUSES).toEqual(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']);
  });
});

describe('TEST_SET_STATUS_INFO', () => {
  it('should have info for all statuses', () => {
    for (const status of TEST_SET_STATUSES) {
      expect(TEST_SET_STATUS_INFO[status]).toBeDefined();
      expect(TEST_SET_STATUS_INFO[status].label).toBeDefined();
      expect(TEST_SET_STATUS_INFO[status].description).toBeDefined();
      expect(TEST_SET_STATUS_INFO[status].color).toBeDefined();
    }
  });

  it('should have correct labels', () => {
    expect(TEST_SET_STATUS_INFO.DRAFT.label).toBe('下書き');
    expect(TEST_SET_STATUS_INFO.ACTIVE.label).toBe('有効');
    expect(TEST_SET_STATUS_INFO.COMPLETED.label).toBe('完了');
    expect(TEST_SET_STATUS_INFO.ARCHIVED.label).toBe('アーカイブ');
  });
});

describe('validateTestSetName', () => {
  it('should return valid for valid name', () => {
    const result = validateTestSetName('テストセット1');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return invalid for empty name', () => {
    const result = validateTestSetName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('テストセット名は必須です');
  });

  it('should return invalid for whitespace only name', () => {
    const result = validateTestSetName('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('テストセット名は必須です');
  });

  it('should return invalid for name exceeding max length', () => {
    const longName = 'a'.repeat(TEST_SET_NAME_MAX_LENGTH + 1);
    const result = validateTestSetName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${TEST_SET_NAME_MAX_LENGTH}文字以内`);
  });

  it('should return valid for name at max length', () => {
    const maxName = 'a'.repeat(TEST_SET_NAME_MAX_LENGTH);
    const result = validateTestSetName(maxName);
    expect(result.valid).toBe(true);
  });
});

describe('validateTestSetDescription', () => {
  it('should return valid for valid description', () => {
    const result = validateTestSetDescription('テストセットの説明');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return valid for null description', () => {
    const result = validateTestSetDescription(null);
    expect(result.valid).toBe(true);
  });

  it('should return valid for undefined description', () => {
    const result = validateTestSetDescription(undefined);
    expect(result.valid).toBe(true);
  });

  it('should return valid for empty description', () => {
    const result = validateTestSetDescription('');
    expect(result.valid).toBe(true);
  });

  it('should return invalid for description exceeding max length', () => {
    const longDesc = 'a'.repeat(TEST_SET_DESCRIPTION_MAX_LENGTH + 1);
    const result = validateTestSetDescription(longDesc);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${TEST_SET_DESCRIPTION_MAX_LENGTH}文字以内`);
  });
});

describe('validateTestSetStatus', () => {
  it('should return valid for all valid statuses', () => {
    for (const status of TEST_SET_STATUSES) {
      const result = validateTestSetStatus(status);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    }
  });

  it('should return invalid for invalid status', () => {
    const result = validateTestSetStatus('INVALID');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('無効なステータスです');
  });

  it('should return invalid for empty status', () => {
    const result = validateTestSetStatus('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('無効なステータスです');
  });
});

describe('validateTestSetVersion', () => {
  it('should return valid for valid semver version', () => {
    const result = validateTestSetVersion('1.0.0');
    expect(result.valid).toBe(true);
  });

  it('should return valid for version with prerelease', () => {
    const result = validateTestSetVersion('1.0.0-beta.1');
    expect(result.valid).toBe(true);
  });

  it('should return valid for version with build metadata', () => {
    const result = validateTestSetVersion('1.0.0+build.123');
    expect(result.valid).toBe(true);
  });

  it('should return invalid for empty version', () => {
    const result = validateTestSetVersion('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('バージョンは必須です');
  });

  it('should return invalid for whitespace only version', () => {
    const result = validateTestSetVersion('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('バージョンは必須です');
  });

  it('should return invalid for version exceeding max length', () => {
    const longVersion = '1.' + '0'.repeat(TEST_SET_VERSION_MAX_LENGTH);
    const result = validateTestSetVersion(longVersion);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${TEST_SET_VERSION_MAX_LENGTH}文字以内`);
  });

  it('should return invalid for invalid semver format', () => {
    const result = validateTestSetVersion('v1.0');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('セマンティックバージョニング形式');
  });

  it('should return invalid for version without patch number', () => {
    const result = validateTestSetVersion('1.0');
    expect(result.valid).toBe(false);
  });
});

describe('validateTestSetSortOrder', () => {
  it('should return valid for zero', () => {
    const result = validateTestSetSortOrder(0);
    expect(result.valid).toBe(true);
  });

  it('should return valid for positive integer', () => {
    const result = validateTestSetSortOrder(100);
    expect(result.valid).toBe(true);
  });

  it('should return invalid for negative number', () => {
    const result = validateTestSetSortOrder(-1);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('並び順は0以上の整数で入力してください');
  });

  it('should return invalid for non-integer', () => {
    const result = validateTestSetSortOrder(1.5);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('並び順は整数で入力してください');
  });

  it('should return invalid for NaN', () => {
    const result = validateTestSetSortOrder(NaN);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('並び順は整数で入力してください');
  });
});

describe('validateCreateTestSetInput', () => {
  it('should return valid for minimal valid input', () => {
    const result = validateCreateTestSetInput({
      name: 'テストセット1',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return valid for full valid input', () => {
    const result = validateCreateTestSetInput({
      name: 'テストセット1',
      description: '説明文',
      status: 'ACTIVE',
      version: '1.0.0',
      sortOrder: 0,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return invalid for empty name', () => {
    const result = validateCreateTestSetInput({
      name: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('テストセット名は必須です');
  });

  it('should return multiple errors for multiple invalid fields', () => {
    const result = validateCreateTestSetInput({
      name: '',
      status: 'INVALID' as 'DRAFT',
      version: 'invalid',
      sortOrder: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should skip validation for undefined optional fields', () => {
    const result = validateCreateTestSetInput({
      name: 'テストセット1',
      description: undefined,
      status: undefined,
      version: undefined,
      sortOrder: undefined,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('validateUpdateTestSetInput', () => {
  it('should return valid for empty update (no changes)', () => {
    const result = validateUpdateTestSetInput({});
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return valid for valid name update', () => {
    const result = validateUpdateTestSetInput({
      name: '新しい名前',
    });
    expect(result.valid).toBe(true);
  });

  it('should return valid for status update', () => {
    const result = validateUpdateTestSetInput({
      status: 'COMPLETED',
    });
    expect(result.valid).toBe(true);
  });

  it('should return invalid for invalid name', () => {
    const result = validateUpdateTestSetInput({
      name: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('テストセット名は必須です');
  });

  it('should validate null description', () => {
    const result = validateUpdateTestSetInput({
      description: null,
    });
    expect(result.valid).toBe(true);
  });
});

describe('validateTestSetCasesInput', () => {
  it('should return valid for valid test case IDs', () => {
    const result = validateTestSetCasesInput({
      testCaseIds: ['1', '2', '3'],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return invalid for empty array', () => {
    const result = validateTestSetCasesInput({
      testCaseIds: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('少なくとも1つのテストケースIDを指定してください');
  });

  it('should return invalid for non-array', () => {
    const result = validateTestSetCasesInput({
      testCaseIds: 'not-an-array' as unknown as string[],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('testCaseIdsは配列である必要があります');
  });

  it('should return invalid for array with empty string', () => {
    const result = validateTestSetCasesInput({
      testCaseIds: ['1', '', '3'],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('テストケースIDは空でない文字列である必要があります');
  });

  it('should return invalid for array with non-string elements', () => {
    const result = validateTestSetCasesInput({
      testCaseIds: ['1', 2, '3'] as unknown as string[],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('テストケースIDは空でない文字列である必要があります');
  });

  it('should return valid for single test case ID', () => {
    const result = validateTestSetCasesInput({
      testCaseIds: ['1'],
    });
    expect(result.valid).toBe(true);
  });
});
