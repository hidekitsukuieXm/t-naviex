import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { GET, PUT } from '../route';

const mockCookies = vi.mocked(cookies);

describe('Language Settings API', () => {
  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue(mockCookieStore as never);
  });

  describe('GET /api/settings/language', () => {
    it('should return default locale when no cookie is set', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locale).toBe('ja');
    });

    it('should return locale from cookie when set', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'en' });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locale).toBe('en');
    });

    it('should return default locale when cookie has invalid value', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'invalid' });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locale).toBe('ja');
    });
  });

  describe('PUT /api/settings/language', () => {
    it('should return 400 when locale is missing', async () => {
      const request = new Request('http://localhost/api/settings/language', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('無効な言語コード');
    });

    it('should return 400 when locale is invalid', async () => {
      const request = new Request('http://localhost/api/settings/language', {
        method: 'PUT',
        body: JSON.stringify({ locale: 'invalid' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('無効な言語コード');
    });

    it('should set Japanese locale successfully', async () => {
      const request = new Request('http://localhost/api/settings/language', {
        method: 'PUT',
        body: JSON.stringify({ locale: 'ja' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locale).toBe('ja');
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        't-naviex-locale',
        'ja',
        expect.objectContaining({
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
        })
      );
    });

    it('should set English locale successfully', async () => {
      const request = new Request('http://localhost/api/settings/language', {
        method: 'PUT',
        body: JSON.stringify({ locale: 'en' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.locale).toBe('en');
      expect(data.message).toContain('Language changed successfully');
    });
  });
});
