import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock test-case-repository
vi.mock('@/lib/repositories/test-case-repository', () => ({
  searchTestCases: vi.fn(),
  testSpecExists: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { searchTestCases, testSpecExists } from '@/lib/repositories/test-case-repository';

const mockAuth = vi.mocked(auth);
const mockSearchTestCases = vi.mocked(searchTestCases);
const mockTestSpecExists = vi.mocked(testSpecExists);

describe('GET /api/test-specs/[id]/cases/search', () => {
  const mockSearchResult = {
    results: [
      {
        id: '1',
        testSpecId: '100',
        sectionId: '10',
        title: 'Test Case 1',
        description: 'A test case description',
        preconditions: null,
        expectedResult: null,
        checkpoint: null,
        scenario: null,
        testEnvironment: null,
        notes: null,
        tags: ['tag1'],
        classification: null,
        referenceId: null,
        estimatedTime: null,
        priority: 'MEDIUM' as const,
        testType: 'FUNCTIONAL' as const,
        testTechnique: 'OTHER' as const,
        isMatrix: false,
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        deletedAt: null,
        rank: 10,
        highlights: [{ field: 'title' as const, snippet: 'Test <mark>keyword</mark> Case' }],
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
    query: 'keyword',
    searchFields: ['title' as const],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: '',
    });
    mockTestSpecExists.mockResolvedValue(true);
    mockSearchTestCases.mockResolvedValue(mockSearchResult);
  });

  function createRequest(searchParams: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    return new Request(`http://localhost/api/test-specs/100/cases/search?${params.toString()}`);
  }

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest({ query: 'keyword' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です。');
  });

  it('should return 400 if query is missing', async () => {
    const request = createRequest({});
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('検索クエリは必須です。');
  });

  it('should return 400 if query is too short', async () => {
    const request = createRequest({ query: 'a' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('検索クエリは2文字以上で入力してください。');
  });

  it('should return 400 if query is too long', async () => {
    const request = createRequest({ query: 'a'.repeat(201) });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('検索クエリは200文字以内で入力してください。');
  });

  it('should return 404 if test spec not found', async () => {
    mockTestSpecExists.mockResolvedValue(false);

    const request = createRequest({ query: 'keyword' });
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('テスト仕様書が見つかりません。');
  });

  it('should search test cases with query', async () => {
    const request = createRequest({ query: 'keyword' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.query).toBe('keyword');
    expect(mockSearchTestCases).toHaveBeenCalledWith(
      expect.objectContaining({
        testSpecId: '100',
        query: 'keyword',
      })
    );
  });

  it('should search with specific fields', async () => {
    const request = createRequest({ query: 'keyword', fields: 'title,description' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });

    expect(response.status).toBe(200);
    expect(mockSearchTestCases).toHaveBeenCalledWith(
      expect.objectContaining({
        searchFields: ['title', 'description'],
      })
    );
  });

  it('should search with filters', async () => {
    const request = createRequest({
      query: 'keyword',
      priority: 'HIGH',
      testType: 'FUNCTIONAL',
      sectionId: '10',
    });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });

    expect(response.status).toBe(200);
    expect(mockSearchTestCases).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'HIGH',
        testType: 'FUNCTIONAL',
        sectionId: '10',
      })
    );
  });

  it('should search with pagination', async () => {
    const request = createRequest({ query: 'keyword', page: '2', limit: '10' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });

    expect(response.status).toBe(200);
    expect(mockSearchTestCases).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 10,
      })
    );
  });

  it('should return 400 for invalid priority', async () => {
    const request = createRequest({ query: 'keyword', priority: 'INVALID' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('無効な優先度です。');
  });

  it('should return 400 for invalid testType', async () => {
    const request = createRequest({ query: 'keyword', testType: 'INVALID' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('無効なテストタイプです。');
  });

  it('should return 400 for invalid limit', async () => {
    const request = createRequest({ query: 'keyword', limit: '101' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('取得件数は1〜100の範囲で指定してください。');
  });

  it('should search with tags', async () => {
    const request = createRequest({ query: 'keyword', tags: 'tag1,tag2' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });

    expect(response.status).toBe(200);
    expect(mockSearchTestCases).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['tag1', 'tag2'],
      })
    );
  });

  it('should search with null sectionId', async () => {
    const request = createRequest({ query: 'keyword', sectionId: 'null' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });

    expect(response.status).toBe(200);
    expect(mockSearchTestCases).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionId: null,
      })
    );
  });

  it('should handle search errors', async () => {
    mockSearchTestCases.mockRejectedValue(new Error('Database error'));

    const request = createRequest({ query: 'keyword' });
    const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('テストケースの検索に失敗しました。');
  });
});
