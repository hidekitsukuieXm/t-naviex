import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/email-template-repository', () => ({
  getEmailTemplates: vi.fn(),
  getEmailTemplateById: vi.fn(),
  createEmailTemplate: vi.fn(),
  updateEmailTemplate: vi.fn(),
  deleteEmailTemplate: vi.fn(),
  initializeDefaultTemplates: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  getEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  initializeDefaultTemplates,
} from '@/lib/repositories/email-template-repository';
import { GET, POST } from '../route';
import { GET as GET_BY_ID, PUT, DELETE } from '../[id]/route';

const mockAuth = vi.mocked(auth);
const mockGetEmailTemplates = vi.mocked(getEmailTemplates);
const mockGetEmailTemplateById = vi.mocked(getEmailTemplateById);
const mockCreateEmailTemplate = vi.mocked(createEmailTemplate);
const mockUpdateEmailTemplate = vi.mocked(updateEmailTemplate);
const mockDeleteEmailTemplate = vi.mocked(deleteEmailTemplate);
const mockInitializeDefaultTemplates = vi.mocked(initializeDefaultTemplates);

describe('Email Templates API', () => {
  const mockSession = {
    user: { id: '1', email: 'admin@example.com', name: 'Admin User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockTemplate = {
    id: '1',
    name: 'welcome-default',
    type: 'WELCOME' as const,
    subject: 'ようこそ',
    body: '<p>テスト</p>',
    variables: ['userName'],
    description: 'ウェルカムメール',
    isActive: true,
    isDefault: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings/email-templates', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/email-templates');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return email templates when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetEmailTemplates.mockResolvedValueOnce({
        templates: [mockTemplate],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new Request('http://localhost/api/settings/email-templates');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates).toHaveLength(1);
      expect(data.templates[0].name).toBe('welcome-default');
    });

    it('should filter by type', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetEmailTemplates.mockResolvedValueOnce({
        templates: [mockTemplate],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const request = new Request('http://localhost/api/settings/email-templates?type=WELCOME');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGetEmailTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'WELCOME' })
      );
    });

    it('should initialize default templates when initialize=true', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockInitializeDefaultTemplates.mockResolvedValueOnce(5);
      mockGetEmailTemplates.mockResolvedValueOnce({
        templates: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const request = new Request('http://localhost/api/settings/email-templates?initialize=true');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockInitializeDefaultTemplates).toHaveBeenCalled();
    });
  });

  describe('POST /api/settings/email-templates', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/email-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test',
          subject: 'Test',
          body: '<p>Test</p>',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when required fields are missing', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/settings/email-templates', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('必須');
    });

    it('should return 400 when name contains invalid characters', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/settings/email-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test template', // スペースは無効
          subject: 'Test',
          body: '<p>Test</p>',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('英数字');
    });

    it('should create template when valid data is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockCreateEmailTemplate.mockResolvedValueOnce(mockTemplate);

      const request = new Request('http://localhost/api/settings/email-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test-template',
          subject: 'Test',
          body: '<p>Test</p>',
          type: 'CUSTOM',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('welcome-default');
    });
  });

  describe('GET /api/settings/email-templates/[id]', () => {
    it('should return 404 when template not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetEmailTemplateById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/email-templates/999');

      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('見つかりません');
    });

    it('should return template by id', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetEmailTemplateById.mockResolvedValueOnce(mockTemplate);

      const request = new Request('http://localhost/api/settings/email-templates/1');

      const response = await GET_BY_ID(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('welcome-default');
    });
  });

  describe('PUT /api/settings/email-templates/[id]', () => {
    it('should return 404 when template not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockUpdateEmailTemplate.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/email-templates/999', {
        method: 'PUT',
        body: JSON.stringify({ subject: 'Updated' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('見つかりません');
    });

    it('should update template when valid data is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      const updatedTemplate = { ...mockTemplate, subject: 'Updated' };
      mockUpdateEmailTemplate.mockResolvedValueOnce(updatedTemplate);

      const request = new Request('http://localhost/api/settings/email-templates/1', {
        method: 'PUT',
        body: JSON.stringify({ subject: 'Updated' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.subject).toBe('Updated');
    });
  });

  describe('DELETE /api/settings/email-templates/[id]', () => {
    it('should return 404 when template not found', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetEmailTemplateById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/email-templates/999', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('見つかりません');
    });

    it('should delete template successfully', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetEmailTemplateById.mockResolvedValueOnce(mockTemplate);
      mockDeleteEmailTemplate.mockResolvedValueOnce(true);

      const request = new Request('http://localhost/api/settings/email-templates/1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
