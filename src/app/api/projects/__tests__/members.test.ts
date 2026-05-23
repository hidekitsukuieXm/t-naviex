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
    projectMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    role: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET, POST } from '../[id]/members/route';
import { PUT, DELETE } from '../[id]/members/[userId]/route';

// モック型の作成
const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe('Project Members API', () => {
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
    name: 'Member User',
    email: 'member@example.com',
    status: 'ACTIVE',
  };

  const mockRole = {
    id: BigInt(1),
    name: 'Developer',
    permissions: {},
  };

  const mockMember = {
    projectId: BigInt(1),
    userId: BigInt(2),
    roleId: BigInt(1),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
    role: mockRole,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects/[id]/members', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/members');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when project not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/999/members');
      const params = Promise.resolve({ id: '999' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('プロジェクトが見つかりません。');
    });

    it('should return members list when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.projectMember.findMany.mockResolvedValueOnce([mockMember]);

      const request = new Request('http://localhost/api/projects/1/members');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].userId).toBe('2');
      expect(data[0].user.name).toBe('Member User');
    });
  });

  describe('POST /api/projects/[id]/members', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/members', {
        method: 'POST',
        body: JSON.stringify({ userId: '2', roleId: '1' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when userId is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);

      const request = new Request('http://localhost/api/projects/1/members', {
        method: 'POST',
        body: JSON.stringify({ roleId: '1' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ユーザーIDは必須です。');
    });

    it('should return 400 when roleId is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);

      const request = new Request('http://localhost/api/projects/1/members', {
        method: 'POST',
        body: JSON.stringify({ userId: '2' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ロールIDは必須です。');
    });

    it('should return 400 when user is already a member', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(mockMember);

      const request = new Request('http://localhost/api/projects/1/members', {
        method: 'POST',
        body: JSON.stringify({ userId: '2', roleId: '1' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このユーザーは既にプロジェクトメンバーです。');
    });

    it('should create member successfully', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.role.findUnique.mockResolvedValueOnce(mockRole);
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);
      mockPrisma.projectMember.create.mockResolvedValueOnce(mockMember);

      const request = new Request('http://localhost/api/projects/1/members', {
        method: 'POST',
        body: JSON.stringify({ userId: '2', roleId: '1' }),
      });
      const params = Promise.resolve({ id: '1' });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.userId).toBe('2');
      expect(data.roleId).toBe('1');
    });
  });

  describe('PUT /api/projects/[id]/members/[userId]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/members/2', {
        method: 'PUT',
        body: JSON.stringify({ roleId: '2' }),
      });
      const params = Promise.resolve({ id: '1', userId: '2' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when member not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/members/999', {
        method: 'PUT',
        body: JSON.stringify({ roleId: '2' }),
      });
      const params = Promise.resolve({ id: '1', userId: '999' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('このユーザーはプロジェクトメンバーではありません。');
    });

    it('should update member role successfully', async () => {
      const newRole = { id: BigInt(2), name: 'Manager', permissions: {} };
      const updatedMember = { ...mockMember, roleId: BigInt(2), role: newRole };

      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(mockMember);
      mockPrisma.role.findUnique.mockResolvedValueOnce(newRole);
      mockPrisma.projectMember.update.mockResolvedValueOnce(updatedMember);

      const request = new Request('http://localhost/api/projects/1/members/2', {
        method: 'PUT',
        body: JSON.stringify({ roleId: '2' }),
      });
      const params = Promise.resolve({ id: '1', userId: '2' });

      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.roleId).toBe('2');
      expect(data.role.name).toBe('Manager');
    });
  });

  describe('DELETE /api/projects/[id]/members/[userId]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/members/2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1', userId: '2' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when member not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/projects/1/members/999', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1', userId: '999' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('このユーザーはプロジェクトメンバーではありません。');
    });

    it('should delete member successfully', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.project.findUnique.mockResolvedValueOnce(mockProject);
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(mockMember);
      mockPrisma.projectMember.delete.mockResolvedValueOnce(mockMember);

      const request = new Request('http://localhost/api/projects/1/members/2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: '1', userId: '2' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('メンバーを削除しました。');
    });
  });
});
