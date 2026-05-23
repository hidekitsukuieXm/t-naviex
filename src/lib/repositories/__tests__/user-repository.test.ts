import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// モックの設定
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  verifyPassword,
  createUser,
  getUserById,
  getUserByEmail,
  getUsers,
  updateUser,
  deleteUser,
  changePassword,
  isEmailTaken,
} from '../user-repository';

const mockPrisma = vi.mocked(prisma);
const mockBcrypt = vi.mocked(bcrypt);

describe('User Repository', () => {
  const mockDbUser = {
    id: BigInt(1),
    email: 'user@example.com',
    name: 'Test User',
    passwordHash: 'hashed_password',
    status: 'ACTIVE' as const,
    emailVerified: null,
    image: null,
    mfaEnabled: false,
    mfaType: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockDbUserWithCount = {
    ...mockDbUser,
    _count: {
      projectMembers: 2,
      userGroups: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      mockBcrypt.hash.mockResolvedValueOnce('hashed_password' as never);

      const result = await hashPassword('plaintext');

      expect(mockBcrypt.hash).toHaveBeenCalledWith('plaintext', 12);
      expect(result).toBe('hashed_password');
    });
  });

  describe('verifyPassword', () => {
    it('should return true when password matches', async () => {
      mockBcrypt.compare.mockResolvedValueOnce(true as never);

      const result = await verifyPassword('plaintext', 'hashed_password');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('plaintext', 'hashed_password');
      expect(result).toBe(true);
    });

    it('should return false when password does not match', async () => {
      mockBcrypt.compare.mockResolvedValueOnce(false as never);

      const result = await verifyPassword('wrong', 'hashed_password');

      expect(result).toBe(false);
    });
  });

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      mockBcrypt.hash.mockResolvedValueOnce('hashed_password' as never);
      mockPrisma.user.create.mockResolvedValueOnce(mockDbUser);

      const result = await createUser({
        email: 'user@example.com',
        name: 'Test User',
        password: 'Password123',
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('Password123', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'user@example.com',
          name: 'Test User',
          passwordHash: 'hashed_password',
          status: 'ACTIVE',
        },
        select: expect.any(Object),
      });
      expect(result.id).toBe('1');
      expect(result.email).toBe('user@example.com');
    });

    it('should use provided status', async () => {
      mockBcrypt.hash.mockResolvedValueOnce('hashed_password' as never);
      mockPrisma.user.create.mockResolvedValueOnce({ ...mockDbUser, status: 'PENDING' });

      await createUser({
        email: 'user@example.com',
        name: 'Test User',
        password: 'Password123',
        status: 'PENDING',
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING',
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockDbUserWithCount);

      const result = await getUserById(BigInt(1));

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        select: expect.objectContaining({
          id: true,
          _count: expect.any(Object),
        }),
      });
      expect(result?.id).toBe('1');
      expect(result?._count.projectMembers).toBe(2);
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await getUserById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockDbUser);

      const result = await getUserByEmail('user@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        select: expect.any(Object),
      });
      expect(result?.email).toBe('user@example.com');
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(25);
      mockPrisma.user.findMany.mockResolvedValueOnce([mockDbUser]);

      const result = await getUsers({ page: 2, limit: 10 });

      expect(mockPrisma.user.count).toHaveBeenCalled();
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
    });

    it('should filter by status', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(5);
      mockPrisma.user.findMany.mockResolvedValueOnce([]);

      await getUsers({ status: 'INACTIVE' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { status: 'INACTIVE' },
        select: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search by query', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(2);
      mockPrisma.user.findMany.mockResolvedValueOnce([]);

      await getUsers({ query: 'test' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { email: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        select: expect.any(Object),
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should sort by specified field', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(1);
      mockPrisma.user.findMany.mockResolvedValueOnce([]);

      await getUsers({ sortBy: 'name', sortOrder: 'asc' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      mockPrisma.user.update.mockResolvedValueOnce({ ...mockDbUser, name: 'Updated Name' });

      const result = await updateUser(BigInt(1), { name: 'Updated Name' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { name: 'Updated Name' },
        select: expect.any(Object),
      });
      expect(result.name).toBe('Updated Name');
    });

    it('should hash password when updating', async () => {
      mockBcrypt.hash.mockResolvedValueOnce('new_hashed_password' as never);
      mockPrisma.user.update.mockResolvedValueOnce(mockDbUser);

      await updateUser(BigInt(1), { password: 'NewPassword123' });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { passwordHash: 'new_hashed_password' },
        select: expect.any(Object),
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      mockPrisma.user.delete.mockResolvedValueOnce(mockDbUser);

      await deleteUser(BigInt(1));

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is correct', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ passwordHash: 'old_hash' });
      mockBcrypt.compare.mockResolvedValueOnce(true as never);
      mockBcrypt.hash.mockResolvedValueOnce('new_hash' as never);
      mockPrisma.user.update.mockResolvedValueOnce(mockDbUser);

      const result = await changePassword(BigInt(1), 'OldPassword123', 'NewPassword123');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('OldPassword123', 'old_hash');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123', 12);
      expect(result.success).toBe(true);
    });

    it('should return error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await changePassword(BigInt(999), 'OldPassword123', 'NewPassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ユーザーが見つかりません。');
    });

    it('should return error when current password is incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ passwordHash: 'old_hash' });
      mockBcrypt.compare.mockResolvedValueOnce(false as never);

      const result = await changePassword(BigInt(1), 'WrongPassword123', 'NewPassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('現在のパスワードが正しくありません。');
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email is taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: BigInt(2) });

      const result = await isEmailTaken('existing@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email is not taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await isEmailTaken('new@example.com');

      expect(result).toBe(false);
    });

    it('should return false when email belongs to excluded user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: BigInt(1) });

      const result = await isEmailTaken('user@example.com', BigInt(1));

      expect(result).toBe(false);
    });

    it('should return true when email belongs to different user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: BigInt(2) });

      const result = await isEmailTaken('user@example.com', BigInt(1));

      expect(result).toBe(true);
    });
  });
});
