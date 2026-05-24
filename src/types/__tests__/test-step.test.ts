import { describe, it, expect } from 'vitest';
import {
  validateActionMd,
  validateExpectedMd,
  validateStepNo,
  validateCreateTestStepInput,
  validateUpdateTestStepInput,
  validateBulkCreateTestStepsInput,
  validateReorderTestStepsInput,
  getNextStepNo,
  recalculateStepNumbers,
  adjustStepNumbersForInsert,
  adjustStepNumbersForDelete,
  MAX_ACTION_LENGTH,
  MAX_EXPECTED_LENGTH,
  MAX_STEPS_PER_CASE,
  TestStep,
} from '../test-step';

describe('Test Step Types', () => {
  describe('validateActionMd', () => {
    it('should return valid for non-empty action', () => {
      const result = validateActionMd('ボタンをクリックする');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty action', () => {
      const result = validateActionMd('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('操作手順は必須です。');
    });

    it('should return invalid for whitespace-only action', () => {
      const result = validateActionMd('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('操作手順は必須です。');
    });

    it('should return invalid for action exceeding max length', () => {
      const longAction = 'a'.repeat(MAX_ACTION_LENGTH + 1);
      const result = validateActionMd(longAction);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`操作手順は${MAX_ACTION_LENGTH}文字以内で入力してください。`);
    });

    it('should return valid for action at max length', () => {
      const maxAction = 'a'.repeat(MAX_ACTION_LENGTH);
      const result = validateActionMd(maxAction);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateExpectedMd', () => {
    it('should return valid for null expected', () => {
      const result = validateExpectedMd(null);
      expect(result.valid).toBe(true);
    });

    it('should return valid for undefined expected', () => {
      const result = validateExpectedMd(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for short expected', () => {
      const result = validateExpectedMd('ダイアログが表示される');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for expected exceeding max length', () => {
      const longExpected = 'a'.repeat(MAX_EXPECTED_LENGTH + 1);
      const result = validateExpectedMd(longExpected);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`期待結果は${MAX_EXPECTED_LENGTH}文字以内で入力してください。`);
    });
  });

  describe('validateStepNo', () => {
    it('should return valid for undefined stepNo', () => {
      const result = validateStepNo(undefined);
      expect(result.valid).toBe(true);
    });

    it('should return valid for valid step number', () => {
      expect(validateStepNo(1).valid).toBe(true);
      expect(validateStepNo(50).valid).toBe(true);
      expect(validateStepNo(MAX_STEPS_PER_CASE).valid).toBe(true);
    });

    it('should return invalid for non-integer', () => {
      const result = validateStepNo(1.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('手順番号は整数で指定してください。');
    });

    it('should return invalid for zero', () => {
      const result = validateStepNo(0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('手順番号は1以上の値を指定してください。');
    });

    it('should return invalid for negative number', () => {
      const result = validateStepNo(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('手順番号は1以上の値を指定してください。');
    });

    it('should return invalid for too large number', () => {
      const result = validateStepNo(MAX_STEPS_PER_CASE + 1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(`手順番号は${MAX_STEPS_PER_CASE}以下の値を指定してください。`);
    });
  });

  describe('validateCreateTestStepInput', () => {
    it('should return valid for valid input', () => {
      const result = validateCreateTestStepInput({
        testCaseId: '1',
        actionMd: 'ボタンをクリックする',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for full input', () => {
      const result = validateCreateTestStepInput({
        testCaseId: '1',
        stepNo: 1,
        actionMd: 'ボタンをクリックする',
        expectedMd: 'ダイアログが表示される',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing testCaseId', () => {
      const result = validateCreateTestStepInput({
        testCaseId: '',
        actionMd: 'ボタンをクリックする',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テストケースIDは必須です。');
    });

    it('should return errors for missing actionMd', () => {
      const result = validateCreateTestStepInput({
        testCaseId: '1',
        actionMd: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('操作手順は必須です。');
    });

    it('should return errors for invalid stepNo', () => {
      const result = validateCreateTestStepInput({
        testCaseId: '1',
        actionMd: 'ボタンをクリックする',
        stepNo: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('手順番号は1以上の値を指定してください。');
    });

    it('should accumulate multiple errors', () => {
      const result = validateCreateTestStepInput({
        testCaseId: '',
        actionMd: '',
        stepNo: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateUpdateTestStepInput', () => {
    it('should return valid for valid input', () => {
      const result = validateUpdateTestStepInput({
        actionMd: '更新された操作手順',
        expectedMd: '更新された期待結果',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for empty input', () => {
      const result = validateUpdateTestStepInput({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid actionMd when specified', () => {
      const result = validateUpdateTestStepInput({
        actionMd: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('操作手順は必須です。');
    });

    it('should return errors for invalid stepNo', () => {
      const result = validateUpdateTestStepInput({
        stepNo: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('手順番号は1以上の値を指定してください。');
    });
  });

  describe('validateBulkCreateTestStepsInput', () => {
    it('should return valid for valid input', () => {
      const result = validateBulkCreateTestStepsInput({
        testCaseId: '1',
        steps: [{ actionMd: '手順1' }, { actionMd: '手順2', expectedMd: '期待結果2' }],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing testCaseId', () => {
      const result = validateBulkCreateTestStepsInput({
        testCaseId: '',
        steps: [{ actionMd: '手順1' }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テストケースIDは必須です。');
    });

    it('should return errors for empty steps array', () => {
      const result = validateBulkCreateTestStepsInput({
        testCaseId: '1',
        steps: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('手順が指定されていません。');
    });

    it('should return errors for too many steps', () => {
      const steps = Array.from({ length: MAX_STEPS_PER_CASE + 1 }, () => ({
        actionMd: '手順',
      }));
      const result = validateBulkCreateTestStepsInput({
        testCaseId: '1',
        steps,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`手順数は${MAX_STEPS_PER_CASE}件以内にしてください。`);
    });

    it('should return errors for invalid step in array', () => {
      const result = validateBulkCreateTestStepsInput({
        testCaseId: '1',
        steps: [{ actionMd: '手順1' }, { actionMd: '' }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('手順2: 操作手順は必須です。');
    });
  });

  describe('validateReorderTestStepsInput', () => {
    it('should return valid for valid input', () => {
      const result = validateReorderTestStepsInput({
        items: [
          { id: '1', stepNo: 1 },
          { id: '2', stepNo: 2 },
        ],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for empty items array', () => {
      const result = validateReorderTestStepsInput({
        items: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('並び替えデータが空です。');
    });

    it('should return errors for duplicate IDs', () => {
      const result = validateReorderTestStepsInput({
        items: [
          { id: '1', stepNo: 1 },
          { id: '1', stepNo: 2 },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('重複したIDが含まれています。');
    });

    it('should return errors for missing ID', () => {
      const result = validateReorderTestStepsInput({
        items: [{ id: '', stepNo: 1 }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('項目1: IDは必須です。');
    });

    it('should return errors for invalid stepNo', () => {
      const result = validateReorderTestStepsInput({
        items: [{ id: '1', stepNo: 0 }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('項目1: 手順番号は1以上の値を指定してください。');
    });
  });

  describe('Helper Functions', () => {
    const createMockStep = (id: string, stepNo: number): TestStep => ({
      id,
      testCaseId: '1',
      stepNo,
      actionMd: `手順${stepNo}`,
      expectedMd: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    describe('getNextStepNo', () => {
      it('should return 1 for empty array', () => {
        expect(getNextStepNo([])).toBe(1);
      });

      it('should return next step number', () => {
        const steps = [createMockStep('1', 1), createMockStep('2', 2)];
        expect(getNextStepNo(steps)).toBe(3);
      });

      it('should handle non-sequential step numbers', () => {
        const steps = [createMockStep('1', 1), createMockStep('2', 5)];
        expect(getNextStepNo(steps)).toBe(6);
      });
    });

    describe('recalculateStepNumbers', () => {
      it('should return empty array for empty input', () => {
        expect(recalculateStepNumbers([])).toHaveLength(0);
      });

      it('should recalculate step numbers sequentially', () => {
        const steps = [createMockStep('1', 5), createMockStep('2', 2), createMockStep('3', 8)];
        const result = recalculateStepNumbers(steps);
        expect(result).toEqual([
          { id: '2', stepNo: 1 },
          { id: '1', stepNo: 2 },
          { id: '3', stepNo: 3 },
        ]);
      });
    });

    describe('adjustStepNumbersForInsert', () => {
      it('should adjust step numbers for insertion', () => {
        const steps = [createMockStep('1', 1), createMockStep('2', 2), createMockStep('3', 3)];
        const result = adjustStepNumbersForInsert(steps, 2);
        expect(result).toEqual([
          { id: '2', stepNo: 3 },
          { id: '3', stepNo: 4 },
        ]);
      });

      it('should return empty array when insert position is beyond all steps', () => {
        const steps = [createMockStep('1', 1), createMockStep('2', 2)];
        const result = adjustStepNumbersForInsert(steps, 10);
        expect(result).toHaveLength(0);
      });
    });

    describe('adjustStepNumbersForDelete', () => {
      it('should adjust step numbers for deletion', () => {
        const steps = [createMockStep('1', 1), createMockStep('2', 2), createMockStep('3', 3)];
        const result = adjustStepNumbersForDelete(steps, 1);
        expect(result).toEqual([
          { id: '2', stepNo: 1 },
          { id: '3', stepNo: 2 },
        ]);
      });

      it('should return empty array when deleted step is the last', () => {
        const steps = [createMockStep('1', 1), createMockStep('2', 2)];
        const result = adjustStepNumbersForDelete(steps, 2);
        expect(result).toHaveLength(0);
      });
    });
  });

  describe('Constants', () => {
    it('MAX_ACTION_LENGTH should be 10000', () => {
      expect(MAX_ACTION_LENGTH).toBe(10000);
    });

    it('MAX_EXPECTED_LENGTH should be 10000', () => {
      expect(MAX_EXPECTED_LENGTH).toBe(10000);
    });

    it('MAX_STEPS_PER_CASE should be 100', () => {
      expect(MAX_STEPS_PER_CASE).toBe(100);
    });
  });
});
