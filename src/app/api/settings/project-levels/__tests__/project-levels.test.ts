import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    projectLevel: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { GET, POST } from '../route';
import { GET as GET_LEVEL, PUT, DELETE } from '../[id]/route';

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(prisma.projectLevel.findMany);
const mockFindUnique = vi.mocked(prisma.projectLevel.findUnique);
const mockCreate = vi.mocked(prisma.projectLevel.create);
const mockUpdate = vi.mocked(prisma.projectLevel.update);
const mockUpdateMany = vi.mocked(prisma.projectLevel.updateMany);
const mockDelete = vi.mocked(prisma.projectLevel.delete);
const mockLogAudit = vi.mocked(logAudit);

describe('Project Levels API', () => {
  const mockSession = {
    user: { id: '1', email: 'admin@example.com', name: 'Admin User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockProjectLevel = {
    id: BigInt(1),
    name: 'STANDARD',
    displayName: 'スタンダード',
    description: 'スタンダードプラン',
    features: ['export_pdf', 'custom_fields'],
    limits: { maxUsers: 10, maxProjects: 5 },
    isDefault: false,
    sortOrder: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const mockDefaultLevel = {
    ...mockProjectLevel,
    id: BigInt(2),
    name: 'FREE',
    displayName: 'フリー',
    isDefault: true,
    sortOrder: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings/project-levels', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return project levels when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindMany.mockResolvedValueOnce([mockDefaultLevel, mockProjectLevel]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.levels).toHaveLength(2);
      expect(data.total).toBe(2);
    });
  });

  describe('POST /api/settings/project-levels', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/project-levels', {
        method: 'POST',
        body: JSON.stringify({ name: 'CUSTOM', displayName: 'カスタム' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when name is invalid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/settings/project-levels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Invalid Name', displayName: 'カスタム' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('英数字、アンダースコア、ハイフン');
    });

    it('should return 400 when duplicate name exists', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(mockProjectLevel);

      const request = new Request('http://localhost/api/settings/project-levels', {
        method: 'POST',
        body: JSON.stringify({ name: 'STANDARD', displayName: 'カスタム' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このレベル名は既に使用されています。');
    });

    it('should create project level and clear other defaults', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(null);
      mockUpdateMany.mockResolvedValueOnce({ count: 1 });
      mockCreate.mockResolvedValueOnce({ ...mockProjectLevel, isDefault: true });

      const request = new Request('http://localhost/api/settings/project-levels', {
        method: 'POST',
        body: JSON.stringify({
          name: 'CUSTOM',
          displayName: 'カスタム',
          isDefault: true,
          features: ['api_access'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });

  describe('GET /api/settings/project-levels/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/project-levels/1');
      const response = await GET_LEVEL(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when level not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/project-levels/999');
      const response = await GET_LEVEL(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('プロジェクトレベルが見つかりません。');
    });

    it('should return level when found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(mockProjectLevel);

      const request = new Request('http://localhost/api/settings/project-levels/1');
      const response = await GET_LEVEL(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('STANDARD');
      expect(data.features).toContain('export_pdf');
    });
  });

  describe('PUT /api/settings/project-levels/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/project-levels/1', {
        method: 'PUT',
        body: JSON.stringify({ displayName: '更新後' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should update level when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique
        .mockResolvedValueOnce(mockProjectLevel) // 存在確認
        .mockResolvedValueOnce(null); // 重複確認
      mockUpdate.mockResolvedValueOnce({ ...mockProjectLevel, displayName: '更新後' });

      const request = new Request('http://localhost/api/settings/project-levels/1', {
        method: 'PUT',
        body: JSON.stringify({ displayName: '更新後' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.displayName).toBe('更新後');
      expect(mockLogAudit).toHaveBeenCalled();
    });

    it('should update default flag and clear others', async () => {
      mockAuth.mockReset();
      mockFindUnique.mockReset();
      mockUpdateMany.mockReset();
      mockUpdate.mockReset();
      mockAuth.mockResolvedValue(mockSession);
      mockFindUnique.mockResolvedValue(mockProjectLevel);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockUpdate.mockResolvedValue({ ...mockProjectLevel, isDefault: true });

      const request = new Request('http://localhost/api/settings/project-levels/1', {
        method: 'PUT',
        body: JSON.stringify({ isDefault: true }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('DELETE /api/settings/project-levels/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/project-levels/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when deleting default level', async () => {
      mockAuth.mockReset();
      mockFindUnique.mockReset();
      mockAuth.mockResolvedValue(mockSession);
      mockFindUnique.mockResolvedValue(mockDefaultLevel);

      const request = new Request('http://localhost/api/settings/project-levels/2', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '2' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('デフォルトのプロジェクトレベルは削除できません。');
    });

    it('should delete level when valid', async () => {
      mockAuth.mockReset();
      mockFindUnique.mockReset();
      mockDelete.mockReset();
      mockAuth.mockResolvedValue(mockSession);
      mockFindUnique.mockResolvedValue(mockProjectLevel);
      mockDelete.mockResolvedValue(mockProjectLevel);

      const request = new Request('http://localhost/api/settings/project-levels/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('プロジェクトレベルを削除しました。');
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });
});
