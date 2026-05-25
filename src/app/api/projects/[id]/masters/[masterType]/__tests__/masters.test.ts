import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock repositories
vi.mock('@/lib/repositories/master-repository', () => ({
  getMasterItems: vi.fn(),
  createMasterItem: vi.fn(),
  getMasterItemByCode: vi.fn(),
  initializeMaster: vi.fn(),
}));

vi.mock('@/lib/repositories/project-repository', () => ({
  projectExists: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  getMasterItems,
  createMasterItem,
  getMasterItemByCode,
} from '@/lib/repositories/master-repository';
import { projectExists } from '@/lib/repositories/project-repository';

const mockAuth = vi.mocked(auth);
const mockGetMasterItems = vi.mocked(getMasterItems);
const mockCreateMasterItem = vi.mocked(createMasterItem);
const mockGetMasterItemByCode = vi.mocked(getMasterItemByCode);
const mockProjectExists = vi.mocked(projectExists);

describe('GET /api/projects/[id]/masters/[masterType]', () => {
  const mockItems = {
    items: [
      {
        id: '1',
        projectId: '100',
        code: 'FUNCTIONAL',
        name: '機能テスト',
        description: 'テストの説明',
        sortOrder: 1,
        isActive: true,
        isDefault: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
    total: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: '',
    });
    mockProjectExists.mockResolvedValue(true);
    mockGetMasterItems.mockResolvedValue(mockItems);
  });

  function createRequest(masterType: string, searchParams: Record<string, string> = {}) {
    const params = new URLSearchParams(searchParams);
    return new Request(
      `http://localhost/api/projects/100/masters/${masterType}?${params.toString()}`
    );
  }

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest('testType');
    const response = await GET(request, {
      params: Promise.resolve({ id: '100', masterType: 'testType' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です。');
  });

  it('should return 400 for invalid masterType', async () => {
    const request = createRequest('invalidType');
    const response = await GET(request, {
      params: Promise.resolve({ id: '100', masterType: 'invalidType' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('無効なマスタタイプです。');
  });

  it('should return 404 if project not found', async () => {
    mockProjectExists.mockResolvedValue(false);

    const request = createRequest('testType');
    const response = await GET(request, {
      params: Promise.resolve({ id: '999', masterType: 'testType' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('プロジェクトが見つかりません。');
  });

  it('should return master items for testType', async () => {
    const request = createRequest('testType');
    const response = await GET(request, {
      params: Promise.resolve({ id: '100', masterType: 'testType' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(mockGetMasterItems).toHaveBeenCalledWith('100', 'testType', { activeOnly: false });
  });

  it('should return master items for testTechnique', async () => {
    const request = createRequest('testTechnique');
    const response = await GET(request, {
      params: Promise.resolve({ id: '100', masterType: 'testTechnique' }),
    });

    expect(response.status).toBe(200);
    expect(mockGetMasterItems).toHaveBeenCalledWith('100', 'testTechnique', { activeOnly: false });
  });

  it('should return master items for testPerspective', async () => {
    const request = createRequest('testPerspective');
    const response = await GET(request, {
      params: Promise.resolve({ id: '100', masterType: 'testPerspective' }),
    });

    expect(response.status).toBe(200);
    expect(mockGetMasterItems).toHaveBeenCalledWith('100', 'testPerspective', {
      activeOnly: false,
    });
  });

  it('should filter active items only', async () => {
    const request = createRequest('testType', { activeOnly: 'true' });
    const response = await GET(request, {
      params: Promise.resolve({ id: '100', masterType: 'testType' }),
    });

    expect(response.status).toBe(200);
    expect(mockGetMasterItems).toHaveBeenCalledWith('100', 'testType', { activeOnly: true });
  });
});

describe('POST /api/projects/[id]/masters/[masterType]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: '',
    });
    mockProjectExists.mockResolvedValue(true);
    mockGetMasterItemByCode.mockResolvedValue(null);
    mockCreateMasterItem.mockResolvedValue({
      id: '1',
      projectId: '100',
      code: 'CUSTOM',
      name: 'カスタムタイプ',
      description: null,
      sortOrder: 0,
      isActive: true,
      isDefault: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  });

  function createRequest(masterType: string, body: Record<string, unknown>) {
    return new Request(`http://localhost/api/projects/100/masters/${masterType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('should return 401 if not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const request = createRequest('testType', { code: 'CUSTOM', name: 'カスタム' });
    const response = await POST(request, {
      params: Promise.resolve({ id: '100', masterType: 'testType' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です。');
  });

  it('should return 400 for invalid masterType', async () => {
    const request = createRequest('invalidType', { code: 'CUSTOM', name: 'カスタム' });
    const response = await POST(request, {
      params: Promise.resolve({ id: '100', masterType: 'invalidType' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('無効なマスタタイプです。');
  });

  it('should return 400 for missing required fields', async () => {
    const request = createRequest('testType', { name: 'カスタム' });
    const response = await POST(request, {
      params: Promise.resolve({ id: '100', masterType: 'testType' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('コードは必須です');
  });

  it('should return 400 for invalid code format', async () => {
    const request = createRequest('testType', { code: 'invalid-code', name: 'カスタム' });
    const response = await POST(request, {
      params: Promise.resolve({ id: '100', masterType: 'testType' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('大文字英数字とアンダースコア');
  });

  it('should return 409 for duplicate code', async () => {
    mockGetMasterItemByCode.mockResolvedValue({
      id: '1',
      projectId: '100',
      code: 'CUSTOM',
      name: '既存のカスタム',
      description: null,
      sortOrder: 0,
      isActive: true,
      isDefault: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    const request = createRequest('testType', { code: 'CUSTOM', name: 'カスタム' });
    const response = await POST(request, {
      params: Promise.resolve({ id: '100', masterType: 'testType' }),
    });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('同じコード');
  });

  it('should create master item successfully', async () => {
    const request = createRequest('testType', { code: 'CUSTOM', name: 'カスタムタイプ' });
    const response = await POST(request, {
      params: Promise.resolve({ id: '100', masterType: 'testType' }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.code).toBe('CUSTOM');
    expect(data.name).toBe('カスタムタイプ');
    expect(mockCreateMasterItem).toHaveBeenCalledWith(
      '100',
      'testType',
      expect.objectContaining({
        code: 'CUSTOM',
        name: 'カスタムタイプ',
      })
    );
  });
});
