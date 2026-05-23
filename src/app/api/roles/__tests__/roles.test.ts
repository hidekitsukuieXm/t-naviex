import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    role: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET } from '../route';

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe('Roles API', () => {
  const mockSession = {
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockRoles = [
    { id: BigInt(1), name: 'Admin', permissions: { all: true } },
    { id: BigInt(2), name: 'Developer', permissions: { read: true, write: true } },
    { id: BigInt(3), name: 'Viewer', permissions: { read: true } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/roles', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return roles when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.role.findMany.mockResolvedValueOnce(mockRoles);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);
      expect(data[0].id).toBe('1');
      expect(data[0].name).toBe('Admin');
      expect(data[0].permissions).toEqual({ all: true });
    });

    it('should return roles ordered by name', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.role.findMany.mockResolvedValueOnce(mockRoles);

      const response = await GET();

      expect(response.status).toBe(200);
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });
  });
});
