import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    role: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findMany: vi.fn(),
    },
  },
}));

// Helper function to create a mock session
function createMockSession(userId: string): Session {
  return {
    user: { id: userId, email: 'test@example.com', name: 'Test User' },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Type for mock role
interface MockRole {
  id: bigint;
}

// Type for mock project member
interface MockProjectMember {
  project: { id: bigint; name: string };
  user: { id: bigint; name: string | null; email: string };
  role: { id: bigint };
}

describe('GET /api/roles/[id]/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('認証されていない場合は401を返す', async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = new Request('http://localhost/api/roles/1/members');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('認証が必要です。');
  });

  it('無効なロールIDの場合は400を返す', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession('1'));

    const request = new Request('http://localhost/api/roles/invalid/members');
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('無効なロールIDです。');
  });

  it('ロールが存在しない場合は404を返す', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession('1'));
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

    const request = new Request('http://localhost/api/roles/1/members');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('ロールが見つかりません。');
  });

  it('ロールメンバーを取得できる', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession('1'));

    const mockRole: MockRole = { id: BigInt(1) };
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as never);

    const mockMembers: MockProjectMember[] = [
      {
        project: { id: BigInt(1), name: 'Project 1' },
        user: { id: BigInt(1), name: 'User 1', email: 'user1@example.com' },
        role: { id: BigInt(1) },
      },
      {
        project: { id: BigInt(2), name: 'Project 2' },
        user: { id: BigInt(2), name: 'User 2', email: 'user2@example.com' },
        role: { id: BigInt(1) },
      },
    ];
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never);

    const request = new Request('http://localhost/api/roles/1/members');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.members).toHaveLength(2);
    expect(data.members[0]).toEqual({
      projectId: '1',
      projectName: 'Project 1',
      userId: '1',
      userName: 'User 1',
      userEmail: 'user1@example.com',
      roleId: '1',
    });
    expect(data.total).toBe(2);
  });

  it('メンバーがいない場合は空の配列を返す', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession('1'));

    const mockRole: MockRole = { id: BigInt(1) };
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as never);
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue([]);

    const request = new Request('http://localhost/api/roles/1/members');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.members).toHaveLength(0);
    expect(data.total).toBe(0);
  });

  it('名前がnullのユーザーは「名前なし」と表示される', async () => {
    vi.mocked(auth).mockResolvedValue(createMockSession('1'));

    const mockRole: MockRole = { id: BigInt(1) };
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as never);

    const mockMembers: MockProjectMember[] = [
      {
        project: { id: BigInt(1), name: 'Project 1' },
        user: { id: BigInt(1), name: null, email: 'user@example.com' },
        role: { id: BigInt(1) },
      },
    ];
    vi.mocked(prisma.projectMember.findMany).mockResolvedValue(mockMembers as never);

    const request = new Request('http://localhost/api/roles/1/members');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.members[0].userName).toBe('名前なし');
  });
});
