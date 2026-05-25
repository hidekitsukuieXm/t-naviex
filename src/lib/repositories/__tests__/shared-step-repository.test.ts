import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSharedSteps,
  getSharedStep,
  getSharedStepDetail,
  getSharedStepByName,
  createSharedStep,
  updateSharedStep,
  deleteSharedStep,
  duplicateSharedStep,
  hasSharedSteps,
  getSharedStepUsageCount,
  updateSharedStepSortOrders,
} from '../shared-step-repository';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    sharedStep: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testStep: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = vi.mocked(prisma);

describe('shared-step-repository', () => {
  const mockSharedStep = {
    id: BigInt(1),
    projectId: BigInt(100),
    name: '共有手順1',
    description: '共有手順の説明',
    contentMd: '# 手順\n\n1. ステップ1\n2. ステップ2',
    sortOrder: 1,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockSharedStepWithCount = {
    ...mockSharedStep,
    _count: { testSteps: 5 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSharedSteps', () => {
    it('should return all shared steps for a project', async () => {
      mockPrisma.sharedStep.findMany.mockResolvedValue([mockSharedStep]);
      mockPrisma.sharedStep.count.mockResolvedValue(1);

      const result = await getSharedSteps('100');

      expect(result.sharedSteps).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.sharedSteps[0].name).toBe('共有手順1');
    });
  });

  describe('getSharedStep', () => {
    it('should return a shared step by id', async () => {
      mockPrisma.sharedStep.findFirst.mockResolvedValue(mockSharedStep);

      const result = await getSharedStep('100', '1');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('共有手順1');
    });

    it('should return null if not found', async () => {
      mockPrisma.sharedStep.findFirst.mockResolvedValue(null);

      const result = await getSharedStep('100', '999');

      expect(result).toBeNull();
    });
  });

  describe('getSharedStepDetail', () => {
    it('should return a shared step with usage count', async () => {
      mockPrisma.sharedStep.findFirst.mockResolvedValue(mockSharedStepWithCount);

      const result = await getSharedStepDetail('100', '1');

      expect(result).not.toBeNull();
      expect(result?.usageCount).toBe(5);
    });
  });

  describe('getSharedStepByName', () => {
    it('should return a shared step by name', async () => {
      mockPrisma.sharedStep.findUnique.mockResolvedValue(mockSharedStep);

      const result = await getSharedStepByName('100', '共有手順1');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('共有手順1');
    });
  });

  describe('createSharedStep', () => {
    it('should create a shared step', async () => {
      mockPrisma.sharedStep.create.mockResolvedValue(mockSharedStep);

      const result = await createSharedStep('100', {
        name: '共有手順1',
        description: '共有手順の説明',
        contentMd: '# 手順\n\n1. ステップ1',
        sortOrder: 1,
      });

      expect(result.name).toBe('共有手順1');
      expect(mockPrisma.sharedStep.create).toHaveBeenCalled();
    });
  });

  describe('updateSharedStep', () => {
    it('should update a shared step', async () => {
      mockPrisma.sharedStep.update.mockResolvedValue({
        ...mockSharedStep,
        name: '更新後の共有手順',
      });

      const result = await updateSharedStep('100', '1', { name: '更新後の共有手順' });

      expect(result.name).toBe('更新後の共有手順');
    });
  });

  describe('deleteSharedStep', () => {
    it('should delete a shared step', async () => {
      mockPrisma.sharedStep.delete.mockResolvedValue(mockSharedStep);

      await deleteSharedStep('100', '1');

      expect(mockPrisma.sharedStep.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1), projectId: BigInt(100) },
      });
    });
  });

  describe('duplicateSharedStep', () => {
    it('should duplicate a shared step', async () => {
      mockPrisma.sharedStep.findFirst.mockResolvedValue(mockSharedStep);
      mockPrisma.sharedStep.create.mockResolvedValue({
        ...mockSharedStep,
        id: BigInt(2),
        name: '共有手順1 (コピー)',
      });

      const result = await duplicateSharedStep('100', '1', '共有手順1 (コピー)');

      expect(result.name).toBe('共有手順1 (コピー)');
    });

    it('should throw error if original not found', async () => {
      mockPrisma.sharedStep.findFirst.mockResolvedValue(null);

      await expect(duplicateSharedStep('100', '999', 'コピー')).rejects.toThrow(
        'Shared step not found'
      );
    });
  });

  describe('hasSharedSteps', () => {
    it('should return true if shared steps exist', async () => {
      mockPrisma.sharedStep.count.mockResolvedValue(3);

      const result = await hasSharedSteps('100');

      expect(result).toBe(true);
    });

    it('should return false if no shared steps exist', async () => {
      mockPrisma.sharedStep.count.mockResolvedValue(0);

      const result = await hasSharedSteps('100');

      expect(result).toBe(false);
    });
  });

  describe('getSharedStepUsageCount', () => {
    it('should return usage count', async () => {
      mockPrisma.testStep.count.mockResolvedValue(5);

      const result = await getSharedStepUsageCount('100', '1');

      expect(result).toBe(5);
    });
  });

  describe('updateSharedStepSortOrders', () => {
    it('should update sort orders', async () => {
      mockPrisma.$transaction.mockResolvedValue([mockSharedStep, mockSharedStep]);

      await updateSharedStepSortOrders('100', [
        { id: '1', sortOrder: 10 },
        { id: '2', sortOrder: 20 },
      ]);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
