import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    testRunAuditReview: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    testRun: {
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
import { GET, POST, PUT } from '../route';

const mockAuth = vi.mocked(auth);
const mockFindMany = vi.mocked(prisma.testRunAuditReview.findMany);
const mockFindFirst = vi.mocked(prisma.testRunAuditReview.findFirst);
const mockFindUnique = vi.mocked(prisma.testRunAuditReview.findUnique);
const mockCreate = vi.mocked(prisma.testRunAuditReview.create);
const mockUpdate = vi.mocked(prisma.testRunAuditReview.update);
const mockFindTestRun = vi.mocked(prisma.testRun.findUnique);
const mockLogAudit = vi.mocked(logAudit);

describe('Audit Review API', () => {
  const mockSession = {
    user: { id: '1', email: 'user@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockReviewerSession = {
    user: { id: '2', email: 'reviewer@example.com', name: 'Reviewer User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockAuditReview = {
    id: BigInt(1),
    testRunId: BigInt(100),
    requesterId: BigInt(1),
    reviewerId: null,
    status: 'PENDING',
    comment: 'レビューお願いします',
    reviewComment: null,
    reviewedAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const mockApprovedReview = {
    ...mockAuditReview,
    reviewerId: BigInt(2),
    status: 'APPROVED',
    reviewComment: '承認しました',
    reviewedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  const mockTestRun = {
    id: BigInt(100),
    name: 'テストラン1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/test-runs/[id]/audit', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-runs/100/audit');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return audit reviews when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindMany.mockResolvedValueOnce([mockAuditReview]);

      const request = new Request('http://localhost/api/test-runs/100/audit');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reviews).toHaveLength(1);
      expect(data.total).toBe(1);
      expect(data.reviews[0].status).toBe('PENDING');
    });
  });

  describe('POST /api/test-runs/[id]/audit', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'POST',
        body: JSON.stringify({ comment: 'レビューお願いします' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when test run not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindTestRun.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-runs/999/audit', {
        method: 'POST',
        body: JSON.stringify({ comment: 'レビューお願いします' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テストランが見つかりません。');
    });

    it('should return 400 when pending review already exists', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindTestRun.mockResolvedValueOnce(mockTestRun);
      mockFindFirst.mockResolvedValueOnce(mockAuditReview);

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'POST',
        body: JSON.stringify({ comment: 'レビューお願いします' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('既に保留中の監査レビューが存在します。');
    });

    it('should create audit review when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockFindTestRun.mockResolvedValueOnce(mockTestRun);
      mockFindFirst.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce(mockAuditReview);

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'POST',
        body: JSON.stringify({ comment: 'レビューお願いします' }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.status).toBe('PENDING');
      expect(data.comment).toBe('レビューお願いします');
      expect(mockLogAudit).toHaveBeenCalled();
    });
  });

  describe('PUT /api/test-runs/[id]/audit', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'PUT',
        body: JSON.stringify({ reviewId: '1', status: 'APPROVED' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when reviewId is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockReviewerSession);

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'PUT',
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('レビューIDは必須です。');
    });

    it('should return 400 when status is invalid', async () => {
      mockAuth.mockResolvedValueOnce(mockReviewerSession);

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'PUT',
        body: JSON.stringify({ reviewId: '1', status: 'INVALID' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('APPROVED または REJECTED');
    });

    it('should return 404 when review not found', async () => {
      mockAuth.mockResolvedValueOnce(mockReviewerSession);
      mockFindUnique.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'PUT',
        body: JSON.stringify({ reviewId: '999', status: 'APPROVED' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('監査レビューが見つかりません。');
    });

    it('should return 400 when test run ID does not match', async () => {
      mockAuth.mockResolvedValueOnce(mockReviewerSession);
      mockFindUnique.mockResolvedValueOnce({
        ...mockAuditReview,
        testRunId: BigInt(999), // 異なるテストラン
      });

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'PUT',
        body: JSON.stringify({ reviewId: '1', status: 'APPROVED' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('テストランIDが一致しません。');
    });

    it('should return 400 when review is already processed', async () => {
      mockAuth.mockResolvedValueOnce(mockReviewerSession);
      mockFindUnique.mockResolvedValueOnce(mockApprovedReview);

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'PUT',
        body: JSON.stringify({ reviewId: '1', status: 'REJECTED' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('この監査レビューは既に処理されています。');
    });

    it('should approve review when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockReviewerSession);
      mockFindUnique.mockResolvedValueOnce(mockAuditReview);
      mockUpdate.mockResolvedValueOnce(mockApprovedReview);

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'PUT',
        body: JSON.stringify({
          reviewId: '1',
          status: 'APPROVED',
          reviewComment: '承認しました',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('APPROVED');
      expect(data.reviewComment).toBe('承認しました');
      expect(mockLogAudit).toHaveBeenCalled();
    });

    it('should reject review when valid', async () => {
      mockAuth.mockResolvedValueOnce(mockReviewerSession);
      mockFindUnique.mockResolvedValueOnce(mockAuditReview);
      mockUpdate.mockResolvedValueOnce({
        ...mockAuditReview,
        reviewerId: BigInt(2),
        status: 'REJECTED',
        reviewComment: '差し戻しです',
        reviewedAt: new Date(),
      });

      const request = new Request('http://localhost/api/test-runs/100/audit', {
        method: 'PUT',
        body: JSON.stringify({
          reviewId: '1',
          status: 'REJECTED',
          reviewComment: '差し戻しです',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('REJECTED');
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AUDIT_REVIEW_REJECT',
        })
      );
    });
  });
});
