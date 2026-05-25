import { describe, it, expect } from 'vitest';
import {
  validateTestRunCaseStatus,
  validateTestRunCaseActualResult,
  validateTestRunCaseDefects,
  validateTestRunCaseComment,
  validateExecutionTime,
  validateSortOrder,
  validateCreateTestRunCaseInput,
  validateUpdateTestRunCaseInput,
  getTestRunCaseStatusLabel,
  getTestRunCaseStatusColor,
  formatExecutionTime,
  getTestRunCaseStats,
  TEST_RUN_CASE_STATUS,
  TEST_RUN_CASE_ACTUAL_RESULT_MAX_LENGTH,
  TEST_RUN_CASE_DEFECTS_MAX_LENGTH,
  TEST_RUN_CASE_COMMENT_MAX_LENGTH,
  type TestRunCase,
} from '../test-run-case';

describe('test-run-case types', () => {
  describe('validateTestRunCaseStatus', () => {
    it('should accept valid status NOT_RUN', () => {
      const result = validateTestRunCaseStatus(TEST_RUN_CASE_STATUS.NOT_RUN);
      expect(result.valid).toBe(true);
    });

    it('should accept valid status PASSED', () => {
      const result = validateTestRunCaseStatus(TEST_RUN_CASE_STATUS.PASSED);
      expect(result.valid).toBe(true);
    });

    it('should accept valid status FAILED', () => {
      const result = validateTestRunCaseStatus(TEST_RUN_CASE_STATUS.FAILED);
      expect(result.valid).toBe(true);
    });

    it('should accept valid status BLOCKED', () => {
      const result = validateTestRunCaseStatus(TEST_RUN_CASE_STATUS.BLOCKED);
      expect(result.valid).toBe(true);
    });

    it('should accept valid status SKIPPED', () => {
      const result = validateTestRunCaseStatus(TEST_RUN_CASE_STATUS.SKIPPED);
      expect(result.valid).toBe(true);
    });

    it('should accept valid status RETEST', () => {
      const result = validateTestRunCaseStatus(TEST_RUN_CASE_STATUS.RETEST);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = validateTestRunCaseStatus('INVALID');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTestRunCaseActualResult', () => {
    it('should accept valid actual result', () => {
      const result = validateTestRunCaseActualResult('実行結果');
      expect(result.valid).toBe(true);
    });

    it('should accept null actual result', () => {
      const result = validateTestRunCaseActualResult(null);
      expect(result.valid).toBe(true);
    });

    it('should reject actual result exceeding max length', () => {
      const longResult = 'a'.repeat(TEST_RUN_CASE_ACTUAL_RESULT_MAX_LENGTH + 1);
      const result = validateTestRunCaseActualResult(longResult);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${TEST_RUN_CASE_ACTUAL_RESULT_MAX_LENGTH}文字以内`);
    });
  });

  describe('validateTestRunCaseDefects', () => {
    it('should accept valid defects', () => {
      const result = validateTestRunCaseDefects('不具合情報');
      expect(result.valid).toBe(true);
    });

    it('should accept null defects', () => {
      const result = validateTestRunCaseDefects(null);
      expect(result.valid).toBe(true);
    });

    it('should reject defects exceeding max length', () => {
      const longDefects = 'a'.repeat(TEST_RUN_CASE_DEFECTS_MAX_LENGTH + 1);
      const result = validateTestRunCaseDefects(longDefects);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${TEST_RUN_CASE_DEFECTS_MAX_LENGTH}文字以内`);
    });
  });

  describe('validateTestRunCaseComment', () => {
    it('should accept valid comment', () => {
      const result = validateTestRunCaseComment('コメント');
      expect(result.valid).toBe(true);
    });

    it('should accept null comment', () => {
      const result = validateTestRunCaseComment(null);
      expect(result.valid).toBe(true);
    });

    it('should reject comment exceeding max length', () => {
      const longComment = 'a'.repeat(TEST_RUN_CASE_COMMENT_MAX_LENGTH + 1);
      const result = validateTestRunCaseComment(longComment);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${TEST_RUN_CASE_COMMENT_MAX_LENGTH}文字以内`);
    });
  });

  describe('validateExecutionTime', () => {
    it('should accept valid execution time', () => {
      const result = validateExecutionTime(120);
      expect(result.valid).toBe(true);
    });

    it('should accept null execution time', () => {
      const result = validateExecutionTime(null);
      expect(result.valid).toBe(true);
    });

    it('should accept zero execution time', () => {
      const result = validateExecutionTime(0);
      expect(result.valid).toBe(true);
    });

    it('should reject negative execution time', () => {
      const result = validateExecutionTime(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0以上');
    });
  });

  describe('validateSortOrder', () => {
    it('should accept valid sort order', () => {
      const result = validateSortOrder(10);
      expect(result.valid).toBe(true);
    });

    it('should accept zero sort order', () => {
      const result = validateSortOrder(0);
      expect(result.valid).toBe(true);
    });

    it('should reject negative sort order', () => {
      const result = validateSortOrder(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0以上');
    });
  });

  describe('validateCreateTestRunCaseInput', () => {
    it('should accept valid input', () => {
      const result = validateCreateTestRunCaseInput({
        testRunId: '1',
        testCaseId: '2',
        assignedToId: '3',
        status: TEST_RUN_CASE_STATUS.NOT_RUN,
        sortOrder: 0,
      });
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should accept minimal input', () => {
      const result = validateCreateTestRunCaseInput({
        testRunId: '1',
        testCaseId: '2',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing testRunId', () => {
      const result = validateCreateTestRunCaseInput({
        testCaseId: '2',
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.testRunId).toBeDefined();
    });

    it('should reject missing testCaseId', () => {
      const result = validateCreateTestRunCaseInput({
        testRunId: '1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.testCaseId).toBeDefined();
    });

    it('should reject invalid status', () => {
      const result = validateCreateTestRunCaseInput({
        testRunId: '1',
        testCaseId: '2',
        status: 'INVALID' as never,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUpdateTestRunCaseInput', () => {
    it('should accept valid input', () => {
      const result = validateUpdateTestRunCaseInput({
        status: TEST_RUN_CASE_STATUS.PASSED,
        actualResult: '期待通りの動作',
      });
      expect(result.valid).toBe(true);
    });

    it('should accept empty input', () => {
      const result = validateUpdateTestRunCaseInput({});
      expect(result.valid).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = validateUpdateTestRunCaseInput({
        status: 'INVALID' as never,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject negative execution time', () => {
      const result = validateUpdateTestRunCaseInput({
        executionTime: -10,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('getTestRunCaseStatusLabel', () => {
    it('should return label for NOT_RUN', () => {
      expect(getTestRunCaseStatusLabel(TEST_RUN_CASE_STATUS.NOT_RUN)).toBe('未実行');
    });

    it('should return label for PASSED', () => {
      expect(getTestRunCaseStatusLabel(TEST_RUN_CASE_STATUS.PASSED)).toBe('合格');
    });

    it('should return label for FAILED', () => {
      expect(getTestRunCaseStatusLabel(TEST_RUN_CASE_STATUS.FAILED)).toBe('不合格');
    });

    it('should return label for BLOCKED', () => {
      expect(getTestRunCaseStatusLabel(TEST_RUN_CASE_STATUS.BLOCKED)).toBe('ブロック');
    });

    it('should return label for SKIPPED', () => {
      expect(getTestRunCaseStatusLabel(TEST_RUN_CASE_STATUS.SKIPPED)).toBe('スキップ');
    });

    it('should return label for RETEST', () => {
      expect(getTestRunCaseStatusLabel(TEST_RUN_CASE_STATUS.RETEST)).toBe('再テスト');
    });
  });

  describe('getTestRunCaseStatusColor', () => {
    it('should return color for each status', () => {
      expect(getTestRunCaseStatusColor(TEST_RUN_CASE_STATUS.NOT_RUN)).toContain('gray');
      expect(getTestRunCaseStatusColor(TEST_RUN_CASE_STATUS.PASSED)).toContain('green');
      expect(getTestRunCaseStatusColor(TEST_RUN_CASE_STATUS.FAILED)).toContain('red');
      expect(getTestRunCaseStatusColor(TEST_RUN_CASE_STATUS.BLOCKED)).toContain('yellow');
      expect(getTestRunCaseStatusColor(TEST_RUN_CASE_STATUS.SKIPPED)).toContain('purple');
      expect(getTestRunCaseStatusColor(TEST_RUN_CASE_STATUS.RETEST)).toContain('blue');
    });
  });

  describe('formatExecutionTime', () => {
    it('should return dash for null', () => {
      expect(formatExecutionTime(null)).toBe('-');
    });

    it('should return dash for zero', () => {
      expect(formatExecutionTime(0)).toBe('-');
    });

    it('should format seconds only', () => {
      expect(formatExecutionTime(45)).toBe('0:45');
    });

    it('should format minutes and seconds', () => {
      expect(formatExecutionTime(125)).toBe('2:05');
    });

    it('should format larger values', () => {
      expect(formatExecutionTime(3661)).toBe('61:01');
    });
  });

  describe('getTestRunCaseStats', () => {
    const createTestRunCase = (status: string): TestRunCase => ({
      id: '1',
      testRunId: '1',
      testCaseId: '1',
      assignedToId: null,
      status: status as TestRunCase['status'],
      executedAt: null,
      executionTime: null,
      actualResult: null,
      defects: null,
      comment: null,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    it('should calculate all stats correctly', () => {
      const cases = [
        createTestRunCase(TEST_RUN_CASE_STATUS.NOT_RUN),
        createTestRunCase(TEST_RUN_CASE_STATUS.NOT_RUN),
        createTestRunCase(TEST_RUN_CASE_STATUS.PASSED),
        createTestRunCase(TEST_RUN_CASE_STATUS.PASSED),
        createTestRunCase(TEST_RUN_CASE_STATUS.PASSED),
        createTestRunCase(TEST_RUN_CASE_STATUS.FAILED),
        createTestRunCase(TEST_RUN_CASE_STATUS.BLOCKED),
        createTestRunCase(TEST_RUN_CASE_STATUS.SKIPPED),
        createTestRunCase(TEST_RUN_CASE_STATUS.RETEST),
        createTestRunCase(TEST_RUN_CASE_STATUS.RETEST),
      ];

      const stats = getTestRunCaseStats(cases);

      expect(stats.total).toBe(10);
      expect(stats.notRun).toBe(2);
      expect(stats.passed).toBe(3);
      expect(stats.failed).toBe(1);
      expect(stats.blocked).toBe(1);
      expect(stats.skipped).toBe(1);
      expect(stats.retest).toBe(2);
      expect(stats.progress).toBe(80); // 8 out of 10 executed
      expect(stats.passRate).toBe(38); // 3 out of 8 passed (37.5% rounds to 38%)
    });

    it('should handle empty array', () => {
      const stats = getTestRunCaseStats([]);

      expect(stats.total).toBe(0);
      expect(stats.progress).toBe(0);
      expect(stats.passRate).toBe(0);
    });

    it('should handle all NOT_RUN cases', () => {
      const cases = [
        createTestRunCase(TEST_RUN_CASE_STATUS.NOT_RUN),
        createTestRunCase(TEST_RUN_CASE_STATUS.NOT_RUN),
      ];

      const stats = getTestRunCaseStats(cases);

      expect(stats.total).toBe(2);
      expect(stats.notRun).toBe(2);
      expect(stats.progress).toBe(0);
      expect(stats.passRate).toBe(0);
    });

    it('should handle all PASSED cases', () => {
      const cases = [
        createTestRunCase(TEST_RUN_CASE_STATUS.PASSED),
        createTestRunCase(TEST_RUN_CASE_STATUS.PASSED),
      ];

      const stats = getTestRunCaseStats(cases);

      expect(stats.total).toBe(2);
      expect(stats.passed).toBe(2);
      expect(stats.progress).toBe(100);
      expect(stats.passRate).toBe(100);
    });
  });
});
