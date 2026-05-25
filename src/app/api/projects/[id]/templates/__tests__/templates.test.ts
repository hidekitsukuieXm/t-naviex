import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { GET as GET_DETAIL, PUT, DELETE } from '../[templateId]/route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock repositories
vi.mock('@/lib/repositories/template-repository', () => ({
  getTemplates: vi.fn(),
  getTemplate: vi.fn(),
  getTemplateDetail: vi.fn(),
  getTemplateByName: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

vi.mock('@/lib/repositories/project-repository', () => ({
  projectExists: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  getTemplates,
  getTemplateDetail,
  getTemplateByName,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/lib/repositories/template-repository';
import { projectExists } from '@/lib/repositories/project-repository';

const mockAuth = vi.mocked(auth);
const mockGetTemplates = vi.mocked(getTemplates);
const mockGetTemplateDetail = vi.mocked(getTemplateDetail);
const mockGetTemplateByName = vi.mocked(getTemplateByName);
const mockCreateTemplate = vi.mocked(createTemplate);
const mockUpdateTemplate = vi.mocked(updateTemplate);
const mockDeleteTemplate = vi.mocked(deleteTemplate);
const mockProjectExists = vi.mocked(projectExists);

describe('Templates API', () => {
  const mockTemplate = {
    id: '1',
    projectId: '100',
    name: 'テンプレート1',
    description: 'テンプレートの説明',
    title: 'タイトルテンプレート',
    templateDescription: '説明テンプレート',
    preconditions: '前提条件',
    expectedResult: '期待結果',
    checkpoint: '確認ポイント',
    scenario: 'シナリオ',
    testEnvironment: 'テスト環境',
    notes: '備考',
    tags: ['tag1'],
    classification: '分類',
    priority: 'MEDIUM' as const,
    testType: 'FUNCTIONAL' as const,
    testTechnique: 'OTHER' as const,
    isDefault: false,
    sortOrder: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    templateSteps: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'test@example.com' } } as never);
    mockProjectExists.mockResolvedValue(true);
  });

  describe('GET /api/projects/[id]/templates', () => {
    it('should return templates list', async () => {
      mockGetTemplates.mockResolvedValue({
        templates: [mockTemplate],
        total: 1,
      });

      const request = new NextRequest('http://localhost/api/projects/100/templates');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null as never);

      const request = new NextRequest('http://localhost/api/projects/100/templates');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      mockProjectExists.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/projects/999/templates');
      const response = await GET(request, { params: Promise.resolve({ id: '999' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/projects/[id]/templates', () => {
    it('should create a template', async () => {
      mockGetTemplateByName.mockResolvedValue(null);
      mockCreateTemplate.mockResolvedValue(mockTemplate);

      const request = new NextRequest('http://localhost/api/projects/100/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'テンプレート1',
          description: 'テンプレートの説明',
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });

      expect(response.status).toBe(201);
    });

    it('should return 400 for invalid input', async () => {
      const request = new NextRequest('http://localhost/api/projects/100/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: '', // empty name
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });

      expect(response.status).toBe(400);
    });

    it('should return 409 if name already exists', async () => {
      mockGetTemplateByName.mockResolvedValue(mockTemplate);

      const request = new NextRequest('http://localhost/api/projects/100/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'テンプレート1',
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/projects/[id]/templates/[templateId]', () => {
    it('should return template detail', async () => {
      mockGetTemplateDetail.mockResolvedValue(mockTemplate);

      const request = new NextRequest('http://localhost/api/projects/100/templates/1');
      const response = await GET_DETAIL(request, {
        params: Promise.resolve({ id: '100', templateId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('テンプレート1');
    });

    it('should return 404 if template not found', async () => {
      mockGetTemplateDetail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/100/templates/999');
      const response = await GET_DETAIL(request, {
        params: Promise.resolve({ id: '100', templateId: '999' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/projects/[id]/templates/[templateId]', () => {
    it('should update a template', async () => {
      mockGetTemplateDetail.mockResolvedValue(mockTemplate);
      mockGetTemplateByName.mockResolvedValue(null); // No conflict
      mockUpdateTemplate.mockResolvedValue({
        ...mockTemplate,
        name: '更新後のテンプレート',
      });

      const request = new NextRequest('http://localhost/api/projects/100/templates/1', {
        method: 'PUT',
        body: JSON.stringify({
          name: '更新後のテンプレート',
        }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ id: '100', templateId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('更新後のテンプレート');
    });

    it('should return 404 if template not found', async () => {
      mockGetTemplateDetail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/100/templates/999', {
        method: 'PUT',
        body: JSON.stringify({
          name: '更新後のテンプレート',
        }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ id: '100', templateId: '999' }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 409 if new name conflicts', async () => {
      mockGetTemplateDetail.mockResolvedValue(mockTemplate);
      mockGetTemplateByName.mockResolvedValue({
        ...mockTemplate,
        id: '2',
        name: '既存のテンプレート',
      });

      const request = new NextRequest('http://localhost/api/projects/100/templates/1', {
        method: 'PUT',
        body: JSON.stringify({
          name: '既存のテンプレート',
        }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ id: '100', templateId: '1' }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/projects/[id]/templates/[templateId]', () => {
    it('should delete a template', async () => {
      mockGetTemplateDetail.mockResolvedValue(mockTemplate);
      mockDeleteTemplate.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/projects/100/templates/1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', templateId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 if template not found', async () => {
      mockGetTemplateDetail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/100/templates/999', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', templateId: '999' }),
      });

      expect(response.status).toBe(404);
    });
  });
});
