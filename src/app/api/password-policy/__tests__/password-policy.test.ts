import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/password-policy-repository', () => ({
  getPasswordPolicy: vi.fn(),
  updatePasswordPolicy: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  getPasswordPolicy,
  updatePasswordPolicy,
} from '@/lib/repositories/password-policy-repository';
import { GET, PUT } from '../route';

const mockAuth = vi.mocked(auth);
const mockGetPasswordPolicy = vi.mocked(getPasswordPolicy);
const mockUpdatePasswordPolicy = vi.mocked(updatePasswordPolicy);

describe('Password Policy API', () => {
  const mockSession = {
    user: { id: '1', email: 'admin@example.com', name: 'Admin User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockPolicy = {
    id: '1',
    minLength: 8,
    maxLength: 100,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    expirationDays: 0,
    preventReuse: 0,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/password-policy', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return password policy when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetPasswordPolicy.mockResolvedValueOnce(mockPolicy);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.minLength).toBe(8);
      expect(data.maxLength).toBe(100);
      expect(data.requireUppercase).toBe(true);
      expect(data.maxLoginAttempts).toBe(5);
    });
  });

  describe('PUT /api/password-policy', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/password-policy', {
        method: 'PUT',
        body: JSON.stringify({ minLength: 10 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when minLength is out of range', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/password-policy', {
        method: 'PUT',
        body: JSON.stringify({ minLength: 0 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('最小文字数は1〜50の範囲で設定してください');
    });

    it('should return 400 when maxLength is out of range', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/password-policy', {
        method: 'PUT',
        body: JSON.stringify({ maxLength: 300 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('最大文字数は50〜200の範囲で設定してください');
    });

    it('should return 400 when minLength is greater than maxLength', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/password-policy', {
        method: 'PUT',
        body: JSON.stringify({ minLength: 60, maxLength: 50 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('最小文字数は最大文字数以下にしてください');
    });

    it('should return 400 when maxLoginAttempts is out of range', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/password-policy', {
        method: 'PUT',
        body: JSON.stringify({ maxLoginAttempts: 0 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('最大ログイン試行回数は1〜10の範囲で設定してください');
    });

    it('should return 400 when lockoutDurationMinutes is out of range', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/password-policy', {
        method: 'PUT',
        body: JSON.stringify({ lockoutDurationMinutes: 2000 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('ロック期間は1〜1440分');
    });

    it('should update password policy when valid data is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      const updatedPolicy = {
        ...mockPolicy,
        minLength: 10,
        requireSpecialChars: true,
      };
      mockUpdatePasswordPolicy.mockResolvedValueOnce(updatedPolicy);

      const request = new Request('http://localhost/api/password-policy', {
        method: 'PUT',
        body: JSON.stringify({
          minLength: 10,
          requireSpecialChars: true,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.minLength).toBe(10);
      expect(data.requireSpecialChars).toBe(true);
      expect(mockUpdatePasswordPolicy).toHaveBeenCalledWith({
        minLength: 10,
        requireSpecialChars: true,
      });
    });

    it('should update account lock settings', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      const updatedPolicy = {
        ...mockPolicy,
        maxLoginAttempts: 3,
        lockoutDurationMinutes: 60,
      };
      mockUpdatePasswordPolicy.mockResolvedValueOnce(updatedPolicy);

      const request = new Request('http://localhost/api/password-policy', {
        method: 'PUT',
        body: JSON.stringify({
          maxLoginAttempts: 3,
          lockoutDurationMinutes: 60,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.maxLoginAttempts).toBe(3);
      expect(data.lockoutDurationMinutes).toBe(60);
    });
  });
});
