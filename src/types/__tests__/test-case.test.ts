import { describe, it, expect } from 'vitest';
import {
  validateTestCaseTitle,
  validateDescription,
  validatePreconditions,
  validateExpectedResult,
  validateCheckpoint,
  validateScenario,
  validateTestEnvironment,
  validateNotes,
  validateTags,
  validateClassification,
  validateReferenceId,
  validateEstimatedTime,
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

  describe('validateExpectedResult', () => {
    it('should return valid for null expectedResult', () => {
      const result = validateExpectedResult(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined expectedResult', () => {
      const result = validateExpectedResult(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for short expectedResult', () => {
      const result = validateExpectedResult('期待結果');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for expectedResult exceeding 10000 characters', () => {
      const longExpectedResult = 'a'.repeat(10001);
      const result = validateExpectedResult(longExpectedResult);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('期待結果は10000文字以内で入力してください。');
    });
  });

  describe('validateCheckpoint', () => {
    it('should return valid for null checkpoint', () => {
      const result = validateCheckpoint(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined checkpoint', () => {
      const result = validateCheckpoint(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for short checkpoint', () => {
      const result = validateCheckpoint('チェックポイント');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for checkpoint exceeding 5000 characters', () => {
      const longCheckpoint = 'a'.repeat(5001);
      const result = validateCheckpoint(longCheckpoint);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('チェックポイントは5000文字以内で入力してください。');
    });
  });

  describe('validateScenario', () => {
    it('should return valid for null scenario', () => {
      const result = validateScenario(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined scenario', () => {
      const result = validateScenario(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for short scenario', () => {
      const result = validateScenario('シナリオ');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for scenario exceeding 10000 characters', () => {
      const longScenario = 'a'.repeat(10001);
      const result = validateScenario(longScenario);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('シナリオは10000文字以内で入力してください。');
    });
  });

  describe('validateTestEnvironment', () => {
    it('should return valid for null testEnvironment', () => {
      const result = validateTestEnvironment(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined testEnvironment', () => {
      const result = validateTestEnvironment(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for short testEnvironment', () => {
      const result = validateTestEnvironment('テスト環境');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for testEnvironment exceeding 5000 characters', () => {
      const longTestEnvironment = 'a'.repeat(5001);
      const result = validateTestEnvironment(longTestEnvironment);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('テスト環境は5000文字以内で入力してください。');
    });
  });

  describe('validateNotes', () => {
    it('should return valid for null notes', () => {
      const result = validateNotes(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined notes', () => {
      const result = validateNotes(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for short notes', () => {
      const result = validateNotes('特記事項');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for notes exceeding 5000 characters', () => {
      const longNotes = 'a'.repeat(5001);
      const result = validateNotes(longNotes);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('特記事項は5000文字以内で入力してください。');
    });
  });

  describe('validateTags', () => {
    it('should return valid for undefined tags', () => {
      const result = validateTags(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for empty tags array', () => {
      const result = validateTags([]);
      expect(result.valid).toBe(true);
    });

    it('should return valid for valid tags', () => {
      const result = validateTags(['tag1', 'tag2', 'tag3']);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for more than 20 tags', () => {
      const manyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
      const result = validateTags(manyTags);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('タグは20個以内で指定してください。');
    });

    it('should return invalid for tag exceeding 50 characters', () => {
      const longTag = 'a'.repeat(51);
      const result = validateTags([longTag]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('各タグは50文字以内で入力してください。');
    });

    it('should return valid for tag at max 50 characters', () => {
      const maxTag = 'a'.repeat(50);
      const result = validateTags([maxTag]);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateClassification', () => {
    it('should return valid for null classification', () => {
      const result = validateClassification(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined classification', () => {
      const result = validateClassification(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for short classification', () => {
      const result = validateClassification('分類');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for classification exceeding 100 characters', () => {
      const longClassification = 'a'.repeat(101);
      const result = validateClassification(longClassification);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('分類は100文字以内で入力してください。');
    });
  });

  describe('validateReferenceId', () => {
    it('should return valid for null referenceId', () => {
      const result = validateReferenceId(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined referenceId', () => {
      const result = validateReferenceId(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for short referenceId', () => {
      const result = validateReferenceId('REF-001');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for referenceId exceeding 100 characters', () => {
      const longReferenceId = 'a'.repeat(101);
      const result = validateReferenceId(longReferenceId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('参照IDは100文字以内で入力してください。');
    });
  });

  describe('validateEstimatedTime', () => {
    it('should return valid for null estimatedTime', () => {
      const result = validateEstimatedTime(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined estimatedTime', () => {
      const result = validateEstimatedTime(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for 0 estimatedTime', () => {
      const result = validateEstimatedTime(0);
      expect(result.valid).toBe(true);
    });

    it('should return valid for valid estimatedTime', () => {
      const result = validateEstimatedTime(60);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for negative estimatedTime', () => {
      const result = validateEstimatedTime(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('推定時間は0以上の値を指定してください。');
    });

    it('should return invalid for non-integer estimatedTime', () => {
      const result = validateEstimatedTime(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('推定時間は整数で指定してください。');
    });

    it('should return invalid for estimatedTime exceeding 99999', () => {
      const result = validateEstimatedTime(100000);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('推定時間は99999分以内で指定してください。');
    });

    it('should return valid for max estimatedTime (99999)', () => {
      const result = validateEstimatedTime(99999);
      expect(result.valid).toBe(true);
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
