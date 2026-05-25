import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testCase: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    testSpec: {
      findUnique: vi.fn(),
    },
    testSection: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  createTestCase,
  getTestCaseById,
  getTestCases,
  updateTestCase,
  deleteTestCase,
  testSpecExists,
  isTestSpecLocked,
  sectionExists,
  isTestCaseTitleTaken,
  getTestCaseCountBySection,
  getTestCaseCountByTestSpec,
} from '../test-case-repository';

const mockPrisma = vi.mocked(prisma);

describe('Test Case Repository', () => {
  const mockDbTestCase = {
    id: BigInt(1),
    testSpecId: BigInt(100),
    sectionId: BigInt(10) as bigint | null,
    title: 'Test Case 1',
    description: 'Description',
    preconditions: 'Preconditions',
    expectedResult: null as string | null,
    checkpoint: null as string | null,
    scenario: null as string | null,
    testEnvironment: null as string | null,
    notes: null as string | null,
    tags: [] as string[],
    classification: null as string | null,
    referenceId: null as string | null,
    estimatedTime: null as number | null,
    priority: 'MEDIUM',
    testType: 'FUNCTIONAL',
    testTechnique: 'OTHER',
    isMatrix: false,
    sortOrder: 0,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-02T12:00:00Z'),
    deletedAt: null as Date | null,
  };

  const mockDbTestCaseDetail = {
    ...mockDbTestCase,
    section: {
      id: BigInt(10),
      name: 'Section 1',
    },
    testSpec: {
      id: BigInt(100),
      name: 'Test Spec 1',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTestCase', () => {
    it('should create a new test case', async () => {
      mockPrisma.testCase.aggregate.mockResolvedValueOnce({
        _max: { sortOrder: null },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });
      mockPrisma.testCase.create.mockResolvedValueOnce(mockDbTestCase);

      const result = await createTestCase({
        testSpecId: '100',
        sectionId: '10',
        title: 'Test Case 1',
        description: 'Description',
        preconditions: 'Preconditions',
        priority: 'MEDIUM',
        testType: 'FUNCTIONAL',
        testTechnique: 'OTHER',
        isMatrix: false,
      });

      expect(mockPrisma.testCase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          testSpecId: BigInt(100),
          sectionId: BigInt(10),
          title: 'Test Case 1',
          description: 'Description',
          preconditions: 'Preconditions',
          priority: 'MEDIUM',
          testType: 'FUNCTIONAL',
          testTechnique: 'OTHER',
          isMatrix: false,
          sortOrder: 0,
        }),
        select: expect.any(Object),
      });

      expect(result.id).toBe('1');
      expect(result.title).toBe('Test Case 1');
    });

    it('should create test case with specified sort order', async () => {
      mockPrisma.testCase.create.mockResolvedValueOnce({
        ...mockDbTestCase,
        sortOrder: 5,
      });

      const result = await createTestCase({
        testSpecId: '100',
        title: 'Test Case 1',
        sortOrder: 5,
      });

      expect(mockPrisma.testCase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 5,
          }),
        })
      );
      expect(result.sortOrder).toBe(5);
    });

    it('should create test case without section', async () => {
      mockPrisma.testCase.aggregate.mockResolvedValueOnce({
        _max: { sortOrder: null },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });
      mockPrisma.testCase.create.mockResolvedValueOnce({
        ...mockDbTestCase,
        sectionId: null,
      });

      const result = await createTestCase({
        testSpecId: '100',
        title: 'Test Case 1',
      });

      expect(mockPrisma.testCase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sectionId: null,
          }),
        })
      );
      expect(result.sectionId).toBeNull();
    });
  });

  describe('getTestCaseById', () => {
    it('should return test case by id', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce(mockDbTestCaseDetail);

      const result = await getTestCaseById(BigInt(1));

      expect(mockPrisma.testCase.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        select: expect.any(Object),
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.section?.name).toBe('Section 1');
    });

    it('should return null for non-existent test case', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce(null);

      const result = await getTestCaseById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getTestCases', () => {
    it('should return paginated test cases', async () => {
      mockPrisma.testCase.count.mockResolvedValueOnce(2);
      mockPrisma.testCase.findMany.mockResolvedValueOnce([mockDbTestCase]);

      const result = await getTestCases({
        testSpecId: '100',
        page: 1,
        limit: 20,
      });

      expect(result.testCases).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by section id', async () => {
      mockPrisma.testCase.count.mockResolvedValueOnce(1);
      mockPrisma.testCase.findMany.mockResolvedValueOnce([mockDbTestCase]);

      await getTestCases({
        testSpecId: '100',
        sectionId: '10',
      });

      expect(mockPrisma.testCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sectionId: BigInt(10),
          }),
        })
      );
    });

    it('should filter by priority', async () => {
      mockPrisma.testCase.count.mockResolvedValueOnce(1);
      mockPrisma.testCase.findMany.mockResolvedValueOnce([mockDbTestCase]);

      await getTestCases({
        testSpecId: '100',
        priority: 'HIGH',
      });

      expect(mockPrisma.testCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'HIGH',
          }),
        })
      );
    });

    it('should search by query', async () => {
      mockPrisma.testCase.count.mockResolvedValueOnce(1);
      mockPrisma.testCase.findMany.mockResolvedValueOnce([mockDbTestCase]);

      await getTestCases({
        testSpecId: '100',
        query: 'search term',
      });

      expect(mockPrisma.testCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'search term', mode: 'insensitive' } },
              { description: { contains: 'search term', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });
  });

  describe('updateTestCase', () => {
    it('should update test case', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce(mockDbTestCase);
      mockPrisma.testCase.update.mockResolvedValueOnce({
        ...mockDbTestCase,
        title: 'Updated Title',
      });

      const result = await updateTestCase(BigInt(1), {
        title: 'Updated Title',
      });

      expect(mockPrisma.testCase.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { title: 'Updated Title' },
        select: expect.any(Object),
      });
      expect(result?.title).toBe('Updated Title');
    });

    it('should return null for non-existent test case', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce(null);

      const result = await updateTestCase(BigInt(999), {
        title: 'Updated Title',
      });

      expect(result).toBeNull();
    });

    it('should update multiple fields', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce(mockDbTestCase);
      mockPrisma.testCase.update.mockResolvedValueOnce({
        ...mockDbTestCase,
        title: 'Updated Title',
        priority: 'HIGH',
        testType: 'E2E',
      });

      const result = await updateTestCase(BigInt(1), {
        title: 'Updated Title',
        priority: 'HIGH',
        testType: 'E2E',
      });

      expect(mockPrisma.testCase.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          title: 'Updated Title',
          priority: 'HIGH',
          testType: 'E2E',
        },
        select: expect.any(Object),
      });
      expect(result?.priority).toBe('HIGH');
    });
  });

  describe('deleteTestCase', () => {
    it('should soft delete test case', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce({
        ...mockDbTestCase,
        deletedAt: null,
      });
      mockPrisma.testCase.update.mockResolvedValueOnce({
        ...mockDbTestCase,
        deletedAt: new Date(),
      });

      const result = await deleteTestCase(BigInt(1));

      expect(mockPrisma.testCase.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.success).toBe(true);
    });

    it('should return error for non-existent test case', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce(null);

      const result = await deleteTestCase(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toBe('テストケースが見つかりません。');
    });

    it('should return error for already deleted test case', async () => {
      mockPrisma.testCase.findUnique.mockResolvedValueOnce({
        ...mockDbTestCase,
        deletedAt: new Date(),
      });

      const result = await deleteTestCase(BigInt(1));

      expect(result.success).toBe(false);
      expect(result.error).toBe('テストケースは既に削除されています。');
    });
  });

  describe('testSpecExists', () => {
    it('should return true for existing test spec', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ id: BigInt(100) });

      const result = await testSpecExists(BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false for non-existent test spec', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce(null);

      const result = await testSpecExists(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('isTestSpecLocked', () => {
    it('should return true for locked test spec', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ isLocked: true });

      const result = await isTestSpecLocked(BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false for unlocked test spec', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ isLocked: false });

      const result = await isTestSpecLocked(BigInt(100));

      expect(result).toBe(false);
    });

    it('should return false for non-existent test spec', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce(null);

      const result = await isTestSpecLocked(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('sectionExists', () => {
    it('should return true for existing section', async () => {
      mockPrisma.testSection.findFirst.mockResolvedValueOnce({ id: BigInt(10) });

      const result = await sectionExists(BigInt(100), BigInt(10));

      expect(result).toBe(true);
    });

    it('should return false for non-existent section', async () => {
      mockPrisma.testSection.findFirst.mockResolvedValueOnce(null);

      const result = await sectionExists(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('isTestCaseTitleTaken', () => {
    it('should return true for taken title', async () => {
      mockPrisma.testCase.findFirst.mockResolvedValueOnce({ id: BigInt(2) });

      const result = await isTestCaseTitleTaken(BigInt(100), BigInt(10), 'Existing Title');

      expect(result).toBe(true);
    });

    it('should return false for available title', async () => {
      mockPrisma.testCase.findFirst.mockResolvedValueOnce(null);

      const result = await isTestCaseTitleTaken(BigInt(100), BigInt(10), 'New Title');

      expect(result).toBe(false);
    });

    it('should exclude specified id', async () => {
      mockPrisma.testCase.findFirst.mockResolvedValueOnce(null);

      await isTestCaseTitleTaken(BigInt(100), BigInt(10), 'Title', BigInt(1));

      expect(mockPrisma.testCase.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: BigInt(1) },
          }),
        })
      );
    });
  });

  describe('getTestCaseCountBySection', () => {
    it('should return count of test cases in section', async () => {
      mockPrisma.testCase.count.mockResolvedValueOnce(5);

      const result = await getTestCaseCountBySection(BigInt(100), BigInt(10));

      expect(mockPrisma.testCase.count).toHaveBeenCalledWith({
        where: {
          testSpecId: BigInt(100),
          sectionId: BigInt(10),
        },
      });
      expect(result).toBe(5);
    });
  });

  describe('getTestCaseCountByTestSpec', () => {
    it('should return count of test cases in test spec', async () => {
      mockPrisma.testCase.count.mockResolvedValueOnce(10);

      const result = await getTestCaseCountByTestSpec(BigInt(100));

      expect(mockPrisma.testCase.count).toHaveBeenCalledWith({
        where: {
          testSpecId: BigInt(100),
        },
      });
      expect(result).toBe(10);
    });
  });
});
