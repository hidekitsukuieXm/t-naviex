import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testSection: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    testSpec: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  createTestSection,
  getTestSectionById,
  getTestSections,
  getTestSectionTree,
  updateTestSection,
  moveTestSection,
  deleteTestSection,
  updateSortOrders,
  testSpecExists,
  isTestSpecLocked,
  isSectionNameTaken,
  parentSectionExists,
  getDescendantCount,
} from '../test-section-repository';

const mockPrisma = vi.mocked(prisma);

describe('Test Section Repository', () => {
  const mockDbSection = {
    id: BigInt(1),
    testSpecId: BigInt(100),
    parentId: null as bigint | null,
    name: 'Test Section',
    sortOrder: 0,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-02T12:00:00Z'),
  };

  const mockDbSectionWithChildren = {
    ...mockDbSection,
    parent: null,
    children: [
      {
        id: BigInt(2),
        testSpecId: BigInt(100),
        parentId: BigInt(1),
        name: 'Child Section',
        sortOrder: 0,
        createdAt: new Date('2024-01-01T12:00:00Z'),
        updatedAt: new Date('2024-01-02T12:00:00Z'),
      },
    ],
    testSpec: {
      id: BigInt(100),
      name: 'Test Spec',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTestSection', () => {
    it('should create a new test section', async () => {
      mockPrisma.testSection.aggregate.mockResolvedValueOnce({
        _max: { sortOrder: null },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });
      mockPrisma.testSection.create.mockResolvedValueOnce(mockDbSection);

      const result = await createTestSection({
        testSpecId: '100',
        name: 'Test Section',
      });

      expect(mockPrisma.testSection.create).toHaveBeenCalledWith({
        data: {
          testSpecId: BigInt(100),
          parentId: null,
          name: 'Test Section',
          sortOrder: 0,
        },
        select: expect.any(Object),
      });
      expect(result.id).toBe('1');
      expect(result.name).toBe('Test Section');
    });

    it('should create section with parent', async () => {
      mockPrisma.testSection.aggregate.mockResolvedValueOnce({
        _max: { sortOrder: 1 },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });
      mockPrisma.testSection.create.mockResolvedValueOnce({
        ...mockDbSection,
        parentId: BigInt(10),
        sortOrder: 2,
      });

      const result = await createTestSection({
        testSpecId: '100',
        parentId: '10',
        name: 'Child Section',
      });

      expect(mockPrisma.testSection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: BigInt(10),
        }),
        select: expect.any(Object),
      });
      expect(result.parentId).toBe('10');
    });

    it('should use specified sort order', async () => {
      mockPrisma.testSection.create.mockResolvedValueOnce({
        ...mockDbSection,
        sortOrder: 5,
      });

      const result = await createTestSection({
        testSpecId: '100',
        name: 'Test Section',
        sortOrder: 5,
      });

      expect(mockPrisma.testSection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sortOrder: 5,
        }),
        select: expect.any(Object),
      });
      expect(result.sortOrder).toBe(5);
    });

    it('should trim whitespace from name', async () => {
      mockPrisma.testSection.aggregate.mockResolvedValueOnce({
        _max: { sortOrder: null },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });
      mockPrisma.testSection.create.mockResolvedValueOnce(mockDbSection);

      await createTestSection({
        testSpecId: '100',
        name: '  Test Section  ',
      });

      expect(mockPrisma.testSection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Section',
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('getTestSectionById', () => {
    it('should return section with details when found', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce(mockDbSectionWithChildren);

      const result = await getTestSectionById(BigInt(1));

      expect(mockPrisma.testSection.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        select: expect.any(Object),
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.children).toHaveLength(1);
    });

    it('should return null when not found', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce(null);

      const result = await getTestSectionById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getTestSections', () => {
    it('should return sections for test spec', async () => {
      mockPrisma.testSection.findMany.mockResolvedValueOnce([
        mockDbSection,
        { ...mockDbSection, id: BigInt(2), name: 'Section 2', sortOrder: 1 },
      ]);

      const result = await getTestSections({ testSpecId: '100' });

      expect(mockPrisma.testSection.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should filter by parentId', async () => {
      mockPrisma.testSection.findMany.mockResolvedValueOnce([mockDbSection]);

      await getTestSections({ testSpecId: '100', parentId: null });

      expect(mockPrisma.testSection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: null,
          }),
        })
      );
    });

    it('should filter by query', async () => {
      mockPrisma.testSection.findMany.mockResolvedValueOnce([mockDbSection]);

      await getTestSections({ testSpecId: '100', query: 'search' });

      expect(mockPrisma.testSection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('getTestSectionTree', () => {
    it('should return tree structure', async () => {
      mockPrisma.testSection.findMany.mockResolvedValueOnce([
        { ...mockDbSection, id: BigInt(1), parentId: null, sortOrder: 0 },
        { ...mockDbSection, id: BigInt(2), parentId: BigInt(1), sortOrder: 0 },
      ]);

      const result = await getTestSectionTree('100');

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
    });
  });

  describe('updateTestSection', () => {
    it('should update section name', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        testSpecId: BigInt(100),
        parentId: null,
      });
      mockPrisma.testSection.update.mockResolvedValueOnce({
        ...mockDbSection,
        name: 'Updated Name',
      });

      const result = await updateTestSection(BigInt(1), { name: 'Updated Name' });

      expect(mockPrisma.testSection.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: expect.objectContaining({
          name: 'Updated Name',
        }),
        select: expect.any(Object),
      });
      expect(result?.name).toBe('Updated Name');
    });

    it('should return null when not found', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce(null);

      const result = await updateTestSection(BigInt(999), { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should throw error for circular reference', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        testSpecId: BigInt(100),
        parentId: null,
      });
      mockPrisma.testSection.findMany.mockResolvedValueOnce([
        { ...mockDbSection, id: BigInt(1), parentId: null },
        { ...mockDbSection, id: BigInt(2), parentId: BigInt(1) },
      ]);

      await expect(updateTestSection(BigInt(1), { parentId: '2' })).rejects.toThrow('循環参照');
    });
  });

  describe('moveTestSection', () => {
    it('should move section to new parent', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        testSpecId: BigInt(100),
        parentId: null,
      });
      mockPrisma.testSection.findMany.mockResolvedValueOnce([
        { ...mockDbSection, id: BigInt(1), parentId: null },
        { ...mockDbSection, id: BigInt(2), parentId: null },
      ]);
      mockPrisma.testSection.aggregate.mockResolvedValueOnce({
        _max: { sortOrder: 0 },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });
      mockPrisma.testSection.update.mockResolvedValueOnce({
        ...mockDbSection,
        parentId: BigInt(2),
        sortOrder: 1,
      });

      const result = await moveTestSection(BigInt(1), { parentId: '2' });

      expect(result?.parentId).toBe('2');
    });

    it('should move section to root', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        testSpecId: BigInt(100),
        parentId: BigInt(2),
      });
      mockPrisma.testSection.aggregate.mockResolvedValueOnce({
        _max: { sortOrder: 0 },
        _min: {},
        _avg: {},
        _sum: {},
        _count: 0,
      });
      mockPrisma.testSection.update.mockResolvedValueOnce({
        ...mockDbSection,
        parentId: null,
        sortOrder: 1,
      });

      const result = await moveTestSection(BigInt(1), { parentId: null });

      expect(result?.parentId).toBeNull();
    });

    it('should return null when section not found', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce(null);

      const result = await moveTestSection(BigInt(999), { parentId: null });

      expect(result).toBeNull();
    });
  });

  describe('deleteTestSection', () => {
    it('should delete section successfully', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        testSpecId: BigInt(100),
      });
      mockPrisma.testSection.findMany.mockResolvedValueOnce([mockDbSection]);
      mockPrisma.testSection.delete.mockResolvedValueOnce(mockDbSection);

      const result = await deleteTestSection(BigInt(1));

      expect(mockPrisma.testSection.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
    });

    it('should return error when not found', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce(null);

      const result = await deleteTestSection(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toBe('テストセクションが見つかりません。');
    });
  });

  describe('updateSortOrders', () => {
    it('should update multiple sort orders', async () => {
      mockPrisma.$transaction.mockResolvedValueOnce([
        { ...mockDbSection, sortOrder: 1 },
        { ...mockDbSection, id: BigInt(2), sortOrder: 0 },
      ]);

      const result = await updateSortOrders('100', [
        { id: '1', sortOrder: 1 },
        { id: '2', sortOrder: 0 },
      ]);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('testSpecExists', () => {
    it('should return true when test spec exists', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ id: BigInt(100) });

      const result = await testSpecExists(BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false when test spec not exists', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce(null);

      const result = await testSpecExists(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('isTestSpecLocked', () => {
    it('should return true when locked', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ isLocked: true });

      const result = await isTestSpecLocked(BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false when not locked', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ isLocked: false });

      const result = await isTestSpecLocked(BigInt(100));

      expect(result).toBe(false);
    });

    it('should return false when test spec not found', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce(null);

      const result = await isTestSpecLocked(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('isSectionNameTaken', () => {
    it('should return true when name is taken', async () => {
      mockPrisma.testSection.findFirst.mockResolvedValueOnce({ id: BigInt(2) });

      const result = await isSectionNameTaken(BigInt(100), null, 'Existing Name');

      expect(result).toBe(true);
    });

    it('should return false when name is available', async () => {
      mockPrisma.testSection.findFirst.mockResolvedValueOnce(null);

      const result = await isSectionNameTaken(BigInt(100), null, 'New Name');

      expect(result).toBe(false);
    });

    it('should exclude specific ID', async () => {
      mockPrisma.testSection.findFirst.mockResolvedValueOnce(null);

      await isSectionNameTaken(BigInt(100), null, 'Name', BigInt(1));

      expect(mockPrisma.testSection.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: BigInt(1) },
          }),
        })
      );
    });
  });

  describe('parentSectionExists', () => {
    it('should return true when parent exists', async () => {
      mockPrisma.testSection.findFirst.mockResolvedValueOnce({ id: BigInt(1) });

      const result = await parentSectionExists(BigInt(100), BigInt(1));

      expect(result).toBe(true);
    });

    it('should return false when parent not exists', async () => {
      mockPrisma.testSection.findFirst.mockResolvedValueOnce(null);

      const result = await parentSectionExists(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('getDescendantCount', () => {
    it('should return descendant count', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce({
        testSpecId: BigInt(100),
      });
      mockPrisma.testSection.findMany.mockResolvedValueOnce([
        { ...mockDbSection, id: BigInt(1), parentId: null },
        { ...mockDbSection, id: BigInt(2), parentId: BigInt(1) },
        { ...mockDbSection, id: BigInt(3), parentId: BigInt(1) },
      ]);

      const result = await getDescendantCount(BigInt(1));

      expect(result).toBe(2);
    });

    it('should return 0 when section not found', async () => {
      mockPrisma.testSection.findUnique.mockResolvedValueOnce(null);

      const result = await getDescendantCount(BigInt(999));

      expect(result).toBe(0);
    });
  });
});
