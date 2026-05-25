import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTask,
  getTaskById,
  getTasks,
  updateTask,
  deleteTask,
  updateTaskSortOrders,
  moveTask,
  projectExists,
  taskExistsInProject,
  userExists,
  parentTaskExistsInProject,
  checkCircularReference,
  getTaskCount,
  getChildTasks,
} from '../task-repository';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
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
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as unknown as {
  task: {
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
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('Task Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDbTask = {
    id: BigInt(1),
    projectId: BigInt(100),
    parentId: null,
    title: 'Test Task',
    description: 'Task description',
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    assigneeId: BigInt(10),
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-15'),
    progress: 0,
    sortOrder: 0,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockDbTaskWithRelations = {
    ...mockDbTask,
    assignee: {
      id: BigInt(10),
      name: 'Test User',
      email: 'test@example.com',
    },
    children: [],
    parent: null,
  };

  describe('createTask', () => {
    it('should create a task', async () => {
      mockPrisma.task.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
      mockPrisma.task.create.mockResolvedValue(mockDbTask);

      const result = await createTask({
        projectId: '100',
        title: 'Test Task',
        description: 'Task description',
        startDate: '2024-01-01',
        endDate: '2024-01-15',
      });

      expect(result.title).toBe('Test Task');
      expect(result.projectId).toBe('100');
      expect(result.status).toBe('NOT_STARTED');
      expect(mockPrisma.task.create).toHaveBeenCalled();
    });

    it('should calculate sort order if not provided', async () => {
      mockPrisma.task.aggregate.mockResolvedValue({ _max: { sortOrder: 3 } });
      mockPrisma.task.create.mockResolvedValue({ ...mockDbTask, sortOrder: 4 });

      await createTask({
        projectId: '100',
        title: 'Test Task',
      });

      expect(mockPrisma.task.aggregate).toHaveBeenCalled();
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 4,
          }),
        })
      );
    });

    it('should use provided sort order', async () => {
      mockPrisma.task.create.mockResolvedValue({ ...mockDbTask, sortOrder: 10 });

      await createTask({
        projectId: '100',
        title: 'Test Task',
        sortOrder: 10,
      });

      expect(mockPrisma.task.aggregate).not.toHaveBeenCalled();
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 10,
          }),
        })
      );
    });

    it('should set parent task', async () => {
      mockPrisma.task.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      mockPrisma.task.create.mockResolvedValue({ ...mockDbTask, parentId: BigInt(2) });

      await createTask({
        projectId: '100',
        title: 'Sub Task',
        parentId: '2',
      });

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parentId: BigInt(2),
          }),
        })
      );
    });
  });

  describe('getTaskById', () => {
    it('should return task with relations', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockDbTaskWithRelations);

      const result = await getTaskById(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Test Task');
      expect(result?.assignee?.name).toBe('Test User');
    });

    it('should return null if not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await getTaskById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getTasks', () => {
    it('should return tasks for project', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockDbTask]);

      const result = await getTasks('100');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Task');
    });

    it('should filter by status', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await getTasks('100', { status: 'COMPLETED' });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });

    it('should filter by priority', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await getTasks('100', { priority: 'HIGH' });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'HIGH',
          }),
        })
      );
    });

    it('should filter by query', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await getTasks('100', { query: 'test' });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ title: { contains: 'test', mode: 'insensitive' } }],
          }),
        })
      );
    });

    it('should filter root only', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      await getTasks('100', { rootOnly: true });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: null,
          }),
        })
      );
    });
  });

  describe('updateTask', () => {
    it('should update task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockDbTask);
      mockPrisma.task.update.mockResolvedValue({
        ...mockDbTask,
        title: 'Updated Task',
        status: 'IN_PROGRESS',
      });

      const result = await updateTask(BigInt(1), {
        title: 'Updated Task',
        status: 'IN_PROGRESS',
      });

      expect(result?.title).toBe('Updated Task');
      expect(result?.status).toBe('IN_PROGRESS');
    });

    it('should return null if task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await updateTask(BigInt(999), { title: 'Updated' });

      expect(result).toBeNull();
    });

    it('should set progress to 100 when status changes to COMPLETED', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockDbTask);
      mockPrisma.task.update.mockResolvedValue({
        ...mockDbTask,
        status: 'COMPLETED',
        progress: 100,
      });

      await updateTask(BigInt(1), { status: 'COMPLETED' });

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            progress: 100,
          }),
        })
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockDbTask);
      mockPrisma.task.delete.mockResolvedValue(mockDbTask);

      const result = await deleteTask(BigInt(1));

      expect(result.success).toBe(true);
      expect(mockPrisma.task.delete).toHaveBeenCalled();
    });

    it('should return error if task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await deleteTask(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toContain('見つかりません');
    });
  });

  describe('updateTaskSortOrders', () => {
    it('should update sort orders', async () => {
      const updates = [
        { id: '1', sortOrder: 0 },
        { id: '2', sortOrder: 1 },
      ];

      mockPrisma.$transaction.mockResolvedValue([
        { ...mockDbTask, id: BigInt(1), sortOrder: 0 },
        { ...mockDbTask, id: BigInt(2), sortOrder: 1 },
      ]);

      const result = await updateTaskSortOrders('100', updates);

      expect(result).toHaveLength(2);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('moveTask', () => {
    it('should move task to new parent', async () => {
      mockPrisma.task.findUnique
        .mockResolvedValueOnce({ id: BigInt(1), projectId: BigInt(100) })
        .mockResolvedValueOnce({ id: BigInt(2), parentId: null });
      mockPrisma.task.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      mockPrisma.task.update.mockResolvedValue({ ...mockDbTask, parentId: BigInt(2) });

      const result = await moveTask(BigInt(1), BigInt(2));

      expect(result).not.toBeNull();
      expect(result?.parentId).toBe('2');
    });

    it('should return null if task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await moveTask(BigInt(999), BigInt(2));

      expect(result).toBeNull();
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

  describe('taskExistsInProject', () => {
    it('should return true if task exists in project', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockDbTask);

      const result = await taskExistsInProject(BigInt(100), BigInt(1));

      expect(result).toBe(true);
    });

    it('should return false if task not in project', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      const result = await taskExistsInProject(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('userExists', () => {
    it('should return true if user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: BigInt(10) });

      const result = await userExists(BigInt(10));

      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userExists(BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('parentTaskExistsInProject', () => {
    it('should return true if parent exists', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockDbTask);

      const result = await parentTaskExistsInProject(BigInt(100), BigInt(1));

      expect(result).toBe(true);
    });

    it('should return false if parent not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);

      const result = await parentTaskExistsInProject(BigInt(100), BigInt(999));

      expect(result).toBe(false);
    });
  });

  describe('checkCircularReference', () => {
    it('should return true if setting self as parent', async () => {
      const result = await checkCircularReference(BigInt(1), BigInt(1));

      expect(result).toBe(true);
    });

    it('should return true if circular reference detected', async () => {
      // Task 1 -> Task 2 (parent) -> Task 1 would be circular
      // We need to mock two findUnique calls:
      // 1. Find Task 2: returns { id: 2, parentId: 1 }
      // 2. Find Task 1: returns { id: 1, parentId: null } - this is the task we're moving
      mockPrisma.task.findUnique
        .mockResolvedValueOnce({ id: BigInt(2), parentId: BigInt(1) })
        .mockResolvedValueOnce({ id: BigInt(1), parentId: null });

      const result = await checkCircularReference(BigInt(1), BigInt(2));

      expect(result).toBe(true);
    });

    it('should return false if no circular reference', async () => {
      mockPrisma.task.findUnique.mockResolvedValueOnce({ id: BigInt(2), parentId: null });

      const result = await checkCircularReference(BigInt(1), BigInt(2));

      expect(result).toBe(false);
    });
  });

  describe('getTaskCount', () => {
    it('should return count of tasks', async () => {
      mockPrisma.task.count.mockResolvedValue(5);

      const result = await getTaskCount(BigInt(100));

      expect(result).toBe(5);
    });

    it('should filter by status', async () => {
      mockPrisma.task.count.mockResolvedValue(2);

      await getTaskCount(BigInt(100), 'COMPLETED');

      expect(mockPrisma.task.count).toHaveBeenCalledWith({
        where: {
          projectId: BigInt(100),
          status: 'COMPLETED',
        },
      });
    });
  });

  describe('getChildTasks', () => {
    it('should return child tasks', async () => {
      mockPrisma.task.findMany.mockResolvedValue([
        { ...mockDbTask, id: BigInt(2), parentId: BigInt(1) },
        { ...mockDbTask, id: BigInt(3), parentId: BigInt(1) },
      ]);

      const result = await getChildTasks(BigInt(1));

      expect(result).toHaveLength(2);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parentId: BigInt(1) },
        })
      );
    });
  });
});
