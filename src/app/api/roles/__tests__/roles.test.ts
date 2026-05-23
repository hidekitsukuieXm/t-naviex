import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/role-repository', () => ({
  getRoles: vi.fn(),
  createRole: vi.fn(),
  getRoleById: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  isRoleNameTaken: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  getRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
  isRoleNameTaken,
} from '@/lib/repositories/role-repository';
import { GET, POST } from '../route';
import { GET as GET_ROLE, PUT, DELETE } from '../[id]/route';

const mockAuth = vi.mocked(auth);
const mockGetRoles = vi.mocked(getRoles);
const mockCreateRole = vi.mocked(createRole);
const mockGetRoleById = vi.mocked(getRoleById);
const mockUpdateRole = vi.mocked(updateRole);
const mockDeleteRole = vi.mocked(deleteRole);
const mockIsRoleNameTaken = vi.mocked(isRoleNameTaken);

describe('Role API', () => {
  const mockSession = {
    user: { id: '1', email: 'admin@example.com', name: 'Admin User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockRole = {
    id: '1',
    name: 'CUSTOM_ROLE',
    displayName: 'カスタムロール',
    description: 'カスタムロールの説明',
    permissions: {
      projects: ['read', 'update'],
      testCases: ['create', 'read', 'update'],
    },
    isSystemRole: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockSystemRole = {
    ...mockRole,
    id: '2',
    name: 'SYSTEM_ADMIN',
    displayName: 'システム管理者',
    isSystemRole: true,
  };

  const mockRoleWithCount = {
    ...mockRole,
    _count: {
      projectMembers: 5,
    },
  };

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

    it('should return roles list when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetRoles.mockResolvedValueOnce({
        roles: [mockSystemRole, mockRole],
        total: 2,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.roles).toHaveLength(2);
      expect(data.total).toBe(2);
    });
  });

  describe('POST /api/roles', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/roles', {
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

      const request = new Request('http://localhost/api/roles', {
        method: 'POST',
        body: JSON.stringify({ name: 'TEST' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ロール名と表示名は必須です。');
    });

    it('should return 400 when name format is invalid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Invalid Name',
          displayName: 'テスト',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('英数字、アンダースコア、ハイフン');
    });

    it('should return 400 when using system role name', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: 'SYSTEM_ADMIN',
          displayName: 'テスト',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このロール名はシステムで予約されています。');
    });

    it('should return 400 when name is already taken', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockIsRoleNameTaken.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: 'EXISTING_ROLE',
          displayName: 'テスト',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このロール名は既に使用されています。');
    });

    it('should create role when valid data is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockIsRoleNameTaken.mockResolvedValueOnce(false);
      mockCreateRole.mockResolvedValueOnce(mockRole);

      const request = new Request('http://localhost/api/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: 'CUSTOM_ROLE',
          displayName: 'カスタムロール',
          description: 'カスタムロールの説明',
          permissions: { projects: ['read', 'update'] },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('CUSTOM_ROLE');
      expect(mockCreateRole).toHaveBeenCalledWith({
        name: 'CUSTOM_ROLE',
        displayName: 'カスタムロール',
        description: 'カスタムロールの説明',
        permissions: { projects: ['read', 'update'] },
      });
    });
  });

  describe('GET /api/roles/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/roles/1');

      const response = await GET_ROLE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when id is invalid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/roles/invalid');

      const response = await GET_ROLE(request, { params: Promise.resolve({ id: 'invalid' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('無効なロールIDです。');
    });

    it('should return 404 when role not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetRoleById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/roles/999');

      const response = await GET_ROLE(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ロールが見つかりません。');
    });

    it('should return role when found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetRoleById.mockResolvedValueOnce(mockRoleWithCount);

      const request = new Request('http://localhost/api/roles/1');

      const response = await GET_ROLE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('CUSTOM_ROLE');
      expect(data._count.projectMembers).toBe(5);
    });
  });

  describe('PUT /api/roles/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/roles/1', {
        method: 'PUT',
        body: JSON.stringify({ displayName: 'Updated' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when role not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetRoleById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/roles/999', {
        method: 'PUT',
        body: JSON.stringify({ displayName: 'Updated' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ロールが見つかりません。');
    });

    it('should return 400 when trying to change system role name', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetRoleById.mockResolvedValueOnce(mockSystemRole);

      const request = new Request('http://localhost/api/roles/2', {
        method: 'PUT',
        body: JSON.stringify({ name: 'NEW_NAME' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '2' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('システムロールの名前は変更できません。');
    });

    it('should update role when valid data is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetRoleById.mockResolvedValueOnce(mockRole);
      mockUpdateRole.mockResolvedValueOnce({ ...mockRole, displayName: '更新後の名前' });

      const request = new Request('http://localhost/api/roles/1', {
        method: 'PUT',
        body: JSON.stringify({ displayName: '更新後の名前' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.displayName).toBe('更新後の名前');
    });

    it('should update permissions', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetRoleById.mockResolvedValueOnce(mockRole);
      mockUpdateRole.mockResolvedValueOnce({
        ...mockRole,
        permissions: { projects: ['create', 'read', 'update', 'delete'] },
      });

      const request = new Request('http://localhost/api/roles/1', {
        method: 'PUT',
        body: JSON.stringify({
          permissions: { projects: ['create', 'read', 'update', 'delete'] },
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.permissions.projects).toContain('delete');
    });
  });

  describe('DELETE /api/roles/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/roles/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when role not found or is system role', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockDeleteRole.mockResolvedValueOnce({
        success: false,
        error: 'システムロールは削除できません。',
      });

      const request = new Request('http://localhost/api/roles/2', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '2' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('システムロールは削除できません。');
    });

    it('should return 400 when role is in use', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockDeleteRole.mockResolvedValueOnce({
        success: false,
        error: 'このロールは3件のプロジェクトメンバーに割り当てられているため削除できません。',
      });

      const request = new Request('http://localhost/api/roles/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('プロジェクトメンバーに割り当てられている');
    });

    it('should delete role when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockDeleteRole.mockResolvedValueOnce({ success: true });

      const request = new Request('http://localhost/api/roles/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('ロールを削除しました。');
    });
  });
});
