import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/test-section-repository', () => ({
  createTestSection: vi.fn(),
  getTestSections: vi.fn(),
  getTestSectionTree: vi.fn(),
  getTestSectionById: vi.fn(),
  updateTestSection: vi.fn(),
  moveTestSection: vi.fn(),
  deleteTestSection: vi.fn(),
  updateSortOrders: vi.fn(),
  testSpecExists: vi.fn(),
  isTestSpecLocked: vi.fn(),
  isSectionNameTaken: vi.fn(),
  parentSectionExists: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logTestSectionCreate: vi.fn(),
  logTestSectionUpdate: vi.fn(),
  logTestSectionDelete: vi.fn(),
  logTestSectionMove: vi.fn(),
  logTestSectionReorder: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  createTestSection,
  getTestSections,
  getTestSectionTree,
  getTestSectionById,
  updateTestSection,
  moveTestSection,
  deleteTestSection,
  updateSortOrders,
  testSpecExists,
  isTestSpecLocked,
  isSectionNameTaken,
  parentSectionExists,
} from '@/lib/repositories/test-section-repository';
import { GET, POST } from '../route';
import { PUT as REORDER } from '../reorder/route';
import { GET as GET_BY_ID, PUT, DELETE } from '../[sectionId]/route';
import { PUT as MOVE } from '../[sectionId]/move/route';

const mockAuth = vi.mocked(auth);
const mockCreateTestSection = vi.mocked(createTestSection);
const mockGetTestSections = vi.mocked(getTestSections);
const mockGetTestSectionTree = vi.mocked(getTestSectionTree);
const mockGetTestSectionById = vi.mocked(getTestSectionById);
const mockUpdateTestSection = vi.mocked(updateTestSection);
const mockMoveTestSection = vi.mocked(moveTestSection);
const mockDeleteTestSection = vi.mocked(deleteTestSection);
const mockUpdateSortOrders = vi.mocked(updateSortOrders);
const mockTestSpecExists = vi.mocked(testSpecExists);
const mockIsTestSpecLocked = vi.mocked(isTestSpecLocked);
const mockIsSectionNameTaken = vi.mocked(isSectionNameTaken);
const mockParentSectionExists = vi.mocked(parentSectionExists);

