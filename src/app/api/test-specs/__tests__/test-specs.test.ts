import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/test-spec-repository', () => ({
  createTestSpec: vi.fn(),
  getTestSpecs: vi.fn(),
  getTestSpecById: vi.fn(),
  updateTestSpec: vi.fn(),
  deleteTestSpec: vi.fn(),
  createTestSpecVersion: vi.fn(),
  getTestSpecVersions: vi.fn(),
  isTestSpecNameTaken: vi.fn(),
  projectExists: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logTestSpecCreate: vi.fn(),
  logTestSpecUpdate: vi.fn(),
  logTestSpecDelete: vi.fn(),
  logTestSpecVersionCreate: vi.fn(),
  logTestSpecLock: vi.fn(),
  logTestSpecUnlock: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  createTestSpec,
  getTestSpecs,
  getTestSpecById,
  updateTestSpec,
  deleteTestSpec,
  createTestSpecVersion,
  getTestSpecVersions,
  isTestSpecNameTaken,
  projectExists,
} from '@/lib/repositories/test-spec-repository';
import { GET, POST } from '../route';
import { GET as GET_BY_ID, PUT, DELETE } from '../[id]/route';
import { GET as GET_VERSIONS, POST as CREATE_VERSION } from '../[id]/versions/route';

const mockAuth = vi.mocked(auth);
const mockCreateTestSpec = vi.mocked(createTestSpec);
const mockGetTestSpecs = vi.mocked(getTestSpecs);
const mockGetTestSpecById = vi.mocked(getTestSpecById);
const mockUpdateTestSpec = vi.mocked(updateTestSpec);
const mockDeleteTestSpec = vi.mocked(deleteTestSpec);
const mockCreateTestSpecVersion = vi.mocked(createTestSpecVersion);
const mockGetTestSpecVersions = vi.mocked(getTestSpecVersions);
const mockIsTestSpecNameTaken = vi.mocked(isTestSpecNameTaken);
const mockProjectExists = vi.mocked(projectExists);

