import { describe, it, expect, vi, beforeEach } from 'vitest';

// モック設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/test-case-repository', () => ({
  createTestCase: vi.fn(),
  getTestCases: vi.fn(),
  getTestCaseById: vi.fn(),
  updateTestCase: vi.fn(),
  deleteTestCase: vi.fn(),
  testSpecExists: vi.fn(),
  isTestSpecLocked: vi.fn(),
  sectionExists: vi.fn(),
  isTestCaseTitleTaken: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logTestCaseCreate: vi.fn(),
  logTestCaseUpdate: vi.fn(),
  logTestCaseDelete: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  createTestCase,
  getTestCases,
  getTestCaseById,
  updateTestCase,
  deleteTestCase,
  testSpecExists,
  isTestSpecLocked,
  sectionExists,
  isTestCaseTitleTaken,
} from '@/lib/repositories/test-case-repository';
import { logTestCaseCreate, logTestCaseUpdate, logTestCaseDelete } from '@/lib/audit';
import { GET, POST } from '../route';
import { GET as GET_SINGLE, PATCH, DELETE } from '../[caseId]/route';

const mockAuth = vi.mocked(auth);
const mockCreateTestCase = vi.mocked(createTestCase);
const mockGetTestCases = vi.mocked(getTestCases);
const mockGetTestCaseById = vi.mocked(getTestCaseById);
const mockUpdateTestCase = vi.mocked(updateTestCase);
const mockDeleteTestCase = vi.mocked(deleteTestCase);
const mockTestSpecExists = vi.mocked(testSpecExists);
const mockIsTestSpecLocked = vi.mocked(isTestSpecLocked);
const mockSectionExists = vi.mocked(sectionExists);
const mockIsTestCaseTitleTaken = vi.mocked(isTestCaseTitleTaken);
const mockLogTestCaseCreate = vi.mocked(logTestCaseCreate);
const mockLogTestCaseUpdate = vi.mocked(logTestCaseUpdate);
const mockLogTestCaseDelete = vi.mocked(logTestCaseDelete);

