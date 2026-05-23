import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    projectMember: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { POST } from '../[id]/copy/route';

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe('Project Copy API', () => {
  const mockSession = {
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockSourceProject = {
    id: BigInt(1),
    name: 'Source Project',
    description: 'Source description',
    status: 'ACTIVE',
    projectType: 'web',
    targetVersion: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    projectMembers: [
      { userId: BigInt(2), roleId: BigInt(1) },
      { userId: BigInt(3), roleId: BigInt(2) },
    ],
  };

  const mockNewProject = {
    id: BigInt(10),
    name: 'Copied Project',
    description: 'Source description',
    status: 'PLANNING',
    projectType: 'web',
    targetVersion: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/projects/[id]/copy', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/copy', {
        method: 'POST',
        body: JSON.stringify({ newName: 'New Project' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when source project not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/999/copy', {
        method: 'POST',
        body: JSON.stringify({ newName: 'New Project' }),
      });
      const params = Promise.resolve({ id: '999' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('コピー元プロジェクトが見つかりません。');
    });

    it('should return 400 when newName is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockSourceProject);

      const request = new Request('http://localhost/api/projects/1/copy', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('新しいプロジェクト名は必須です。');
    });

    it('should return 400 when newName is empty', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockSourceProject);

      const request = new Request('http://localhost/api/projects/1/copy', {
        method: 'POST',
        body: JSON.stringify({ newName: '   ' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('新しいプロジェクト名は必須です。');
    });

    it('should return 400 when newName exceeds 255 characters', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockSourceProject);

      const longName = 'a'.repeat(256);
      const request = new Request('http://localhost/api/projects/1/copy', {
        method: 'POST',
        body: JSON.stringify({ newName: longName }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('プロジェクト名は255文字以内で入力してください。');
    });

    it('should copy project without members by default', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce({
        ...mockSourceProject,
        projectMembers: false,
      });
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback({
          project: {
            create: vi.fn().mockResolvedValueOnce(mockNewProject),
          },
          projectMember: {
            createMany: vi.fn(),
          },
        });
      });

      const request = new Request('http://localhost/api/projects/1/copy', {
        method: 'POST',
        body: JSON.stringify({ newName: 'Copied Project' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.project.name).toBe('Copied Project');
      expect(data.copiedItems.members).toBe(0);
    });

    it('should copy project with members when copyMembers is true', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockSourceProject);
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        const mockTx = {
          project: {
            create: vi.fn().mockResolvedValueOnce(mockNewProject),
          },
          projectMember: {
            createMany: vi.fn().mockResolvedValueOnce({ count: 2 }),
          },
        };
        return callback(mockTx);
      });

      const request = new Request('http://localhost/api/projects/1/copy', {
        method: 'POST',
        body: JSON.stringify({ newName: 'Copied Project', copyMembers: true }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.copiedItems.members).toBe(2);
    });

    it('should copy project without description when copyDescription is false', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce({
        ...mockSourceProject,
        projectMembers: false,
      });

      const newProjectWithoutDescription = {
        ...mockNewProject,
        description: null,
      };

      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback({
          project: {
            create: vi.fn().mockResolvedValueOnce(newProjectWithoutDescription),
          },
          projectMember: {
            createMany: vi.fn(),
          },
        });
      });

      const request = new Request('http://localhost/api/projects/1/copy', {
        method: 'POST',
        body: JSON.stringify({ newName: 'Copied Project', copyDescription: false }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.project.description).toBeNull();
    });

    it('should use custom status when newStatus is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce({
        ...mockSourceProject,
        projectMembers: false,
      });

      const newProjectWithCustomStatus = {
        ...mockNewProject,
        status: 'ACTIVE',
      };

      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback({
          project: {
            create: vi.fn().mockResolvedValueOnce(newProjectWithCustomStatus),
          },
          projectMember: {
            createMany: vi.fn(),
          },
        });
      });

      const request = new Request('http://localhost/api/projects/1/copy', {
        method: 'POST',
        body: JSON.stringify({ newName: 'Copied Project', newStatus: 'ACTIVE' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.project.status).toBe('ACTIVE');
    });

    it('should include sourceProjectId in response', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce({
        ...mockSourceProject,
        projectMembers: false,
      });
      mockPrisma.$transaction.mockImplementationOnce(async (callback) => {
        return callback({
          project: {
            create: vi.fn().mockResolvedValueOnce(mockNewProject),
          },
          projectMember: {
            createMany: vi.fn(),
          },
        });
      });

      const request = new Request('http://localhost/api/projects/1/copy', {
        method: 'POST',
        body: JSON.stringify({ newName: 'Copied Project' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.sourceProjectId).toBe('1');
    });
  });
});
