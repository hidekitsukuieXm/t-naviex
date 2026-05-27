/**
 * ベースライン型定義のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  BASELINE_STATUSES,
  BASELINE_STATUS_INFO,
  BASELINE_NAME_MAX_LENGTH,
  BASELINE_DESCRIPTION_MAX_LENGTH,
  BASELINE_VERSION_MAX_LENGTH,
  validateBaselineName,
  validateBaselineDescription,
  validateBaselineStatus,
  validateBaselineVersion,
  validateCreateBaselineInput,
  validateUpdateBaselineInput,
  generateChecksum,
  validateStatusTransition,
  type TestCaseSnapshotData,
} from '../baseline';

describe('BASELINE_STATUSES', () => {
  it('should have all expected statuses', () => {
    expect(BASELINE_STATUSES).toEqual(['DRAFT', 'APPROVED', 'LOCKED', 'ARCHIVED']);
  });
});

describe('BASELINE_STATUS_INFO', () => {
  it('should have info for all statuses', () => {
    for (const status of BASELINE_STATUSES) {
      expect(BASELINE_STATUS_INFO[status]).toBeDefined();
      expect(BASELINE_STATUS_INFO[status].label).toBeDefined();
      expect(BASELINE_STATUS_INFO[status].description).toBeDefined();
      expect(BASELINE_STATUS_INFO[status].color).toBeDefined();
    }
  });

  it('should have correct labels', () => {
    expect(BASELINE_STATUS_INFO.DRAFT.label).toBe('下書き');
    expect(BASELINE_STATUS_INFO.APPROVED.label).toBe('承認済み');
    expect(BASELINE_STATUS_INFO.LOCKED.label).toBe('ロック');
    expect(BASELINE_STATUS_INFO.ARCHIVED.label).toBe('アーカイブ');
  });
});

describe('validateBaselineName', () => {
  it('should return valid for valid name', () => {
    const result = validateBaselineName('ベースライン1');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return invalid for empty name', () => {
    const result = validateBaselineName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('ベースライン名は必須です');
  });

  it('should return invalid for whitespace only name', () => {
    const result = validateBaselineName('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('ベースライン名は必須です');
  });

  it('should return invalid for name exceeding max length', () => {
    const longName = 'a'.repeat(BASELINE_NAME_MAX_LENGTH + 1);
    const result = validateBaselineName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${BASELINE_NAME_MAX_LENGTH}文字以内`);
  });

  it('should return valid for name at max length', () => {
    const maxName = 'a'.repeat(BASELINE_NAME_MAX_LENGTH);
    const result = validateBaselineName(maxName);
    expect(result.valid).toBe(true);
  });
});

describe('validateBaselineDescription', () => {
  it('should return valid for valid description', () => {
    const result = validateBaselineDescription('ベースラインの説明');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return valid for null description', () => {
    const result = validateBaselineDescription(null);
    expect(result.valid).toBe(true);
  });

  it('should return valid for undefined description', () => {
    const result = validateBaselineDescription(undefined);
    expect(result.valid).toBe(true);
  });

  it('should return valid for empty description', () => {
    const result = validateBaselineDescription('');
    expect(result.valid).toBe(true);
  });

  it('should return invalid for description exceeding max length', () => {
    const longDesc = 'a'.repeat(BASELINE_DESCRIPTION_MAX_LENGTH + 1);
    const result = validateBaselineDescription(longDesc);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${BASELINE_DESCRIPTION_MAX_LENGTH}文字以内`);
  });
});

describe('validateBaselineStatus', () => {
  it('should return valid for all valid statuses', () => {
    for (const status of BASELINE_STATUSES) {
      const result = validateBaselineStatus(status);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    }
  });

  it('should return invalid for invalid status', () => {
    const result = validateBaselineStatus('INVALID');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('無効なステータスです');
  });

  it('should return invalid for empty status', () => {
    const result = validateBaselineStatus('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('無効なステータスです');
  });
});

describe('validateBaselineVersion', () => {
  it('should return valid for valid semver version', () => {
    const result = validateBaselineVersion('1.0.0');
    expect(result.valid).toBe(true);
  });

  it('should return valid for version with prerelease', () => {
    const result = validateBaselineVersion('1.0.0-beta.1');
    expect(result.valid).toBe(true);
  });

  it('should return valid for version with build metadata', () => {
    const result = validateBaselineVersion('1.0.0+build.123');
    expect(result.valid).toBe(true);
  });

  it('should return invalid for empty version', () => {
    const result = validateBaselineVersion('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('バージョンは必須です');
  });

  it('should return invalid for whitespace only version', () => {
    const result = validateBaselineVersion('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('バージョンは必須です');
  });

  it('should return invalid for version exceeding max length', () => {
    const longVersion = '1.' + '0'.repeat(BASELINE_VERSION_MAX_LENGTH);
    const result = validateBaselineVersion(longVersion);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${BASELINE_VERSION_MAX_LENGTH}文字以内`);
  });

  it('should return invalid for invalid semver format', () => {
    const result = validateBaselineVersion('v1.0');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('セマンティックバージョニング形式');
  });

  it('should return invalid for version without patch number', () => {
    const result = validateBaselineVersion('1.0');
    expect(result.valid).toBe(false);
  });
});

describe('validateCreateBaselineInput', () => {
  it('should return valid for minimal valid input', () => {
    const result = validateCreateBaselineInput({
      name: 'ベースライン1',
      version: '1.0.0',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return valid for full valid input', () => {
    const result = validateCreateBaselineInput({
      name: 'ベースライン1',
      description: '説明文',
      version: '1.0.0',
      status: 'DRAFT',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return invalid for empty name', () => {
    const result = validateCreateBaselineInput({
      name: '',
      version: '1.0.0',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ベースライン名は必須です');
  });

  it('should return invalid for empty version', () => {
    const result = validateCreateBaselineInput({
      name: 'ベースライン1',
      version: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('バージョンは必須です');
  });

  it('should return multiple errors for multiple invalid fields', () => {
    const result = validateCreateBaselineInput({
      name: '',
      version: 'invalid',
      status: 'INVALID' as 'DRAFT',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should skip validation for undefined optional fields', () => {
    const result = validateCreateBaselineInput({
      name: 'ベースライン1',
      version: '1.0.0',
      description: undefined,
      status: undefined,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('validateUpdateBaselineInput', () => {
  it('should return valid for empty update (no changes)', () => {
    const result = validateUpdateBaselineInput({});
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should return valid for valid name update', () => {
    const result = validateUpdateBaselineInput({
      name: '新しい名前',
    });
    expect(result.valid).toBe(true);
  });

  it('should return valid for status update', () => {
    const result = validateUpdateBaselineInput({
      status: 'APPROVED',
    });
    expect(result.valid).toBe(true);
  });

  it('should return invalid for invalid name', () => {
    const result = validateUpdateBaselineInput({
      name: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ベースライン名は必須です');
  });

  it('should validate null description', () => {
    const result = validateUpdateBaselineInput({
      description: null,
    });
    expect(result.valid).toBe(true);
  });
});

describe('generateChecksum', () => {
  it('should generate consistent checksum for same data', () => {
    const data: TestCaseSnapshotData = {
      title: 'テストケース',
      description: '説明',
      preconditions: '前提条件',
      expectedResult: '期待結果',
      checkpoint: null,
      scenario: null,
      testEnvironment: null,
      notes: null,
      priority: 'MEDIUM',
      testType: 'FUNCTIONAL',
      testTechnique: 'OTHER',
      tags: ['tag1', 'tag2'],
      steps: [{ stepNo: 1, actionMd: 'アクション1', expectedMd: '期待結果1' }],
    };

    const checksum1 = generateChecksum(data);
    const checksum2 = generateChecksum(data);

    expect(checksum1).toBe(checksum2);
  });

  it('should generate different checksums for different data', () => {
    const data1: TestCaseSnapshotData = {
      title: 'テストケース1',
      description: null,
      preconditions: null,
      expectedResult: null,
      checkpoint: null,
      scenario: null,
      testEnvironment: null,
      notes: null,
      priority: 'HIGH',
      testType: 'FUNCTIONAL',
      testTechnique: 'OTHER',
      tags: [],
      steps: [],
    };

    const data2: TestCaseSnapshotData = {
      title: 'テストケース2',
      description: null,
      preconditions: null,
      expectedResult: null,
      checkpoint: null,
      scenario: null,
      testEnvironment: null,
      notes: null,
      priority: 'HIGH',
      testType: 'FUNCTIONAL',
      testTechnique: 'OTHER',
      tags: [],
      steps: [],
    };

    const checksum1 = generateChecksum(data1);
    const checksum2 = generateChecksum(data2);

    expect(checksum1).not.toBe(checksum2);
  });

  it('should return 64-character hex string', () => {
    const data: TestCaseSnapshotData = {
      title: 'テスト',
      description: null,
      preconditions: null,
      expectedResult: null,
      checkpoint: null,
      scenario: null,
      testEnvironment: null,
      notes: null,
      priority: 'MEDIUM',
      testType: 'FUNCTIONAL',
      testTechnique: 'OTHER',
      tags: [],
      steps: [],
    };

    const checksum = generateChecksum(data);

    expect(checksum).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('validateStatusTransition', () => {
  describe('from DRAFT', () => {
    it('should allow transition to APPROVED', () => {
      const result = validateStatusTransition('DRAFT', 'APPROVED');
      expect(result.valid).toBe(true);
    });

    it('should allow transition to ARCHIVED', () => {
      const result = validateStatusTransition('DRAFT', 'ARCHIVED');
      expect(result.valid).toBe(true);
    });

    it('should not allow transition to LOCKED', () => {
      const result = validateStatusTransition('DRAFT', 'LOCKED');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('遷移はできません');
    });

    it('should allow staying in DRAFT', () => {
      const result = validateStatusTransition('DRAFT', 'DRAFT');
      expect(result.valid).toBe(true);
    });
  });

  describe('from APPROVED', () => {
    it('should allow transition to LOCKED', () => {
      const result = validateStatusTransition('APPROVED', 'LOCKED');
      expect(result.valid).toBe(true);
    });

    it('should allow transition to ARCHIVED', () => {
      const result = validateStatusTransition('APPROVED', 'ARCHIVED');
      expect(result.valid).toBe(true);
    });

    it('should not allow transition to DRAFT', () => {
      const result = validateStatusTransition('APPROVED', 'DRAFT');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('遷移はできません');
    });
  });

  describe('from LOCKED', () => {
    it('should allow transition to ARCHIVED', () => {
      const result = validateStatusTransition('LOCKED', 'ARCHIVED');
      expect(result.valid).toBe(true);
    });

    it('should not allow transition to DRAFT', () => {
      const result = validateStatusTransition('LOCKED', 'DRAFT');
      expect(result.valid).toBe(false);
    });

    it('should not allow transition to APPROVED', () => {
      const result = validateStatusTransition('LOCKED', 'APPROVED');
      expect(result.valid).toBe(false);
    });
  });

  describe('from ARCHIVED', () => {
    it('should not allow any transition', () => {
      expect(validateStatusTransition('ARCHIVED', 'DRAFT').valid).toBe(false);
      expect(validateStatusTransition('ARCHIVED', 'APPROVED').valid).toBe(false);
      expect(validateStatusTransition('ARCHIVED', 'LOCKED').valid).toBe(false);
    });

    it('should allow staying in ARCHIVED', () => {
      const result = validateStatusTransition('ARCHIVED', 'ARCHIVED');
      expect(result.valid).toBe(true);
    });
  });
});