describe('Test Cases API', () => {
  const mockSession = {
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    expires: '2024-12-31T23:59:59.999Z',
  };

  const mockTestCase = {
    id: '1',
    testSpecId: '100',
    sectionId: '10',
    title: 'Test Case 1',
    description: 'Description',
    preconditions: 'Preconditions',
    priority: 'MEDIUM' as const,
    testType: 'FUNCTIONAL' as const,
    testTechnique: 'OTHER' as const,
    isMatrix: false,
    sortOrder: 0,
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-02T12:00:00Z',
  };

  const mockTestCaseDetail = {
    ...mockTestCase,
    section: { id: '10', name: 'Section 1' },
    testSpec: { id: '100', name: 'Test Spec 1' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    mockTestSpecExists.mockResolvedValue(true);
    mockIsTestSpecLocked.mockResolvedValue(false);
  });

  describe('GET /api/test-specs/[id]/cases', () => {
    it('should return test cases list', async () => {
      mockGetTestCases.mockResolvedValueOnce({
        testCases: [mockTestCase],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new Request('http://localhost/api/test-specs/100/cases');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.testCases).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should return 401 for unauthenticated request', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/100/cases');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 for non-existent test spec', async () => {
      mockTestSpecExists.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/test-specs/999/cases');
      const response = await GET(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テスト仕様書が見つかりません。');
    });

    it('should filter by sectionId', async () => {
      mockGetTestCases.mockResolvedValueOnce({
        testCases: [mockTestCase],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new Request('http://localhost/api/test-specs/100/cases?sectionId=10');
      await GET(request, { params: Promise.resolve({ id: '100' }) });

      expect(mockGetTestCases).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionId: '10',
        })
      );
    });

    it('should filter by priority', async () => {
      mockGetTestCases.mockResolvedValueOnce({
        testCases: [mockTestCase],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new Request('http://localhost/api/test-specs/100/cases?priority=HIGH');
      await GET(request, { params: Promise.resolve({ id: '100' }) });

      expect(mockGetTestCases).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'HIGH',
        })
      );
    });
  });

  describe('POST /api/test-specs/[id]/cases', () => {
    it('should create a new test case', async () => {
      mockSectionExists.mockResolvedValueOnce(true);
      mockIsTestCaseTitleTaken.mockResolvedValueOnce(false);
      mockCreateTestCase.mockResolvedValueOnce(mockTestCase);

      const request = new Request('http://localhost/api/test-specs/100/cases', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: '10',
          title: 'Test Case 1',
          description: 'Description',
          priority: 'MEDIUM',
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('Test Case 1');
      expect(mockLogTestCaseCreate).toHaveBeenCalled();
    });

    it('should return 400 for invalid input', async () => {
      const request = new Request('http://localhost/api/test-specs/100/cases', {
        method: 'POST',
        body: JSON.stringify({
          title: '', // empty title
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('テストケースタイトルは必須です');
    });

    it('should return 403 for locked test spec', async () => {
      mockIsTestSpecLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/100/cases', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Case 1',
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('ロックされているテスト仕様書にテストケースを追加できません。');
    });

    it('should return 404 for non-existent section', async () => {
      mockSectionExists.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/test-specs/100/cases', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: '999',
          title: 'Test Case 1',
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('セクションが見つかりません。');
    });

    it('should return 409 for duplicate title', async () => {
      mockIsTestCaseTitleTaken.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/100/cases', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Existing Title',
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('同じセクション内に同名のテストケースが既に存在します。');
    });
  });

  describe('GET /api/test-specs/[id]/cases/[caseId]', () => {
    it('should return test case by id', async () => {
      mockGetTestCaseById.mockResolvedValueOnce(mockTestCaseDetail);

      const request = new Request('http://localhost/api/test-specs/100/cases/1');
      const response = await GET_SINGLE(request, {
        params: Promise.resolve({ id: '100', caseId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('1');
      expect(data.section.name).toBe('Section 1');
    });

    it('should return 404 for non-existent test case', async () => {
      mockGetTestCaseById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/100/cases/999');
      const response = await GET_SINGLE(request, {
        params: Promise.resolve({ id: '100', caseId: '999' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テストケースが見つかりません。');
    });

    it('should return 400 if test case does not belong to test spec', async () => {
      mockGetTestCaseById.mockResolvedValueOnce({
        ...mockTestCaseDetail,
        testSpecId: '200', // different test spec
      });

      const request = new Request('http://localhost/api/test-specs/100/cases/1');
      const response = await GET_SINGLE(request, {
        params: Promise.resolve({ id: '100', caseId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('テストケースは指定されたテスト仕様書に属していません。');
    });
  });

  describe('PATCH /api/test-specs/[id]/cases/[caseId]', () => {
    it('should update test case', async () => {
      mockGetTestCaseById.mockResolvedValueOnce(mockTestCaseDetail);
      mockUpdateTestCase.mockResolvedValueOnce({
        ...mockTestCase,
        title: 'Updated Title',
      });

      const request = new Request('http://localhost/api/test-specs/100/cases/1', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Title',
        }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '100', caseId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
      expect(mockLogTestCaseUpdate).toHaveBeenCalled();
    });

    it('should return 403 for locked test spec', async () => {
      mockIsTestSpecLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/100/cases/1', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Updated Title',
        }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '100', caseId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('ロックされているテスト仕様書のテストケースは更新できません。');
    });

    it('should check for duplicate title on update', async () => {
      mockGetTestCaseById.mockResolvedValueOnce(mockTestCaseDetail);
      mockIsTestCaseTitleTaken.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/100/cases/1', {
        method: 'PATCH',
        body: JSON.stringify({
          title: 'Existing Title',
        }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '100', caseId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('同じセクション内に同名のテストケースが既に存在します。');
    });
  });

  describe('DELETE /api/test-specs/[id]/cases/[caseId]', () => {
    it('should delete test case', async () => {
      mockGetTestCaseById.mockResolvedValueOnce(mockTestCaseDetail);
      mockDeleteTestCase.mockResolvedValueOnce({ success: true });

      const request = new Request('http://localhost/api/test-specs/100/cases/1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', caseId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockLogTestCaseDelete).toHaveBeenCalled();
    });

    it('should return 403 for locked test spec', async () => {
      mockIsTestSpecLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/100/cases/1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', caseId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('ロックされているテスト仕様書のテストケースは削除できません。');
    });

    it('should return 404 for non-existent test case', async () => {
      mockGetTestCaseById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/100/cases/999', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', caseId: '999' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テストケースが見つかりません。');
    });
  });
});
