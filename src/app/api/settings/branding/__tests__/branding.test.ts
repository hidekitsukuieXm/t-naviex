import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';
import type { Session } from 'next-auth';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenantSettings: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type MockSession = Session & { user: { id: string } };

interface MockTenantSettings {
  id: bigint;
  logo?: string | null;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  faviconUrl?: string | null;
  customCss?: string | null;
  companyName?: string | null;
}

describe('Branding Settings API', () => {
  const defaultSettings: MockTenantSettings = {
    id: BigInt(1),
    logo: null,
    primaryColor: '#3B82F6',
    secondaryColor: '#6366F1',
    accentColor: '#8B5CF6',
    faviconUrl: null,
    customCss: null,
    companyName: null,
  };

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

    it('should return branding settings when they exist', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.tenantSettings.findFirst).mockResolvedValue(defaultSettings);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.primaryColor).toBe('#3B82F6');
      expect(data.secondaryColor).toBe('#6366F1');
    });

    it('should create default branding if not exists', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.tenantSettings.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.tenantSettings.create).mockResolvedValue(defaultSettings);

      const response = await GET();

      expect(response.status).toBe(200);
      expect(prisma.tenantSettings.create).toHaveBeenCalled();
    });
  });

  describe('PUT /api/settings/branding', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/settings/branding', {
        method: 'PUT',
        body: JSON.stringify({ primaryColor: '#10b981' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should validate color format', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);

      const request = new NextRequest('http://localhost/api/settings/branding', {
        method: 'PUT',
        body: JSON.stringify({ primaryColor: 'invalid-color' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('カラーコード');
    });

    it('should update branding settings when they exist', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.tenantSettings.findFirst).mockResolvedValue(defaultSettings);
      vi.mocked(prisma.tenantSettings.update).mockResolvedValue({
        ...defaultSettings,
        primaryColor: '#10b981',
      });

      const request = new NextRequest('http://localhost/api/settings/branding', {
        method: 'PUT',
        body: JSON.stringify({ primaryColor: '#10b981' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.primaryColor).toBe('#10b981');
    });

    it('should create settings if they do not exist', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.tenantSettings.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.tenantSettings.create).mockResolvedValue({
        ...defaultSettings,
        primaryColor: '#10b981',
      });

      const request = new NextRequest('http://localhost/api/settings/branding', {
        method: 'PUT',
        body: JSON.stringify({ primaryColor: '#10b981' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.tenantSettings.create).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/settings/branding', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should reset branding to defaults when settings exist', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.tenantSettings.findFirst).mockResolvedValue(defaultSettings);
      vi.mocked(prisma.tenantSettings.update).mockResolvedValue({
        ...defaultSettings,
        logo: null,
        primaryColor: '#3B82F6',
        secondaryColor: '#6366F1',
        accentColor: '#8B5CF6',
        faviconUrl: null,
        customCss: null,
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.primaryColor).toBe('#3B82F6');
      expect(data.logoUrl).toBeNull();
    });

    it('should create default settings if none exist', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1' } } as MockSession);
      vi.mocked(prisma.tenantSettings.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.tenantSettings.create).mockResolvedValue(defaultSettings);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.tenantSettings.create).toHaveBeenCalled();
    });
  });
});
