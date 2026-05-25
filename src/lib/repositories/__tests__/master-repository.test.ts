import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTestTypeMasters,
  getTestTechniqueMasters,
  getTestPerspectives,
  getTestTypeMaster,
  createTestTypeMaster,
  updateTestTypeMaster,
  deleteTestTypeMaster,
  getMasterItems,
  getMasterItem,
  createMasterItem,
  updateMasterItem,
  deleteMasterItem,
  initializeTestTypeMasters,
  initializeTestTechniqueMasters,
  initializeTestPerspectives,
  initializeAllMasters,
  hasTestTypeMasters,
} from '../master-repository';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testTypeMaster: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testTechniqueMaster: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testPerspective: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = vi.mocked(prisma);

describe('master-repository', () => {
  const mockMasterItem = {
    id: BigInt(1),
    projectId: BigInt(100),
    code: 'FUNCTIONAL',
    name: '機能テスト',
    description: 'テストの説明',
    sortOrder: 1,
    isActive: true,
    isDefault: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTestTypeMasters', () => {
    it('should return all test types for a project', async () => {
      mockPrisma.testTypeMaster.findMany.mockResolvedValue([mockMasterItem]);
      mockPrisma.testTypeMaster.count.mockResolvedValue(1);

      const result = await getTestTypeMasters('100');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].code).toBe('FUNCTIONAL');
      expect(mockPrisma.testTypeMaster.findMany).toHaveBeenCalledWith({
        where: { projectId: BigInt(100) },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter active items only', async () => {
      mockPrisma.testTypeMaster.findMany.mockResolvedValue([mockMasterItem]);
      mockPrisma.testTypeMaster.count.mockResolvedValue(1);

      await getTestTypeMasters('100', { activeOnly: true });

      expect(mockPrisma.testTypeMaster.findMany).toHaveBeenCalledWith({
        where: { projectId: BigInt(100), isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('getTestTypeMaster', () => {
    it('should return a test type by id', async () => {
      mockPrisma.testTypeMaster.findFirst.mockResolvedValue(mockMasterItem);

      const result = await getTestTypeMaster('100', '1');

      expect(result).not.toBeNull();
      expect(result?.code).toBe('FUNCTIONAL');
    });

    it('should return null if not found', async () => {
      mockPrisma.testTypeMaster.findFirst.mockResolvedValue(null);

      const result = await getTestTypeMaster('100', '999');

      expect(result).toBeNull();
    });
  });

  describe('createTestTypeMaster', () => {
    it('should create a test type', async () => {
      mockPrisma.testTypeMaster.create.mockResolvedValue(mockMasterItem);

      const result = await createTestTypeMaster('100', {
        code: 'functional',
        name: '機能テスト',
        description: 'テストの説明',
        sortOrder: 1,
        isActive: true,
        isDefault: true,
      });

      expect(result.code).toBe('FUNCTIONAL');
      expect(mockPrisma.testTypeMaster.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: BigInt(100),
          code: 'FUNCTIONAL', // should be uppercased
          name: '機能テスト',
        }),
      });
    });
  });

  describe('updateTestTypeMaster', () => {
    it('should update a test type', async () => {
      mockPrisma.testTypeMaster.update.mockResolvedValue({
        ...mockMasterItem,
        name: '更新後の名前',
      });

      const result = await updateTestTypeMaster('100', '1', { name: '更新後の名前' });

      expect(result.name).toBe('更新後の名前');
    });
  });

  describe('deleteTestTypeMaster', () => {
    it('should delete a test type', async () => {
      mockPrisma.testTypeMaster.delete.mockResolvedValue(mockMasterItem);

      await deleteTestTypeMaster('100', '1');

      expect(mockPrisma.testTypeMaster.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1), projectId: BigInt(100) },
      });
    });
  });

  describe('getTestTechniqueMasters', () => {
    it('should return all test techniques for a project', async () => {
      mockPrisma.testTechniqueMaster.findMany.mockResolvedValue([mockMasterItem]);
      mockPrisma.testTechniqueMaster.count.mockResolvedValue(1);

      const result = await getTestTechniqueMasters('100');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getTestPerspectives', () => {
    it('should return all test perspectives for a project', async () => {
      mockPrisma.testPerspective.findMany.mockResolvedValue([mockMasterItem]);
      mockPrisma.testPerspective.count.mockResolvedValue(1);

      const result = await getTestPerspectives('100');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getMasterItems (generic)', () => {
    it('should call getTestTypeMasters for testType', async () => {
      mockPrisma.testTypeMaster.findMany.mockResolvedValue([mockMasterItem]);
      mockPrisma.testTypeMaster.count.mockResolvedValue(1);

      await getMasterItems('100', 'testType');

      expect(mockPrisma.testTypeMaster.findMany).toHaveBeenCalled();
    });

    it('should call getTestTechniqueMasters for testTechnique', async () => {
      mockPrisma.testTechniqueMaster.findMany.mockResolvedValue([mockMasterItem]);
      mockPrisma.testTechniqueMaster.count.mockResolvedValue(1);

      await getMasterItems('100', 'testTechnique');

      expect(mockPrisma.testTechniqueMaster.findMany).toHaveBeenCalled();
    });

    it('should call getTestPerspectives for testPerspective', async () => {
      mockPrisma.testPerspective.findMany.mockResolvedValue([mockMasterItem]);
      mockPrisma.testPerspective.count.mockResolvedValue(1);

      await getMasterItems('100', 'testPerspective');

      expect(mockPrisma.testPerspective.findMany).toHaveBeenCalled();
    });
  });

  describe('getMasterItem (generic)', () => {
    it('should call getTestTypeMaster for testType', async () => {
      mockPrisma.testTypeMaster.findFirst.mockResolvedValue(mockMasterItem);

      await getMasterItem('100', 'testType', '1');

      expect(mockPrisma.testTypeMaster.findFirst).toHaveBeenCalled();
    });
  });

  describe('createMasterItem (generic)', () => {
    it('should call createTestTypeMaster for testType', async () => {
      mockPrisma.testTypeMaster.create.mockResolvedValue(mockMasterItem);

      await createMasterItem('100', 'testType', { code: 'TEST', name: 'テスト' });

      expect(mockPrisma.testTypeMaster.create).toHaveBeenCalled();
    });
  });

  describe('updateMasterItem (generic)', () => {
    it('should call updateTestTypeMaster for testType', async () => {
      mockPrisma.testTypeMaster.update.mockResolvedValue(mockMasterItem);

      await updateMasterItem('100', 'testType', '1', { name: '更新' });

      expect(mockPrisma.testTypeMaster.update).toHaveBeenCalled();
    });
  });

  describe('deleteMasterItem (generic)', () => {
    it('should call deleteTestTypeMaster for testType', async () => {
      mockPrisma.testTypeMaster.delete.mockResolvedValue(mockMasterItem);

      await deleteMasterItem('100', 'testType', '1');

      expect(mockPrisma.testTypeMaster.delete).toHaveBeenCalled();
    });
  });

  describe('hasTestTypeMasters', () => {
    it('should return true if test types exist', async () => {
      mockPrisma.testTypeMaster.count.mockResolvedValue(3);

      const result = await hasTestTypeMasters('100');

      expect(result).toBe(true);
    });

    it('should return false if no test types exist', async () => {
      mockPrisma.testTypeMaster.count.mockResolvedValue(0);

      const result = await hasTestTypeMasters('100');

      expect(result).toBe(false);
    });
  });

  describe('initializeTestTypeMasters', () => {
    it('should create default test types if none exist', async () => {
      mockPrisma.testTypeMaster.count.mockResolvedValue(0);
      mockPrisma.testTypeMaster.createMany.mockResolvedValue({ count: 7 });

      await initializeTestTypeMasters('100');

      expect(mockPrisma.testTypeMaster.createMany).toHaveBeenCalled();
    });

    it('should not create test types if already exist', async () => {
      mockPrisma.testTypeMaster.count.mockResolvedValue(3);

      await initializeTestTypeMasters('100');

      expect(mockPrisma.testTypeMaster.createMany).not.toHaveBeenCalled();
    });
  });

  describe('initializeTestTechniqueMasters', () => {
    it('should create default test techniques if none exist', async () => {
      mockPrisma.testTechniqueMaster.count.mockResolvedValue(0);
      mockPrisma.testTechniqueMaster.createMany.mockResolvedValue({ count: 7 });

      await initializeTestTechniqueMasters('100');

      expect(mockPrisma.testTechniqueMaster.createMany).toHaveBeenCalled();
    });
  });

  describe('initializeTestPerspectives', () => {
    it('should create default test perspectives if none exist', async () => {
      mockPrisma.testPerspective.count.mockResolvedValue(0);
      mockPrisma.testPerspective.createMany.mockResolvedValue({ count: 9 });

      await initializeTestPerspectives('100');

      expect(mockPrisma.testPerspective.createMany).toHaveBeenCalled();
    });
  });

  describe('initializeAllMasters', () => {
    it('should initialize all master types', async () => {
      mockPrisma.testTypeMaster.count.mockResolvedValue(0);
      mockPrisma.testTechniqueMaster.count.mockResolvedValue(0);
      mockPrisma.testPerspective.count.mockResolvedValue(0);
      mockPrisma.testTypeMaster.createMany.mockResolvedValue({ count: 7 });
      mockPrisma.testTechniqueMaster.createMany.mockResolvedValue({ count: 7 });
      mockPrisma.testPerspective.createMany.mockResolvedValue({ count: 9 });

      await initializeAllMasters('100');

      expect(mockPrisma.testTypeMaster.createMany).toHaveBeenCalled();
      expect(mockPrisma.testTechniqueMaster.createMany).toHaveBeenCalled();
      expect(mockPrisma.testPerspective.createMany).toHaveBeenCalled();
    });
  });
});
