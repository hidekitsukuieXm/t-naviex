import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    apiToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    apiTokenIpWhitelist: {
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    apiTokenUsageLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    apiRateLimit: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        apiToken: {
          create: vi.fn(),
        },
        apiTokenIpWhitelist: {
          createMany: vi.fn(),
        },
      })
    ),
  },
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => Buffer.from('a'.repeat(32))),
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => 'mocked_hash'),
      })),
    })),
    timingSafeEqual: vi.fn(() => true),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  generateSecureToken,
  hashToken,
  verifyToken,
  getTokenPrefix,
  getApiTokens,
  updateApiToken,
  revokeApiToken,
  deleteApiToken,
  logTokenUsage,
  getTokenUsageLogs,
  addIpWhitelist,
  removeIpWhitelist,
  getTokenIpWhitelists,
  checkAndUpdateRateLimit,
  cleanupExpiredTokens,
  cleanupOldUsageLogs,
} from '../api-token-repository';

const mockPrisma = vi.mocked(prisma);
const mockCrypto = vi.mocked(crypto);

describe('API Token Repository', () => {
  const mockDbToken = {
    id: BigInt(1),
    userId: BigInt(1),
    name: 'Test Token',
    tokenHash: 'hashed_token',
    tokenPrefix: 'abc12345',
    scopes: ['READ_PROJECTS', 'WRITE_PROJECTS'],
    expiresAt: null,
    lastUsedAt: null,
    lastUsedIp: null,
    isActive: true,
    revokedAt: null,
    revokedReason: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    user: {
      id: BigInt(1),
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSecureToken', () => {
    it('should generate a hex string token', () => {
      const token = generateSecureToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('hashToken', () => {
    it('should hash a token', () => {
      const hash = hashToken('test_token');
      expect(hash).toBeDefined();
      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const result = verifyToken('test_token', 'hashed_token');
      expect(result).toBe(true);
    });
  });

  describe('getTokenPrefix', () => {
    it('should return first 8 characters', () => {
      const prefix = getTokenPrefix('abcdefghijklmnop');
      expect(prefix).toBe('abcdefgh');
    });
  });

  describe('getApiTokens', () => {
    it('should get paginated tokens for user', async () => {
      mockPrisma.apiToken.count.mockResolvedValueOnce(2);
      mockPrisma.apiToken.findMany.mockResolvedValueOnce([
        mockDbToken,
        { ...mockDbToken, id: BigInt(2) },
      ]);

      const result = await getApiTokens({ userId: BigInt(1) });

      expect(result.tokens).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockPrisma.apiToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: BigInt(1) },
        })
      );
    });

    it('should filter by isActive status', async () => {
      mockPrisma.apiToken.count.mockResolvedValueOnce(1);
      mockPrisma.apiToken.findMany.mockResolvedValueOnce([mockDbToken]);

      await getApiTokens({ isActive: true });

      expect(mockPrisma.apiToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('should apply pagination', async () => {
      mockPrisma.apiToken.count.mockResolvedValueOnce(50);
      mockPrisma.apiToken.findMany.mockResolvedValueOnce([]);

      const result = await getApiTokens({ page: 3, limit: 10 });

      expect(result.totalPages).toBe(5);
      expect(mockPrisma.apiToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });

    it('should apply sorting', async () => {
      mockPrisma.apiToken.count.mockResolvedValueOnce(0);
      mockPrisma.apiToken.findMany.mockResolvedValueOnce([]);

      await getApiTokens({ sortBy: 'name', sortOrder: 'asc' });

      expect(mockPrisma.apiToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });
  });

  describe('updateApiToken', () => {
    it('should update token name', async () => {
      mockPrisma.apiToken.update.mockResolvedValueOnce({
        ...mockDbToken,
        name: 'Updated Token',
      });

      const result = await updateApiToken(BigInt(1), { name: 'Updated Token' });

      expect(result.name).toBe('Updated Token');
      expect(mockPrisma.apiToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BigInt(1) },
          data: expect.objectContaining({ name: 'Updated Token' }),
        })
      );
    });

    it('should update scopes', async () => {
      const newScopes = ['ADMIN'];
      mockPrisma.apiToken.update.mockResolvedValueOnce({
        ...mockDbToken,
        scopes: newScopes,
      });

      const result = await updateApiToken(BigInt(1), { scopes: newScopes as ApiTokenScope[] });

      expect(result.scopes).toEqual(newScopes);
    });

    it('should update expiration date', async () => {
      const newExpiration = new Date('2025-01-01');
      mockPrisma.apiToken.update.mockResolvedValueOnce({
        ...mockDbToken,
        expiresAt: newExpiration,
      });

      const result = await updateApiToken(BigInt(1), { expiresAt: newExpiration });

      expect(result.expiresAt).toBe(newExpiration.toISOString());
    });

    it('should update active status', async () => {
      mockPrisma.apiToken.update.mockResolvedValueOnce({
        ...mockDbToken,
        isActive: false,
      });

      const result = await updateApiToken(BigInt(1), { isActive: false });

      expect(result.isActive).toBe(false);
    });
  });

  describe('revokeApiToken', () => {
    it('should revoke token with reason', async () => {
      const revokedAt = new Date();
      mockPrisma.apiToken.update.mockResolvedValueOnce({
        ...mockDbToken,
        isActive: false,
        revokedAt,
        revokedReason: 'Security concern',
      });

      const result = await revokeApiToken(BigInt(1), 'Security concern');

      expect(result.isActive).toBe(false);
      expect(result.revokedAt).toBeDefined();
      expect(result.revokedReason).toBe('Security concern');
      expect(mockPrisma.apiToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
            revokedReason: 'Security concern',
          }),
        })
      );
    });

    it('should revoke token without reason', async () => {
      mockPrisma.apiToken.update.mockResolvedValueOnce({
        ...mockDbToken,
        isActive: false,
        revokedAt: new Date(),
        revokedReason: null,
      });

      const result = await revokeApiToken(BigInt(1));

      expect(result.revokedReason).toBeNull();
    });
  });

  describe('deleteApiToken', () => {
    it('should delete token', async () => {
      mockPrisma.apiToken.delete.mockResolvedValueOnce(mockDbToken);

      await deleteApiToken(BigInt(1));

      expect(mockPrisma.apiToken.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('logTokenUsage', () => {
    it('should create usage log entry', async () => {
      mockPrisma.apiTokenUsageLog.create.mockResolvedValueOnce({
        id: BigInt(1),
        tokenId: BigInt(1),
        method: 'GET',
        endpoint: '/api/v1/projects',
        statusCode: 200,
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
        requestBody: null,
        responseTime: 50,
        errorMessage: null,
        createdAt: new Date(),
      });

      await logTokenUsage({
        tokenId: BigInt(1),
        method: 'GET',
        endpoint: '/api/v1/projects',
        statusCode: 200,
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
        responseTime: 50,
      });

      expect(mockPrisma.apiTokenUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokenId: BigInt(1),
          method: 'GET',
          endpoint: '/api/v1/projects',
          statusCode: 200,
        }),
      });
    });

    it('should log error message for failed requests', async () => {
      mockPrisma.apiTokenUsageLog.create.mockResolvedValueOnce({
        id: BigInt(1),
        tokenId: BigInt(1),
        method: 'POST',
        endpoint: '/api/v1/projects',
        statusCode: 400,
        ipAddress: null,
        userAgent: null,
        requestBody: null,
        responseTime: null,
        errorMessage: 'Invalid request',
        createdAt: new Date(),
      });

      await logTokenUsage({
        tokenId: BigInt(1),
        method: 'POST',
        endpoint: '/api/v1/projects',
        statusCode: 400,
        errorMessage: 'Invalid request',
      });

      expect(mockPrisma.apiTokenUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          errorMessage: 'Invalid request',
        }),
      });
    });
  });

  describe('getTokenUsageLogs', () => {
    const mockLog = {
      id: BigInt(1),
      tokenId: BigInt(1),
      method: 'GET',
      endpoint: '/api/v1/projects',
      statusCode: 200,
      ipAddress: '192.168.1.1',
      userAgent: 'Test Agent',
      requestBody: null,
      responseTime: 50,
      errorMessage: null,
      createdAt: new Date('2024-01-01'),
    };

    it('should get usage logs for token', async () => {
      mockPrisma.apiTokenUsageLog.count.mockResolvedValueOnce(1);
      mockPrisma.apiTokenUsageLog.findMany.mockResolvedValueOnce([mockLog]);

      const result = await getTokenUsageLogs({ tokenId: BigInt(1) });

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by method', async () => {
      mockPrisma.apiTokenUsageLog.count.mockResolvedValueOnce(0);
      mockPrisma.apiTokenUsageLog.findMany.mockResolvedValueOnce([]);

      await getTokenUsageLogs({ tokenId: BigInt(1), method: 'POST' });

      expect(mockPrisma.apiTokenUsageLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ method: 'POST' }),
        })
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.apiTokenUsageLog.count.mockResolvedValueOnce(0);
      mockPrisma.apiTokenUsageLog.findMany.mockResolvedValueOnce([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await getTokenUsageLogs({ tokenId: BigInt(1), startDate, endDate });

      expect(mockPrisma.apiTokenUsageLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        })
      );
    });
  });

  describe('addIpWhitelist', () => {
    it('should add IP to whitelist', async () => {
      mockPrisma.apiTokenIpWhitelist.create.mockResolvedValueOnce({
        id: BigInt(1),
        tokenId: BigInt(1),
        ipAddress: '192.168.1.100',
        description: 'Office IP',
        createdAt: new Date(),
      });

      const result = await addIpWhitelist(BigInt(1), '192.168.1.100', 'Office IP');

      expect(result.ipAddress).toBe('192.168.1.100');
      expect(result.description).toBe('Office IP');
    });
  });

  describe('removeIpWhitelist', () => {
    it('should remove IP from whitelist', async () => {
      mockPrisma.apiTokenIpWhitelist.delete.mockResolvedValueOnce({
        id: BigInt(1),
        tokenId: BigInt(1),
        ipAddress: '192.168.1.100',
        description: null,
        createdAt: new Date(),
      });

      await removeIpWhitelist(BigInt(1));

      expect(mockPrisma.apiTokenIpWhitelist.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('getTokenIpWhitelists', () => {
    it('should get all IPs for token', async () => {
      mockPrisma.apiTokenIpWhitelist.findMany.mockResolvedValueOnce([
        {
          id: BigInt(1),
          tokenId: BigInt(1),
          ipAddress: '192.168.1.100',
          description: null,
          createdAt: new Date(),
        },
        {
          id: BigInt(2),
          tokenId: BigInt(1),
          ipAddress: '10.0.0.0/8',
          description: 'VPN',
          createdAt: new Date(),
        },
      ]);

      const result = await getTokenIpWhitelists(BigInt(1));

      expect(result).toHaveLength(2);
    });
  });

  describe('checkAndUpdateRateLimit', () => {
    it('should allow request within limit', async () => {
      mockPrisma.apiRateLimit.upsert.mockResolvedValueOnce({
        id: BigInt(1),
        tokenId: BigInt(1),
        windowStart: new Date(),
        requestCount: 100,
        maxRequests: 1000,
        windowMinutes: 60,
      });

      const result = await checkAndUpdateRateLimit(BigInt(1));

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(900);
    });

    it('should deny request over limit', async () => {
      mockPrisma.apiRateLimit.upsert.mockResolvedValueOnce({
        id: BigInt(1),
        tokenId: BigInt(1),
        windowStart: new Date(),
        requestCount: 1001,
        maxRequests: 1000,
        windowMinutes: 60,
      });

      const result = await checkAndUpdateRateLimit(BigInt(1));

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should deactivate expired tokens', async () => {
      mockPrisma.apiToken.updateMany.mockResolvedValueOnce({ count: 5 });

      const count = await cleanupExpiredTokens();

      expect(count).toBe(5);
      expect(mockPrisma.apiToken.updateMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          expiresAt: { lte: expect.any(Date) },
        },
        data: expect.objectContaining({
          isActive: false,
          revokedReason: '有効期限切れ',
        }),
      });
    });
  });

  describe('cleanupOldUsageLogs', () => {
    it('should delete logs older than retention period', async () => {
      mockPrisma.apiTokenUsageLog.deleteMany.mockResolvedValueOnce({ count: 100 });

      const count = await cleanupOldUsageLogs(90);

      expect(count).toBe(100);
      expect(mockPrisma.apiTokenUsageLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
        },
      });
    });
  });
});
