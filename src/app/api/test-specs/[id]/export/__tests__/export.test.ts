import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock repositories
vi.mock('@/lib/repositories/test-case-repository', () => ({
  getTestCasesForExport: vi.fn(),
  testSpecExists: vi.fn(),
}));

import { auth } from '@/lib/auth';
import { getTestCasesForExport, testSpecExists } from '@/lib/repositories/test-case-repository';

const mockAuth = vi.mocked(auth);
const mockGetTestCasesForExport = vi.mocked(getTestCasesForExport);
const mockTestSpecExists = vi.mocked(testSpecExists);

describe('Export API', () => {
  const mockTestCase = {
    id: '1',
    testCaseNumber: 'TC-0001',
    referenceId: 'REF-001',
    title: 'テストケース1',
    description: 'テストの説明',
    precondition: '事前条件',
    expectedResult: '期待結果',
    checkpoint: 'チェックポイント',
    scenario: 'シナリオ',
    testEnvironment: 'テスト環境',
    notes: '特記事項',
    priority: 'HIGH',
    testType: 'FUNCTIONAL',
    testTechnique: 'EQUIVALENCE',
    classification: 'UI',
    estimatedTime: 30,
    tags: ['tag1', 'tag2'],
    sectionName: 'セクション1',
    sectionPath: 'セクション1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    steps: [
      { stepNo: 1, action: '操作1', expected: '期待1' },
      { stepNo: 2, action: '操作2', expected: '期待2' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'test@example.com' } } as never);
    mockTestSpecExists.mockResolvedValue(true);
  });

  describe('GET /api/test-specs/[id]/export', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null as never);

      const request = new NextRequest('http://localhost/api/test-specs/1/export');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if test spec not found', async () => {
      mockTestSpecExists.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/test-specs/999/export');
      const response = await GET(request, { params: Promise.resolve({ id: '999' }) });

      expect(response.status).toBe(404);
    });

    it('should return 404 if no test cases to export', async () => {
      mockGetTestCasesForExport.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/test-specs/1/export');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(404);
    });

    it('should export CSV format by default', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest('http://localhost/api/test-specs/1/export');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/csv');

      const content = await response.text();
      // BOM may not be preserved when reading as text in test environment
      // but the actual bytes include it for Excel compatibility
      expect(content).toContain('ID'); // Header
      expect(content).toContain('テストケース1'); // Data
    });

    it('should export CSV format with format=csv', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest('http://localhost/api/test-specs/1/export?format=csv');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/csv');
    });

    it('should export JSON format with format=json', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest('http://localhost/api/test-specs/1/export?format=json');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const data = await response.json();
      expect(data.testCases).toHaveLength(1);
      expect(data.testCases[0].title).toBe('テストケース1');
      expect(data.total).toBe(1);
      expect(data.exportedAt).toBeDefined();
    });

    it('should return 400 for unsupported format', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest('http://localhost/api/test-specs/1/export?format=xlsx');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(400);
    });

    it('should include test steps in CSV', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest(
        'http://localhost/api/test-specs/1/export?format=csv&includeSteps=true'
      );
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      const content = await response.text();
      expect(content).toContain('手順1_操作');
      expect(content).toContain('手順1_期待結果');
    });

    it('should filter by priority', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest('http://localhost/api/test-specs/1/export?priority=HIGH');
      await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(mockGetTestCasesForExport).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'HIGH' })
      );
    });

    it('should filter by testType', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest(
        'http://localhost/api/test-specs/1/export?testType=FUNCTIONAL'
      );
      await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(mockGetTestCasesForExport).toHaveBeenCalledWith(
        expect.objectContaining({ testType: 'FUNCTIONAL' })
      );
    });

    it('should filter by sectionId', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest('http://localhost/api/test-specs/1/export?sectionId=5');
      await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(mockGetTestCasesForExport).toHaveBeenCalledWith(
        expect.objectContaining({ sectionId: '5' })
      );
    });

    it('should filter by sectionId=null', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest('http://localhost/api/test-specs/1/export?sectionId=null');
      await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(mockGetTestCasesForExport).toHaveBeenCalledWith(
        expect.objectContaining({ sectionId: null })
      );
    });

    it('should filter by tags', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest('http://localhost/api/test-specs/1/export?tags=tag1,tag2');
      await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(mockGetTestCasesForExport).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['tag1', 'tag2'] })
      );
    });

    it('should use custom columns', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest(
        'http://localhost/api/test-specs/1/export?columns=id,title,priority'
      );
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      const content = await response.text();
      // Should contain specified columns
      expect(content).toContain('ID');
      expect(content).toContain('タイトル');
      expect(content).toContain('優先度');
    });

    it('should set Content-Disposition header with filename', async () => {
      mockGetTestCasesForExport.mockResolvedValue([mockTestCase]);

      const request = new NextRequest('http://localhost/api/test-specs/1/export?format=csv');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('attachment');
      expect(contentDisposition).toContain('.csv');
    });
  });
});
