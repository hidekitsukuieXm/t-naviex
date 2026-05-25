import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMilestone,
  getMilestoneById,
  getMilestones,
  updateMilestone,
  deleteMilestone,
  updateMilestoneSortOrders,
  projectExists,
  isMilestoneNameTaken,
  milestoneExistsInProject,
  getMilestoneCount,
} from '../milestone-repository';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    milestone: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as unknown as {
  milestone: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  project: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('Milestone Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDbMilestone = {
    id: BigInt(1),
    projectId: BigInt(100),
    name: 'Sprint 1',
    description: 'First sprint',
    status: 'PLANNED',
    startDate: new Date('2024-01-01'),
    dueDate: new Date('2024-01-14'),
    completedAt: null,
    sortOrder: 0,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockDbMilestoneWithProject = {
    ...mockDbMilestone,
    project: {
      id: BigInt(100),
      name: 'Test Project',
    },
  };

  describe('createMilestone', () => {
    it('should create a milestone', async () => {
      mockPrisma.milestone.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
      mockPrisma.milestone.create.mockResolvedValue(mockDbMilestone);

      const result = await createMilestone({
        projectId: '100',
        name: 'Sprint 1',
        description: 'First sprint',
        startDate: '2024-01-01',
        dueDate: '2024-01-14',
      });

      expect(result.name).toBe('Sprint 1');
      expect(result.projectId).toBe('100');
      expect(result.status).toBe('PLANNED');
      expect(mockPrisma.milestone.create).toHaveBeenCalled();
    });

    it('should calculate sort order if not provided', async () => {
      mockPrisma.milestone.aggregate.mockResolvedValue({ _max: { sortOrder: 3 } });
      mockPrisma.milestone.create.mockResolvedValue({ ...mockDbMilestone, sortOrder: 4 });

      await createMilestone({
        projectId: '100',
        name: 'Sprint 1',
      });

      expect(mockPrisma.milestone.aggregate).toHaveBeenCalled();
      expect(mockPrisma.milestone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 4,
          }),
        })
      );
    });

    it('should use provided sort order', async () => {
      mockPrisma.milestone.create.mockResolvedValue({ ...mockDbMilestone, sortOrder: 10 });

      await createMilestone({
        projectId: '100',
        name: 'Sprint 1',
        sortOrder: 10,
      });

      expect(mockPrisma.milestone.aggregate).not.toHaveBeenCalled();
      expect(mockPrisma.milestone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 10,
          }),
        })
      );
    });
  });

  describe('getMilestoneById', () => {
    it('should return milestone with project', async () => {
      mockPrisma.milestone.findUnique.mockResolvedValue(mockDbMilestoneWithProject);

      const result = await getMilestoneById(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Sprint 1');
      expect(result?.project.name).toBe('Test Project');
    });

    it('should return null if not found', async () => {
      mockPrisma.milestone.findUnique.mockResolvedValue(null);

      const result = await getMilestoneById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getMilestones', () => {
    it('should return milestones for project', async () => {
      mockPrisma.milestone.findMany.mockResolvedValue([mockDbMilestone]);

      const result = await getMilestones({ projectId: '100' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sprint 1');
    });

    it('should filter by status', async () => {
      mockPrisma.milestone.findMany.mockResolvedValue([]);

      await getMilestones({ projectId: '100', status: 'COMPLETED' });

      expect(mockPrisma.milestone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should filter by query', async () => {
      mockPrisma.milestone.findMany.mockResolvedValue([]);

      await getMilestones({ projectId: '100', query: 'sprint' });

      expect(mockPrisma.milestone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ name: { contains: 'sprint', mode: 'insensitive' } }],
          }),
        })
      );
    });
  });

  describe('updateMilestone', () => {
    it('should update milestone', async () => {
      mockPrisma.milestone.findUnique.mockResolvedValue(mockDbMilestone);
      mockPrisma.milestone.update.mockResolvedValue({
        ...mockDbMilestone,
        name: 'Updated Sprint',
        status: 'IN_PROGRESS',
      });

      const result = await updateMilestone(BigInt(1), {
        name: 'Updated Sprint',
        status: 'IN_PROGRESS',
      });

      expect(result?.name).toBe('Updated Sprint');
      expect(result?.status).toBe('IN_PROGRESS');
    });

    it('should return null if milestone not found', async () => {
      mockPrisma.milestone.findUnique.mockResolvedValue(null);

      const result = await updateMilestone(BigInt(999), { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should set completedAt when status changes to COMPLETED', async () => {
      mockPrisma.milestone.findUnique.mockResolvedValue(mockDbMilestone);
      mockPrisma.milestone.update.mockResolvedValue({
        ...mockDbMilestone,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      await updateMilestone(BigInt(1), { status: 'COMPLETED' });

      expect(mockPrisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should clear completedAt when status changes from COMPLETED', async () => {
      mockPrisma.milestone.findUnique.mockResolvedValue({
        ...mockDbMilestone,
        status: 'COMPLETED',
      });
      mockPrisma.milestone.update.mockResolvedValue({
        ...mockDbMilestone,
        status: 'IN_PROGRESS',
        completedAt: null,
      });

      await updateMilestone(BigInt(1), { status: 'IN_PROGRESS' });

      expect(mockPrisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            completedAt: null,
          }),
        })
      );
    });
  });

  describe('deleteMilestone', () => {
    it('should delete milestone', async () => {
      mockPrisma.milestone.findUnique.mockResolvedValue(mockDbMilestone);
      mockPrisma.milestone.delete.mockResolvedValue(mockDbMilestone);

      const result = await deleteMilestone(BigInt(1));

      expect(result.success).toBe(true);
      expect(mockPrisma.milestone.delete).toHaveBeenCalled();
    });

    it('should return error if milestone not found', async () => {
      mockPrisma.milestone.findUnique.mockResolvedValue(null);

      const result = await deleteMilestone(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toContain('見つかりません');
    });
  });

  describe('updateMilestoneSortOrders', () => {
    it('should update sort orders', async () => {
      const updates = [
        { id: '1', sortOrder: 0 },
        { id: '2', sortOrder: 1 },
      ];

      mockPrisma.$transaction.mockResolvedValue([
        { ...mockDbMilestone, id: BigInt(1), sortOrder: 0 },
        { ...mockDbMilestone, id: BigInt(2), sortOrder: 1 },
      ]);

      const result = await updateMilestoneSortOrders('100', updates);

      expect(result).toHaveLength(2);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
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

  describe('isMilestoneNameTaken', () => {
    it('should return true if name is taken', async () => {
      mockPrisma.milestone.findFirst.mockResolvedValue(mockDbMilestone);

      const result = await isMilestoneNameTaken(BigInt(100), 'Sprint 1');

      expect(result).toBe(true);
    });

    it('should return false if name is not taken', async () => {
      mockPrisma.milestone.findFirst.mockResolvedValue(null);

      const result = await isMilestoneNameTaken(BigInt(100), 'New Sprint');

      expect(result).toBe(false);
    });

    it('should exclude specific milestone when checking', async () => {
      mockPrisma.milestone.findFirst.mockResolvedValue(null);

      await isMilestoneNameTaken(BigInt(100), 'Sprint 1', BigInt(1));

      expect(mockPrisma.milestone.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: BigInt(1) },
          }),
        })
      );
    });
  });

  describe('milestoneExistsInProject', () => {
    it('should return true if milestone exists in project', async () => {
      mockPrisma.milestone.findFirst.mockResolvedValue(mockDbMilestone);

      const result = await milestoneExistsInProject(BigInt(100), BigInt(1));

      expect(result).toBe(true);
    });

    it('should return false if milestone not in project', async () => {
      mockPrisma.milestone.findFirst.mockResolvedValue(null);

      const result = await milestoneExistsInProject(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('getMilestoneCount', () => {
    it('should return count of milestones', async () => {
      mockPrisma.milestone.count.mockResolvedValue(5);

      const result = await getMilestoneCount(BigInt(100));

      expect(result).toBe(5);
    });

    it('should filter by status', async () => {
      mockPrisma.milestone.count.mockResolvedValue(2);

      await getMilestoneCount(BigInt(100), 'COMPLETED');

      expect(mockPrisma.milestone.count).toHaveBeenCalledWith({
        where: {
          projectId: BigInt(100),
          status: 'COMPLETED',
        },
      });
    });
  });
});