describe('Test Section API', () => {
  const mockSession = {
    user: { id: '1', email: 'user@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockSection = {
    id: '1',
    testSpecId: '100',
    parentId: null,
    name: 'Test Section',
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockSectionDetail = {
    ...mockSection,
    parent: null,
    children: [],
    testSpec: { id: '100', name: 'Test Spec' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/test-specs/[id]/sections', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/100/sections');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 when test spec not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockTestSpecExists.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/test-specs/100/sections');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テスト仕様書が見つかりません。');
    });

    it('should return sections list', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockTestSpecExists.mockResolvedValueOnce(true);
      mockGetTestSections.mockResolvedValueOnce([mockSection]);

      const request = new Request('http://localhost/api/test-specs/100/sections');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections).toHaveLength(1);
    });

    it('should return tree format when requested', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockTestSpecExists.mockResolvedValueOnce(true);
      mockGetTestSectionTree.mockResolvedValueOnce([{ ...mockSection, children: [] }]);

      const request = new Request('http://localhost/api/test-specs/100/sections?format=tree');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      await response.json();

      expect(response.status).toBe(200);
      expect(mockGetTestSectionTree).toHaveBeenCalled();
    });
  });

  describe('POST /api/test-specs/[id]/sections', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/100/sections', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Section' }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when name is missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/test-specs/100/sections', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 404 when test spec not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockTestSpecExists.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/test-specs/100/sections', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Section' }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テスト仕様書が見つかりません。');
    });

    it('should return 403 when test spec is locked', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockTestSpecExists.mockResolvedValueOnce(true);
      mockIsTestSpecLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/100/sections', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Section' }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('ロック');
    });

    it('should return 404 when parent section not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockTestSpecExists.mockResolvedValueOnce(true);
      mockIsTestSpecLocked.mockResolvedValueOnce(false);
      mockParentSectionExists.mockResolvedValueOnce(false);

      const request = new Request('http://localhost/api/test-specs/100/sections', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Section', parentId: '999' }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('親セクションが見つかりません。');
    });

    it('should return 409 when name is taken', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockTestSpecExists.mockResolvedValueOnce(true);
      mockIsTestSpecLocked.mockResolvedValueOnce(false);
      mockIsSectionNameTaken.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/100/sections', {
        method: 'POST',
        body: JSON.stringify({ name: 'Existing Name' }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('同名');
    });

    it('should create section successfully', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockTestSpecExists.mockResolvedValueOnce(true);
      mockIsTestSpecLocked.mockResolvedValueOnce(false);
      mockIsSectionNameTaken.mockResolvedValueOnce(false);
      mockCreateTestSection.mockResolvedValueOnce(mockSection);

      const request = new Request('http://localhost/api/test-specs/100/sections', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Section' }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Test Section');
    });
  });

  describe('GET /api/test-specs/[id]/sections/[sectionId]', () => {
    it('should return section detail', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSectionById.mockResolvedValueOnce(mockSectionDetail);

      const request = new Request('http://localhost/api/test-specs/100/sections/1');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: '100', sectionId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('1');
    });

    it('should return 404 when section not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSectionById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/test-specs/100/sections/999');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: '100', sectionId: '999' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('テストセクションが見つかりません。');
    });

    it('should return 404 when test spec ID mismatch', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSectionById.mockResolvedValueOnce({
        ...mockSectionDetail,
        testSpecId: '200', // Different test spec
      });

      const request = new Request('http://localhost/api/test-specs/100/sections/1');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: '100', sectionId: '1' }),
      });
      await response.json();

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/test-specs/[id]/sections/[sectionId]', () => {
    it('should update section', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSectionById.mockResolvedValueOnce(mockSectionDetail);
      mockIsTestSpecLocked.mockResolvedValueOnce(false);
      mockUpdateTestSection.mockResolvedValueOnce({
        ...mockSection,
        name: 'Updated Name',
      });

      const request = new Request('http://localhost/api/test-specs/100/sections/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ id: '100', sectionId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Updated Name');
    });

    it('should return 403 when locked', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSectionById.mockResolvedValueOnce(mockSectionDetail);
      mockIsTestSpecLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/100/sections/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ id: '100', sectionId: '1' }),
      });
      await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/test-specs/[id]/sections/[sectionId]', () => {
    it('should delete section', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSectionById.mockResolvedValueOnce(mockSectionDetail);
      mockIsTestSpecLocked.mockResolvedValueOnce(false);
      mockDeleteTestSection.mockResolvedValueOnce({ success: true, deletedCount: 1 });

      const request = new Request('http://localhost/api/test-specs/100/sections/1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', sectionId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 403 when locked', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSectionById.mockResolvedValueOnce(mockSectionDetail);
      mockIsTestSpecLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/100/sections/1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', sectionId: '1' }),
      });
      await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/test-specs/[id]/sections/[sectionId]/move', () => {
    it('should move section', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSectionById.mockResolvedValueOnce(mockSectionDetail);
      mockIsTestSpecLocked.mockResolvedValueOnce(false);
      mockParentSectionExists.mockResolvedValueOnce(true);
      mockMoveTestSection.mockResolvedValueOnce({
        ...mockSection,
        parentId: '2',
      });

      const request = new Request('http://localhost/api/test-specs/100/sections/1/move', {
        method: 'PUT',
        body: JSON.stringify({ parentId: '2' }),
      });
      const response = await MOVE(request, {
        params: Promise.resolve({ id: '100', sectionId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.parentId).toBe('2');
    });

    it('should move section to root', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSectionById.mockResolvedValueOnce({
        ...mockSectionDetail,
        parentId: '2',
      });
      mockIsTestSpecLocked.mockResolvedValueOnce(false);
      mockMoveTestSection.mockResolvedValueOnce({
        ...mockSection,
        parentId: null,
      });

      const request = new Request('http://localhost/api/test-specs/100/sections/1/move', {
        method: 'PUT',
        body: JSON.stringify({ parentId: null }),
      });
      const response = await MOVE(request, {
        params: Promise.resolve({ id: '100', sectionId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.parentId).toBeNull();
    });

    it('should return 400 for circular reference', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetTestSectionById.mockResolvedValueOnce(mockSectionDetail);
      mockIsTestSpecLocked.mockResolvedValueOnce(false);
      mockParentSectionExists.mockResolvedValueOnce(true);
      mockMoveTestSection.mockRejectedValueOnce(new Error('循環参照が発生'));

      const request = new Request('http://localhost/api/test-specs/100/sections/1/move', {
        method: 'PUT',
        body: JSON.stringify({ parentId: '3' }),
      });
      const response = await MOVE(request, {
        params: Promise.resolve({ id: '100', sectionId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('循環参照');
    });
  });

  describe('PUT /api/test-specs/[id]/sections/reorder', () => {
    it('should reorder sections', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockTestSpecExists.mockResolvedValueOnce(true);
      mockIsTestSpecLocked.mockResolvedValueOnce(false);
      mockUpdateSortOrders.mockResolvedValueOnce([
        { ...mockSection, sortOrder: 1 },
        { ...mockSection, id: '2', sortOrder: 0 },
      ]);

      const request = new Request('http://localhost/api/test-specs/100/sections/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          items: [
            { id: '1', sortOrder: 1 },
            { id: '2', sortOrder: 0 },
          ],
        }),
      });
      const response = await REORDER(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections).toHaveLength(2);
    });

    it('should return 400 for invalid items', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/test-specs/100/sections/reorder', {
        method: 'PUT',
        body: JSON.stringify({ items: [] }),
      });
      const response = await REORDER(request, { params: Promise.resolve({ id: '100' }) });
      await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 403 when locked', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockTestSpecExists.mockResolvedValueOnce(true);
      mockIsTestSpecLocked.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/test-specs/100/sections/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          items: [{ id: '1', sortOrder: 0 }],
        }),
      });
      const response = await REORDER(request, { params: Promise.resolve({ id: '100' }) });
      await response.json();

      expect(response.status).toBe(403);
    });
  });
});
