import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/user-repository', () => ({
  createUser: vi.fn(),
  getUsers: vi.fn(),
  getUserById: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  changePassword: vi.fn(),
  isEmailTaken: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  isEmailTaken,
} from '@/lib/repositories/user-repository';
import { GET, POST } from '../route';
import { GET as GET_USER, PUT, DELETE } from '../[id]/route';
import { PUT as CHANGE_PASSWORD } from '../[id]/password/route';

const mockAuth = vi.mocked(auth);
const mockCreateUser = vi.mocked(createUser);
const mockGetUsers = vi.mocked(getUsers);
const mockGetUserById = vi.mocked(getUserById);
const mockUpdateUser = vi.mocked(updateUser);
const mockDeleteUser = vi.mocked(deleteUser);
const mockChangePassword = vi.mocked(changePassword);
const mockIsEmailTaken = vi.mocked(isEmailTaken);

describe('User CRUD API', () => {
  const mockSession = {
    user: { id: '1', email: 'admin@example.com', name: 'Admin User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockUser = {
    id: '1',
    email: 'user@example.com',
    name: 'Test User',
    status: 'ACTIVE' as const,
    emailVerified: null,
    image: null,
    mfaEnabled: false,
    mfaType: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockUserDetail = {
    ...mockUser,
    _count: {
      projectMembers: 2,
      userGroups: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/users');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return users list when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUsers.mockResolvedValueOnce({
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new Request('http://localhost/api/users');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
      expect(data.users[0].email).toBe('user@example.com');
      expect(data.total).toBe(1);
    });

    it('should pass search params to repository', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUsers.mockResolvedValueOnce({
        users: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
      });

      const request = new Request(
        'http://localhost/api/users?query=test&status=ACTIVE&page=2&limit=10&sortBy=name&sortOrder=asc'
      );

      await GET(request);

      expect(mockGetUsers).toHaveBeenCalledWith({
        query: 'test',
        status: 'ACTIVE',
        page: 2,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });
  });

  describe('POST /api/users', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when required fields are missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('メールアドレス、名前、パスワードは必須です。');
    });

    it('should return 400 when email format is invalid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          name: 'Test',
          password: 'Password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('メールアドレスの形式が正しくありません。');
    });

    it('should return 400 when email is already taken', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockIsEmailTaken.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          name: 'Test',
          password: 'Password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このメールアドレスは既に使用されています。');
    });

    it('should return 400 when password is too weak', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockIsEmailTaken.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test',
          password: 'weak',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('パスワードは8文字以上');
    });

    it('should create user when valid data is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockIsEmailTaken.mockResolvedValueOnce(false);
      mockCreateUser.mockResolvedValueOnce(mockUser);

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          name: 'New User',
          password: 'Password123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.email).toBe('user@example.com');
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'New User',
        password: 'Password123',
        status: undefined,
      });
    });
  });

  describe('GET /api/users/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/users/1');

      const response = await GET_USER(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when id is invalid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/users/invalid');

      const response = await GET_USER(request, { params: Promise.resolve({ id: 'invalid' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('無効なユーザーIDです。');
    });

    it('should return 404 when user not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/users/999');

      const response = await GET_USER(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ユーザーが見つかりません。');
    });

    it('should return user when found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(mockUserDetail);

      const request = new Request('http://localhost/api/users/1');

      const response = await GET_USER(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.email).toBe('user@example.com');
      expect(data._count.projectMembers).toBe(2);
    });
  });

  describe('PUT /api/users/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/users/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when user not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/users/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ユーザーが見つかりません。');
    });

    it('should update user when valid data is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(mockUserDetail);
      mockUpdateUser.mockResolvedValueOnce({ ...mockUser, name: 'Updated User' });

      const request = new Request('http://localhost/api/users/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated User' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated User');
    });

    it('should return 400 when email is already taken by another user', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(mockUserDetail);
      mockIsEmailTaken.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/users/1', {
        method: 'PUT',
        body: JSON.stringify({ email: 'existing@example.com' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このメールアドレスは既に使用されています。');
    });
  });

  describe('DELETE /api/users/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/users/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when user not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/users/999', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ユーザーが見つかりません。');
    });

    it('should return 400 when trying to delete self', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(mockUserDetail);

      const request = new Request('http://localhost/api/users/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('自分自身を削除することはできません。');
    });

    it('should delete user when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce({ ...mockUserDetail, id: '2' });
      mockDeleteUser.mockResolvedValueOnce(undefined);

      const request = new Request('http://localhost/api/users/2', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '2' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('ユーザーを削除しました。');
    });
  });

  describe('PUT /api/users/[id]/password', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/users/1/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword123',
        }),
      });

      const response = await CHANGE_PASSWORD(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 403 when trying to change another user password', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/users/2/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword123',
        }),
      });

      const response = await CHANGE_PASSWORD(request, { params: Promise.resolve({ id: '2' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('他のユーザーのパスワードは変更できません。');
    });

    it('should return 400 when passwords are missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(mockUserDetail);

      const request = new Request('http://localhost/api/users/1/password', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const response = await CHANGE_PASSWORD(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('現在のパスワードと新しいパスワードは必須です。');
    });

    it('should return 400 when new password is the same as current', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(mockUserDetail);

      const request = new Request('http://localhost/api/users/1/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'Password123',
          newPassword: 'Password123',
        }),
      });

      const response = await CHANGE_PASSWORD(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('新しいパスワードは現在のパスワードと異なる必要があります。');
    });

    it('should change password when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(mockUserDetail);
      mockChangePassword.mockResolvedValueOnce({ success: true });

      const request = new Request('http://localhost/api/users/1/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'OldPassword123',
          newPassword: 'NewPassword123',
        }),
      });

      const response = await CHANGE_PASSWORD(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('パスワードを変更しました。');
    });

    it('should return 400 when current password is incorrect', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetUserById.mockResolvedValueOnce(mockUserDetail);
      mockChangePassword.mockResolvedValueOnce({
        success: false,
        error: '現在のパスワードが正しくありません。',
      });

      const request = new Request('http://localhost/api/users/1/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'WrongPassword123',
          newPassword: 'NewPassword123',
        }),
      });

      const response = await CHANGE_PASSWORD(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('現在のパスワードが正しくありません。');
    });
  });
});
