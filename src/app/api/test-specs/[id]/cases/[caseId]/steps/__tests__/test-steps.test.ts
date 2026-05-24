import { describe, it, expect, vi, beforeEach } from 'vitest';

// モック設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/test-step-repository', () => ({
  createTestStep: vi.fn(),
  createTestStepsBulk: vi.fn(),
  getTestSteps: vi.fn(),
  getTestStepById: vi.fn(),
  updateTestStep: vi.fn(),
  deleteTestStep: vi.fn(),
  reorderTestSteps: vi.fn(),
  testCaseExists: vi.fn(),
  isTestCaseLocked: vi.fn(),
  hasReachedMaxSteps: vi.fn(),
  getTestStepCount: vi.fn(),
  isStepNoTaken: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logTestStepCreate: vi.fn(),
  logTestStepUpdate: vi.fn(),
  logTestStepDelete: vi.fn(),
  logTestStepReorder: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  createTestStep,
  createTestStepsBulk,
  getTestSteps,
  getTestStepById,
  updateTestStep,
  deleteTestStep,
  reorderTestSteps,
  testCaseExists,
  isTestCaseLocked,
  hasReachedMaxSteps,
  getTestStepCount,
  isStepNoTaken,
} from '@/lib/repositories/test-step-repository';
import {
  logTestStepCreate,
  logTestStepUpdate,
  logTestStepDelete,
  logTestStepReorder,
} from '@/lib/audit';
import { GET, POST } from '../route';
import { GET as GET_SINGLE, PATCH, DELETE } from '../[stepId]/route';
import { PUT as REORDER } from '../reorder/route';

const mockAuth = vi.mocked(auth);
const mockCreateTestStep = vi.mocked(createTestStep);
const mockCreateTestStepsBulk = vi.mocked(createTestStepsBulk);
const mockGetTestSteps = vi.mocked(getTestSteps);
const mockGetTestStepById = vi.mocked(getTestStepById);
const mockUpdateTestStep = vi.mocked(updateTestStep);
const mockDeleteTestStep = vi.mocked(deleteTestStep);
const mockReorderTestSteps = vi.mocked(reorderTestSteps);
const mockTestCaseExists = vi.mocked(testCaseExists);
const mockIsTestCaseLocked = vi.mocked(isTestCaseLocked);
const mockHasReachedMaxSteps = vi.mocked(hasReachedMaxSteps);
const mockGetTestStepCount = vi.mocked(getTestStepCount);
const mockIsStepNoTaken = vi.mocked(isStepNoTaken);
const mockLogTestStepCreate = vi.mocked(logTestStepCreate);
const mockLogTestStepUpdate = vi.mocked(logTestStepUpdate);
const mockLogTestStepDelete = vi.mocked(logTestStepDelete);
const mockLogTestStepReorder = vi.mocked(logTestStepReorder);

