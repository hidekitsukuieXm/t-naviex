/**
 * バグ型定義のテスト
 */

import { describe, it, expect } from 'vitest';
import {
  BugType,
  BugTypeLabels,
  BugPriority,
  BugPriorityLabels,
  BugSeverity,
  BugSeverityLabels,
  BugStatus,
  BugStatusLabels,
  bugTitleSchema,
  bugDescriptionSchema,
  bugTypeSchema,
  bugPrioritySchema,
  bugSeveritySchema,
  bugStatusSchema,
  createBugSchema,
  updateBugSchema,
  validateBugTitle,
  validateCreateBugInput,
  validateUpdateBugInput,
  isOpenStatus,
  isClosedStatus,
  isResolvedStatus,
  getNextStatuses,
  calculateBugStatistics,
  getBugStatusColor,
  getBugPriorityColor,
  getBugSeverityColor,
  getBugTypeColor,
  type Bug,
} from '../bug';

// ============================================
// Enum Tests
// ============================================

describe('BugType', () => {
  it('should have all expected values', () => {
    expect(BugType.BUG).toBe('BUG');
    expect(BugType.FEATURE).toBe('FEATURE');
    expect(BugType.INQUIRY).toBe('INQUIRY');
    expect(BugType.TASK).toBe('TASK');
    expect(BugType.IMPROVEMENT).toBe('IMPROVEMENT');
  });

  it('should have labels for all types', () => {
    expect(BugTypeLabels.BUG).toBe('不具合');
    expect(BugTypeLabels.FEATURE).toBe('機能要望');
    expect(BugTypeLabels.INQUIRY).toBe('問い合わせ');
    expect(BugTypeLabels.TASK).toBe('タスク');
    expect(BugTypeLabels.IMPROVEMENT).toBe('改善');
  });
});

describe('BugPriority', () => {
  it('should have all expected values', () => {
    expect(BugPriority.CRITICAL).toBe('CRITICAL');
    expect(BugPriority.HIGH).toBe('HIGH');
    expect(BugPriority.MEDIUM).toBe('MEDIUM');
    expect(BugPriority.LOW).toBe('LOW');
  });

  it('should have labels for all priorities', () => {
    expect(BugPriorityLabels.CRITICAL).toBe('緊急');
    expect(BugPriorityLabels.HIGH).toBe('高');
    expect(BugPriorityLabels.MEDIUM).toBe('中');
    expect(BugPriorityLabels.LOW).toBe('低');
  });
});

describe('BugSeverity', () => {
  it('should have all expected values', () => {
    expect(BugSeverity.BLOCKER).toBe('BLOCKER');
    expect(BugSeverity.CRITICAL).toBe('CRITICAL');
    expect(BugSeverity.MAJOR).toBe('MAJOR');
    expect(BugSeverity.MINOR).toBe('MINOR');
    expect(BugSeverity.TRIVIAL).toBe('TRIVIAL');
  });

  it('should have labels for all severities', () => {
    expect(BugSeverityLabels.BLOCKER).toBe('ブロッカー');
    expect(BugSeverityLabels.CRITICAL).toBe('致命的');
    expect(BugSeverityLabels.MAJOR).toBe('重大');
    expect(BugSeverityLabels.MINOR).toBe('軽微');
    expect(BugSeverityLabels.TRIVIAL).toBe('些細');
  });
});

