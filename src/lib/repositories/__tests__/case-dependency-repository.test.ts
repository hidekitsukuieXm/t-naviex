/**
 * テストケース依存関係リポジトリのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCaseDependencies,
  getCaseDependents,
  createCaseDependency,
  updateCaseDependency,
  deleteCaseDependency,
  deleteAllCaseDependencies,
  testCaseExists,
  dependencyExists,
  checkCircularDependency,
  testCaseBelongsToSpec,
} from '../case-dependency-repository';
import { prisma } from '@/lib/prisma';

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    caseDependency: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    testCase: {
      count: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma);

describe('CaseDependency Repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getCaseDependencies', () => {
    it('should return case dependencies', async () => {
      const mockDeps = [
        {
          id: BigInt(1),
          testCaseId: BigInt(1),
          dependsOnId: BigInt(2),
          dependencyType: 'REQUIRES',
          description: 'Test description',
          createdAt: new Date('2024-01-01'),
          dependsOn: {
            id: BigInt(2),
            title: 'Dependency Case',
            priority: 'HIGH',
          },
        },
      ];

      mockPrisma.caseDependency.findMany.mockResolvedValue(mockDeps);

      const result = await getCaseDependencies(BigInt(1));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].dependsOnId).toBe('2');
      expect(result[0].dependencyType).toBe('REQUIRES');
      expect(result[0].dependsOn.title).toBe('Dependency Case');
    });
  });

  describe('getCaseDependents', () => {
    it('should return cases that depend on the given case', async () => {
      const mockDeps = [
        {
          id: BigInt(1),
          testCaseId: BigInt(2),
          dependsOnId: BigInt(1),
          dependencyType: 'BLOCKS',
          description: null,
          createdAt: new Date('2024-01-01'),
          testCase: {
            id: BigInt(2),
            title: 'Dependent Case',
            priority: 'MEDIUM',
          },
        },
      ];

      mockPrisma.caseDependency.findMany.mockResolvedValue(mockDeps);

      const result = await getCaseDependents(BigInt(1));

      expect(result).toHaveLength(1);
      expect(result[0].testCaseId).toBe('2');
      expect(result[0].dependsOnId).toBe('1');
    });
  });

  describe('createCaseDependency', () => {
    it('should create a case dependency', async () => {
      const mockDep = {
        id: BigInt(1),
        testCaseId: BigInt(1),
        dependsOnId: BigInt(2),
        dependencyType: 'REQUIRES',
        description: 'New dependency',
        createdAt: new Date('2024-01-01'),
      };

      mockPrisma.caseDependency.create.mockResolvedValue(mockDep);

      const result = await createCaseDependency({
        testCaseId: '1',
        dependsOnId: '2',
        dependencyType: 'REQUIRES',
        description: 'New dependency',
      });

      expect(result.id).toBe('1');
      expect(result.testCaseId).toBe('1');
      expect(result.dependsOnId).toBe('2');
      expect(mockPrisma.caseDependency.create).toHaveBeenCalled();
    });
  });

  describe('updateCaseDependency', () => {
    it('should update a case dependency', async () => {
      const mockDep = {
        id: BigInt(1),
        testCaseId: BigInt(1),
        dependsOnId: BigInt(2),
        dependencyType: 'BLOCKS',
        description: 'Updated description',
        createdAt: new Date('2024-01-01'),
      };

      mockPrisma.caseDependency.findUnique.mockResolvedValue(mockDep);
      mockPrisma.caseDependency.update.mockResolvedValue(mockDep);

      const result = await updateCaseDependency(BigInt(1), {
        dependencyType: 'BLOCKS',
        description: 'Updated description',
      });

      expect(result?.dependencyType).toBe('BLOCKS');
      expect(mockPrisma.caseDependency.update).toHaveBeenCalled();
    });

    it('should return null if dependency not found', async () => {
      mockPrisma.caseDependency.findUnique.mockResolvedValue(null);

      const result = await updateCaseDependency(BigInt(999), {
        dependencyType: 'BLOCKS',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteCaseDependency', () => {
    it('should delete a case dependency', async () => {
      const mockDep = {
        id: BigInt(1),
        testCaseId: BigInt(1),
        dependsOnId: BigInt(2),
        dependencyType: 'REQUIRES',
        description: null,
        createdAt: new Date('2024-01-01'),
      };

      mockPrisma.caseDependency.findUnique.mockResolvedValue(mockDep);
      mockPrisma.caseDependency.delete.mockResolvedValue(mockDep);

      const result = await deleteCaseDependency(BigInt(1));

      expect(result).toBe(true);
      expect(mockPrisma.caseDependency.delete).toHaveBeenCalled();
    });

    it('should return false if dependency not found', async () => {
      mockPrisma.caseDependency.findUnique.mockResolvedValue(null);

      const result = await deleteCaseDependency(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('deleteAllCaseDependencies', () => {
    it('should delete all dependencies for a test case', async () => {
      mockPrisma.caseDependency.deleteMany.mockResolvedValue({ count: 3 });

      const result = await deleteAllCaseDependencies(BigInt(1));

      expect(result).toBe(3);
    });
  });

  describe('testCaseExists', () => {
    it('should return true if test case exists', async () => {
      mockPrisma.testCase.count.mockResolvedValue(1);

      const result = await testCaseExists(BigInt(1));

      expect(result).toBe(true);
    });

    it('should return false if test case not found', async () => {
      mockPrisma.testCase.count.mockResolvedValue(0);

      const result = await testCaseExists(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('dependencyExists', () => {
    it('should return true if dependency exists', async () => {
      mockPrisma.caseDependency.count.mockResolvedValue(1);

      const result = await dependencyExists(BigInt(1), BigInt(2));

      expect(result).toBe(true);
    });

    it('should return false if dependency not found', async () => {
      mockPrisma.caseDependency.count.mockResolvedValue(0);

      const result = await dependencyExists(BigInt(1), BigInt(2));

      expect(result).toBe(false);
    });
  });

  describe('checkCircularDependency', () => {
    it('should return false when no circular dependency exists', async () => {
      // Case 1 -> Case 2 (we want to add Case 1 -> Case 3)
      // No cycle exists
      mockPrisma.caseDependency.findMany
        .mockResolvedValueOnce([]) // Case 3 has no dependencies
        .mockResolvedValue([]);

      const result = await checkCircularDependency(BigInt(1), BigInt(3));

      expect(result).toBe(false);
    });

    it('should return true when circular dependency would be created', async () => {
      // Case 2 -> Case 1 (we want to add Case 1 -> Case 2)
      // This would create: Case 1 -> Case 2 -> Case 1 (cycle!)
      mockPrisma.caseDependency.findMany.mockResolvedValueOnce([
        { dependsOnId: BigInt(1) }, // Case 2 depends on Case 1
      ]);

      const result = await checkCircularDependency(BigInt(1), BigInt(2));

      expect(result).toBe(true);
    });
  });

  describe('testCaseBelongsToSpec', () => {
    it('should return true if test case belongs to spec', async () => {
      mockPrisma.testCase.count.mockResolvedValue(1);

      const result = await testCaseBelongsToSpec(BigInt(1), BigInt(100));

      expect(result).toBe(true);
    });

    it('should return false if test case does not belong to spec', async () => {
      mockPrisma.testCase.count.mockResolvedValue(0);

      const result = await testCaseBelongsToSpec(BigInt(1), BigInt(100));

      expect(result).toBe(false);
    });
  });
});
