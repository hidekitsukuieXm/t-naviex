import { describe, it, expect } from 'vitest';
import {
  TEST_SPEC_STATUS_LABELS,
  VALID_TEST_SPEC_STATUSES,
  validateTestSpecName,
  validateVersion,
  validateTestSpec,
  validateTestSpecVersion,
  compareVersions,
  incrementMinorVersion,
  incrementPatchVersion,
  type TestSpecStatus,
} from '../test-spec';

describe('Test Spec Types', () => {
  describe('TEST_SPEC_STATUS_LABELS', () => {
    it('should have labels for all valid statuses', () => {
      VALID_TEST_SPEC_STATUSES.forEach((status) => {
        expect(TEST_SPEC_STATUS_LABELS[status]).toBeDefined();
      });
    });

    it('should have correct Japanese labels', () => {
      expect(TEST_SPEC_STATUS_LABELS.DRAFT).toBe('下書き');
      expect(TEST_SPEC_STATUS_LABELS.REVIEW).toBe('レビュー中');
      expect(TEST_SPEC_STATUS_LABELS.APPROVED).toBe('承認済み');
      expect(TEST_SPEC_STATUS_LABELS.ARCHIVED).toBe('アーカイブ');
    });
  });

  describe('VALID_TEST_SPEC_STATUSES', () => {
    it('should include all expected statuses', () => {
      expect(VALID_TEST_SPEC_STATUSES).toContain('DRAFT');
      expect(VALID_TEST_SPEC_STATUSES).toContain('REVIEW');
      expect(VALID_TEST_SPEC_STATUSES).toContain('APPROVED');
      expect(VALID_TEST_SPEC_STATUSES).toContain('ARCHIVED');
    });

    it('should have 4 statuses', () => {
      expect(VALID_TEST_SPEC_STATUSES).toHaveLength(4);
    });
  });

  describe('validateTestSpecName', () => {
    it('should return valid for non-empty name', () => {
      const result = validateTestSpecName('テスト仕様書1');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty name', () => {
      const result = validateTestSpecName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テスト仕様書名は必須です。');
    });

    it('should return invalid for whitespace-only name', () => {
      const result = validateTestSpecName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テスト仕様書名は必須です。');
    });

    it('should return invalid for name exceeding 255 characters', () => {
      const longName = 'a'.repeat(256);
      const result = validateTestSpecName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テスト仕様書名は255文字以内で入力してください。');
    });

    it('should return valid for name at max length', () => {
      const maxName = 'a'.repeat(255);
      const result = validateTestSpecName(maxName);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateVersion', () => {
    it('should return valid for semantic version', () => {
      const result = validateVersion('1.0.0');
      expect(result.valid).toBe(true);
    });

    it('should return valid for version with v prefix', () => {
      const result = validateVersion('v2.1.3');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for empty version', () => {
      const result = validateVersion('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('バージョンは必須です。');
    });

    it('should return invalid for version exceeding 50 characters', () => {
      const longVersion = '1.0.' + '0'.repeat(48);
      const result = validateVersion(longVersion);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('バージョンは50文字以内で入力してください。');
    });

    it('should return invalid for version with invalid characters', () => {
      const result = validateVersion('1.0.0 beta');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        'バージョンには英数字、ドット、ハイフン、アンダースコアのみ使用できます。'
      );
    });

    it('should return valid for version with hyphen', () => {
      const result = validateVersion('1.0.0-beta');
      expect(result.valid).toBe(true);
    });

    it('should return valid for version with underscore', () => {
      const result = validateVersion('1.0.0_rc1');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTestSpec', () => {
    it('should return valid for valid test spec data', () => {
      const result = validateTestSpec({
        name: 'テスト仕様書1',
        description: '説明文',
        status: 'DRAFT',
        projectId: '1',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid name', () => {
      const result = validateTestSpec({
        name: '',
        projectId: '1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テスト仕様書名は必須です。');
    });

    it('should return errors for invalid status', () => {
      const result = validateTestSpec({
        name: 'テスト仕様書1',
        status: 'INVALID' as TestSpecStatus,
        projectId: '1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('無効なステータスです。');
    });

    it('should return errors for description exceeding 10000 characters', () => {
      const result = validateTestSpec({
        name: 'テスト仕様書1',
        description: 'a'.repeat(10001),
        projectId: '1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('説明は10000文字以内で入力してください。');
    });

    it('should return errors for empty projectId', () => {
      const result = validateTestSpec({
        name: 'テスト仕様書1',
        projectId: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('プロジェクトIDは必須です。');
    });

    it('should accumulate multiple errors', () => {
      const result = validateTestSpec({
        name: '',
        status: 'INVALID' as TestSpecStatus,
        projectId: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateTestSpecVersion', () => {
    it('should return valid for valid version data', () => {
      const result = validateTestSpecVersion({
        version: '1.1.0',
        changeNote: '新機能追加',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid version', () => {
      const result = validateTestSpecVersion({
        version: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('バージョンは必須です。');
    });

    it('should return errors for change note exceeding 5000 characters', () => {
      const result = validateTestSpecVersion({
        version: '1.1.0',
        changeNote: 'a'.repeat(5001),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('変更内容は5000文字以内で入力してください。');
    });
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should return 1 when first version is greater', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
    });

    it('should return -1 when first version is smaller', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    });

    it('should handle versions with different number of parts', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0.1', '1.0.0')).toBe(1);
    });

    it('should handle non-numeric version parts', () => {
      expect(compareVersions('v1.0.0', 'v1.0.0')).toBe(0);
    });
  });

  describe('incrementMinorVersion', () => {
    it('should increment minor version', () => {
      expect(incrementMinorVersion('1.0.0')).toBe('1.1.0');
    });

    it('should reset patch version', () => {
      expect(incrementMinorVersion('1.0.5')).toBe('1.1.0');
    });

    it('should handle version without patch', () => {
      expect(incrementMinorVersion('1.0')).toBe('1.1');
    });

    it('should handle version without minor', () => {
      expect(incrementMinorVersion('1')).toBe('1.1');
    });
  });

  describe('incrementPatchVersion', () => {
    it('should increment patch version', () => {
      expect(incrementPatchVersion('1.0.0')).toBe('1.0.1');
    });

    it('should handle higher patch numbers', () => {
      expect(incrementPatchVersion('1.0.9')).toBe('1.0.10');
    });

    it('should handle version without patch', () => {
      expect(incrementPatchVersion('1.0')).toBe('1.0.0.1');
    });
  });
});
