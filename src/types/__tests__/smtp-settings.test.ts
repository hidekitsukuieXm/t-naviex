import { describe, it, expect } from 'vitest';
import { validateSmtpSettings, maskPassword, DEFAULT_SMTP_SETTINGS } from '../smtp-settings';

describe('SMTP Settings Types', () => {
  describe('validateSmtpSettings', () => {
    it('should return valid for empty object', () => {
      const result = validateSmtpSettings({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when host is empty', () => {
      const result = validateSmtpSettings({ host: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'host',
        message: 'SMTPサーバーを入力してください。',
      });
    });

    it('should return error when host is too long', () => {
      const result = validateSmtpSettings({ host: 'a'.repeat(256) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'host',
        message: 'SMTPサーバーは255文字以内で入力してください。',
      });
    });

    it('should return error when port is out of range', () => {
      const result = validateSmtpSettings({ port: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'port',
        message: 'ポート番号は1〜65535の範囲で入力してください。',
      });
    });

    it('should return error when port is too high', () => {
      const result = validateSmtpSettings({ port: 70000 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'port',
        message: 'ポート番号は1〜65535の範囲で入力してください。',
      });
    });

    it('should return error when fromEmail is empty', () => {
      const result = validateSmtpSettings({ fromEmail: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'fromEmail',
        message: '送信元メールアドレスを入力してください。',
      });
    });

    it('should return error when fromEmail is invalid', () => {
      const result = validateSmtpSettings({ fromEmail: 'invalid-email' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'fromEmail',
        message: '有効なメールアドレスを入力してください。',
      });
    });

    it('should return error when fromEmail is too long', () => {
      const result = validateSmtpSettings({ fromEmail: 'a'.repeat(250) + '@example.com' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'fromEmail',
        message: '送信元メールアドレスは255文字以内で入力してください。',
      });
    });

    it('should return error when fromName is too long', () => {
      const result = validateSmtpSettings({ fromName: 'a'.repeat(256) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'fromName',
        message: '送信者名は255文字以内で入力してください。',
      });
    });

    it('should return error when username is too long', () => {
      const result = validateSmtpSettings({
        authEnabled: true,
        username: 'a'.repeat(256),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'username',
        message: 'ユーザー名は255文字以内で入力してください。',
      });
    });

    it('should return valid for valid settings', () => {
      const result = validateSmtpSettings({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        fromEmail: 'noreply@example.com',
        fromName: 'Test',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('maskPassword', () => {
    it('should return null for null input', () => {
      expect(maskPassword(null)).toBeNull();
    });

    it('should return masked password', () => {
      expect(maskPassword('password123')).toBe('********');
    });
  });

  describe('DEFAULT_SMTP_SETTINGS', () => {
    it('should have default values', () => {
      expect(DEFAULT_SMTP_SETTINGS.host).toBe('');
      expect(DEFAULT_SMTP_SETTINGS.port).toBe(587);
      expect(DEFAULT_SMTP_SETTINGS.secure).toBe(false);
      expect(DEFAULT_SMTP_SETTINGS.authEnabled).toBe(true);
      expect(DEFAULT_SMTP_SETTINGS.isEnabled).toBe(false);
    });
  });
});