describe('Test Spec API', () => {
  const mockSession = {
    user: { id: '1', email: 'user@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockTestSpec = {
    id: '1',
    projectId: '10',
    name: 'Test Spec 1',
    description: 'Test description',
    status: 'DRAFT' as const,
    version: '1.0.0',
    isLocked: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    _count: { versions: 1 },
  };

  const mockTestSpecDetail = {
    ...mockTestSpec,
    project: { id: '10', name: 'Test Project' },
    versions: [
      {
        id: '100',
        testSpecId: '1',
        version: '1.0.0',
        changeNote: '初期作成',
        createdBy: '1',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ],
  };

  const mockVersion = {
    id: '100',
    testSpecId: '1',
    version: '1.0.0',
    changeNote: '初期作成',
    createdBy: '1',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/test-specs', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs?projectId=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/test-specs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('プロジェクトIDは必須です。');
    });

    it('should return test specs list', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSpecs.mockResolvedValueOnce({
        testSpecs: [mockTestSpec],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new Request('http://localhost/api/test-specs?projectId=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.testSpecs).toHaveLength(1);
      expect(data.total).toBe(1);
    });
  });

  describe('POST /api/test-specs', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs', {
        method: 'POST',
        body: JSON.stringify({ projectId: '10', name: 'Test Spec' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/test-specs', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Spec' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('プロジェクトIDは必須です。');
    });

    it('should return 400 when name is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/test-specs', {
        method: 'POST',
        body: JSON.stringify({ projectId: '10' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('テスト仕様書名は必須です。');
    });

    it('should return 404 when project not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockProjectExists.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/test-specs', {
        method: 'POST',
        body: JSON.stringify({ projectId: '10', name: 'Test Spec' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('指定されたプロジェクトが見つかりません。');
    });

    it('should return 409 when name is already taken', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockProjectExists.mockResolvedValueOnce(true);
      mockIsTestSpecNameTaken.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs', {
        method: 'POST',
        body: JSON.stringify({ projectId: '10', name: 'Existing Name' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('同名のテスト仕様書が既に存在');
    });

    it('should create test spec successfully', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockProjectExists.mockResolvedValueOnce(true);
      mockIsTestSpecNameTaken.mockResolvedValueOnce(false);
      mockCreateTestSpec.mockResolvedValueOnce(mockTestSpec);

      const request = new Request('http://localhost/api/test-specs', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '10',
          name: 'Test Spec 1',
          description: 'Test description',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('1');
      expect(data.name).toBe('Test Spec 1');
    });
  });

  describe('GET /api/test-specs/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/1');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSpecById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/999');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テスト仕様書が見つかりません。');
    });

    it('should return test spec detail', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSpecById.mockResolvedValueOnce(mockTestSpecDetail);

      const request = new Request('http://localhost/api/test-specs/1');
      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('1');
      expect(data.versions).toHaveLength(1);
    });
  });

  describe('PUT /api/test-specs/[id]', () => {
    it('should update test spec', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSpecById.mockResolvedValueOnce(mockTestSpecDetail);
      mockUpdateTestSpec.mockResolvedValueOnce({
        ...mockTestSpec,
        name: 'Updated Name',
      });

      const request = new Request('http://localhost/api/test-specs/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Name');
    });

    it('should return 409 when name is already taken', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSpecById.mockResolvedValueOnce(mockTestSpecDetail);
      mockIsTestSpecNameTaken.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Existing Name' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('同名のテスト仕様書が既に存在');
    });
  });

  describe('DELETE /api/test-specs/[id]', () => {
    it('should delete test spec', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockDeleteTestSpec.mockResolvedValueOnce({ success: true });

      const request = new Request('http://localhost/api/test-specs/1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 when not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockDeleteTestSpec.mockResolvedValueOnce({
        success: false,
        error: 'テスト仕様書が見つかりません。',
      });

      const request = new Request('http://localhost/api/test-specs/999', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テスト仕様書が見つかりません。');
    });

    it('should return 403 when locked', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockDeleteTestSpec.mockResolvedValueOnce({
        success: false,
        error: 'ロックされているテスト仕様書は削除できません。',
      });

      const request = new Request('http://localhost/api/test-specs/1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('ロック');
    });
  });

  describe('GET /api/test-specs/[id]/versions', () => {
    it('should return version history', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSpecById.mockResolvedValueOnce(mockTestSpecDetail);
      mockGetTestSpecVersions.mockResolvedValueOnce([mockVersion]);

      const request = new Request('http://localhost/api/test-specs/1/versions');
      const response = await GET_VERSIONS(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.versions).toHaveLength(1);
      expect(data.currentVersion).toBe('1.0.0');
    });
  });

  describe('POST /api/test-specs/[id]/versions', () => {
    it('should create new version', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSpecById.mockResolvedValueOnce(mockTestSpecDetail);
      mockGetTestSpecVersions.mockResolvedValueOnce([mockVersion]);
      mockCreateTestSpecVersion.mockResolvedValueOnce({
        testSpec: { ...mockTestSpec, version: '1.1.0' },
        version: { ...mockVersion, id: '101', version: '1.1.0' },
      });

      const request = new Request('http://localhost/api/test-specs/1/versions', {
        method: 'POST',
        body: JSON.stringify({
          version: '1.1.0',
          changeNote: 'Minor update',
        }),
      });
      const response = await CREATE_VERSION(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.testSpec.version).toBe('1.1.0');
    });

    it('should return 400 when version is smaller or equal', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSpecById.mockResolvedValueOnce(mockTestSpecDetail);
      mockGetTestSpecVersions.mockResolvedValueOnce([mockVersion]);

      const request = new Request('http://localhost/api/test-specs/1/versions', {
        method: 'POST',
        body: JSON.stringify({
          version: '0.9.0',
          changeNote: 'Downgrade',
        }),
      });
      const response = await CREATE_VERSION(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('現在のバージョンより大きい');
    });

    it('should return 403 when locked', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSpecById.mockResolvedValueOnce({
        ...mockTestSpecDetail,
        isLocked: true,
      });

      const request = new Request('http://localhost/api/test-specs/1/versions', {
        method: 'POST',
        body: JSON.stringify({
          version: '1.1.0',
          changeNote: 'Update',
        }),
      });
      const response = await CREATE_VERSION(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('ロック');
    });
  });
});
