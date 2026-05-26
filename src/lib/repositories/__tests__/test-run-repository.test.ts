import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTestRun,
  getTestRunById,
  getTestRuns,
  updateTestRun,
  deleteTestRun,
  projectExists,
  testRunExistsInProject,
  milestoneExistsInProject,
  configurationExistsInProject,
  getTestRunCount,
  getTestRunsByMilestone,
  getTestRunsByConfiguration,
  createReRun,
  getTestRunCaseStatusCounts,
  closeTestRun,
  reopenTestRun,
  isTestRunClosed,
} from '../test-run-repository';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testRun: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    milestone: {
      findFirst: vi.fn(),
    },
    configuration: {
      findFirst: vi.fn(),
    },
    testRunCase: {
      groupBy: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as unknown as {
  testRun: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  project: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  milestone: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  configuration: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

describe('TestRun Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDbTestRun = {
    id: BigInt(1),
    projectId: BigInt(100),
    milestoneId: BigInt(10),
    configurationId: BigInt(20),
    name: 'Test Run 1',
    description: 'Test run description',
    status: 'PLANNED',
    plannedStartDate: new Date('2024-01-01'),
    plannedEndDate: new Date('2024-01-15'),
    actualStartDate: null,
    actualEndDate: null,
    totalCases: 100,
    passedCases: 0,
    failedCases: 0,
    blockedCases: 0,
    skippedCases: 0,
    notes: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockDbTestRunWithRelations = {
    ...mockDbTestRun,
    project: {
      id: BigInt(100),
      name: 'Project 1',
    },
    milestone: {
      id: BigInt(10),
      name: 'Milestone 1',
    },
    configuration: {
      id: BigInt(20),
      name: 'Configuration 1',
    },
  };

  describe('createTestRun', () => {
    it('should create a test run', async () => {
      mockPrisma.testRun.create.mockResolvedValue(mockDbTestRun);

      const result = await createTestRun({
        projectId: '100',
        name: 'Test Run 1',
        description: 'Test run description',
        plannedStartDate: '2024-01-01',
        plannedEndDate: '2024-01-15',
      });

      expect(result.name).toBe('Test Run 1');
      expect(result.projectId).toBe('100');
      expect(result.status).toBe('PLANNED');
      expect(mockPrisma.testRun.create).toHaveBeenCalled();
    });

    it('should create a test run with milestone and configuration', async () => {
      mockPrisma.testRun.create.mockResolvedValue(mockDbTestRun);

      await createTestRun({
        projectId: '100',
        name: 'Test Run 1',
        milestoneId: '10',
        configurationId: '20',
      });

      expect(mockPrisma.testRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            milestoneId: BigInt(10),
            configurationId: BigInt(20),
          }),
        })
      );
    });

    it('should trim name on create', async () => {
      mockPrisma.testRun.create.mockResolvedValue(mockDbTestRun);

      await createTestRun({
        projectId: '100',
        name: '  Test Run 1  ',
      });

      expect(mockPrisma.testRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Run 1',
          }),
        })
      );
    });
  });

  describe('getTestRunById', () => {
    it('should return test run with relations', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue(mockDbTestRunWithRelations);

      const result = await getTestRunById(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Run 1');
      expect(result?.project.name).toBe('Project 1');
      expect(result?.milestone?.name).toBe('Milestone 1');
      expect(result?.configuration?.name).toBe('Configuration 1');
    });

    it('should return null if not found', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue(null);

      const result = await getTestRunById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getTestRuns', () => {
    it('should return test runs for project', async () => {
      mockPrisma.testRun.findMany.mockResolvedValue([mockDbTestRunWithRelations]);

      const result = await getTestRuns('100');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Run 1');
    });

    it('should filter by milestone', async () => {
      mockPrisma.testRun.findMany.mockResolvedValue([]);

      await getTestRuns('100', { milestoneId: '10' });

      expect(mockPrisma.testRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            milestoneId: BigInt(10),
          }),
        })
      );
    });

    it('should filter by configuration', async () => {
      mockPrisma.testRun.findMany.mockResolvedValue([]);

      await getTestRuns('100', { configurationId: '20' });

      expect(mockPrisma.testRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            configurationId: BigInt(20),
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrisma.testRun.findMany.mockResolvedValue([]);

      await getTestRuns('100', { status: 'COMPLETED' });

      expect(mockPrisma.testRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should filter by query', async () => {
      mockPrisma.testRun.findMany.mockResolvedValue([]);

      await getTestRuns('100', { query: 'test' });

      expect(mockPrisma.testRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ name: { contains: 'test', mode: 'insensitive' } }],
          }),
        })
      );
    });
  });

  describe('updateTestRun', () => {
    it('should update test run', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue(mockDbTestRun);
      mockPrisma.testRun.update.mockResolvedValue({
        ...mockDbTestRun,
        name: 'Updated Test Run',
        status: 'IN_PROGRESS',
      });

      const result = await updateTestRun(BigInt(1), {
        name: 'Updated Test Run',
        status: 'IN_PROGRESS',
      });

      expect(result?.name).toBe('Updated Test Run');
      expect(result?.status).toBe('IN_PROGRESS');
    });

    it('should return null if test run not found', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue(null);

      const result = await updateTestRun(BigInt(999), { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should update case counts', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue(mockDbTestRun);
      mockPrisma.testRun.update.mockResolvedValue({
        ...mockDbTestRun,
        passedCases: 50,
        failedCases: 10,
      });

      await updateTestRun(BigInt(1), {
        passedCases: 50,
        failedCases: 10,
      });

      expect(mockPrisma.testRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passedCases: 50,
            failedCases: 10,
          }),
        })
      );
    });
  });

  describe('deleteTestRun', () => {
    it('should delete test run', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue(mockDbTestRun);
      mockPrisma.testRun.delete.mockResolvedValue(mockDbTestRun);

      const result = await deleteTestRun(BigInt(1));

      expect(result.success).toBe(true);
      expect(mockPrisma.testRun.delete).toHaveBeenCalled();
    });

    it('should return error if test run not found', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue(null);

      const result = await deleteTestRun(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toContain('見つかりません');
    });
  });

  describe('projectExists', () => {
    it('should return true if project exists', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: BigInt(100) });

      const result = await projectExists(BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false if project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      const result = await projectExists(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('testRunExistsInProject', () => {
    it('should return true if test run exists in project', async () => {
      mockPrisma.testRun.findFirst.mockResolvedValue(mockDbTestRun);

      const result = await testRunExistsInProject(BigInt(100), BigInt(1));

      expect(result).toBe(true);
    });

    it('should return false if test run not in project', async () => {
      mockPrisma.testRun.findFirst.mockResolvedValue(null);

      const result = await testRunExistsInProject(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('milestoneExistsInProject', () => {
    it('should return true if milestone exists', async () => {
      mockPrisma.milestone.findFirst.mockResolvedValue({ id: BigInt(10) });

      const result = await milestoneExistsInProject(BigInt(100), BigInt(10));

      expect(result).toBe(true);
    });

    it('should return false if milestone not found', async () => {
      mockPrisma.milestone.findFirst.mockResolvedValue(null);

      const result = await milestoneExistsInProject(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('configurationExistsInProject', () => {
    it('should return true if configuration exists', async () => {
      mockPrisma.configuration.findFirst.mockResolvedValue({ id: BigInt(20) });

      const result = await configurationExistsInProject(BigInt(100), BigInt(20));

      expect(result).toBe(true);
    });

    it('should return false if configuration not found', async () => {
      mockPrisma.configuration.findFirst.mockResolvedValue(null);

      const result = await configurationExistsInProject(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('getTestRunCount', () => {
    it('should return count of test runs', async () => {
      mockPrisma.testRun.count.mockResolvedValue(5);

      const result = await getTestRunCount(BigInt(100));

      expect(result).toBe(5);
    });

    it('should filter by status', async () => {
      mockPrisma.testRun.count.mockResolvedValue(2);

      await getTestRunCount(BigInt(100), 'COMPLETED');

      expect(mockPrisma.testRun.count).toHaveBeenCalledWith({
        where: {
          projectId: BigInt(100),
          status: 'COMPLETED',
        },
      });
    });
  });

  describe('getTestRunsByMilestone', () => {
    it('should return test runs for milestone', async () => {
      mockPrisma.testRun.findMany.mockResolvedValue([mockDbTestRun]);

      const result = await getTestRunsByMilestone(BigInt(10));

      expect(result).toHaveLength(1);
      expect(mockPrisma.testRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { milestoneId: BigInt(10) },
        })
      );
    });
  });

  describe('getTestRunsByConfiguration', () => {
    it('should return test runs for configuration', async () => {
      mockPrisma.testRun.findMany.mockResolvedValue([mockDbTestRun]);

      const result = await getTestRunsByConfiguration(BigInt(20));

      expect(result).toHaveLength(1);
      expect(mockPrisma.testRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { configurationId: BigInt(20) },
        })
      );
    });
  });

  describe('getTestRunCaseStatusCounts', () => {
    it('should return status counts', async () => {
      mockPrisma.testRunCase.groupBy.mockResolvedValue([
        { status: 'PASSED', _count: 5 },
        { status: 'FAILED', _count: 3 },
        { status: 'BLOCKED', _count: 2 },
      ]);

      const result = await getTestRunCaseStatusCounts(BigInt(1));

      expect(result.PASSED).toBe(5);
      expect(result.FAILED).toBe(3);
      expect(result.BLOCKED).toBe(2);
      expect(result.NOT_RUN).toBe(0);
    });
  });

  describe('createReRun', () => {
    it('should create new test run from failed/blocked cases', async () => {
      const sourceTestRun = {
        id: BigInt(1),
        projectId: BigInt(100),
        milestoneId: BigInt(10),
        configurationId: BigInt(20),
        name: 'Original Test Run',
        testRunCases: [
          { testCaseId: BigInt(1), assignedToId: BigInt(5) },
          { testCaseId: BigInt(2), assignedToId: BigInt(6) },
        ],
      };

      mockPrisma.testRun.findUnique.mockResolvedValue(sourceTestRun);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          testRun: {
            create: vi.fn().mockResolvedValue({
              ...mockDbTestRunWithRelations,
              name: 'Original Test Run - Re-Run',
            }),
          },
          testRunCase: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(mockTx);
      });

      const result = await createReRun(BigInt(100), BigInt(1), {
        includeStatuses: ['FAILED', 'BLOCKED'],
      });

      expect(result).not.toBeNull();
      expect(result.name).toBe('Original Test Run - Re-Run');
    });

    it('should throw error if test run not found', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue(null);

      await expect(
        createReRun(BigInt(100), BigInt(999), { includeStatuses: ['FAILED'] })
      ).rejects.toThrow('テストランが見つかりません');
    });

    it('should throw error if no matching cases', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue({
        id: BigInt(1),
        projectId: BigInt(100),
        testRunCases: [],
      });

      await expect(
        createReRun(BigInt(100), BigInt(1), { includeStatuses: ['FAILED'] })
      ).rejects.toThrow('対象のテストケースがありません');
    });
  });

  describe('closeTestRun', () => {
    it('should close test run and update status counts', async () => {
      const testRun = {
        id: BigInt(1),
        projectId: BigInt(100),
        status: 'IN_PROGRESS',
        notes: 'Test notes',
      };

      mockPrisma.testRun.findUnique.mockResolvedValue(testRun);
      mockPrisma.testRunCase.groupBy.mockResolvedValue([
        { status: 'PASSED', _count: 5 },
        { status: 'FAILED', _count: 2 },
      ]);
      mockPrisma.testRun.update.mockResolvedValue({
        ...mockDbTestRunWithRelations,
        status: 'COMPLETED',
      });

      const result = await closeTestRun(BigInt(100), BigInt(1));

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.testRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            passedCases: 5,
            failedCases: 2,
          }),
        })
      );
    });

    it('should throw error if test run not found', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue(null);

      await expect(closeTestRun(BigInt(100), BigInt(999))).rejects.toThrow(
        'テストランが見つかりません'
      );
    });

    it('should throw error if already closed', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue({
        id: BigInt(1),
        projectId: BigInt(100),
        status: 'COMPLETED',
      });

      await expect(closeTestRun(BigInt(100), BigInt(1))).rejects.toThrow(
        'テストランは既にクローズされています'
      );
    });
  });

  describe('reopenTestRun', () => {
    it('should reopen closed test run', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue({
        id: BigInt(1),
        projectId: BigInt(100),
        status: 'COMPLETED',
      });
      mockPrisma.testRun.update.mockResolvedValue({
        ...mockDbTestRunWithRelations,
        status: 'IN_PROGRESS',
      });

      const result = await reopenTestRun(BigInt(100), BigInt(1));

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should throw error if not closed', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue({
        id: BigInt(1),
        projectId: BigInt(100),
        status: 'IN_PROGRESS',
      });

      await expect(reopenTestRun(BigInt(100), BigInt(1))).rejects.toThrow(
        'テストランはクローズされていません'
      );
    });
  });

  describe('isTestRunClosed', () => {
    it('should return true for closed test run', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue({
        status: 'COMPLETED',
      });

      const result = await isTestRunClosed(BigInt(1));

      expect(result).toBe(true);
    });

    it('should return false for open test run', async () => {
      mockPrisma.testRun.findUnique.mockResolvedValue({
        status: 'IN_PROGRESS',
      });

      const result = await isTestRunClosed(BigInt(1));

      expect(result).toBe(false);
    });
  });
});
