import { describe, it, expect } from 'vitest';
import {
  validateTestCaseTitle,
  validateDescription,
  validatePreconditions,
  validatePriority,
  validateTestType,
  validateTestTechnique,
  validateSortOrder,
  validateCreateTestCaseInput,
  validateUpdateTestCaseInput,
  VALID_PRIORITIES,
  VALID_TEST_TYPES,
  VALID_TEST_TECHNIQUES,
  PRIORITY_LABELS,
  TEST_TYPE_LABELS,
  TEST_TECHNIQUE_LABELS,
} from '../test-case';

describe('Test Case Types', () => {
  describe('validateTestCaseTitle', () => {
    it('should return valid for non-empty title', () => {
      const result = validateTestCaseTitle('テストケース1');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty title', () => {
      const result = validateTestCaseTitle('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テストケースタイトルは必須です。');
    });

    it('should return invalid for whitespace-only title', () => {
      const result = validateTestCaseTitle('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テストケースタイトルは必須です。');
    });

    it('should return invalid for title exceeding 500 characters', () => {
      const longTitle = 'a'.repeat(501);
      const result = validateTestCaseTitle(longTitle);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テストケースタイトルは500文字以内で入力してください。');
    });

    it('should return valid for title at max length', () => {
      const maxTitle = 'a'.repeat(500);
      const result = validateTestCaseTitle(maxTitle);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateDescription', () => {
    it('should return valid for null description', () => {
      const result = validateDescription(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined description', () => {
      const result = validateDescription(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for short description', () => {
      const result = validateDescription('短い説明');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for description exceeding 10000 characters', () => {
      const longDescription = 'a'.repeat(10001);
      const result = validateDescription(longDescription);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('説明は10000文字以内で入力してください。');
    });
  });

  describe('validatePreconditions', () => {
    it('should return valid for null preconditions', () => {
      const result = validatePreconditions(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined preconditions', () => {
      const result = validatePreconditions(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for short preconditions', () => {
      const result = validatePreconditions('事前条件');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for preconditions exceeding 5000 characters', () => {
      const longPreconditions = 'a'.repeat(5001);
      const result = validatePreconditions(longPreconditions);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('事前条件は5000文字以内で入力してください。');
    });
  });

  describe('validatePriority', () => {
    it('should return valid for undefined priority', () => {
      const result = validatePriority(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for valid priority', () => {
      VALID_PRIORITIES.forEach((priority) => {
        const result = validatePriority(priority);
        expect(result.valid).toBe(true);
      });
    });

    it('should return invalid for invalid priority', () => {
      const result = validatePriority('INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('無効な優先度です。');
    });
  });

  describe('validateTestType', () => {
    it('should return valid for undefined testType', () => {
      const result = validateTestType(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for valid testType', () => {
      VALID_TEST_TYPES.forEach((testType) => {
        const result = validateTestType(testType);
        expect(result.valid).toBe(true);
      });
    });

    it('should return invalid for invalid testType', () => {
      const result = validateTestType('INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('無効なテストタイプです。');
    });
  });

  describe('validateTestTechnique', () => {
    it('should return valid for undefined testTechnique', () => {
      const result = validateTestTechnique(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for valid testTechnique', () => {
      VALID_TEST_TECHNIQUES.forEach((technique) => {
        const result = validateTestTechnique(technique);
        expect(result.valid).toBe(true);
      });
    });

    it('should return invalid for invalid testTechnique', () => {
      const result = validateTestTechnique('INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('無効なテスト技法です。');
    });
  });

  describe('validateSortOrder', () => {
    it('should return valid for undefined sortOrder', () => {
      const result = validateSortOrder(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for valid sort order', () => {
      expect(validateSortOrder(0).valid).toBe(true);
      expect(validateSortOrder(100).valid).toBe(true);
      expect(validateSortOrder(999999).valid).toBe(true);
    });

    it('should return invalid for non-integer', () => {
      const result = validateSortOrder(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は整数で指定してください。');
    });

    it('should return invalid for negative number', () => {
      const result = validateSortOrder(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は0以上の値を指定してください。');
    });

    it('should return invalid for too large number', () => {
      const result = validateSortOrder(1000000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('並び順は999999以下の値を指定してください。');
    });
  });

  describe('validateCreateTestCaseInput', () => {
    it('should return valid for valid input', () => {
      const result = validateCreateTestCaseInput({
        testSpecId: '1',
        title: 'テストケース1',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for full input', () => {
      const result = validateCreateTestCaseInput({
        testSpecId: '1',
        sectionId: '2',
        title: 'テストケース1',
        description: '説明',
        preconditions: '事前条件',
        priority: 'HIGH',
        testType: 'FUNCTIONAL',
        testTechnique: 'BOUNDARY_VALUE_ANALYSIS',
        isMatrix: false,
        sortOrder: 0,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing testSpecId', () => {
      const result = validateCreateTestCaseInput({
        testSpecId: '',
        title: 'テストケース1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テスト仕様書IDは必須です。');
    });

    it('should return errors for missing title', () => {
      const result = validateCreateTestCaseInput({
        testSpecId: '1',
        title: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テストケースタイトルは必須です。');
    });

    it('should return errors for invalid priority', () => {
      const result = validateCreateTestCaseInput({
        testSpecId: '1',
        title: 'テストケース1',
        priority: 'INVALID' as 'HIGH',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('無効な優先度です。');
    });

    it('should accumulate multiple errors', () => {
      const result = validateCreateTestCaseInput({
        testSpecId: '',
        title: '',
        priority: 'INVALID' as 'HIGH',
        sortOrder: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateUpdateTestCaseInput', () => {
    it('should return valid for valid input', () => {
      const result = validateUpdateTestCaseInput({
        title: 'Updated Title',
        priority: 'HIGH',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for empty input', () => {
      const result = validateUpdateTestCaseInput({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid title', () => {
      const result = validateUpdateTestCaseInput({
        title: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テストケースタイトルは必須です。');
    });

    it('should return errors for invalid sort order', () => {
      const result = validateUpdateTestCaseInput({
        sortOrder: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('並び順は0以上の値を指定してください。');
    });
  });

  describe('Constants', () => {
    it('should have all priorities defined in labels', () => {
      VALID_PRIORITIES.forEach((priority) => {
        expect(PRIORITY_LABELS[priority]).toBeDefined();
      });
    });

    it('should have all test types defined in labels', () => {
      VALID_TEST_TYPES.forEach((testType) => {
        expect(TEST_TYPE_LABELS[testType]).toBeDefined();
      });
    });

    it('should have all test techniques defined in labels', () => {
      VALID_TEST_TECHNIQUES.forEach((technique) => {
        expect(TEST_TECHNIQUE_LABELS[technique]).toBeDefined();
      });
    });
  });
});
