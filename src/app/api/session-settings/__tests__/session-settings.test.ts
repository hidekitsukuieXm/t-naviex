import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/session-settings-repository', () => ({
  getSessionSettings: vi.fn(),
  updateSessionSettings: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  getSessionSettings,
  updateSessionSettings,
} from '@/lib/repositories/session-settings-repository';
import { GET, PUT } from '../route';

const mockAuth = vi.mocked(auth);
const mockGetSessionSettings = vi.mocked(getSessionSettings);
const mockUpdateSessionSettings = vi.mocked(updateSessionSettings);

describe('Session Settings API', () => {
  const mockSession = {
    user: { id: '1', email: 'admin@example.com', name: 'Admin User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockSettings = {
    id: '1',
    sessionTimeoutMinutes: 30,
    warningBeforeMinutes: 5,
    extendOnActivity: true,
    maxConcurrentSessions: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/session-settings', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return session settings when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetSessionSettings.mockResolvedValueOnce(mockSettings);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionTimeoutMinutes).toBe(30);
      expect(data.warningBeforeMinutes).toBe(5);
      expect(data.extendOnActivity).toBe(true);
      expect(data.maxConcurrentSessions).toBe(0);
    });
  });

  describe('PUT /api/session-settings', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/session-settings', {
        method: 'PUT',
        body: JSON.stringify({ sessionTimeoutMinutes: 60 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when sessionTimeoutMinutes is out of range', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/session-settings', {
        method: 'PUT',
        body: JSON.stringify({ sessionTimeoutMinutes: 0 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('セッションタイムアウトは1〜480分の範囲で設定してください');
    });

    it('should return 400 when warningBeforeMinutes is out of range', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/session-settings', {
        method: 'PUT',
        body: JSON.stringify({ warningBeforeMinutes: 0 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('タイムアウト警告時間は1〜30分の範囲で設定してください');
    });

    it('should return 400 when warningBeforeMinutes >= sessionTimeoutMinutes', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/session-settings', {
        method: 'PUT',
        body: JSON.stringify({ sessionTimeoutMinutes: 5, warningBeforeMinutes: 10 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('警告時間はタイムアウト時間より短く設定してください');
    });

    it('should return 400 when maxConcurrentSessions is out of range', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/session-settings', {
        method: 'PUT',
        body: JSON.stringify({ maxConcurrentSessions: -1 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('同時セッション数上限は0〜10の範囲で設定してください');
    });

    it('should update session settings when valid data is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      const updatedSettings = {
        ...mockSettings,
        sessionTimeoutMinutes: 60,
        warningBeforeMinutes: 10,
      };
      mockUpdateSessionSettings.mockResolvedValueOnce(updatedSettings);

      const request = new Request('http://localhost/api/session-settings', {
        method: 'PUT',
        body: JSON.stringify({
          sessionTimeoutMinutes: 60,
          warningBeforeMinutes: 10,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessionTimeoutMinutes).toBe(60);
      expect(data.warningBeforeMinutes).toBe(10);
      expect(mockUpdateSessionSettings).toHaveBeenCalledWith({
        sessionTimeoutMinutes: 60,
        warningBeforeMinutes: 10,
      });
    });

    it('should update extendOnActivity setting', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      const updatedSettings = {
        ...mockSettings,
        extendOnActivity: false,
      };
      mockUpdateSessionSettings.mockResolvedValueOnce(updatedSettings);

      const request = new Request('http://localhost/api/session-settings', {
        method: 'PUT',
        body: JSON.stringify({
          extendOnActivity: false,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.extendOnActivity).toBe(false);
    });

    it('should update maxConcurrentSessions setting', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      const updatedSettings = {
        ...mockSettings,
        maxConcurrentSessions: 3,
      };
      mockUpdateSessionSettings.mockResolvedValueOnce(updatedSettings);

      const request = new Request('http://localhost/api/session-settings', {
        method: 'PUT',
        body: JSON.stringify({
          maxConcurrentSessions: 3,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.maxConcurrentSessions).toBe(3);
    });
  });
});
