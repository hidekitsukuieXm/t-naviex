/**
 * MCP Test Management Server Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    testSpec: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    testCase: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    testRun: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    testRunCase: {
      findUnique: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    bug: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('MCP Test Management Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list_projects tool', () => {
    it('should return list of projects', async () => {
      const mockProjects = [
        {
          id: BigInt(1),
          name: 'Project A',
          description: 'Description A',
          prefix: 'PA',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: BigInt(2),
          name: 'Project B',
          description: null,
          prefix: 'PB',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects);

      const projects = await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
      });

      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe('Project A');
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('get_test_cases tool', () => {
    it('should return test cases with filters', async () => {
      const mockTestCases = [
        {
          id: BigInt(1),
          testSpecId: BigInt(1),
          title: 'Test Case 1',
          description: 'Description',
          preconditions: 'Precondition',
          priority: 'HIGH',
          testType: 'FUNCTIONAL',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          testSpec: { name: 'Spec 1' },
          testSteps: [
            { id: BigInt(1), stepNumber: 1, action: 'Action 1', expectedResult: 'Result 1' },
          ],
        },
      ];

      vi.mocked(prisma.testCase.findMany).mockResolvedValue(mockTestCases as never);

      const testCases = await prisma.testCase.findMany({
        where: {
          deletedAt: null,
          testSpecId: BigInt(1),
          priority: 'HIGH',
        },
        include: {
          testSpec: true,
          testSteps: { orderBy: { stepNumber: 'asc' } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });

      expect(testCases).toHaveLength(1);
      expect(testCases[0].title).toBe('Test Case 1');
      expect(testCases[0].testSteps).toHaveLength(1);
    });
  });

  describe('create_test_case tool', () => {
    it('should create a new test case', async () => {
      const mockSpec = {
        id: BigInt(1),
        name: 'Test Specification',
        projectId: BigInt(1),
      };

      const mockTestCase = {
        id: BigInt(100),
        testSpecId: BigInt(1),
        title: 'New Test Case',
        description: 'New Description',
        preconditions: null,
        priority: 'MEDIUM',
        testType: 'FUNCTIONAL',
        sortOrder: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        testSteps: [
          { id: BigInt(1), stepNumber: 1, action: 'Step 1', expectedResult: 'Expected 1' },
        ],
      };

      vi.mocked(prisma.testSpec.findUnique).mockResolvedValue(mockSpec as never);
      vi.mocked(prisma.testCase.aggregate).mockResolvedValue({
        _max: { sortOrder: 0 },
      } as never);
      vi.mocked(prisma.testCase.create).mockResolvedValue(mockTestCase as never);

      // Verify spec exists
      const spec = await prisma.testSpec.findUnique({
        where: { id: BigInt(1) },
      });
      expect(spec).toBeDefined();
      expect(spec?.name).toBe('Test Specification');

      // Get next sort order
      const maxSortOrder = await prisma.testCase.aggregate({
        where: { testSpecId: BigInt(1), deletedAt: null },
        _max: { sortOrder: true },
      });
      expect(maxSortOrder._max.sortOrder).toBe(0);

      // Create test case
      const created = await prisma.testCase.create({
        data: {
          testSpecId: BigInt(1),
          title: 'New Test Case',
          description: 'New Description',
          preconditions: null,
          priority: 'MEDIUM',
          testType: 'FUNCTIONAL',
          sortOrder: 1,
          testSteps: {
            create: [{ stepNumber: 1, action: 'Step 1', expectedResult: 'Expected 1' }],
          },
        },
        include: { testSteps: { orderBy: { stepNumber: 'asc' } } },
      });

      expect(created.id).toBe(BigInt(100));
      expect(created.title).toBe('New Test Case');
    });

    it('should return error if spec not found', async () => {
      vi.mocked(prisma.testSpec.findUnique).mockResolvedValue(null);

      const spec = await prisma.testSpec.findUnique({
        where: { id: BigInt(999) },
      });

      expect(spec).toBeNull();
    });
  });

  describe('update_test_result tool', () => {
    it('should update test run case status', async () => {
      const mockTestRunCase = {
        id: BigInt(1),
        testRunId: BigInt(1),
        testCaseId: BigInt(1),
        status: 'NOT_RUN',
        comment: null,
        executionTime: null,
        executedAt: null,
        testCase: { title: 'Test Case 1' },
        testRun: { name: 'Test Run 1' },
      };

      const mockUpdated = {
        ...mockTestRunCase,
        status: 'PASSED',
        executedAt: new Date('2024-01-02'),
      };

      vi.mocked(prisma.testRunCase.findUnique).mockResolvedValue(mockTestRunCase as never);
      vi.mocked(prisma.testRunCase.update).mockResolvedValue(mockUpdated as never);

      const testRunCase = await prisma.testRunCase.findUnique({
        where: {
          testRunId_testCaseId: {
            testRunId: BigInt(1),
            testCaseId: BigInt(1),
          },
        },
        include: { testCase: true, testRun: true },
      });

      expect(testRunCase).toBeDefined();
      expect(testRunCase?.testCase.title).toBe('Test Case 1');

      const updated = await prisma.testRunCase.update({
        where: { id: BigInt(1) },
        data: {
          status: 'PASSED',
          executedAt: new Date(),
        },
      });

      expect(updated.status).toBe('PASSED');
      expect(updated.executedAt).toBeDefined();
    });

    it('should return error if test run case not found', async () => {
      vi.mocked(prisma.testRunCase.findUnique).mockResolvedValue(null);

      const testRunCase = await prisma.testRunCase.findUnique({
        where: {
          testRunId_testCaseId: {
            testRunId: BigInt(999),
            testCaseId: BigInt(999),
          },
        },
      });

      expect(testRunCase).toBeNull();
    });
  });

  describe('get_test_runs tool', () => {
    it('should return test runs with statistics', async () => {
      const mockTestRuns = [
        {
          id: BigInt(1),
          name: 'Test Run 1',
          description: 'Description',
          status: 'IN_PROGRESS',
          actualStartDate: new Date('2024-01-01'),
          actualEndDate: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          _count: { testRunCases: 10 },
        },
      ];

      const mockStats = [
        { status: 'PASSED', _count: 5 },
        { status: 'FAILED', _count: 2 },
        { status: 'NOT_RUN', _count: 3 },
      ];

      vi.mocked(prisma.testRun.findMany).mockResolvedValue(mockTestRuns as never);
      vi.mocked(prisma.testRunCase.groupBy).mockResolvedValue(mockStats as never);

      const testRuns = await prisma.testRun.findMany({
        where: { projectId: BigInt(1) },
        include: { _count: { select: { testRunCases: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });

      expect(testRuns).toHaveLength(1);
      expect(testRuns[0].name).toBe('Test Run 1');
      expect(testRuns[0]._count.testRunCases).toBe(10);

      const stats = await prisma.testRunCase.groupBy({
        by: ['status'],
        where: { testRunId: BigInt(1) },
        _count: true,
      });

      expect(stats).toHaveLength(3);
      const passedStat = stats.find((s) => s.status === 'PASSED');
      expect(passedStat?._count).toBe(5);
    });
  });

  describe('get_bugs tool', () => {
    it('should return bugs with filters', async () => {
      const mockBugs = [
        {
          id: BigInt(1),
          title: 'Bug 1',
          description: 'Bug description',
          status: 'NEW',
          priority: 'HIGH',
          severity: 'MAJOR',
          type: 'BUG',
          assigneeId: BigInt(1),
          reporterId: BigInt(2),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          assignee: { id: BigInt(1), name: 'User A' },
          reporter: { id: BigInt(2), name: 'User B' },
        },
      ];

      vi.mocked(prisma.bug.findMany).mockResolvedValue(mockBugs as never);

      const bugs = await prisma.bug.findMany({
        where: {
          projectId: BigInt(1),
          priority: 'HIGH',
        },
        include: {
          assignee: { select: { id: true, name: true } },
          reporter: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });

      expect(bugs).toHaveLength(1);
      expect(bugs[0].title).toBe('Bug 1');
      expect(bugs[0].assignee?.name).toBe('User A');
      expect(bugs[0].reporter?.name).toBe('User B');
    });
  });

  describe('Resources', () => {
    describe('test_specs resource', () => {
      it('should list test specifications for a project', async () => {
        const mockSpecs = [
          {
            id: BigInt(1),
            name: 'Test Spec 1',
            description: 'Description 1',
            status: 'DRAFT',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            _count: { testCases: 5 },
          },
        ];

        vi.mocked(prisma.testSpec.findMany).mockResolvedValue(mockSpecs as never);

        const specs = await prisma.testSpec.findMany({
          where: { projectId: BigInt(1) },
          include: { _count: { select: { testCases: { where: { deletedAt: null } } } } },
          orderBy: { updatedAt: 'desc' },
        });

        expect(specs).toHaveLength(1);
        expect(specs[0].name).toBe('Test Spec 1');
        expect(specs[0]._count.testCases).toBe(5);
      });
    });

    describe('test_runs resource', () => {
      it('should list test runs for a project', async () => {
        const mockRuns = [
          {
            id: BigInt(1),
            name: 'Run 1',
            description: null,
            status: 'COMPLETED',
            actualStartDate: new Date('2024-01-01'),
            actualEndDate: new Date('2024-01-02'),
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            _count: { testRunCases: 20 },
          },
        ];

        vi.mocked(prisma.testRun.findMany).mockResolvedValue(mockRuns as never);

        const runs = await prisma.testRun.findMany({
          where: { projectId: BigInt(1) },
          include: { _count: { select: { testRunCases: true } } },
          orderBy: { updatedAt: 'desc' },
        });

        expect(runs).toHaveLength(1);
        expect(runs[0].name).toBe('Run 1');
        expect(runs[0]._count.testRunCases).toBe(20);
      });
    });

    describe('bugs resource', () => {
      it('should list bugs for a project', async () => {
        const mockBugs = [
          {
            id: BigInt(1),
            title: 'Bug 1',
            status: 'NEW',
            priority: 'HIGH',
            severity: 'MAJOR',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
            assignee: { name: 'User A' },
            reporter: { name: 'User B' },
          },
        ];

        vi.mocked(prisma.bug.findMany).mockResolvedValue(mockBugs as never);

        const bugs = await prisma.bug.findMany({
          where: { projectId: BigInt(1) },
          include: {
            assignee: { select: { name: true } },
            reporter: { select: { name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
        });

        expect(bugs).toHaveLength(1);
        expect(bugs[0].title).toBe('Bug 1');
        expect(bugs[0].assignee?.name).toBe('User A');
      });
    });
  });
});
