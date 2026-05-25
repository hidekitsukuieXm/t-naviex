import { describe, it, expect } from 'vitest';
import {
  validateMasterCode,
  validateMasterName,
  validateMasterDescription,
  validateMasterSortOrder,
  validateCreateMasterItemInput,
  validateUpdateMasterItemInput,
  DEFAULT_TEST_TYPES,
  DEFAULT_TEST_TECHNIQUES,
  DEFAULT_TEST_PERSPECTIVES,
} from '../master';

describe('マスタバリデーション', () => {
  describe('validateMasterCode', () => {
    it('should accept valid codes', () => {
      expect(validateMasterCode('FUNCTIONAL').valid).toBe(true);
      expect(validateMasterCode('E2E').valid).toBe(true);
      expect(validateMasterCode('TEST_TYPE_1').valid).toBe(true);
    });

    it('should reject empty code', () => {
      const result = validateMasterCode('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('コードは必須です。');
    });

    it('should reject whitespace-only code', () => {
      const result = validateMasterCode('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('コードは必須です。');
    });

    it('should reject code with invalid characters', () => {
      expect(validateMasterCode('test').valid).toBe(false); // lowercase
      expect(validateMasterCode('TEST-TYPE').valid).toBe(false); // hyphen
      expect(validateMasterCode('TEST TYPE').valid).toBe(false); // space
      expect(validateMasterCode('TEST!').valid).toBe(false); // special char
    });

    it('should reject code exceeding 50 characters', () => {
      const result = validateMasterCode('A'.repeat(51));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('コードは50文字以内で入力してください。');
    });
  });

  describe('validateMasterName', () => {
    it('should accept valid names', () => {
      expect(validateMasterName('機能テスト').valid).toBe(true);
      expect(validateMasterName('E2E Test').valid).toBe(true);
      expect(validateMasterName('テスト-1').valid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validateMasterName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('名前は必須です。');
    });

    it('should reject name exceeding 100 characters', () => {
      const result = validateMasterName('あ'.repeat(101));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('名前は100文字以内で入力してください。');
    });
  });

  describe('validateMasterDescription', () => {
    it('should accept null or undefined', () => {
      expect(validateMasterDescription(null).valid).toBe(true);
      expect(validateMasterDescription(undefined).valid).toBe(true);
    });

    it('should accept valid descriptions', () => {
      expect(validateMasterDescription('テストの説明').valid).toBe(true);
      expect(validateMasterDescription('').valid).toBe(true);
    });

    it('should reject description exceeding 500 characters', () => {
      const result = validateMasterDescription('あ'.repeat(501));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('説明は500文字以内で入力してください。');
    });
  });

  describe('validateMasterSortOrder', () => {
    it('should accept undefined', () => {
      expect(validateMasterSortOrder(undefined).valid).toBe(true);
    });

    it('should accept valid sort orders', () => {
      expect(validateMasterSortOrder(0).valid).toBe(true);
      expect(validateMasterSortOrder(100).valid).toBe(true);
      expect(validateMasterSortOrder(9999).valid).toBe(true);
    });

    it('should reject non-integer values', () => {
      const result = validateMasterSortOrder(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は整数で指定してください。');
    });

    it('should reject negative values', () => {
      const result = validateMasterSortOrder(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は0以上の値を指定してください。');
    });

    it('should reject values exceeding 9999', () => {
      const result = validateMasterSortOrder(10000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は9999以下の値を指定してください。');
    });
  });

  describe('validateCreateMasterItemInput', () => {
    it('should accept valid input', () => {
      const result = validateCreateMasterItemInput({
        code: 'FUNCTIONAL',
        name: '機能テスト',
        description: 'テストの説明',
        sortOrder: 1,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept minimal required input', () => {
      const result = validateCreateMasterItemInput({
        code: 'TEST',
        name: 'テスト',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid input', () => {
      const result = validateCreateMasterItemInput({
        code: '',
        name: '',
        description: 'あ'.repeat(501),
        sortOrder: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateUpdateMasterItemInput', () => {
    it('should accept valid partial update', () => {
      const result = validateUpdateMasterItemInput({
        name: '新しい名前',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept empty update', () => {
      const result = validateUpdateMasterItemInput({});
      expect(result.valid).toBe(true);
    });

    it('should reject invalid code update', () => {
      const result = validateUpdateMasterItemInput({
        code: 'invalid-code',
      });
      expect(result.valid).toBe(false);
    });
  });
});

describe('デフォルト値', () => {
  describe('DEFAULT_TEST_TYPES', () => {
    it('should have required default types', () => {
      const codes = DEFAULT_TEST_TYPES.map((t) => t.code);
      expect(codes).toContain('FUNCTIONAL');
      expect(codes).toContain('INTEGRATION');
      expect(codes).toContain('E2E');
      expect(codes).toContain('OTHER');
    });

    it('should have exactly one default item', () => {
      const defaults = DEFAULT_TEST_TYPES.filter((t) => t.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].code).toBe('FUNCTIONAL');
    });

    it('should have valid items', () => {
      for (const item of DEFAULT_TEST_TYPES) {
        const result = validateCreateMasterItemInput(item);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('DEFAULT_TEST_TECHNIQUES', () => {
    it('should have required default techniques', () => {
      const codes = DEFAULT_TEST_TECHNIQUES.map((t) => t.code);
      expect(codes).toContain('EQUIVALENCE_PARTITIONING');
      expect(codes).toContain('BOUNDARY_VALUE_ANALYSIS');
      expect(codes).toContain('OTHER');
    });

    it('should have exactly one default item', () => {
      const defaults = DEFAULT_TEST_TECHNIQUES.filter((t) => t.isDefault);
      expect(defaults).toHaveLength(1);
    });

    it('should have valid items', () => {
      for (const item of DEFAULT_TEST_TECHNIQUES) {
        const result = validateCreateMasterItemInput(item);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('DEFAULT_TEST_PERSPECTIVES', () => {
    it('should have required default perspectives', () => {
      const codes = DEFAULT_TEST_PERSPECTIVES.map((t) => t.code);
      expect(codes).toContain('NORMAL');
      expect(codes).toContain('ABNORMAL');
      expect(codes).toContain('BOUNDARY');
      expect(codes).toContain('OTHER');
    });

    it('should have exactly one default item', () => {
      const defaults = DEFAULT_TEST_PERSPECTIVES.filter((t) => t.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].code).toBe('NORMAL');
    });

    it('should have valid items', () => {
      for (const item of DEFAULT_TEST_PERSPECTIVES) {
        const result = validateCreateMasterItemInput(item);
        expect(result.valid).toBe(true);
      }
    });
  });
});
