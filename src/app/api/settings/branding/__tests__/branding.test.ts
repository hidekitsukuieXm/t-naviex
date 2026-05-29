import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';
import type { Session } from 'next-auth';
import type { User, Organization, BrandingSettings } from '@/generated/prisma';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    brandingSettings: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type MockSession = Session & { user: { id: string } };
type MockUser = Partial<User> & { organization: Partial<Organization> | null };
type MockBranding = Partial<BrandingSettings>;

describe('Branding Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings/branding', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 404 if organization not found', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        organizationId: null,
        organization: null,
      } as MockUser);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('組織が見つかりません。');
    });

    it('should return branding settings', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        organization: { id: 'org-1' },
      } as MockUser);
      vi.mocked(prisma.brandingSettings.findUnique).mockResolvedValue({
        id: 'branding-1',
        organizationId: 'org-1',
        primaryColor: '#3b82f6',
        logoUrl: null,
      } as MockBranding);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.primaryColor).toBe('#3b82f6');
    });

    it('should create default branding if not exists', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        organization: { id: 'org-1' },
      } as MockUser);
      vi.mocked(prisma.brandingSettings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.brandingSettings.create).mockResolvedValue({
        id: 'branding-1',
        organizationId: 'org-1',
        primaryColor: '#3b82f6',
      } as MockBranding);

      const response = await GET();

      expect(response.status).toBe(200);
      expect(prisma.brandingSettings.create).toHaveBeenCalled();
    });
  });

  describe('PUT /api/settings/branding', () => {
    it('should return 403 if not admin', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        organization: { id: 'org-1' },
        role: 'MEMBER',
      } as MockUser);

      const request = new NextRequest('http://localhost/api/settings/branding', {
        method: 'PUT',
        body: JSON.stringify({ primaryColor: '#10b981' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('管理者権限');
    });

    it('should validate color format', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        organization: { id: 'org-1' },
        role: 'ADMIN',
      } as MockUser);

      const request = new NextRequest('http://localhost/api/settings/branding', {
        method: 'PUT',
        body: JSON.stringify({ primaryColor: 'invalid-color' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('カラーコード');
    });

    it('should update branding settings', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        organization: { id: 'org-1' },
        role: 'ADMIN',
      } as MockUser);
      vi.mocked(prisma.brandingSettings.upsert).mockResolvedValue({
        id: 'branding-1',
        organizationId: 'org-1',
        primaryColor: '#10b981',
      } as MockBranding);

      const request = new NextRequest('http://localhost/api/settings/branding', {
        method: 'PUT',
        body: JSON.stringify({ primaryColor: '#10b981' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.primaryColor).toBe('#10b981');
    });
  });

  describe('DELETE /api/settings/branding', () => {
    it('should reset branding to defaults', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        organization: { id: 'org-1' },
        role: 'ADMIN',
      } as MockUser);
      vi.mocked(prisma.brandingSettings.upsert).mockResolvedValue({
        id: 'branding-1',
        organizationId: 'org-1',
        primaryColor: '#3b82f6',
        logoUrl: null,
      } as MockBranding);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.primaryColor).toBe('#3b82f6');
      expect(data.logoUrl).toBeNull();
    });
  });
});