describe('BugStatus', () => {
  it('should have all expected values', () => {
    expect(BugStatus.NEW).toBe('NEW');
    expect(BugStatus.OPEN).toBe('OPEN');
    expect(BugStatus.IN_PROGRESS).toBe('IN_PROGRESS');
    expect(BugStatus.RESOLVED).toBe('RESOLVED');
    expect(BugStatus.VERIFIED).toBe('VERIFIED');
    expect(BugStatus.CLOSED).toBe('CLOSED');
    expect(BugStatus.REJECTED).toBe('REJECTED');
    expect(BugStatus.DEFERRED).toBe('DEFERRED');
  });

  it('should have labels for all statuses', () => {
    expect(BugStatusLabels.NEW).toBe('新規');
    expect(BugStatusLabels.OPEN).toBe('オープン');
    expect(BugStatusLabels.IN_PROGRESS).toBe('対応中');
    expect(BugStatusLabels.RESOLVED).toBe('解決済み');
    expect(BugStatusLabels.VERIFIED).toBe('検証済み');
    expect(BugStatusLabels.CLOSED).toBe('クローズ');
    expect(BugStatusLabels.REJECTED).toBe('却下');
    expect(BugStatusLabels.DEFERRED).toBe('保留');
  });
});

// ============================================
// Schema Tests
// ============================================

describe('bugTitleSchema', () => {
  it('should accept valid titles', () => {
    expect(bugTitleSchema.safeParse('バグタイトル').success).toBe(true);
    expect(bugTitleSchema.safeParse('a'.repeat(500)).success).toBe(true);
  });

  it('should reject empty titles', () => {
    expect(bugTitleSchema.safeParse('').success).toBe(false);
  });

  it('should reject titles over 500 characters', () => {
    expect(bugTitleSchema.safeParse('a'.repeat(501)).success).toBe(false);
  });
});

describe('bugDescriptionSchema', () => {
  it('should accept valid descriptions', () => {
    expect(bugDescriptionSchema.safeParse('バグの説明').success).toBe(true);
    expect(bugDescriptionSchema.safeParse(null).success).toBe(true);
    expect(bugDescriptionSchema.safeParse(undefined).success).toBe(true);
  });

  it('should reject descriptions over 10000 characters', () => {
    expect(bugDescriptionSchema.safeParse('a'.repeat(10001)).success).toBe(false);
  });
});

describe('bugTypeSchema', () => {
  it('should accept valid bug types', () => {
    expect(bugTypeSchema.safeParse('BUG').success).toBe(true);
    expect(bugTypeSchema.safeParse('FEATURE').success).toBe(true);
    expect(bugTypeSchema.safeParse('INQUIRY').success).toBe(true);
    expect(bugTypeSchema.safeParse('TASK').success).toBe(true);
    expect(bugTypeSchema.safeParse('IMPROVEMENT').success).toBe(true);
  });

  it('should reject invalid bug types', () => {
    expect(bugTypeSchema.safeParse('INVALID').success).toBe(false);
    expect(bugTypeSchema.safeParse('').success).toBe(false);
  });
});

describe('bugPrioritySchema', () => {
  it('should accept valid priorities', () => {
    expect(bugPrioritySchema.safeParse('CRITICAL').success).toBe(true);
    expect(bugPrioritySchema.safeParse('HIGH').success).toBe(true);
    expect(bugPrioritySchema.safeParse('MEDIUM').success).toBe(true);
    expect(bugPrioritySchema.safeParse('LOW').success).toBe(true);
  });

  it('should reject invalid priorities', () => {
    expect(bugPrioritySchema.safeParse('INVALID').success).toBe(false);
  });
});

describe('bugSeveritySchema', () => {
  it('should accept valid severities', () => {
    expect(bugSeveritySchema.safeParse('BLOCKER').success).toBe(true);
    expect(bugSeveritySchema.safeParse('CRITICAL').success).toBe(true);
    expect(bugSeveritySchema.safeParse('MAJOR').success).toBe(true);
    expect(bugSeveritySchema.safeParse('MINOR').success).toBe(true);
    expect(bugSeveritySchema.safeParse('TRIVIAL').success).toBe(true);
  });

  it('should reject invalid severities', () => {
    expect(bugSeveritySchema.safeParse('INVALID').success).toBe(false);
  });
});

