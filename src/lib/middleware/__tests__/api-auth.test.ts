import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createSuccessResponse,
  createErrorResponse,
  parsePaginationParams,
  createPaginationMeta,
  ErrorCodes,
} from '../api-auth';

// モック
vi.mock('@/lib/repositories/api-token-repository', () => ({
  authenticateByToken: vi.fn(),
  updateTokenLastUsed: vi.fn(),
  logTokenUsage: vi.fn(),
  checkAndUpdateRateLimit: vi.fn(),
  isIpWhitelisted: vi.fn(),
}));

describe('API Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const data = { id: '1', name: 'Test' };
      const requestId = 'req_123';

      const response = createSuccessResponse(data, requestId);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Request-Id')).toBe(requestId);
    });

    it('should include rate limit info in headers when provided', () => {
      const data = { id: '1' };
      const requestId = 'req_456';
      const rateLimitInfo = {
        remaining: 999,
        resetAt: new Date('2026-01-01T00:00:00Z'),
      };

      const response = createSuccessResponse(data, requestId, rateLimitInfo);

      expect(response.headers.get('X-RateLimit-Remaining')).toBe('999');
      expect(response.headers.get('X-RateLimit-Reset')).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with code and message', () => {
      const response = createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        '認証が必要です',
        401,
        'req_789'
      );

      expect(response.status).toBe(401);
      expect(response.headers.get('X-Request-Id')).toBe('req_789');
    });

    it('should include details when provided', async () => {
      const response = createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'バリデーションエラー',
        400,
        'req_abc',
        { field: 'name' }
      );

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details).toEqual({ field: 'name' });
    });

    it('should create error with different status codes', () => {
      const notFound = createErrorResponse(ErrorCodes.NOT_FOUND, 'Not found', 404, 'req_1');
      expect(notFound.status).toBe(404);

      const forbidden = createErrorResponse(ErrorCodes.FORBIDDEN, 'Forbidden', 403, 'req_2');
      expect(forbidden.status).toBe(403);

      const serverError = createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Server error',
        500,
        'req_3'
      );
      expect(serverError.status).toBe(500);
    });
  });

  describe('parsePaginationParams', () => {
    it('should parse page and limit from search params', () => {
      const searchParams = new URLSearchParams('page=2&limit=50');
      const result = parsePaginationParams(searchParams);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('should use defaults when not provided', () => {
      const searchParams = new URLSearchParams('');
      const result = parsePaginationParams(searchParams);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should enforce minimum page of 1', () => {
      const searchParams = new URLSearchParams('page=-5');
      const result = parsePaginationParams(searchParams);

      expect(result.page).toBe(1);
    });

    it('should enforce maximum limit of 100', () => {
      const searchParams = new URLSearchParams('limit=500');
      const result = parsePaginationParams(searchParams);

      expect(result.limit).toBe(100);
    });

    it('should enforce minimum limit of 1', () => {
      const searchParams = new URLSearchParams('limit=-10');
      const result = parsePaginationParams(searchParams);

      expect(result.limit).toBe(1);
    });
  });

  describe('createPaginationMeta', () => {
    it('should calculate correct pagination metadata', () => {
      const meta = createPaginationMeta(100, 2, 20);

      expect(meta.total).toBe(100);
      expect(meta.page).toBe(2);
      expect(meta.limit).toBe(20);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNext).toBe(true);
      expect(meta.hasPrev).toBe(true);
    });

    it('should handle first page', () => {
      const meta = createPaginationMeta(50, 1, 10);

      expect(meta.hasPrev).toBe(false);
      expect(meta.hasNext).toBe(true);
    });

    it('should handle last page', () => {
      const meta = createPaginationMeta(50, 5, 10);

      expect(meta.hasPrev).toBe(true);
      expect(meta.hasNext).toBe(false);
    });

    it('should handle single page', () => {
      const meta = createPaginationMeta(5, 1, 10);

      expect(meta.totalPages).toBe(1);
      expect(meta.hasPrev).toBe(false);
      expect(meta.hasNext).toBe(false);
    });

    it('should handle empty results', () => {
      const meta = createPaginationMeta(0, 1, 10);

      expect(meta.totalPages).toBe(0);
      expect(meta.hasNext).toBe(false);
    });
  });

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST');
      expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(ErrorCodes.IP_NOT_ALLOWED).toBe('IP_NOT_ALLOWED');
      expect(ErrorCodes.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
      expect(ErrorCodes.TOKEN_REVOKED).toBe('TOKEN_REVOKED');
      expect(ErrorCodes.INSUFFICIENT_SCOPE).toBe('INSUFFICIENT_SCOPE');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    });
  });
});
