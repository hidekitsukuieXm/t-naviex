import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testSpec: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testSpecVersion: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  createTestSpec,
  getTestSpecById,
  getTestSpecs,
  updateTestSpec,
  deleteTestSpec,
  createTestSpecVersion,
  getTestSpecVersions,
  isTestSpecNameTaken,
  projectExists,
} from '../test-spec-repository';

const mockPrisma = vi.mocked(prisma);

describe('Test Spec Repository', () => {
  const mockDbTestSpec = {
    id: BigInt(1),
    projectId: BigInt(10),
    name: 'Test Spec 1',
    description: 'Test description',
    status: 'DRAFT',
    version: '1.0.0',
    isLocked: false,
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-02T12:00:00Z'),
  };

  const mockDbTestSpecWithCount = {
    ...mockDbTestSpec,
    _count: {
      versions: 1,
    },
  };

  const mockDbTestSpecDetail = {
    ...mockDbTestSpec,
    project: {
      id: BigInt(10),
      name: 'Test Project',
    },
    versions: [
      {
        id: BigInt(100),
        testSpecId: BigInt(1),
        version: '1.0.0',
        changeNote: '初期作成',
        createdBy: BigInt(999),
        createdAt: new Date('2024-01-01T12:00:00Z'),
      },
    ],
  };

  const mockDbVersion = {
    id: BigInt(100),
    testSpecId: BigInt(1),
    version: '1.0.0',
    changeNote: '初期作成',
    createdBy: BigInt(999),
    createdAt: new Date('2024-01-01T12:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTestSpec', () => {
    it('should create a new test spec with initial version', async () => {
      mockPrisma.testSpec.create.mockResolvedValueOnce(mockDbTestSpecWithCount);
      mockPrisma.testSpecVersion.create.mockResolvedValueOnce(mockDbVersion);

      const result = await createTestSpec({
        projectId: '10',
        name: 'Test Spec 1',
        description: 'Test description',
        status: 'DRAFT',
      });

      expect(mockPrisma.testSpec.create).toHaveBeenCalledWith({
        data: {
          projectId: BigInt(10),
          name: 'Test Spec 1',
          description: 'Test description',
          status: 'DRAFT',
          version: '1.0.0',
          isLocked: false,
        },
        select: expect.any(Object),
      });
      expect(mockPrisma.testSpecVersion.create).toHaveBeenCalled();
      expect(result.id).toBe('1');
      expect(result.projectId).toBe('10');
      expect(result.name).toBe('Test Spec 1');
      expect(result.status).toBe('DRAFT');
      expect(result.version).toBe('1.0.0');
    });

    it('should create test spec with default status when not provided', async () => {
      mockPrisma.testSpec.create.mockResolvedValueOnce(mockDbTestSpecWithCount);
      mockPrisma.testSpecVersion.create.mockResolvedValueOnce(mockDbVersion);

      await createTestSpec({
        projectId: '10',
        name: 'Test Spec 1',
      });

      expect(mockPrisma.testSpec.create).toHaveBeenCalledWith({
        data: {
          projectId: BigInt(10),
          name: 'Test Spec 1',
          description: null,
          status: 'DRAFT',
          version: '1.0.0',
          isLocked: false,
        },
        select: expect.any(Object),
      });
    });

    it('should trim whitespace from name', async () => {
      mockPrisma.testSpec.create.mockResolvedValueOnce(mockDbTestSpecWithCount);
      mockPrisma.testSpecVersion.create.mockResolvedValueOnce(mockDbVersion);

      await createTestSpec({
        projectId: '10',
        name: '  Test Spec 1  ',
      });

      expect(mockPrisma.testSpec.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Spec 1',
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('getTestSpecById', () => {
    it('should return test spec detail when found', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce(mockDbTestSpecDetail);

      const result = await getTestSpecById(BigInt(1));

      expect(mockPrisma.testSpec.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        select: expect.any(Object),
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.project?.name).toBe('Test Project');
      expect(result?.versions).toHaveLength(1);
    });

    it('should return null when not found', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce(null);

      const result = await getTestSpecById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getTestSpecs', () => {
    it('should return paginated test specs', async () => {
      mockPrisma.testSpec.count.mockResolvedValueOnce(2);
      mockPrisma.testSpec.findMany.mockResolvedValueOnce([
        mockDbTestSpecWithCount,
        { ...mockDbTestSpecWithCount, id: BigInt(2), name: 'Test Spec 2' },
      ]);

      const result = await getTestSpecs({
        projectId: '10',
        page: 1,
        limit: 20,
      });

      expect(mockPrisma.testSpec.count).toHaveBeenCalled();
      expect(mockPrisma.testSpec.findMany).toHaveBeenCalled();
      expect(result.testSpecs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.testSpec.count.mockResolvedValueOnce(1);
      mockPrisma.testSpec.findMany.mockResolvedValueOnce([mockDbTestSpecWithCount]);

      await getTestSpecs({
        projectId: '10',
        status: 'DRAFT',
      });

      expect(mockPrisma.testSpec.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'DRAFT',
          }),
        })
      );
    });

    it('should filter by search query', async () => {
      mockPrisma.testSpec.count.mockResolvedValueOnce(1);
      mockPrisma.testSpec.findMany.mockResolvedValueOnce([mockDbTestSpecWithCount]);

      await getTestSpecs({
        projectId: '10',
        query: 'search term',
      });

      expect(mockPrisma.testSpec.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('updateTestSpec', () => {
    it('should update test spec', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ id: BigInt(1), isLocked: false });
      mockPrisma.testSpec.update.mockResolvedValueOnce({
        ...mockDbTestSpecWithCount,
        name: 'Updated Name',
      });

      const result = await updateTestSpec(BigInt(1), {
        name: 'Updated Name',
      });

      expect(mockPrisma.testSpec.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: expect.objectContaining({
          name: 'Updated Name',
        }),
        select: expect.any(Object),
      });
      expect(result?.name).toBe('Updated Name');
    });

    it('should return null when test spec not found', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce(null);

      const result = await updateTestSpec(BigInt(999), {
        name: 'Updated Name',
      });

      expect(result).toBeNull();
    });

    it('should throw error when test spec is locked', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ id: BigInt(1), isLocked: true });

      await expect(
        updateTestSpec(BigInt(1), {
          name: 'Updated Name',
        })
      ).rejects.toThrow('ロックされている');
    });

    it('should allow unlocking a locked test spec', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ id: BigInt(1), isLocked: true });
      mockPrisma.testSpec.update.mockResolvedValueOnce({
        ...mockDbTestSpecWithCount,
        isLocked: false,
      });

      const result = await updateTestSpec(BigInt(1), {
        isLocked: false,
      });

      expect(result?.isLocked).toBe(false);
    });
  });

  describe('deleteTestSpec', () => {
    it('should delete test spec successfully', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ id: BigInt(1), isLocked: false });
      mockPrisma.testSpec.delete.mockResolvedValueOnce(mockDbTestSpec);

      const result = await deleteTestSpec(BigInt(1));

      expect(mockPrisma.testSpec.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
      expect(result.success).toBe(true);
    });

    it('should return error when test spec not found', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce(null);

      const result = await deleteTestSpec(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toBe('テスト仕様書が見つかりません。');
    });

    it('should return error when test spec is locked', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({ id: BigInt(1), isLocked: true });

      const result = await deleteTestSpec(BigInt(1));

      expect(result.success).toBe(false);
      expect(result.error).toBe('ロックされているテスト仕様書は削除できません。');
    });
  });

  describe('createTestSpecVersion', () => {
    it('should create a new version', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        isLocked: false,
        version: '1.0.0',
      });
      mockPrisma.$transaction.mockResolvedValueOnce([
        { ...mockDbTestSpecWithCount, version: '1.1.0' },
        { ...mockDbVersion, id: BigInt(101), version: '1.1.0' },
      ]);

      const result = await createTestSpecVersion(BigInt(1), {
        version: '1.1.0',
        changeNote: 'Minor update',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.testSpec.version).toBe('1.1.0');
      expect(result.version.version).toBe('1.1.0');
    });

    it('should throw error when test spec not found', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce(null);

      await expect(
        createTestSpecVersion(BigInt(999), {
          version: '1.1.0',
        })
      ).rejects.toThrow('テスト仕様書が見つかりません。');
    });

    it('should throw error when test spec is locked', async () => {
      mockPrisma.testSpec.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        isLocked: true,
        version: '1.0.0',
      });

      await expect(
        createTestSpecVersion(BigInt(1), {
          version: '1.1.0',
        })
      ).rejects.toThrow('ロックされている');
    });
  });

  describe('getTestSpecVersions', () => {
    it('should return version history', async () => {
      mockPrisma.testSpecVersion.findMany.mockResolvedValueOnce([
        mockDbVersion,
        { ...mockDbVersion, id: BigInt(101), version: '1.1.0' },
      ]);

      const result = await getTestSpecVersions(BigInt(1));

      expect(mockPrisma.testSpecVersion.findMany).toHaveBeenCalledWith({
        where: { testSpecId: BigInt(1) },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('isTestSpecNameTaken', () => {
    it('should return true when name is taken', async () => {
      mockPrisma.testSpec.findFirst.mockResolvedValueOnce({ id: BigInt(2) });

      const result = await isTestSpecNameTaken(BigInt(10), 'Existing Name');

      expect(result).toBe(true);
    });

    it('should return false when name is not taken', async () => {
      mockPrisma.testSpec.findFirst.mockResolvedValueOnce(null);

      const result = await isTestSpecNameTaken(BigInt(10), 'New Name');

      expect(result).toBe(false);
    });

    it('should return false when name belongs to excluded id', async () => {
      mockPrisma.testSpec.findFirst.mockResolvedValueOnce({ id: BigInt(1) });

      const result = await isTestSpecNameTaken(BigInt(10), 'Existing Name', BigInt(1));

      expect(result).toBe(false);
    });
  });

  describe('projectExists', () => {
    it('should return true when project exists', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce({ id: BigInt(10) });

      const result = await projectExists(BigInt(10));

      expect(result).toBe(true);
    });

    it('should return false when project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      const result = await projectExists(BigInt(999));

      expect(result).toBe(false);
    });
  });
});
