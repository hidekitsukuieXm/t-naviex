import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock repositories
vi.mock('@/lib/repositories/test-case-repository', () => ({
  testSpecExists: vi.fn(),
  isTestSpecLocked: vi.fn(),
  sectionExists: vi.fn(),
  createTestCase: vi.fn(),
}));

vi.mock('@/lib/repositories/test-step-repository', () => ({
  createTestStep: vi.fn(),
}));

vi.mock('@/lib/repositories/test-section-repository', () => ({
  findOrCreateSection: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logTestCaseCreate: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  testSpecExists,
  isTestSpecLocked,
  sectionExists,
  createTestCase,
} from '@/lib/repositories/test-case-repository';
import { createTestStep } from '@/lib/repositories/test-step-repository';
import { findOrCreateSection } from '@/lib/repositories/test-section-repository';
import { logTestCaseCreate } from '@/lib/audit';

const mockAuth = vi.mocked(auth);
const mockTestSpecExists = vi.mocked(testSpecExists);
const mockIsTestSpecLocked = vi.mocked(isTestSpecLocked);
const mockSectionExists = vi.mocked(sectionExists);
const mockCreateTestCase = vi.mocked(createTestCase);
const mockCreateTestStep = vi.mocked(createTestStep);
const mockFindOrCreateSection = vi.mocked(findOrCreateSection);
const mockLogTestCaseCreate = vi.mocked(logTestCaseCreate);

describe('Import API', () => {
  const testCsvContent = `タイトル,説明,優先度
テストケース1,説明1,高
テストケース2,説明2,中`;

  const testCsvContentWithSteps = `タイトル,説明,優先度,手順1_操作,手順1_期待結果,手順2_操作,手順2_期待結果
テストケース1,説明1,高,操作1,結果1,操作2,結果2`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'test@example.com' } } as never);
    mockTestSpecExists.mockResolvedValue(true);
    mockIsTestSpecLocked.mockResolvedValue(false);
    mockSectionExists.mockResolvedValue(true);
    mockCreateTestCase.mockResolvedValue({
      id: '1',
      testCaseNumber: 'TC-0001',
      title: 'テストケース1',
      description: '説明1',
      sectionId: null,
      priority: 'HIGH',
      testType: null,
      testTechnique: null,
    } as never);
    mockCreateTestStep.mockResolvedValue({
      id: '1',
      testCaseId: '1',
      stepNo: 1,
      actionMd: '操作1',
      expectedMd: '結果1',
    } as never);
    mockFindOrCreateSection.mockResolvedValue({
      id: BigInt(1),
      testSpecId: BigInt(1),
      parentId: null,
      name: 'セクション1',
      sortOrder: 0,
    } as never);
    mockLogTestCaseCreate.mockResolvedValue(undefined);
  });

  describe('POST /api/test-specs/[id]/import (JSON)', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null as never);

      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: testCsvContent }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if test spec not found', async () => {
      mockTestSpecExists.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/test-specs/999/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: testCsvContent }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '999' }) });

      expect(response.status).toBe(404);
    });

    it('should return 403 if test spec is locked', async () => {
      mockIsTestSpecLocked.mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: testCsvContent }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(403);
    });

    it('should return 400 if no csvContent provided', async () => {
      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(400);
    });

    it('should return preview when no mappings provided', async () => {
      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: testCsvContent }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.headers).toEqual(['タイトル', '説明', '優先度']);
      expect(data.totalRows).toBe(2);
      expect(data.autoMappings).toBeDefined();
      expect(data.autoMappings.length).toBeGreaterThan(0);
    });

    it('should detect step columns in preview', async () => {
      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: testCsvContentWithSteps }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.stepColumns.maxSteps).toBe(2);
      expect(data.stepColumns.stepMappings).toHaveLength(2);
    });

    it('should return 400 for invalid mapping (missing required field)', async () => {
      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: testCsvContent,
          mappings: [
            { csvHeader: '説明', targetField: 'description' }, // Missing required title
          ],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('マッピング');
    });

    it('should import data with mappings', async () => {
      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: testCsvContent,
          mappings: [
            { csvHeader: 'タイトル', targetField: 'title' },
            { csvHeader: '説明', targetField: 'description' },
            { csvHeader: '優先度', targetField: 'priority' },
          ],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(2);
      expect(data.failed).toBe(0);
      expect(data.createdIds).toHaveLength(2);
      expect(mockCreateTestCase).toHaveBeenCalledTimes(2);
    });

    it('should import data with steps', async () => {
      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: testCsvContentWithSteps,
          mappings: [
            { csvHeader: 'タイトル', targetField: 'title' },
            { csvHeader: '説明', targetField: 'description' },
            { csvHeader: '優先度', targetField: 'priority' },
          ],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(1);
      expect(mockCreateTestStep).toHaveBeenCalledTimes(2); // 2 steps
    });

    it('should import to specified section', async () => {
      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: testCsvContent,
          sectionId: '5',
          mappings: [
            { csvHeader: 'タイトル', targetField: 'title' },
            { csvHeader: '説明', targetField: 'description' },
            { csvHeader: '優先度', targetField: 'priority' },
          ],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      expect(mockCreateTestCase).toHaveBeenCalledWith(expect.objectContaining({ sectionId: '5' }));
    });

    it('should find or create section from sectionName field', async () => {
      const csvWithSection = `タイトル,説明,セクション名
テスト1,説明1,新規セクション`;

      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: csvWithSection,
          mappings: [
            { csvHeader: 'タイトル', targetField: 'title' },
            { csvHeader: '説明', targetField: 'description' },
            { csvHeader: 'セクション名', targetField: 'sectionName' },
          ],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      expect(mockFindOrCreateSection).toHaveBeenCalledWith(BigInt(1), '新規セクション');
    });

    it('should return 404 for non-existent section', async () => {
      mockSectionExists.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: testCsvContent,
          sectionId: '999',
          mappings: [{ csvHeader: 'タイトル', targetField: 'title' }],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(404);
    });

    it('should log audit for each imported test case', async () => {
      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: testCsvContent,
          mappings: [
            { csvHeader: 'タイトル', targetField: 'title' },
            { csvHeader: '説明', targetField: 'description' },
            { csvHeader: '優先度', targetField: 'priority' },
          ],
        }),
      });
      await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(mockLogTestCaseCreate).toHaveBeenCalledTimes(2);
      expect(mockLogTestCaseCreate).toHaveBeenCalledWith(
        '1',
        '1',
        expect.objectContaining({ importedFrom: 'CSV' })
      );
    });

    it('should handle import errors gracefully', async () => {
      mockCreateTestCase
        .mockResolvedValueOnce({
          id: '1',
          title: 'テストケース1',
          sectionId: null,
          priority: 'HIGH',
        } as never)
        .mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: testCsvContent,
          mappings: [
            { csvHeader: 'タイトル', targetField: 'title' },
            { csvHeader: '説明', targetField: 'description' },
            { csvHeader: '優先度', targetField: 'priority' },
          ],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(1);
      expect(data.failed).toBe(1);
      expect(data.errors).toHaveLength(1);
    });

    it('should handle invalid priority value', async () => {
      const csvWithInvalidPriority = `タイトル,優先度
テスト1,無効な優先度`;

      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: csvWithInvalidPriority,
          mappings: [
            { csvHeader: 'タイトル', targetField: 'title' },
            { csvHeader: '優先度', targetField: 'priority' },
          ],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.failed).toBe(1);
      expect(data.errors[0].errors[0].field).toBe('priority');
    });

    it('should handle missing title', async () => {
      const csvWithMissingTitle = `タイトル,説明
,説明1`;

      const request = new NextRequest('http://localhost/api/test-specs/1/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: csvWithMissingTitle,
          mappings: [
            { csvHeader: 'タイトル', targetField: 'title' },
            { csvHeader: '説明', targetField: 'description' },
          ],
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.failed).toBe(1);
      expect(data.errors[0].errors[0].field).toBe('title');
    });
  });
});
