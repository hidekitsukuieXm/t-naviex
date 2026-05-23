import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    projectMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPermission, requirePermission, withPermission } from '../middleware';
import { ForbiddenError } from '../errors';

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe('RBAC Middleware', () => {
  const mockSession = {
    user: { id: '1', email: 'user@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockMemberPermissions = {
    projects: ['read'],
    testCases: ['create', 'read', 'update'],
    testRuns: ['read', 'update'],
    testResults: ['create', 'read', 'update'],
    bugs: ['create', 'read', 'update'],
    reports: ['read'],
    settings: ['read'],
  };

  const mockAdminPermissions = {
    projects: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    roles: ['create', 'read', 'update', 'delete'],
    testCases: ['create', 'read', 'update', 'delete'],
    testRuns: ['create', 'read', 'update', 'delete'],
    testResults: ['create', 'read', 'update', 'delete'],
    bugs: ['create', 'read', 'update', 'delete'],
    reports: ['create', 'read', 'update', 'delete'],
    settings: ['read', 'update'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('should return authorized true when user has permission', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          id: BigInt(1),
          name: 'MEMBER',
          permissions: mockMemberPermissions,
        },
      } as unknown as Awaited<ReturnType<typeof prisma.projectMember.findUnique>>);

      const result = await checkPermission('1', '1', 'testCases', 'create');

      expect(result.authorized).toBe(true);
      expect(result.userId).toBe('1');
      expect(result.projectId).toBe('1');
      expect(result.role?.name).toBe('MEMBER');
    });

    it('should return authorized false when user lacks permission', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          id: BigInt(1),
          name: 'MEMBER',
          permissions: mockMemberPermissions,
        },
      } as unknown as Awaited<ReturnType<typeof prisma.projectMember.findUnique>>);

      const result = await checkPermission('1', '1', 'testCases', 'delete');

      expect(result.authorized).toBe(false);
      expect(result.error).toContain('テストケースの削除権限');
    });

    it('should return authorized false when user is not a project member', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      const result = await checkPermission('1', '1', 'testCases', 'read');

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('このプロジェクトのメンバーではありません。');
    });

    it('should return authorized true for admin with all permissions', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          id: BigInt(1),
          name: 'SYSTEM_ADMIN',
          permissions: mockAdminPermissions,
        },
      } as unknown as Awaited<ReturnType<typeof prisma.projectMember.findUnique>>);

      const result = await checkPermission('1', '1', 'users', 'delete');

      expect(result.authorized).toBe(true);
      expect(result.role?.name).toBe('SYSTEM_ADMIN');
    });
  });

  describe('requirePermission', () => {
    it('should not throw when user has permission', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          id: BigInt(1),
          name: 'MEMBER',
          permissions: mockMemberPermissions,
        },
      } as unknown as Awaited<ReturnType<typeof prisma.projectMember.findUnique>>);

      await expect(requirePermission('1', '1', 'testCases', 'create')).resolves.not.toThrow();
    });

    it('should throw ForbiddenError when user lacks permission', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          id: BigInt(1),
          name: 'MEMBER',
          permissions: mockMemberPermissions,
        },
      } as unknown as Awaited<ReturnType<typeof prisma.projectMember.findUnique>>);

      await expect(requirePermission('1', '1', 'projects', 'delete')).rejects.toThrow(
        ForbiddenError
      );
    });

    it('should throw ForbiddenError when user is not a member', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      await expect(requirePermission('1', '1', 'testCases', 'read')).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('withPermission', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const handler = vi.fn();
      const wrappedHandler = withPermission({ resource: 'testCases', action: 'read' }, handler);

      const request = new Request('http://localhost/api/test?projectId=1');
      const response = await wrappedHandler(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks permission', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          id: BigInt(1),
          name: 'GUEST',
          permissions: { testCases: ['read'] },
        },
      } as unknown as Awaited<ReturnType<typeof prisma.projectMember.findUnique>>);

      const handler = vi.fn();
      const wrappedHandler = withPermission({ resource: 'testCases', action: 'delete' }, handler);

      const request = new Request('http://localhost/api/test?projectId=1');
      const response = await wrappedHandler(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('FORBIDDEN');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should call handler when user has permission', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          id: BigInt(1),
          name: 'MEMBER',
          permissions: mockMemberPermissions,
        },
      } as unknown as Awaited<ReturnType<typeof prisma.projectMember.findUnique>>);

      const handler = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

      const wrappedHandler = withPermission({ resource: 'testCases', action: 'create' }, handler);

      const request = new Request('http://localhost/api/test');
      await wrappedHandler(request, { params: Promise.resolve({ id: '1' }) });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          userId: '1',
          projectId: '1',
        })
      );
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const handler = vi.fn();
      const wrappedHandler = withPermission({ resource: 'testCases', action: 'read' }, handler);

      const request = new Request('http://localhost/api/test');
      const response = await wrappedHandler(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('プロジェクトIDが指定されていません。');
    });

    it('should use custom getProjectId function', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          id: BigInt(1),
          name: 'MEMBER',
          permissions: mockMemberPermissions,
        },
      } as unknown as Awaited<ReturnType<typeof prisma.projectMember.findUnique>>);

      const handler = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

      const wrappedHandler = withPermission(
        {
          resource: 'testCases',
          action: 'read',
          getProjectId: () => '999',
        },
        handler
      );

      const request = new Request('http://localhost/api/test');
      await wrappedHandler(request, { params: Promise.resolve({ id: '1' }) });

      expect(handler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          projectId: '999',
        })
      );
    });

    it('should handle systemLevel permission', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockPrisma.projectMember.findFirst.mockResolvedValueOnce({
        id: BigInt(1),
      } as Awaited<ReturnType<typeof prisma.projectMember.findFirst>>);

      const handler = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

      const wrappedHandler = withPermission(
        {
          resource: 'users',
          action: 'create',
          systemLevel: true,
        },
        handler
      );

      const request = new Request('http://localhost/api/users');
      await wrappedHandler(request, { params: Promise.resolve({}) });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          userId: '1',
          projectId: null,
          role: null,
        })
      );
    });
  });
});
