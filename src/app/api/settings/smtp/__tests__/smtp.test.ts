import { describe, it, expect, vi, beforeEach } from 'vitest';

// モックの設定
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/repositories/smtp-settings-repository', () => ({
  getSmtpSettings: vi.fn(),
  getSmtpSettingsWithPassword: vi.fn(),
  updateSmtpSettings: vi.fn(),
  recordSmtpTestResult: vi.fn(),
}));

vi.mock('@/services/email/smtp-client', () => ({
  SmtpClient: {
    fromSettings: vi.fn(() => ({
      testConnection: vi.fn(),
      sendTestMail: vi.fn(),
      close: vi.fn(),
    })),
  },
}));

vi.mock('@/services/email/notification-service', () => ({
  resetNotificationService: vi.fn(),
}));

import { auth } from '@/lib/auth';
import {
  getSmtpSettings,
  getSmtpSettingsWithPassword,
  updateSmtpSettings,
  recordSmtpTestResult,
} from '@/lib/repositories/smtp-settings-repository';
import { SmtpClient } from '@/services/email/smtp-client';
import { GET, PUT, POST } from '../route';

const mockAuth = vi.mocked(auth);
const mockGetSmtpSettings = vi.mocked(getSmtpSettings);
const mockGetSmtpSettingsWithPassword = vi.mocked(getSmtpSettingsWithPassword);
const mockUpdateSmtpSettings = vi.mocked(updateSmtpSettings);
const mockRecordSmtpTestResult = vi.mocked(recordSmtpTestResult);
const mockSmtpClientFromSettings = vi.mocked(SmtpClient.fromSettings);

describe('SMTP Settings API', () => {
  const mockSession = {
    user: { id: '1', email: 'admin@example.com', name: 'Admin User' },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockSettings = {
    id: '1',
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    authEnabled: true,
    username: 'user@example.com',
    password: '********',
    fromEmail: 'noreply@example.com',
    fromName: 'T-NaviEx',
    isEnabled: true,
    lastTestedAt: '2024-01-01T00:00:00.000Z',
    lastTestSuccess: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/settings/smtp', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return SMTP settings when authenticated', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetSmtpSettings.mockResolvedValueOnce(mockSettings);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.host).toBe('smtp.example.com');
      expect(data.port).toBe(587);
      expect(data.fromEmail).toBe('noreply@example.com');
    });
  });

  describe('PUT /api/settings/smtp', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/smtp', {
        method: 'PUT',
        body: JSON.stringify({ host: 'smtp.example.com' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when port is out of range', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/settings/smtp', {
        method: 'PUT',
        body: JSON.stringify({ port: 70000 }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('ポート番号');
    });

    it('should return 400 when fromEmail is invalid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/settings/smtp', {
        method: 'PUT',
        body: JSON.stringify({ fromEmail: 'invalid-email' }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('メールアドレス');
    });

    it('should update SMTP settings when valid data is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      const updatedSettings = {
        ...mockSettings,
        port: 465,
        secure: true,
      };
      mockUpdateSmtpSettings.mockResolvedValueOnce(updatedSettings);

      const request = new Request('http://localhost/api/settings/smtp', {
        method: 'PUT',
        body: JSON.stringify({ port: 465, secure: true }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.port).toBe(465);
      expect(data.secure).toBe(true);
    });
  });

  describe('POST /api/settings/smtp (connection test)', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new Request('http://localhost/api/settings/smtp', {
        method: 'POST',
        body: JSON.stringify({ action: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です。');
    });

    it('should return 400 when action is invalid', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);

      const request = new Request('http://localhost/api/settings/smtp', {
        method: 'POST',
        body: JSON.stringify({ action: 'invalid' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('無効なアクションです。');
    });

    it('should return 400 when SMTP settings are incomplete', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetSmtpSettingsWithPassword.mockResolvedValueOnce({
        ...mockSettings,
        host: '',
        fromEmail: '',
        decryptedPassword: undefined,
      });

      const request = new Request('http://localhost/api/settings/smtp', {
        method: 'POST',
        body: JSON.stringify({ action: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toContain('SMTP設定が不完全です');
    });

    it('should test connection successfully', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetSmtpSettingsWithPassword.mockResolvedValueOnce({
        ...mockSettings,
        decryptedPassword: 'password123',
      });

      const mockClient = {
        testConnection: vi.fn().mockResolvedValue({
          success: true,
          message: 'SMTP接続テストに成功しました。',
          details: { connectionTime: 100 },
        }),
        close: vi.fn(),
      };
      mockSmtpClientFromSettings.mockReturnValueOnce(mockClient as never);

      const request = new Request('http://localhost/api/settings/smtp', {
        method: 'POST',
        body: JSON.stringify({ action: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRecordSmtpTestResult).toHaveBeenCalledWith(true);
    });

    it('should send test email when testEmail is provided', async () => {
      mockAuth.mockResolvedValueOnce(mockSession);
      mockGetSmtpSettingsWithPassword.mockResolvedValueOnce({
        ...mockSettings,
        decryptedPassword: 'password123',
      });

      const mockClient = {
        testConnection: vi.fn().mockResolvedValue({
          success: true,
          message: 'SMTP接続テストに成功しました。',
          details: { connectionTime: 100 },
        }),
        sendTestMail: vi.fn().mockResolvedValue({
          success: true,
          messageId: 'test-message-id',
        }),
        close: vi.fn(),
      };
      mockSmtpClientFromSettings.mockReturnValueOnce(mockClient as never);

      const request = new Request('http://localhost/api/settings/smtp', {
        method: 'POST',
        body: JSON.stringify({ action: 'test', testEmail: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('test@example.com');
      expect(mockClient.sendTestMail).toHaveBeenCalledWith('test@example.com');
    });
  });
});
