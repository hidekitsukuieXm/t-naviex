import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    watchlist: {
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
import { GET as GET_ITEM, PUT, DELETE } from '../[id]/route';
import { GET as GET_STATUS } from '../status/route';

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(prisma.watchlist.findMany);
const mockFindUnique = vi.mocked(prisma.watchlist.findUnique);
const mockCreate = vi.mocked(prisma.watchlist.create);
const mockUpdate = vi.mocked(prisma.watchlist.update);
const mockDelete = vi.mocked(prisma.watchlist.delete);
const mockLogAudit = vi.mocked(logAudit);

describe('Watchlist API', () => {
  const mockSession = {
    user: { id: '1', email: 'user@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockWatchlistItem = {
    id: BigInt(1),
    userId: BigInt(1),
    entityType: 'PROJECT',
    entityId: BigInt(100),
    notifyEmail: true,
    notifyInApp: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/watchlist', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/watchlist');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return watchlist items when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindMany.mockResolvedValueOnce([mockWatchlistItem]);

      const request = new Request('http://localhost/api/watchlist');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.items[0].entityType).toBe('PROJECT');
    });

    it('should filter by entityType when provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindMany.mockResolvedValueOnce([mockWatchlistItem]);

      const request = new Request('http://localhost/api/watchlist?entityType=PROJECT');
      const response = await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: BigInt(1),
          entityType: 'PROJECT',
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('POST /api/watchlist', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ entityType: 'PROJECT', entityId: '100' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when entityType is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ entityId: '100' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('エンティティタイプは必須です');
    });

    it('should return 400 when already watching', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(mockWatchlistItem);

      const request = new Request('http://localhost/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ entityType: 'PROJECT', entityId: '100' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('既にウォッチリストに登録されています。');
    });

    it('should create watchlist item when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce(mockWatchlistItem);

      const request = new Request('http://localhost/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'PROJECT',
          entityId: '100',
          notifyEmail: true,
          notifyInApp: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.entityType).toBe('PROJECT');
      expect(data.entityId).toBe('100');
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });

  describe('GET /api/watchlist/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/watchlist/1');
      const response = await GET_ITEM(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when item not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/watchlist/999');
      const response = await GET_ITEM(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ウォッチリスト項目が見つかりません。');
    });

    it('should return 403 when accessing another user item', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce({
        ...mockWatchlistItem,
        userId: BigInt(999), // 別のユーザー
      });

      const request = new Request('http://localhost/api/watchlist/1');
      const response = await GET_ITEM(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('アクセス権限がありません。');
    });

    it('should return item when authorized', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(mockWatchlistItem);

      const request = new Request('http://localhost/api/watchlist/1');
      const response = await GET_ITEM(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entityType).toBe('PROJECT');
    });
  });

  describe('PUT /api/watchlist/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/watchlist/1', {
        method: 'PUT',
        body: JSON.stringify({ notifyEmail: false }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should update notification settings', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(mockWatchlistItem);
      mockUpdate.mockResolvedValueOnce({
        ...mockWatchlistItem,
        notifyEmail: false,
      });

      const request = new Request('http://localhost/api/watchlist/1', {
        method: 'PUT',
        body: JSON.stringify({ notifyEmail: false }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifyEmail).toBe(false);
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/watchlist/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/watchlist/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should delete watchlist item', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(mockWatchlistItem);
      mockDelete.mockResolvedValueOnce(mockWatchlistItem);

      const request = new Request('http://localhost/api/watchlist/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('ウォッチリストから削除しました。');
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });

  describe('GET /api/watchlist/status', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request(
        'http://localhost/api/watchlist/status?entityType=PROJECT&entityId=100'
      );
      const response = await GET_STATUS(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when parameters are missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/watchlist/status');
      const response = await GET_STATUS(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('entityTypeとentityIdは必須です。');
    });

    it('should return isWatching: false when not watching', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(null);

      const request = new Request(
        'http://localhost/api/watchlist/status?entityType=PROJECT&entityId=100'
      );
      const response = await GET_STATUS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isWatching).toBe(false);
      expect(data.item).toBeNull();
    });

    it('should return isWatching: true when watching', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(mockWatchlistItem);

      const request = new Request(
        'http://localhost/api/watchlist/status?entityType=PROJECT&entityId=100'
      );
      const response = await GET_STATUS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isWatching).toBe(true);
      expect(data.item).not.toBeNull();
    });
  });
});
