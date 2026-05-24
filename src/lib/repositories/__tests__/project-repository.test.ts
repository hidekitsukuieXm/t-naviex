import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  createProject,
  getProjectById,
  getProjects,
  getAllProjects,
  updateProject,
  deleteProject,
  isProjectNameTaken,
} from '../project-repository';

const mockPrisma = vi.mocked(prisma);

describe('Project Repository', () => {
  const mockDbProject = {
    id: BigInt(1),
    name: 'Test Project',
    description: 'Test description',
    status: 'ACTIVE',
    projectType: 'web',
    targetVersion: '1.0.0',
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-02T12:00:00Z'),
  };

  const mockDbProjectWithCount = {
    ...mockDbProject,
    _count: {
      projectMembers: 5,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      mockPrisma.project.create.mockResolvedValueOnce(mockDbProject);

      const result = await createProject({
        name: 'Test Project',
        description: 'Test description',
        status: 'ACTIVE',
        projectType: 'web',
        targetVersion: '1.0.0',
      });

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Project',
          description: 'Test description',
          status: 'ACTIVE',
          projectType: 'web',
          targetVersion: '1.0.0',
        },
        select: expect.any(Object),
      });
      expect(result.id).toBe('1');
      expect(result.name).toBe('Test Project');
      expect(result.status).toBe('ACTIVE');
    });

    it('should create project with default status when not provided', async () => {
      mockPrisma.project.create.mockResolvedValueOnce(mockDbProject);

      await createProject({
        name: 'Test Project',
      });

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Project',
          description: null,
          status: 'ACTIVE',
          projectType: null,
          targetVersion: null,
        },
        select: expect.any(Object),
      });
    });

    it('should trim whitespace from name', async () => {
      mockPrisma.project.create.mockResolvedValueOnce(mockDbProject);

      await createProject({
        name: '  Test Project  ',
      });

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Project',
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('getProjectById', () => {
    it('should return project when found', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockDbProjectWithCount);

      const result = await getProjectById(BigInt(1));

      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        select: expect.objectContaining({
          id: true,
          name: true,
          _count: expect.any(Object),
        }),
      });
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('Test Project');
      expect(result?._count.projectMembers).toBe(5);
    });

    it('should return null when project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      const result = await getProjectById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getProjects', () => {
    it('should return paginated projects', async () => {
      mockPrisma.project.count.mockResolvedValueOnce(50);
      mockPrisma.project.findMany.mockResolvedValueOnce([mockDbProjectWithCount]);

      const result = await getProjects({ page: 1, limit: 20 });

      expect(mockPrisma.project.count).toHaveBeenCalled();
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { updatedAt: 'desc' },
      });
      expect(result.projects).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(3);
    });

    it('should filter by status', async () => {
      mockPrisma.project.count.mockResolvedValueOnce(10);
      mockPrisma.project.findMany.mockResolvedValueOnce([mockDbProjectWithCount]);

      await getProjects({ status: 'ACTIVE' });

      expect(mockPrisma.project.count).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
    });

    it('should filter by projectType', async () => {
      mockPrisma.project.count.mockResolvedValueOnce(10);
      mockPrisma.project.findMany.mockResolvedValueOnce([mockDbProjectWithCount]);

      await getProjects({ projectType: 'web' });

      expect(mockPrisma.project.count).toHaveBeenCalledWith({
        where: { projectType: 'web' },
      });
    });

    it('should search by query', async () => {
      mockPrisma.project.count.mockResolvedValueOnce(10);
      mockPrisma.project.findMany.mockResolvedValueOnce([mockDbProjectWithCount]);

      await getProjects({ query: 'test' });

      expect(mockPrisma.project.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('should sort by specified field', async () => {
      mockPrisma.project.count.mockResolvedValueOnce(10);
      mockPrisma.project.findMany.mockResolvedValueOnce([mockDbProjectWithCount]);

      await getProjects({ sortBy: 'name', sortOrder: 'asc' });

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects without pagination', async () => {
      mockPrisma.project.findMany.mockResolvedValueOnce([mockDbProjectWithCount]);

      const result = await getAllProjects();

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        orderBy: { updatedAt: 'desc' },
        select: expect.any(Object),
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('updateProject', () => {
    it('should update project when found', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockDbProject);
      mockPrisma.project.update.mockResolvedValueOnce({
        ...mockDbProject,
        name: 'Updated Project',
      });

      const result = await updateProject(BigInt(1), {
        name: 'Updated Project',
      });

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { name: 'Updated Project' },
        select: expect.any(Object),
      });
      expect(result?.name).toBe('Updated Project');
    });

    it('should return null when project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      const result = await updateProject(BigInt(999), {
        name: 'Updated Project',
      });

      expect(result).toBeNull();
      expect(mockPrisma.project.update).not.toHaveBeenCalled();
    });

    it('should update multiple fields', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockDbProject);
      mockPrisma.project.update.mockResolvedValueOnce({
        ...mockDbProject,
        name: 'Updated',
        description: 'New desc',
        status: 'INACTIVE',
      });

      await updateProject(BigInt(1), {
        name: 'Updated',
        description: 'New desc',
        status: 'INACTIVE',
      });

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          name: 'Updated',
          description: 'New desc',
          status: 'INACTIVE',
        },
        select: expect.any(Object),
      });
    });
  });

  describe('deleteProject', () => {
    it('should delete project when found', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        _count: { projectMembers: 0 },
      });

      const result = await deleteProject(BigInt(1));

      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
      expect(result.success).toBe(true);
    });

    it('should return error when project not found', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      const result = await deleteProject(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toBe('プロジェクトが見つかりません。');
      expect(mockPrisma.project.delete).not.toHaveBeenCalled();
    });

    it('should delete project with members (cascade)', async () => {
      mockPrisma.project.findUnique.mockResolvedValueOnce({
        id: BigInt(1),
        _count: { projectMembers: 5 },
      });

      const result = await deleteProject(BigInt(1));

      expect(mockPrisma.project.delete).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('isProjectNameTaken', () => {
    it('should return false when name is not taken', async () => {
      mockPrisma.project.findFirst.mockResolvedValueOnce(null);

      const result = await isProjectNameTaken('New Project');

      expect(result).toBe(false);
    });

    it('should return true when name is taken', async () => {
      mockPrisma.project.findFirst.mockResolvedValueOnce({
        id: BigInt(1),
      });

      const result = await isProjectNameTaken('Existing Project');

      expect(result).toBe(true);
    });

    it('should return false when name is taken by excluded id', async () => {
      mockPrisma.project.findFirst.mockResolvedValueOnce({
        id: BigInt(1),
      });

      const result = await isProjectNameTaken('Existing Project', BigInt(1));

      expect(result).toBe(false);
    });

    it('should return true when name is taken by different id', async () => {
      mockPrisma.project.findFirst.mockResolvedValueOnce({
        id: BigInt(2),
      });

      const result = await isProjectNameTaken('Existing Project', BigInt(1));

      expect(result).toBe(true);
    });
  });
});
