import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  createAuditLog,
  getAuditLogById,
  getAuditLogs,
  getAuditLogsForExport,
} from '../audit-log-repository';

const mockPrisma = vi.mocked(prisma);

describe('Audit Log Repository', () => {
  const mockDbAuditLog = {
    id: BigInt(1),
    userId: BigInt(100),
    action: 'USER_CREATE',
    targetType: 'USER',
    targetId: BigInt(200),
    details: { userName: 'Test User', userEmail: 'test@example.com' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2024-01-01T12:00:00Z'),
    user: {
      id: BigInt(100),
      name: 'Admin User',
      email: 'admin@example.com',
    },
  };

  const mockDbAuditLogWithoutUser = {
    ...mockDbAuditLog,
    userId: null,
    user: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('should create a new audit log', async () => {
      mockPrisma.auditLog.create.mockResolvedValueOnce(mockDbAuditLog);

      await createAuditLog({
        userId: BigInt(100),
        action: 'USER_CREATE',
        targetType: 'USER',
        targetId: BigInt(200),
        details: { userName: 'Test User' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: BigInt(100),
          action: 'USER_CREATE',
          targetType: 'USER',
          targetId: BigInt(200),
          details: { userName: 'Test User' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      });
    });

    it('should create audit log with null values when not provided', async () => {
      mockPrisma.auditLog.create.mockResolvedValueOnce(mockDbAuditLogWithoutUser);

      await createAuditLog({
        action: 'LOGIN_FAILED',
        targetType: 'USER',
        details: { email: 'test@example.com' },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: null,
          action: 'LOGIN_FAILED',
          targetType: 'USER',
          targetId: null,
          details: { email: 'test@example.com' },
          ipAddress: null,
          userAgent: null,
        },
      });
    });
  });

  describe('getAuditLogById', () => {
    it('should return audit log when found', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValueOnce(mockDbAuditLog);

      const result = await getAuditLogById(BigInt(1));

      expect(mockPrisma.auditLog.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      expect(result?.id).toBe('1');
      expect(result?.userId).toBe('100');
      expect(result?.userName).toBe('Admin User');
      expect(result?.userEmail).toBe('admin@example.com');
      expect(result?.action).toBe('USER_CREATE');
    });

    it('should return null when audit log not found', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValueOnce(null);

      const result = await getAuditLogById(BigInt(999));

      expect(result).toBeNull();
    });

    it('should handle audit log without user', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValueOnce(mockDbAuditLogWithoutUser);

      const result = await getAuditLogById(BigInt(1));

      expect(result?.userId).toBeNull();
      expect(result?.userName).toBeNull();
      expect(result?.userEmail).toBeNull();
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      mockPrisma.auditLog.count.mockResolvedValueOnce(100);
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([mockDbAuditLog]);

      const result = await getAuditLogs({ page: 1, limit: 20 });

      expect(mockPrisma.auditLog.count).toHaveBeenCalled();
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.auditLogs).toHaveLength(1);
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(5);
    });

    it('should filter by userId', async () => {
      mockPrisma.auditLog.count.mockResolvedValueOnce(10);
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([mockDbAuditLog]);

      await getAuditLogs({ userId: '100' });

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
        where: { userId: BigInt(100) },
      });
    });

    it('should filter by action', async () => {
      mockPrisma.auditLog.count.mockResolvedValueOnce(10);
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([mockDbAuditLog]);

      await getAuditLogs({ action: 'USER_CREATE' });

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
        where: { action: 'USER_CREATE' },
      });
    });

    it('should filter by targetType', async () => {
      mockPrisma.auditLog.count.mockResolvedValueOnce(10);
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([mockDbAuditLog]);

      await getAuditLogs({ targetType: 'USER' });

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
        where: { targetType: 'USER' },
      });
    });

    it('should filter by date range', async () => {
      mockPrisma.auditLog.count.mockResolvedValueOnce(10);
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([mockDbAuditLog]);

      await getAuditLogs({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: expect.any(Date),
          },
        },
      });
    });

    it('should search by query', async () => {
      mockPrisma.auditLog.count.mockResolvedValueOnce(10);
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([mockDbAuditLog]);

      await getAuditLogs({ query: 'admin' });

      expect(mockPrisma.auditLog.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { action: { contains: 'admin', mode: 'insensitive' } },
            { targetType: { contains: 'admin', mode: 'insensitive' } },
            { user: { name: { contains: 'admin', mode: 'insensitive' } } },
            { user: { email: { contains: 'admin', mode: 'insensitive' } } },
          ],
        },
      });
    });
  });

  describe('getAuditLogsForExport', () => {
    it('should return audit logs for export with limit', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([mockDbAuditLog]);

      const result = await getAuditLogsForExport({});

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
      expect(result).toHaveLength(1);
    });

    it('should apply filters for export', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([mockDbAuditLog]);

      await getAuditLogsForExport({
        action: 'USER_CREATE',
        targetType: 'USER',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: 'USER_CREATE',
          targetType: 'USER',
          createdAt: {
            gte: new Date('2024-01-01'),
            lte: expect.any(Date),
          },
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });
    });
  });
});
