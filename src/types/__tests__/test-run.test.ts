import { describe, it, expect } from 'vitest';
import {
  validateTestRunName,
  validateTestRunDescription,
  validateTestRunStatus,
  validateTestRunDate,
  validateCreateTestRunInput,
  validateUpdateTestRunInput,
  getTestRunStatusLabel,
  getTestRunStatusColor,
  getTestRunProgress,
  getTestRunPassRate,
  isTestRunOverdue,
  getTestRunStatsSummary,
  TEST_RUN_NAME_MAX_LENGTH,
  TEST_RUN_DESCRIPTION_MAX_LENGTH,
  TEST_RUN_STATUS,
  type TestRun,
} from '../test-run';

describe('test-run types', () => {
  describe('validateTestRunName', () => {
    it('should accept valid name', () => {
      const result = validateTestRunName('スプリント1 テストラン');
      expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validateTestRunName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('必須');
    });

    it('should reject whitespace only name', () => {
      const result = validateTestRunName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('空白のみ');
    });

    it('should reject name exceeding max length', () => {
      const longName = 'a'.repeat(TEST_RUN_NAME_MAX_LENGTH + 1);
      const result = validateTestRunName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${TEST_RUN_NAME_MAX_LENGTH}文字以内`);
    });

    it('should accept name at max length', () => {
      const maxName = 'a'.repeat(TEST_RUN_NAME_MAX_LENGTH);
      const result = validateTestRunName(maxName);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTestRunDescription', () => {
    it('should accept valid description', () => {
      const result = validateTestRunDescription('テストラン説明');
      expect(result.valid).toBe(true);
    });

    it('should accept null description', () => {
      const result = validateTestRunDescription(null);
      expect(result.valid).toBe(true);
    });

    it('should reject description exceeding max length', () => {
      const longDesc = 'a'.repeat(TEST_RUN_DESCRIPTION_MAX_LENGTH + 1);
      const result = validateTestRunDescription(longDesc);
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`${TEST_RUN_DESCRIPTION_MAX_LENGTH}文字以内`);
    });
  });

  describe('validateTestRunStatus', () => {
    it('should accept valid status PLANNED', () => {
      const result = validateTestRunStatus(TEST_RUN_STATUS.PLANNED);
      expect(result.valid).toBe(true);
    });

    it('should accept valid status IN_PROGRESS', () => {
      const result = validateTestRunStatus(TEST_RUN_STATUS.IN_PROGRESS);
      expect(result.valid).toBe(true);
    });

    it('should accept valid status COMPLETED', () => {
      const result = validateTestRunStatus(TEST_RUN_STATUS.COMPLETED);
      expect(result.valid).toBe(true);
    });

    it('should accept valid status ABORTED', () => {
      const result = validateTestRunStatus(TEST_RUN_STATUS.ABORTED);
      expect(result.valid).toBe(true);
    });

    it('should accept valid status BLOCKED', () => {
      const result = validateTestRunStatus(TEST_RUN_STATUS.BLOCKED);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = validateTestRunStatus('INVALID');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTestRunDate', () => {
    it('should accept valid date', () => {
      const result = validateTestRunDate('2024-01-15');
      expect(result.valid).toBe(true);
    });

    it('should accept null date', () => {
      const result = validateTestRunDate(null);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid date format', () => {
      const result = validateTestRunDate('2024/01/15');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('YYYY-MM-DD');
    });

    it('should reject incomplete date', () => {
      const result = validateTestRunDate('2024-01');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateCreateTestRunInput', () => {
    it('should accept valid input', () => {
      const result = validateCreateTestRunInput({
        projectId: '1',
        name: 'テストラン1',
        description: 'テストラン説明',
        status: TEST_RUN_STATUS.PLANNED,
        plannedStartDate: '2024-01-01',
        plannedEndDate: '2024-01-15',
      });
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should accept minimal input', () => {
      const result = validateCreateTestRunInput({
        projectId: '1',
        name: 'テストラン1',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing projectId', () => {
      const result = validateCreateTestRunInput({
        name: 'テストラン1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.projectId).toBeDefined();
    });

    it('should reject missing name', () => {
      const result = validateCreateTestRunInput({
        projectId: '1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors?.name).toBeDefined();
    });

    it('should accept input with milestoneId', () => {
      const result = validateCreateTestRunInput({
        projectId: '1',
        name: 'テストラン1',
        milestoneId: '2',
      });
      expect(result.valid).toBe(true);
      expect(result.data?.milestoneId).toBe('2');
    });

    it('should accept input with configurationId', () => {
      const result = validateCreateTestRunInput({
        projectId: '1',
        name: 'テストラン1',
        configurationId: '3',
      });
      expect(result.valid).toBe(true);
      expect(result.data?.configurationId).toBe('3');
    });
  });

  describe('validateUpdateTestRunInput', () => {
    it('should accept valid input', () => {
      const result = validateUpdateTestRunInput({
        name: '更新後テストラン',
        status: TEST_RUN_STATUS.IN_PROGRESS,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept empty input', () => {
      const result = validateUpdateTestRunInput({});
      expect(result.valid).toBe(true);
    });

    it('should accept case counts update', () => {
      const result = validateUpdateTestRunInput({
        totalCases: 100,
        passedCases: 80,
        failedCases: 10,
        blockedCases: 5,
        skippedCases: 5,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = validateUpdateTestRunInput({
        status: 'INVALID' as never,
      });
      expect(result.valid).toBe(false);
    });

    it('should reject negative case counts', () => {
      const result = validateUpdateTestRunInput({
        passedCases: -1,
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('getTestRunStatusLabel', () => {
    it('should return label for PLANNED', () => {
      expect(getTestRunStatusLabel(TEST_RUN_STATUS.PLANNED)).toBe('計画中');
    });

    it('should return label for IN_PROGRESS', () => {
      expect(getTestRunStatusLabel(TEST_RUN_STATUS.IN_PROGRESS)).toBe('実行中');
    });

    it('should return label for COMPLETED', () => {
      expect(getTestRunStatusLabel(TEST_RUN_STATUS.COMPLETED)).toBe('完了');
    });

    it('should return label for ABORTED', () => {
      expect(getTestRunStatusLabel(TEST_RUN_STATUS.ABORTED)).toBe('中止');
    });

    it('should return label for BLOCKED', () => {
      expect(getTestRunStatusLabel(TEST_RUN_STATUS.BLOCKED)).toBe('ブロック');
    });
  });

  describe('getTestRunStatusColor', () => {
    it('should return color for each status', () => {
      expect(getTestRunStatusColor(TEST_RUN_STATUS.PLANNED)).toContain('gray');
      expect(getTestRunStatusColor(TEST_RUN_STATUS.IN_PROGRESS)).toContain('blue');
      expect(getTestRunStatusColor(TEST_RUN_STATUS.COMPLETED)).toContain('green');
      expect(getTestRunStatusColor(TEST_RUN_STATUS.ABORTED)).toContain('red');
      expect(getTestRunStatusColor(TEST_RUN_STATUS.BLOCKED)).toContain('yellow');
    });
  });

  describe('getTestRunProgress', () => {
    const baseTestRun: TestRun = {
      id: '1',
      projectId: '1',
      milestoneId: null,
      configurationId: null,
      name: 'Test Run',
      description: null,
      status: TEST_RUN_STATUS.IN_PROGRESS,
      plannedStartDate: null,
      plannedEndDate: null,
      actualStartDate: null,
      actualEndDate: null,
      totalCases: 100,
      passedCases: 0,
      failedCases: 0,
      blockedCases: 0,
      skippedCases: 0,
      notes: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should return 0 when no cases', () => {
      expect(getTestRunProgress({ ...baseTestRun, totalCases: 0 })).toBe(0);
    });

    it('should return 0 when no cases executed', () => {
      expect(getTestRunProgress(baseTestRun)).toBe(0);
    });

    it('should calculate progress correctly', () => {
      expect(
        getTestRunProgress({
          ...baseTestRun,
          passedCases: 50,
          failedCases: 10,
          blockedCases: 5,
          skippedCases: 5,
        })
      ).toBe(70);
    });

    it('should return 100 when all cases executed', () => {
      expect(
        getTestRunProgress({
          ...baseTestRun,
          passedCases: 80,
          failedCases: 10,
          blockedCases: 5,
          skippedCases: 5,
        })
      ).toBe(100);
    });
  });

  describe('getTestRunPassRate', () => {
    const baseTestRun: TestRun = {
      id: '1',
      projectId: '1',
      milestoneId: null,
      configurationId: null,
      name: 'Test Run',
      description: null,
      status: TEST_RUN_STATUS.IN_PROGRESS,
      plannedStartDate: null,
      plannedEndDate: null,
      actualStartDate: null,
      actualEndDate: null,
      totalCases: 100,
      passedCases: 0,
      failedCases: 0,
      blockedCases: 0,
      skippedCases: 0,
      notes: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should return 0 when no cases executed', () => {
      expect(getTestRunPassRate(baseTestRun)).toBe(0);
    });

    it('should return 100 when all passed', () => {
      expect(getTestRunPassRate({ ...baseTestRun, passedCases: 50 })).toBe(100);
    });

    it('should calculate pass rate correctly', () => {
      expect(
        getTestRunPassRate({
          ...baseTestRun,
          passedCases: 80,
          failedCases: 20,
        })
      ).toBe(80);
    });
  });

  describe('isTestRunOverdue', () => {
    const baseTestRun: TestRun = {
      id: '1',
      projectId: '1',
      milestoneId: null,
      configurationId: null,
      name: 'Test Run',
      description: null,
      status: TEST_RUN_STATUS.IN_PROGRESS,
      plannedStartDate: null,
      plannedEndDate: null,
      actualStartDate: null,
      actualEndDate: null,
      totalCases: 100,
      passedCases: 0,
      failedCases: 0,
      blockedCases: 0,
      skippedCases: 0,
      notes: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should return false if no planned end date', () => {
      expect(isTestRunOverdue({ ...baseTestRun, plannedEndDate: null })).toBe(false);
    });

    it('should return false if completed', () => {
      expect(
        isTestRunOverdue({
          ...baseTestRun,
          plannedEndDate: '2020-01-01',
          status: TEST_RUN_STATUS.COMPLETED,
        })
      ).toBe(false);
    });

    it('should return false if aborted', () => {
      expect(
        isTestRunOverdue({
          ...baseTestRun,
          plannedEndDate: '2020-01-01',
          status: TEST_RUN_STATUS.ABORTED,
        })
      ).toBe(false);
    });

    it('should return true if end date is past', () => {
      expect(
        isTestRunOverdue({
          ...baseTestRun,
          plannedEndDate: '2020-01-01',
          status: TEST_RUN_STATUS.IN_PROGRESS,
        })
      ).toBe(true);
    });

    it('should return false if end date is in future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(
        isTestRunOverdue({
          ...baseTestRun,
          plannedEndDate: futureDate.toISOString().split('T')[0],
          status: TEST_RUN_STATUS.IN_PROGRESS,
        })
      ).toBe(false);
    });
  });

  describe('getTestRunStatsSummary', () => {
    const baseTestRun: TestRun = {
      id: '1',
      projectId: '1',
      milestoneId: null,
      configurationId: null,
      name: 'Test Run',
      description: null,
      status: TEST_RUN_STATUS.IN_PROGRESS,
      plannedStartDate: null,
      plannedEndDate: null,
      actualStartDate: null,
      actualEndDate: null,
      totalCases: 100,
      passedCases: 50,
      failedCases: 20,
      blockedCases: 10,
      skippedCases: 5,
      notes: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should calculate all stats correctly', () => {
      const stats = getTestRunStatsSummary(baseTestRun);

      expect(stats.total).toBe(100);
      expect(stats.passed).toBe(50);
      expect(stats.failed).toBe(20);
      expect(stats.blocked).toBe(10);
      expect(stats.skipped).toBe(5);
      expect(stats.notRun).toBe(15);
      expect(stats.progress).toBe(85);
      expect(stats.passRate).toBe(71);
    });

    it('should handle zero cases', () => {
      const stats = getTestRunStatsSummary({
        ...baseTestRun,
        totalCases: 0,
        passedCases: 0,
        failedCases: 0,
        blockedCases: 0,
        skippedCases: 0,
      });

      expect(stats.total).toBe(0);
      expect(stats.notRun).toBe(0);
      expect(stats.progress).toBe(0);
      expect(stats.passRate).toBe(0);
    });
  });
});
