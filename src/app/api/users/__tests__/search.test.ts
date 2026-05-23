import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET } from '../search/route';

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe('User Search API', () => {
  const mockSession = {
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockUsers = [
    { id: BigInt(1), name: 'User One', email: 'user1@example.com', status: 'ACTIVE' },
    { id: BigInt(2), name: 'User Two', email: 'user2@example.com', status: 'ACTIVE' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users/search', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/users/search');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return users when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.user.findMany.mockResolvedValueOnce(mockUsers);

      const request = new Request('http://localhost/api/users/search');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      expect(data[0].id).toBe('1');
      expect(data[0].name).toBe('User One');
    });

    it('should search users by query', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.user.findMany.mockResolvedValueOnce([mockUsers[0]]);

      const request = new Request('http://localhost/api/users/search?q=One');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(1);
      expect(data[0].name).toBe('User One');

      // Prismaのクエリが正しく呼ばれていることを確認
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'One', mode: 'insensitive' } },
              { email: { contains: 'One', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should exclude project members when projectId is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.user.findMany.mockResolvedValueOnce([mockUsers[1]]);

      const request = new Request('http://localhost/api/users/search?projectId=1');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: {
              projectMembers: {
                some: {
                  projectId: BigInt(1),
                },
              },
            },
          }),
        })
      );
    });

    it('should respect limit parameter', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.user.findMany.mockResolvedValueOnce([mockUsers[0]]);

      const request = new Request('http://localhost/api/users/search?limit=1');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
        })
      );
    });
  });
});
