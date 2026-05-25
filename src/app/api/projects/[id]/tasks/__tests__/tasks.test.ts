import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    task: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET, POST } from '../route';
import { GET as GET_TASK, PUT, DELETE } from '../[taskId]/route';

// モック型の作成
const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe('Tasks API', () => {
  const mockSession = {
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockProject = {
    id: BigInt(1),
    name: 'Test Project',
    description: null,
    status: 'ACTIVE',
    projectType: null,
    targetVersion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: BigInt(2),
    name: 'Assignee User',
    email: 'assignee@example.com',
    status: 'ACTIVE',
  };

  const mockTask = {
    id: BigInt(1),
    projectId: BigInt(1),
    parentId: null,
    title: 'Test Task',
    description: 'Task description',
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    assigneeId: BigInt(2),
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    progress: 0,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTaskWithRelations = {
    ...mockTask,
    assignee: {
      id: BigInt(2),
      name: 'Assignee User',
      email: 'assignee@example.com',
    },
    children: [],
    parent: null,
  };

  const mockChildTask = {
    id: BigInt(2),
    projectId: BigInt(1),
    parentId: BigInt(1),
    title: 'Child Task',
    description: 'Child description',
    status: 'NOT_STARTED',
    priority: 'LOW',
    assigneeId: null,
    startDate: null,
    endDate: null,
    progress: 0,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects/[id]/tasks', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/tasks');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when project not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/999/tasks');
      const params = Promise.resolve({ id: '999' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('プロジェクトが見つかりません。');
    });

    it('should return tasks list when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findMany.mockResolvedValueOnce([mockTask]);

      const request = new Request('http://localhost/api/projects/1/tasks');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].title).toBe('Test Task');
    });

    it('should filter tasks by status', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findMany.mockResolvedValueOnce([mockTask]);

      const request = new Request('http://localhost/api/projects/1/tasks?status=NOT_STARTED');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'NOT_STARTED',
          }),
        })
      );
    });

    it('should filter tasks by priority', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findMany.mockResolvedValueOnce([mockTask]);

      const request = new Request('http://localhost/api/projects/1/tasks?priority=HIGH');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'HIGH',
          }),
        })
      );
    });

    it('should filter root tasks only when rootOnly=true', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findMany.mockResolvedValueOnce([mockTask]);

      const request = new Request('http://localhost/api/projects/1/tasks?rootOnly=true');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: null,
          }),
        })
      );
    });
  });

  describe('POST /api/projects/[id]/tasks', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Task' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when title is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);

      const request = new Request('http://localhost/api/projects/1/tasks', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('バリデーションエラー');
    });

    it('should return 400 when title is empty', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);

      const request = new Request('http://localhost/api/projects/1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: '   ' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('バリデーションエラー');
    });

    it('should return 404 when parent task not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Task', parentId: '999' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('親タスクが見つかりません。');
    });

    it('should return 404 when assignee not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Task', assigneeId: '999' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('担当者が見つかりません。');
    });

    it('should create task successfully', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.aggregate.mockResolvedValueOnce({ _max: { sortOrder: 0 } });
      mockPrisma.task.create.mockResolvedValueOnce(mockTask);

      const request = new Request('http://localhost/api/projects/1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          description: 'Task description',
          status: 'NOT_STARTED',
          priority: 'MEDIUM',
        }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('Test Task');
    });

    it('should create task with parent', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findFirst.mockResolvedValueOnce(mockTask);
      mockPrisma.task.aggregate.mockResolvedValueOnce({ _max: { sortOrder: 0 } });
      mockPrisma.task.create.mockResolvedValueOnce(mockChildTask);

      const request = new Request('http://localhost/api/projects/1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Child Task',
          parentId: '1',
        }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.parentId).toBe('1');
    });

    it('should create task with assignee', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.task.aggregate.mockResolvedValueOnce({ _max: { sortOrder: 0 } });
      mockPrisma.task.create.mockResolvedValueOnce(mockTask);

      const request = new Request('http://localhost/api/projects/1/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Task',
          assigneeId: '2',
        }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.assigneeId).toBe('2');
    });
  });

  describe('GET /api/projects/[id]/tasks/[taskId]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/tasks/1');
      const params = Promise.resolve({ id: '1', taskId: '1' });

      const response = await GET_TASK(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when project not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/999/tasks/1');
      const params = Promise.resolve({ id: '999', taskId: '1' });

      const response = await GET_TASK(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('プロジェクトが見つかりません。');
    });

    it('should return 404 when task not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/tasks/999');
      const params = Promise.resolve({ id: '1', taskId: '999' });

      const response = await GET_TASK(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('タスクが見つかりません。');
    });

    it('should return task when found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTaskWithRelations);

      const request = new Request('http://localhost/api/projects/1/tasks/1');
      const params = Promise.resolve({ id: '1', taskId: '1' });

      const response = await GET_TASK(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('1');
      expect(data.title).toBe('Test Task');
      expect(data.assignee.name).toBe('Assignee User');
    });
  });

  describe('PUT /api/projects/[id]/tasks/[taskId]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/tasks/1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Task' }),
      });
      const params = Promise.resolve({ id: '1', taskId: '1' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when task not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/tasks/999', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Task' }),
      });
      const params = Promise.resolve({ id: '1', taskId: '999' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('タスクが見つかりません。');
    });

    it('should update task title successfully', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Task' };

      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findFirst.mockResolvedValueOnce(mockTask);
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockPrisma.task.update.mockResolvedValueOnce(updatedTask);

      const request = new Request('http://localhost/api/projects/1/tasks/1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Task' }),
      });
      const params = Promise.resolve({ id: '1', taskId: '1' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Task');
    });

    it('should update task status to COMPLETED and set progress to 100', async () => {
      const updatedTask = { ...mockTask, status: 'COMPLETED', progress: 100 };

      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findFirst.mockResolvedValueOnce(mockTask);
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockPrisma.task.update.mockResolvedValueOnce(updatedTask);

      const request = new Request('http://localhost/api/projects/1/tasks/1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      const params = Promise.resolve({ id: '1', taskId: '1' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('COMPLETED');
      expect(data.progress).toBe(100);
    });

    it('should return 400 for circular reference when setting parent', async () => {
      // タスク1を親としてタスク1自身に設定しようとする
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findFirst
        .mockResolvedValueOnce(mockTask) // taskExistsInProject
        .mockResolvedValueOnce(mockTask); // parentTaskExistsInProject
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask); // checkCircularReference

      const request = new Request('http://localhost/api/projects/1/tasks/1', {
        method: 'PUT',
        body: JSON.stringify({ parentId: '1' }),
      });
      const params = Promise.resolve({ id: '1', taskId: '1' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('循環参照が発生するため、この親タスクは設定できません。');
    });
  });

  describe('DELETE /api/projects/[id]/tasks/[taskId]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/tasks/1', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1', taskId: '1' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when task not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/tasks/999', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1', taskId: '999' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('タスクが見つかりません。');
    });

    it('should delete task successfully', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.task.findFirst.mockResolvedValueOnce(mockTask);
      mockPrisma.task.findUnique.mockResolvedValueOnce(mockTask);
      mockPrisma.task.delete.mockResolvedValueOnce(mockTask);

      const request = new Request('http://localhost/api/projects/1/tasks/1', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1', taskId: '1' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
