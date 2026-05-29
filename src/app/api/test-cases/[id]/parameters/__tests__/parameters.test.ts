import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    testParameter: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    testCase: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { GET, POST } from '../route';
import { GET as GET_PARAM, PUT, DELETE } from '../[parameterId]/route';

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(prisma.testParameter.findMany);
const mockFindUnique = vi.mocked(prisma.testParameter.findUnique);
const mockCreate = vi.mocked(prisma.testParameter.create);
const mockUpdate = vi.mocked(prisma.testParameter.update);
const mockDelete = vi.mocked(prisma.testParameter.delete);
const mockFindTestCase = vi.mocked(prisma.testCase.findUnique);
const mockLogAudit = vi.mocked(logAudit);

describe('Test Parameters API', () => {
  const mockSession = {
    user: { id: '1', email: 'user@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockTestParameter = {
    id: BigInt(1),
    testCaseId: BigInt(100),
    name: 'browser',
    description: 'ブラウザ種別',
    values: ['Chrome', 'Firefox', 'Safari'],
    isRequired: true,
    sortOrder: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const mockTestCase = {
    id: BigInt(100),
    name: 'テストケース1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/test-cases/[id]/parameters', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-cases/100/parameters');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return parameters when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindMany.mockResolvedValueOnce([mockTestParameter]);

      const request = new Request('http://localhost/api/test-cases/100/parameters');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.parameters).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.parameters[0].name).toBe('browser');
    });
  });

  describe('POST /api/test-cases/[id]/parameters', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-cases/100/parameters', {
        method: 'POST',
        body: JSON.stringify({ name: 'browser' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when name is missing', async () => {
      mockAuth.mockReset();
      mockFindTestCase.mockReset();
      mockAuth.mockResolvedValue(mockSession);
      mockFindTestCase.mockResolvedValue(mockTestCase);

      const request = new Request('http://localhost/api/test-cases/100/parameters', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('パラメーター名は必須です');
    });

    it('should return 404 when test case not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindTestCase.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-cases/999/parameters', {
        method: 'POST',
        body: JSON.stringify({ name: 'browser' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テストケースが見つかりません。');
    });

    it('should return 400 when duplicate parameter name exists', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindTestCase.mockResolvedValueOnce(mockTestCase);
      mockFindUnique.mockResolvedValueOnce(mockTestParameter);

      const request = new Request('http://localhost/api/test-cases/100/parameters', {
        method: 'POST',
        body: JSON.stringify({ name: 'browser' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このパラメーター名は既に使用されています。');
    });

    it('should create parameter when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindTestCase.mockResolvedValueOnce(mockTestCase);
      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce(mockTestParameter);

      const request = new Request('http://localhost/api/test-cases/100/parameters', {
        method: 'POST',
        body: JSON.stringify({
          name: 'browser',
          description: 'ブラウザ種別',
          values: ['Chrome', 'Firefox', 'Safari'],
          isRequired: true,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('browser');
      expect(data.values).toContain('Chrome');
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });

  describe('GET /api/test-cases/[id]/parameters/[parameterId]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-cases/100/parameters/1');
      const response = await GET_PARAM(request, {
        params: Promise.resolve({ id: '100', parameterId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when parameter not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-cases/100/parameters/999');
      const response = await GET_PARAM(request, {
        params: Promise.resolve({ id: '100', parameterId: '999' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テストパラメーターが見つかりません。');
    });

    it('should return parameter when found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique.mockResolvedValueOnce(mockTestParameter);

      const request = new Request('http://localhost/api/test-cases/100/parameters/1');
      const response = await GET_PARAM(request, {
        params: Promise.resolve({ id: '100', parameterId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('browser');
    });
  });

  describe('PUT /api/test-cases/[id]/parameters/[parameterId]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-cases/100/parameters/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'updated' }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: '100', parameterId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should update parameter when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindUnique
        .mockResolvedValueOnce(mockTestParameter) // 存在確認
        .mockResolvedValueOnce(null); // 重複確認
      mockUpdate.mockResolvedValueOnce({
        ...mockTestParameter,
        values: ['Chrome', 'Firefox', 'Safari', 'Edge'],
      });

      const request = new Request('http://localhost/api/test-cases/100/parameters/1', {
        method: 'PUT',
        body: JSON.stringify({ values: ['Chrome', 'Firefox', 'Safari', 'Edge'] }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: '100', parameterId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.values).toContain('Edge');
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/test-cases/[id]/parameters/[parameterId]', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-cases/100/parameters/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', parameterId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should delete parameter when valid', async () => {
      mockAuth.mockReset();
      mockFindUnique.mockReset();
      mockDelete.mockReset();
      mockAuth.mockResolvedValue(mockSession);
      mockFindUnique.mockResolvedValue(mockTestParameter);
      mockDelete.mockResolvedValue(mockTestParameter);

      const request = new Request('http://localhost/api/test-cases/100/parameters/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', parameterId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('テストパラメーターを削除しました。');
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });
});