describe('bugStatusSchema', () => {
  it('should accept valid statuses', () => {
    expect(bugStatusSchema.safeParse('NEW').success).toBe(true);
    expect(bugStatusSchema.safeParse('OPEN').success).toBe(true);
    expect(bugStatusSchema.safeParse('IN_PROGRESS').success).toBe(true);
    expect(bugStatusSchema.safeParse('RESOLVED').success).toBe(true);
    expect(bugStatusSchema.safeParse('VERIFIED').success).toBe(true);
    expect(bugStatusSchema.safeParse('CLOSED').success).toBe(true);
    expect(bugStatusSchema.safeParse('REJECTED').success).toBe(true);
    expect(bugStatusSchema.safeParse('DEFERRED').success).toBe(true);
  });

  it('should reject invalid statuses', () => {
    expect(bugStatusSchema.safeParse('INVALID').success).toBe(false);
  });
});

describe('createBugSchema', () => {
  it('should accept valid input with required fields', () => {
    const input = {
      projectId: BigInt(1),
      title: 'テストバグ',
      reporterId: BigInt(1),
    };
    const result = createBugSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept valid input with all fields', () => {
    const input = {
      projectId: BigInt(1),
      title: 'テストバグ',
      description: 'バグの説明',
      type: 'BUG',
      priority: 'HIGH',
      severity: 'CRITICAL',
      assigneeId: BigInt(2),
      reporterId: BigInt(1),
      parentBugId: null,
      testResultId: BigInt(1),
      stepsToReproduce: '再現手順',
      expectedResult: '期待結果',
      actualResult: '実際の結果',
      environment: 'Chrome 100',
      version: '1.0.0',
      dueDate: new Date(),
    };
    const result = createBugSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should convert number to BigInt for IDs', () => {
    const input = {
      projectId: 1,
      title: 'テストバグ',
      reporterId: 1,
    };
    const result = createBugSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.projectId).toBe('bigint');
      expect(typeof result.data.reporterId).toBe('bigint');
    }
  });

  it('should reject missing required fields', () => {
    const input = {
      projectId: BigInt(1),
    };
    const result = createBugSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('updateBugSchema', () => {
  it('should accept partial updates', () => {
    const input = {
      title: '更新されたタイトル',
    };
    const result = updateBugSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept status updates', () => {
    const input = {
      status: 'RESOLVED',
    };
    const result = updateBugSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept empty object', () => {
    const result = updateBugSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ============================================
// Validation Function Tests
// ============================================

describe('validateBugTitle', () => {
  it('should return valid for valid titles', () => {
    expect(validateBugTitle('有効なタイトル').valid).toBe(true);
  });

  it('should return invalid for empty titles', () => {
    const result = validateBugTitle('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('validateCreateBugInput', () => {
  it('should validate correct input', () => {
    const input = {
      projectId: BigInt(1),
      title: 'テストバグ',
      reporterId: BigInt(1),
    };
    const result = validateCreateBugInput(input);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should return error for invalid input', () => {
    const input = {
      projectId: BigInt(1),
    };
    const result = validateCreateBugInput(input);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('validateUpdateBugInput', () => {
  it('should validate correct input', () => {
    const input = {
      title: '更新されたタイトル',
      status: 'OPEN',
    };
    const result = validateUpdateBugInput(input);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should return error for invalid status', () => {
    const input = {
      status: 'INVALID_STATUS',
    };
    const result = validateUpdateBugInput(input);
    expect(result.valid).toBe(false);
  });
});

// ============================================
// Helper Function Tests
// ============================================

describe('isOpenStatus', () => {
  it('should return true for open statuses', () => {
    expect(isOpenStatus('NEW')).toBe(true);
    expect(isOpenStatus('OPEN')).toBe(true);
    expect(isOpenStatus('IN_PROGRESS')).toBe(true);
  });

  it('should return false for non-open statuses', () => {
    expect(isOpenStatus('RESOLVED')).toBe(false);
    expect(isOpenStatus('VERIFIED')).toBe(false);
    expect(isOpenStatus('CLOSED')).toBe(false);
    expect(isOpenStatus('REJECTED')).toBe(false);
    expect(isOpenStatus('DEFERRED')).toBe(false);
  });
});

describe('isClosedStatus', () => {
  it('should return true for closed statuses', () => {
    expect(isClosedStatus('CLOSED')).toBe(true);
    expect(isClosedStatus('REJECTED')).toBe(true);
  });

  it('should return false for non-closed statuses', () => {
    expect(isClosedStatus('NEW')).toBe(false);
    expect(isClosedStatus('OPEN')).toBe(false);
    expect(isClosedStatus('IN_PROGRESS')).toBe(false);
    expect(isClosedStatus('RESOLVED')).toBe(false);
    expect(isClosedStatus('VERIFIED')).toBe(false);
    expect(isClosedStatus('DEFERRED')).toBe(false);
  });
});

describe('isResolvedStatus', () => {
  it('should return true for resolved statuses', () => {
    expect(isResolvedStatus('RESOLVED')).toBe(true);
    expect(isResolvedStatus('VERIFIED')).toBe(true);
    expect(isResolvedStatus('CLOSED')).toBe(true);
  });

  it('should return false for non-resolved statuses', () => {
    expect(isResolvedStatus('NEW')).toBe(false);
    expect(isResolvedStatus('OPEN')).toBe(false);
    expect(isResolvedStatus('IN_PROGRESS')).toBe(false);
    expect(isResolvedStatus('REJECTED')).toBe(false);
    expect(isResolvedStatus('DEFERRED')).toBe(false);
  });
});

describe('getNextStatuses', () => {
  it('should return valid transitions from NEW', () => {
    const nextStatuses = getNextStatuses('NEW');
    expect(nextStatuses).toContain('OPEN');
    expect(nextStatuses).toContain('IN_PROGRESS');
    expect(nextStatuses).toContain('REJECTED');
    expect(nextStatuses).toContain('DEFERRED');
  });

  it('should return valid transitions from IN_PROGRESS', () => {
    const nextStatuses = getNextStatuses('IN_PROGRESS');
    expect(nextStatuses).toContain('RESOLVED');
    expect(nextStatuses).toContain('OPEN');
    expect(nextStatuses).toContain('DEFERRED');
  });

  it('should return valid transitions from RESOLVED', () => {
    const nextStatuses = getNextStatuses('RESOLVED');
    expect(nextStatuses).toContain('VERIFIED');
    expect(nextStatuses).toContain('OPEN');
    expect(nextStatuses).toContain('IN_PROGRESS');
  });

  it('should return valid transitions from CLOSED', () => {
    const nextStatuses = getNextStatuses('CLOSED');
    expect(nextStatuses).toContain('OPEN');
  });
});

describe('calculateBugStatistics', () => {
  it('should calculate statistics correctly for empty array', () => {
    const stats = calculateBugStatistics([]);
    expect(stats.total).toBe(0);
    expect(stats.openCount).toBe(0);
    expect(stats.closedCount).toBe(0);
    expect(stats.resolvedCount).toBe(0);
  });

  it('should calculate statistics correctly for multiple bugs', () => {
    const bugs: Bug[] = [
      createTestBug({ status: 'NEW', priority: 'HIGH', severity: 'CRITICAL', type: 'BUG' }),
      createTestBug({ status: 'OPEN', priority: 'MEDIUM', severity: 'MAJOR', type: 'BUG' }),
      createTestBug({ status: 'IN_PROGRESS', priority: 'LOW', severity: 'MINOR', type: 'FEATURE' }),
      createTestBug({ status: 'RESOLVED', priority: 'HIGH', severity: 'MAJOR', type: 'BUG' }),
      createTestBug({ status: 'CLOSED', priority: 'MEDIUM', severity: 'TRIVIAL', type: 'TASK' }),
    ];

    const stats = calculateBugStatistics(bugs);

    expect(stats.total).toBe(5);
    expect(stats.byStatus.NEW).toBe(1);
    expect(stats.byStatus.OPEN).toBe(1);
    expect(stats.byStatus.IN_PROGRESS).toBe(1);
    expect(stats.byStatus.RESOLVED).toBe(1);
    expect(stats.byStatus.CLOSED).toBe(1);
    expect(stats.byPriority.HIGH).toBe(2);
    expect(stats.byPriority.MEDIUM).toBe(2);
    expect(stats.byPriority.LOW).toBe(1);
    expect(stats.bySeverity.CRITICAL).toBe(1);
    expect(stats.bySeverity.MAJOR).toBe(2);
    expect(stats.bySeverity.MINOR).toBe(1);
    expect(stats.bySeverity.TRIVIAL).toBe(1);
    expect(stats.byType.BUG).toBe(3);
    expect(stats.byType.FEATURE).toBe(1);
    expect(stats.byType.TASK).toBe(1);
    expect(stats.openCount).toBe(3);
    expect(stats.closedCount).toBe(1);
    expect(stats.resolvedCount).toBe(2);
  });
});

// ============================================
// Color Function Tests
// ============================================

describe('getBugStatusColor', () => {
  it.each([
    ['NEW', 'bg-blue-100'],
    ['OPEN', 'bg-sky-100'],
    ['IN_PROGRESS', 'bg-yellow-100'],
    ['RESOLVED', 'bg-green-100'],
    ['VERIFIED', 'bg-emerald-100'],
    ['CLOSED', 'bg-gray-100'],
    ['REJECTED', 'bg-red-100'],
    ['DEFERRED', 'bg-orange-100'],
  ] as const)('should return correct color for %s', (status, expectedColor) => {
    const color = getBugStatusColor(status);
    expect(color).toContain(expectedColor);
  });
});

describe('getBugPriorityColor', () => {
  it.each([
    ['CRITICAL', 'bg-red-100'],
    ['HIGH', 'bg-orange-100'],
    ['MEDIUM', 'bg-yellow-100'],
    ['LOW', 'bg-green-100'],
  ] as const)('should return correct color for %s', (priority, expectedColor) => {
    const color = getBugPriorityColor(priority);
    expect(color).toContain(expectedColor);
  });
});

describe('getBugSeverityColor', () => {
  it.each([
    ['BLOCKER', 'bg-purple-100'],
    ['CRITICAL', 'bg-red-100'],
    ['MAJOR', 'bg-orange-100'],
    ['MINOR', 'bg-yellow-100'],
    ['TRIVIAL', 'bg-gray-100'],
  ] as const)('should return correct color for %s', (severity, expectedColor) => {
    const color = getBugSeverityColor(severity);
    expect(color).toContain(expectedColor);
  });
});

describe('getBugTypeColor', () => {
  it.each([
    ['BUG', 'bg-red-100'],
    ['FEATURE', 'bg-blue-100'],
    ['INQUIRY', 'bg-cyan-100'],
    ['TASK', 'bg-indigo-100'],
    ['IMPROVEMENT', 'bg-green-100'],
  ] as const)('should return correct color for %s', (type, expectedColor) => {
    const color = getBugTypeColor(type);
    expect(color).toContain(expectedColor);
  });
});

// ============================================
// Helper Functions for Tests
// ============================================

function createTestBug(overrides: Partial<Bug> = {}): Bug {
  return {
    id: BigInt(1),
    projectId: BigInt(1),
    parentBugId: null,
    testResultId: null,
    title: 'テストバグ',
    description: null,
    type: 'BUG',
    status: 'NEW',
    priority: 'MEDIUM',
    severity: 'MAJOR',
    assigneeId: null,
    reporterId: BigInt(1),
    stepsToReproduce: null,
    expectedResult: null,
    actualResult: null,
    environment: null,
    version: null,
    fixedVersion: null,
    dueDate: null,
    resolvedAt: null,
    closedAt: null,
    externalId: null,
    externalUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