describe('Test Steps API', () => {
  const mockSession = {
    user: { id: '1', email: 'test@example.com', name: 'Test User' },
    expires: '2024-12-31T23:59:59.999Z',
  };

  const mockTestStep = {
    id: '1',
    testCaseId: '100',
    stepNo: 1,
    actionMd: 'ボタンをクリックする',
    expectedMd: 'ダイアログが表示される',
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-02T12:00:00Z',
  };

  const mockTestStepDetail = {
    ...mockTestStep,
    testCase: {
      id: '100',
      title: 'Test Case 1',
      testSpecId: '1000',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    mockTestCaseExists.mockResolvedValue(true);
    mockIsTestCaseLocked.mockResolvedValue(false);
    mockHasReachedMaxSteps.mockResolvedValue(false);
  });

  describe('GET /api/test-specs/[id]/cases/[caseId]/steps', () => {
    it('should return test steps list', async () => {
      mockGetTestSteps.mockResolvedValueOnce([mockTestStep]);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps');
      const response = await GET(request, {
        params: Promise.resolve({ id: '1000', caseId: '100' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.steps).toHaveLength(1);
    });

    it('should return 401 for unauthenticated request', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps');
      const response = await GET(request, {
        params: Promise.resolve({ id: '1000', caseId: '100' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 for non-existent test case', async () => {
      mockTestCaseExists.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/test-specs/1000/cases/999/steps');
      const response = await GET(request, {
        params: Promise.resolve({ id: '1000', caseId: '999' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テストケースが見つかりません。');
    });

    it('should search by query', async () => {
      mockGetTestSteps.mockResolvedValueOnce([mockTestStep]);

      const request = new Request(
        'http://localhost/api/test-specs/1000/cases/100/steps?query=ボタン'
      );
      await GET(request, { params: Promise.resolve({ id: '1000', caseId: '100' }) });

      expect(mockGetTestSteps).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'ボタン',
        })
      );
    });
  });

  describe('POST /api/test-specs/[id]/cases/[caseId]/steps', () => {
    it('should create a new test step', async () => {
      mockCreateTestStep.mockResolvedValueOnce(mockTestStep);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps', {
        method: 'POST',
        body: JSON.stringify({
          actionMd: 'ボタンをクリックする',
          expectedMd: 'ダイアログが表示される',
        }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: '1000', caseId: '100' }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.actionMd).toBe('ボタンをクリックする');
      expect(mockLogTestStepCreate).toHaveBeenCalled();
    });

    it('should create multiple test steps in bulk', async () => {
      mockGetTestStepCount.mockResolvedValueOnce(0);
      mockCreateTestStepsBulk.mockResolvedValueOnce([
        mockTestStep,
        { ...mockTestStep, id: '2', stepNo: 2 },
      ]);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps', {
        method: 'POST',
        body: JSON.stringify({
          steps: [{ actionMd: '手順1' }, { actionMd: '手順2', expectedMd: '期待結果2' }],
        }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: '1000', caseId: '100' }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.steps).toHaveLength(2);
      expect(mockLogTestStepCreate).toHaveBeenCalled();
    });

    it('should return 400 for invalid input', async () => {
      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps', {
        method: 'POST',
        body: JSON.stringify({
          actionMd: '', // empty action
        }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: '1000', caseId: '100' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('操作手順は必須です');
    });

    it('should return 403 for locked test spec', async () => {
      mockIsTestCaseLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps', {
        method: 'POST',
        body: JSON.stringify({
          actionMd: 'ボタンをクリックする',
        }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: '1000', caseId: '100' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('ロックされているテスト仕様書にテスト手順を追加できません。');
    });

    it('should return 400 when max steps reached', async () => {
      mockHasReachedMaxSteps.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps', {
        method: 'POST',
        body: JSON.stringify({
          actionMd: 'ボタンをクリックする',
        }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ id: '1000', caseId: '100' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('手順数が上限');
    });
  });

  describe('GET /api/test-specs/[id]/cases/[caseId]/steps/[stepId]', () => {
    it('should return test step by id', async () => {
      mockGetTestStepById.mockResolvedValueOnce(mockTestStepDetail);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/1');
      const response = await GET_SINGLE(request, {
        params: Promise.resolve({ id: '1000', caseId: '100', stepId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('1');
      expect(data.testCase.title).toBe('Test Case 1');
    });

    it('should return 404 for non-existent test step', async () => {
      mockGetTestStepById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/999');
      const response = await GET_SINGLE(request, {
        params: Promise.resolve({ id: '1000', caseId: '100', stepId: '999' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テスト手順が見つかりません。');
    });

    it('should return 400 if test step does not belong to test case', async () => {
      mockGetTestStepById.mockResolvedValueOnce({
        ...mockTestStepDetail,
        testCaseId: '200', // different test case
      });

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/1');
      const response = await GET_SINGLE(request, {
        params: Promise.resolve({ id: '1000', caseId: '100', stepId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('テスト手順は指定されたテストケースに属していません。');
    });
  });

  describe('PATCH /api/test-specs/[id]/cases/[caseId]/steps/[stepId]', () => {
    it('should update test step', async () => {
      mockGetTestStepById.mockResolvedValueOnce(mockTestStepDetail);
      mockUpdateTestStep.mockResolvedValueOnce({
        ...mockTestStep,
        actionMd: '更新されたアクション',
      });

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/1', {
        method: 'PATCH',
        body: JSON.stringify({
          actionMd: '更新されたアクション',
        }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '1000', caseId: '100', stepId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.actionMd).toBe('更新されたアクション');
      expect(mockLogTestStepUpdate).toHaveBeenCalled();
    });

    it('should return 403 for locked test spec', async () => {
      mockIsTestCaseLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/1', {
        method: 'PATCH',
        body: JSON.stringify({
          actionMd: '更新されたアクション',
        }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '1000', caseId: '100', stepId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('ロックされているテスト仕様書のテスト手順は更新できません。');
    });

    it('should check for duplicate step number on update', async () => {
      mockGetTestStepById.mockResolvedValueOnce(mockTestStepDetail);
      mockIsStepNoTaken.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/1', {
        method: 'PATCH',
        body: JSON.stringify({
          stepNo: 2,
        }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: '1000', caseId: '100', stepId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('指定された手順番号は既に使用されています。');
    });
  });

  describe('DELETE /api/test-specs/[id]/cases/[caseId]/steps/[stepId]', () => {
    it('should delete test step', async () => {
      mockGetTestStepById.mockResolvedValueOnce(mockTestStepDetail);
      mockDeleteTestStep.mockResolvedValueOnce({ success: true });

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '1000', caseId: '100', stepId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockLogTestStepDelete).toHaveBeenCalled();
    });

    it('should return 403 for locked test spec', async () => {
      mockIsTestCaseLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '1000', caseId: '100', stepId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('ロックされているテスト仕様書のテスト手順は削除できません。');
    });

    it('should return 404 for non-existent test step', async () => {
      mockGetTestStepById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/999', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '1000', caseId: '100', stepId: '999' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テスト手順が見つかりません。');
    });
  });

  describe('PUT /api/test-specs/[id]/cases/[caseId]/steps/reorder', () => {
    it('should reorder test steps', async () => {
      mockReorderTestSteps.mockResolvedValueOnce([
        { ...mockTestStep, stepNo: 2 },
        { ...mockTestStep, id: '2', stepNo: 1 },
      ]);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          items: [
            { id: '1', stepNo: 2 },
            { id: '2', stepNo: 1 },
          ],
        }),
      });
      const response = await REORDER(request, {
        params: Promise.resolve({ id: '1000', caseId: '100' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.steps).toHaveLength(2);
      expect(mockLogTestStepReorder).toHaveBeenCalled();
    });

    it('should return 400 for invalid input', async () => {
      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          items: [], // empty items
        }),
      });
      const response = await REORDER(request, {
        params: Promise.resolve({ id: '1000', caseId: '100' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('並び替えデータが空です');
    });

    it('should return 403 for locked test spec', async () => {
      mockIsTestCaseLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/1000/cases/100/steps/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          items: [{ id: '1', stepNo: 2 }],
        }),
      });
      const response = await REORDER(request, {
        params: Promise.resolve({ id: '1000', caseId: '100' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('ロックされているテスト仕様書のテスト手順は並び替えできません。');
    });
  });
});
