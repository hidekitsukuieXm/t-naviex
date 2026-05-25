import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTestRunCase,
  bulkCreateTestRunCases,
  getTestRunCaseById,
  getTestRunCases,
  updateTestRunCase,
  bulkUpdateTestRunCases,
  deleteTestRunCase,
  bulkDeleteTestRunCases,
  testRunExists,
  testCaseExists,
  userExists,
  testRunCaseExistsInTestRun,
  testRunCaseAlreadyExists,
  getTestRunCaseCount,
  getTestRunCaseStatusCounts,
  getTestRunCasesByAssignee,
} from '../test-run-case-repository';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testRunCase: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    testRun: {
      findUnique: vi.fn(),
    },
    testCase: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as unknown as {
  testRunCase: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  testRun: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  testCase: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('TestRunCase Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDbTestRunCase = {
    id: BigInt(1),
    testRunId: BigInt(100),
    testCaseId: BigInt(200),
    assignedToId: BigInt(300),
    status: 'NOT_RUN',
    executedAt: null,
    executionTime: null,
    actualResult: null,
    defects: null,
    comment: null,
    sortOrder: 0,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockDbTestRunCaseWithRelations = {
    ...mockDbTestRunCase,
    testRun: {
      id: BigInt(100),
      name: 'Test Run 1',
    },
    testCase: {
      id: BigInt(200),
      title: 'Test Case 1',
      priority: 'HIGH',
    },
    assignedTo: {
      id: BigInt(300),
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  describe('createTestRunCase', () => {
    it('should create a test run case', async () => {
      mockPrisma.testRunCase.create.mockResolvedValue(mockDbTestRunCase);

      const result = await createTestRunCase({
        testRunId: '100',
        testCaseId: '200',
        assignedToId: '300',
      });

      expect(result.testRunId).toBe('100');
      expect(result.testCaseId).toBe('200');
      expect(result.assignedToId).toBe('300');
      expect(result.status).toBe('NOT_RUN');
      expect(mockPrisma.testRunCase.create).toHaveBeenCalled();
    });

    it('should create a test run case without assignedTo', async () => {
      mockPrisma.testRunCase.create.mockResolvedValue({
        ...mockDbTestRunCase,
        assignedToId: null,
      });

      await createTestRunCase({
        testRunId: '100',
        testCaseId: '200',
      });

      expect(mockPrisma.testRunCase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToId: null,
          }),
        })
      );
    });
  });

  describe('bulkCreateTestRunCases', () => {
    it('should create multiple test run cases', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        mockDbTestRunCase,
        { ...mockDbTestRunCase, id: BigInt(2), testCaseId: BigInt(201) },
      ]);

      const result = await bulkCreateTestRunCases({
        testRunId: '100',
        testCaseIds: ['200', '201'],
        assignedToId: '300',
      });

      expect(result).toHaveLength(2);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getTestRunCaseById', () => {
    it('should return test run case with relations', async () => {
      mockPrisma.testRunCase.findUnique.mockResolvedValue(mockDbTestRunCaseWithRelations);

      const result = await getTestRunCaseById(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.testRun.name).toBe('Test Run 1');
      expect(result?.testCase.title).toBe('Test Case 1');
      expect(result?.assignedTo?.name).toBe('Test User');
    });

    it('should return null if not found', async () => {
      mockPrisma.testRunCase.findUnique.mockResolvedValue(null);

      const result = await getTestRunCaseById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getTestRunCases', () => {
    it('should return test run cases for test run', async () => {
      mockPrisma.testRunCase.findMany.mockResolvedValue([mockDbTestRunCaseWithRelations]);

      const result = await getTestRunCases('100');

      expect(result).toHaveLength(1);
      expect(result[0].testRunId).toBe('100');
    });

    it('should filter by status', async () => {
      mockPrisma.testRunCase.findMany.mockResolvedValue([]);

      await getTestRunCases('100', { status: 'PASSED' });

      expect(mockPrisma.testRunCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PASSED',
          }),
        })
      );
    });

    it('should filter by assignedToId', async () => {
      mockPrisma.testRunCase.findMany.mockResolvedValue([]);

      await getTestRunCases('100', { assignedToId: '300' });

      expect(mockPrisma.testRunCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: BigInt(300),
          }),
        })
      );
    });

    it('should filter by query', async () => {
      mockPrisma.testRunCase.findMany.mockResolvedValue([]);

      await getTestRunCases('100', { query: 'search' });

      expect(mockPrisma.testRunCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ testCase: { title: { contains: 'search', mode: 'insensitive' } } }],
          }),
        })
      );
    });
  });

  describe('updateTestRunCase', () => {
    it('should update test run case', async () => {
      mockPrisma.testRunCase.findUnique.mockResolvedValue(mockDbTestRunCase);
      mockPrisma.testRunCase.update.mockResolvedValue({
        ...mockDbTestRunCase,
        status: 'PASSED',
        executedAt: new Date(),
      });

      const result = await updateTestRunCase(BigInt(1), {
        status: 'PASSED',
      });

      expect(result?.status).toBe('PASSED');
    });

    it('should return null if test run case not found', async () => {
      mockPrisma.testRunCase.findUnique.mockResolvedValue(null);

      const result = await updateTestRunCase(BigInt(999), { status: 'PASSED' });

      expect(result).toBeNull();
    });

    it('should set executedAt automatically when status changes to executed', async () => {
      mockPrisma.testRunCase.findUnique.mockResolvedValue(mockDbTestRunCase);
      mockPrisma.testRunCase.update.mockResolvedValue({
        ...mockDbTestRunCase,
        status: 'PASSED',
      });

      await updateTestRunCase(BigInt(1), { status: 'PASSED' });

      expect(mockPrisma.testRunCase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            executedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('bulkUpdateTestRunCases', () => {
    it('should update multiple test run cases', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        { ...mockDbTestRunCase, status: 'PASSED' },
        { ...mockDbTestRunCase, id: BigInt(2), status: 'PASSED' },
      ]);

      const result = await bulkUpdateTestRunCases({
        ids: ['1', '2'],
        status: 'PASSED',
      });

      expect(result).toHaveLength(2);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('deleteTestRunCase', () => {
    it('should delete test run case', async () => {
      mockPrisma.testRunCase.findUnique.mockResolvedValue(mockDbTestRunCase);
      mockPrisma.testRunCase.delete.mockResolvedValue(mockDbTestRunCase);

      const result = await deleteTestRunCase(BigInt(1));

      expect(result.success).toBe(true);
      expect(mockPrisma.testRunCase.delete).toHaveBeenCalled();
    });

    it('should return error if test run case not found', async () => {
      mockPrisma.testRunCase.findUnique.mockResolvedValue(null);

      const result = await deleteTestRunCase(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toContain('見つかりません');
    });
  });

  describe('bulkDeleteTestRunCases', () => {
    it('should delete multiple test run cases', async () => {
      mockPrisma.testRunCase.deleteMany.mockResolvedValue({ count: 3 });

      const result = await bulkDeleteTestRunCases(['1', '2', '3']);

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
    });
  });

  describe('testRunExists', () => {
    it('should return true if test run exists', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue({ id: BigInt(100) });

      const result = await testRunExists(BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false if test run not found', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue(null);

      const result = await testRunExists(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('testCaseExists', () => {
    it('should return true if test case exists', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValue({ id: BigInt(200) });

      const result = await testCaseExists(BigInt(200));

      expect(result).toBe(true);
    });

    it('should return false if test case not found', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValue(null);

      const result = await testCaseExists(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('userExists', () => {
    it('should return true if user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: BigInt(300) });

      const result = await userExists(BigInt(300));

      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userExists(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('testRunCaseExistsInTestRun', () => {
    it('should return true if test run case exists in test run', async () => {
      mockPrisma.testRunCase.findFirst.mockResolvedValue(mockDbTestRunCase);

      const result = await testRunCaseExistsInTestRun(BigInt(100), BigInt(1));

      expect(result).toBe(true);
    });

    it('should return false if test run case not in test run', async () => {
      mockPrisma.testRunCase.findFirst.mockResolvedValue(null);

      const result = await testRunCaseExistsInTestRun(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('testRunCaseAlreadyExists', () => {
    it('should return true if combination exists', async () => {
      mockPrisma.testRunCase.findUnique.mockResolvedValue(mockDbTestRunCase);

      const result = await testRunCaseAlreadyExists(BigInt(100), BigInt(200));

      expect(result).toBe(true);
    });

    it('should return false if combination does not exist', async () => {
      mockPrisma.testRunCase.findUnique.mockResolvedValue(null);

      const result = await testRunCaseAlreadyExists(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('getTestRunCaseCount', () => {
    it('should return count of test run cases', async () => {
      mockPrisma.testRunCase.count.mockResolvedValue(5);

      const result = await getTestRunCaseCount(BigInt(100));

      expect(result).toBe(5);
    });

    it('should filter by status', async () => {
      mockPrisma.testRunCase.count.mockResolvedValue(2);

      await getTestRunCaseCount(BigInt(100), 'PASSED');

      expect(mockPrisma.testRunCase.count).toHaveBeenCalledWith({
        where: {
          testRunId: BigInt(100),
          status: 'PASSED',
        },
      });
    });
  });

  describe('getTestRunCaseStatusCounts', () => {
    it('should return status counts', async () => {
      mockPrisma.testRunCase.groupBy.mockResolvedValue([
        { status: 'NOT_RUN', _count: 5 },
        { status: 'PASSED', _count: 10 },
        { status: 'FAILED', _count: 3 },
      ]);

      const result = await getTestRunCaseStatusCounts(BigInt(100));

      expect(result.NOT_RUN).toBe(5);
      expect(result.PASSED).toBe(10);
      expect(result.FAILED).toBe(3);
      expect(result.BLOCKED).toBe(0);
      expect(result.SKIPPED).toBe(0);
      expect(result.RETEST).toBe(0);
    });
  });

  describe('getTestRunCasesByAssignee', () => {
    it('should return test run cases for assignee', async () => {
      mockPrisma.testRunCase.findMany.mockResolvedValue([mockDbTestRunCase]);

      const result = await getTestRunCasesByAssignee(BigInt(300));

      expect(result).toHaveLength(1);
      expect(mockPrisma.testRunCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignedToId: BigInt(300) },
        })
      );
    });
  });
});
