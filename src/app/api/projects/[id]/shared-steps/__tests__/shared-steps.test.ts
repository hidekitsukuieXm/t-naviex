import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { GET as GET_DETAIL, PUT, DELETE } from '../[stepId]/route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock repositories
vi.mock('@/lib/repositories/shared-step-repository', () => ({
  getSharedSteps: vi.fn(),
  getSharedStep: vi.fn(),
  getSharedStepDetail: vi.fn(),
  getSharedStepByName: vi.fn(),
  createSharedStep: vi.fn(),
  updateSharedStep: vi.fn(),
  deleteSharedStep: vi.fn(),
}));

vi.mock('@/lib/repositories/project-repository', () => ({
  projectExists: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  getSharedSteps,
  getSharedStepDetail,
  getSharedStepByName,
  createSharedStep,
  updateSharedStep,
  deleteSharedStep,
} from '@/lib/repositories/shared-step-repository';
import { projectExists } from '@/lib/repositories/project-repository';

const mockAuth = vi.mocked(auth);
const mockGetSharedSteps = vi.mocked(getSharedSteps);
const mockGetSharedStepDetail = vi.mocked(getSharedStepDetail);
const mockGetSharedStepByName = vi.mocked(getSharedStepByName);
const mockCreateSharedStep = vi.mocked(createSharedStep);
const mockUpdateSharedStep = vi.mocked(updateSharedStep);
const mockDeleteSharedStep = vi.mocked(deleteSharedStep);
const mockProjectExists = vi.mocked(projectExists);

describe('Shared Steps API', () => {
  const mockSharedStep = {
    id: '1',
    projectId: '100',
    name: '共有手順1',
    description: '共有手順の説明',
    contentMd: '# 手順\n\n1. ステップ1',
    sortOrder: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    usageCount: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: '1', email: 'test@example.com' } } as never);
    mockProjectExists.mockResolvedValue(true);
  });

  describe('GET /api/projects/[id]/shared-steps', () => {
    it('should return shared steps list', async () => {
      mockGetSharedSteps.mockResolvedValue({
        sharedSteps: [mockSharedStep],
        total: 1,
      });

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sharedSteps).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null as never);

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps');
      const response = await GET(request, { params: Promise.resolve({ id: '100' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if project not found', async () => {
      mockProjectExists.mockResolvedValue(false);

      const request = new NextRequest('http://localhost/api/projects/999/shared-steps');
      const response = await GET(request, { params: Promise.resolve({ id: '999' }) });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/projects/[id]/shared-steps', () => {
    it('should create a shared step', async () => {
      mockGetSharedStepByName.mockResolvedValue(null);
      mockCreateSharedStep.mockResolvedValue(mockSharedStep);

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps', {
        method: 'POST',
        body: JSON.stringify({
          name: '共有手順1',
          contentMd: '# 手順',
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });

      expect(response.status).toBe(201);
    });

    it('should return 400 for invalid input', async () => {
      const request = new NextRequest('http://localhost/api/projects/100/shared-steps', {
        method: 'POST',
        body: JSON.stringify({
          name: '', // empty name
          contentMd: '# 手順',
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });

      expect(response.status).toBe(400);
    });

    it('should return 409 if name already exists', async () => {
      mockGetSharedStepByName.mockResolvedValue(mockSharedStep);

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps', {
        method: 'POST',
        body: JSON.stringify({
          name: '共有手順1',
          contentMd: '# 手順',
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: '100' }) });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/projects/[id]/shared-steps/[stepId]', () => {
    it('should return shared step detail', async () => {
      mockGetSharedStepDetail.mockResolvedValue(mockSharedStep);

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps/1');
      const response = await GET_DETAIL(request, {
        params: Promise.resolve({ id: '100', stepId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('共有手順1');
      expect(data.usageCount).toBe(5);
    });

    it('should return 404 if shared step not found', async () => {
      mockGetSharedStepDetail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps/999');
      const response = await GET_DETAIL(request, {
        params: Promise.resolve({ id: '100', stepId: '999' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/projects/[id]/shared-steps/[stepId]', () => {
    it('should update a shared step', async () => {
      mockGetSharedStepDetail.mockResolvedValue(mockSharedStep);
      mockGetSharedStepByName.mockResolvedValue(null);
      mockUpdateSharedStep.mockResolvedValue({
        ...mockSharedStep,
        name: '更新後の共有手順',
      });

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps/1', {
        method: 'PUT',
        body: JSON.stringify({
          name: '更新後の共有手順',
        }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ id: '100', stepId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('更新後の共有手順');
    });

    it('should return 404 if shared step not found', async () => {
      mockGetSharedStepDetail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps/999', {
        method: 'PUT',
        body: JSON.stringify({
          name: '更新後の共有手順',
        }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ id: '100', stepId: '999' }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 409 if new name conflicts', async () => {
      mockGetSharedStepDetail.mockResolvedValue(mockSharedStep);
      mockGetSharedStepByName.mockResolvedValue({
        ...mockSharedStep,
        id: '2',
        name: '既存の共有手順',
      });

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps/1', {
        method: 'PUT',
        body: JSON.stringify({
          name: '既存の共有手順',
        }),
      });
      const response = await PUT(request, {
        params: Promise.resolve({ id: '100', stepId: '1' }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/projects/[id]/shared-steps/[stepId]', () => {
    it('should delete a shared step', async () => {
      mockGetSharedStepDetail.mockResolvedValue(mockSharedStep);
      mockDeleteSharedStep.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps/1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', stepId: '1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 404 if shared step not found', async () => {
      mockGetSharedStepDetail.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/projects/100/shared-steps/999', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: '100', stepId: '999' }),
      });

      expect(response.status).toBe(404);
    });
  });
});
