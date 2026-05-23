import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    role: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  createRole,
  getRoleById,
  getRoleByName,
  getRoles,
  updateRole,
  deleteRole,
  isRoleNameTaken,
  checkUserPermission,
} from '../role-repository';

const mockPrisma = vi.mocked(prisma);

describe('Role Repository', () => {
  const mockDbRole = {
    id: BigInt(1),
    name: 'CUSTOM_ROLE',
    displayName: 'カスタムロール',
    description: 'カスタムロールの説明',
    permissions: {
      projects: ['read', 'update'],
      testCases: ['create', 'read', 'update'],
    },
    isSystemRole: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockSystemRole = {
    ...mockDbRole,
    id: BigInt(2),
    name: 'SYSTEM_ADMIN',
    displayName: 'システム管理者',
    isSystemRole: true,
  };

  const mockDbRoleWithCount = {
    ...mockDbRole,
    _count: {
      projectMembers: 5,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRole', () => {
    it('should create a new role', async () => {
      mockPrisma.role.create.mockResolvedValueOnce(mockDbRole);

      const result = await createRole({
        name: 'CUSTOM_ROLE',
        displayName: 'カスタムロール',
        description: 'カスタムロールの説明',
        permissions: {
          projects: ['read', 'update'],
          testCases: ['create', 'read', 'update'],
        },
      });

      expect(mockPrisma.role.create).toHaveBeenCalledWith({
        data: {
          name: 'CUSTOM_ROLE',
          displayName: 'カスタムロール',
          description: 'カスタムロールの説明',
          permissions: {
            projects: ['read', 'update'],
            testCases: ['create', 'read', 'update'],
          },
          isSystemRole: false,
        },
        select: expect.any(Object),
      });
      expect(result.id).toBe('1');
      expect(result.name).toBe('CUSTOM_ROLE');
      expect(result.isSystemRole).toBe(false);
    });

    it('should create role with null description when not provided', async () => {
      mockPrisma.role.create.mockResolvedValueOnce({
        ...mockDbRole,
        description: null,
      });

      await createRole({
        name: 'TEST_ROLE',
        displayName: 'テストロール',
        permissions: {},
      });

      expect(mockPrisma.role.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('getRoleById', () => {
    it('should return role when found', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce(mockDbRoleWithCount);

      const result = await getRoleById(BigInt(1));

      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        select: expect.objectContaining({
          id: true,
          _count: expect.any(Object),
        }),
      });
      expect(result?.id).toBe('1');
      expect(result?._count.projectMembers).toBe(5);
    });

    it('should return null when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce(null);

      const result = await getRoleById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getRoleByName', () => {
    it('should return role when found', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce(mockDbRole);

      const result = await getRoleByName('CUSTOM_ROLE');

      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { name: 'CUSTOM_ROLE' },
        select: expect.any(Object),
      });
      expect(result?.name).toBe('CUSTOM_ROLE');
    });

    it('should return null when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce(null);

      const result = await getRoleByName('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('getRoles', () => {
    it('should return all roles sorted by isSystemRole and name', async () => {
      mockPrisma.role.findMany.mockResolvedValueOnce([mockSystemRole, mockDbRole]);

      const result = await getRoles();

      expect(mockPrisma.role.findMany).toHaveBeenCalledWith({
        select: expect.any(Object),
        orderBy: [{ isSystemRole: 'desc' }, { name: 'asc' }],
      });
      expect(result.roles).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('updateRole', () => {
    it('should update role fields', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce({
        name: 'CUSTOM_ROLE',
        isSystemRole: false,
      });
      mockPrisma.role.update.mockResolvedValueOnce({
        ...mockDbRole,
        displayName: '更新後の名前',
      });

      const result = await updateRole(BigInt(1), { displayName: '更新後の名前' });

      expect(mockPrisma.role.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { displayName: '更新後の名前' },
        select: expect.any(Object),
      });
      expect(result?.displayName).toBe('更新後の名前');
    });

    it('should throw error when trying to change system role name', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce({
        name: 'SYSTEM_ADMIN',
        isSystemRole: true,
      });

      await expect(updateRole(BigInt(2), { name: 'NEW_NAME' })).rejects.toThrow(
        'システムロールの名前は変更できません。'
      );
    });

    it('should return null when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce(null);

      const result = await updateRole(BigInt(999), { displayName: 'Test' });

      expect(result).toBeNull();
    });

    it('should update permissions', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce({
        name: 'CUSTOM_ROLE',
        isSystemRole: false,
      });
      mockPrisma.role.update.mockResolvedValueOnce(mockDbRole);

      await updateRole(BigInt(1), {
        permissions: { projects: ['create', 'read', 'update', 'delete'] },
      });

      expect(mockPrisma.role.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { permissions: { projects: ['create', 'read', 'update', 'delete'] } },
        select: expect.any(Object),
      });
    });
  });

  describe('deleteRole', () => {
    it('should delete role when not in use', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce({
        name: 'CUSTOM_ROLE',
        isSystemRole: false,
        _count: { projectMembers: 0 },
      });
      mockPrisma.role.delete.mockResolvedValueOnce(mockDbRole);

      const result = await deleteRole(BigInt(1));

      expect(result.success).toBe(true);
      expect(mockPrisma.role.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });

    it('should return error when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce(null);

      const result = await deleteRole(BigInt(999));

      expect(result.success).toBe(false);
      expect(result.error).toBe('ロールが見つかりません。');
    });

    it('should return error when trying to delete system role', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce({
        name: 'SYSTEM_ADMIN',
        isSystemRole: true,
        _count: { projectMembers: 0 },
      });

      const result = await deleteRole(BigInt(2));

      expect(result.success).toBe(false);
      expect(result.error).toBe('システムロールは削除できません。');
    });

    it('should return error when role is in use', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce({
        name: 'CUSTOM_ROLE',
        isSystemRole: false,
        _count: { projectMembers: 3 },
      });

      const result = await deleteRole(BigInt(1));

      expect(result.success).toBe(false);
      expect(result.error).toContain('3件のプロジェクトメンバーに割り当てられている');
    });
  });

  describe('isRoleNameTaken', () => {
    it('should return true when name is taken', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce({ id: BigInt(2) });

      const result = await isRoleNameTaken('EXISTING_ROLE');

      expect(result).toBe(true);
    });

    it('should return false when name is not taken', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce(null);

      const result = await isRoleNameTaken('NEW_ROLE');

      expect(result).toBe(false);
    });

    it('should return false when name belongs to excluded role', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce({ id: BigInt(1) });

      const result = await isRoleNameTaken('CUSTOM_ROLE', BigInt(1));

      expect(result).toBe(false);
    });

    it('should return true when name belongs to different role', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce({ id: BigInt(2) });

      const result = await isRoleNameTaken('OTHER_ROLE', BigInt(1));

      expect(result).toBe(true);
    });
  });

  describe('checkUserPermission', () => {
    it('should return true when user has permission', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          permissions: {
            projects: ['read', 'update'],
            testCases: ['create', 'read'],
          },
        },
      });

      const result = await checkUserPermission(BigInt(1), BigInt(1), 'projects', 'read');

      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          permissions: {
            projects: ['read'],
          },
        },
      });

      const result = await checkUserPermission(BigInt(1), BigInt(1), 'projects', 'delete');

      expect(result).toBe(false);
    });

    it('should return false when user is not a project member', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce(null);

      const result = await checkUserPermission(BigInt(1), BigInt(1), 'projects', 'read');

      expect(result).toBe(false);
    });

    it('should return false when resource is not in permissions', async () => {
      mockPrisma.projectMember.findUnique.mockResolvedValueOnce({
        role: {
          permissions: {
            projects: ['read'],
          },
        },
      });

      const result = await checkUserPermission(BigInt(1), BigInt(1), 'users', 'read');

      expect(result).toBe(false);
    });
  });
});
