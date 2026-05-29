import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    uiScript: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
import { GET as GET_SCRIPT, PUT, DELETE } from '../[id]/route';

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(prisma.uiScript.findMany);
const mockFindUnique = vi.mocked(prisma.uiScript.findUnique);
const mockCreate = vi.mocked(prisma.uiScript.create);
const mockUpdate = vi.mocked(prisma.uiScript.update);
const mockDelete = vi.mocked(prisma.uiScript.delete);
const mockLogAudit = vi.mocked(logAudit);

describe('UI Scripts API', () => {
  const mockSession = {
    user: { id: '1', email: 'admin@example.com', name: 'Admin User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockUiScript = {
    id: BigInt(1),
    name: 'Test Script',
    description: 'Test description',
    trigger: 'PAGE_LOAD',
    targetPage: '/dashboard',
    script: 'console.log("test");',
    css: '.test { color: red; }',
    isActive: true,
    priority: 0,
    metadata: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings/ui-scripts', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/ui-scripts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return scripts list when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindMany.mockResolvedValueOnce([mockUiScript]);

      const request = new Request('http://localhost/api/settings/ui-scripts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scripts).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.scripts[0].name).toBe('Test Script');
    });
  });

  describe('POST /api/settings/ui-scripts', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/ui-scripts', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Script' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when name is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/settings/ui-scripts', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('スクリプト名は必須です');
    });

    it('should return 400 when duplicate name exists', async () => {
      mockAuth.mockReset();
      mockFindUnique.mockReset();
      mockAuth.mockResolvedValue(mockSession);
      mockFindUnique.mockResolvedValue(mockUiScript);

      const request = new Request('http://localhost/api/settings/ui-scripts', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Script' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このスクリプト名は既に使用されています。');
    });

    it('should create script when valid', async () => {
      mockAuth.mockReset();
      mockFindUnique.mockReset();
      mockCreate.mockReset();
      mockAuth.mockResolvedValue(mockSession);
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue(mockUiScript);

      const request = new Request('http://localhost/api/settings/ui-scripts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Script',
          description: 'Test description',
          trigger: 'PAGE_LOAD',
          script: 'console.log("test");',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Test Script');
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });

  describe('GET /api/settings/ui-scripts/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockReset();
      mockFindUnique.mockReset();
      mockAuth.mockResolvedValue(null);

      const request = new Request('http://localhost/api/settings/ui-scripts/1');
      const response = await GET_SCRIPT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when script not found', async () => {
      mockAuth.mockReset();
      mockFindUnique.mockReset();
      mockAuth.mockResolvedValue(mockSession);
      mockFindUnique.mockResolvedValue(null);

      const request = new Request('http://localhost/api/settings/ui-scripts/999');
      const response = await GET_SCRIPT(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('UIスクリプトが見つかりません。');
    });

    it('should return script when found', async () => {
      mockAuth.mockReset();
      mockFindUnique.mockReset();
      mockAuth.mockResolvedValue(mockSession);
      mockFindUnique.mockResolvedValue(mockUiScript);

      const request = new Request('http://localhost/api/settings/ui-scripts/1');
      const response = await GET_SCRIPT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Test Script');
    });
  });

  describe('PUT /api/settings/ui-scripts/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/ui-scripts/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Script' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when script not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/ui-scripts/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Script' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('UIスクリプトが見つかりません。');
    });

    it('should update script when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique
        .mockResolvedValueOnce(mockUiScript) // 存在確認
        .mockResolvedValueOnce(null); // 重複確認
      mockUpdate.mockResolvedValueOnce({ ...mockUiScript, name: 'Updated Script' });

      const request = new Request('http://localhost/api/settings/ui-scripts/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Script' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Script');
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/settings/ui-scripts/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/ui-scripts/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when script not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/ui-scripts/999', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('UIスクリプトが見つかりません。');
    });

    it('should delete script when valid', async () => {
      mockAuth.mockReset();
      mockFindUnique.mockReset();
      mockDelete.mockReset();
      mockAuth.mockResolvedValue(mockSession);
      mockFindUnique.mockResolvedValue(mockUiScript);
      mockDelete.mockResolvedValue(mockUiScript);

      const request = new Request('http://localhost/api/settings/ui-scripts/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('UIスクリプトを削除しました。');
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });
});
