import { describe, it, expect } from 'vitest';
import {
  validatePasswordWithPolicy,
  validatePasswordPolicySettings,
  DEFAULT_PASSWORD_POLICY,
} from '../password-policy';

describe('Password Policy Validation', () => {
  describe('validatePasswordWithPolicy', () => {
    it('should pass for valid password with default policy', () => {
      const result = validatePasswordWithPolicy('Password123', DEFAULT_PASSWORD_POLICY);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when password is too short', () => {
      const result = validatePasswordWithPolicy('Pass1', DEFAULT_PASSWORD_POLICY);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワードは8文字以上で入力してください。');
    });

    it('should fail when password is too long', () => {
      const longPassword = 'A'.repeat(101) + 'a1';
      const result = validatePasswordWithPolicy(longPassword, DEFAULT_PASSWORD_POLICY);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワードは100文字以内で入力してください。');
    });

    it('should fail when password does not contain uppercase', () => {
      const result = validatePasswordWithPolicy('password123', DEFAULT_PASSWORD_POLICY);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワードには大文字を含めてください。');
    });

    it('should fail when password does not contain lowercase', () => {
      const result = validatePasswordWithPolicy('PASSWORD123', DEFAULT_PASSWORD_POLICY);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワードには小文字を含めてください。');
    });

    it('should fail when password does not contain numbers', () => {
      const result = validatePasswordWithPolicy('PasswordAbc', DEFAULT_PASSWORD_POLICY);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワードには数字を含めてください。');
    });

    it('should fail when special chars are required but missing', () => {
      const policy = { ...DEFAULT_PASSWORD_POLICY, requireSpecialChars: true };
      const result = validatePasswordWithPolicy('Password123', policy);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワードには特殊文字（!@#$%^&*など）を含めてください。');
    });

    it('should pass when special chars are required and present', () => {
      const policy = { ...DEFAULT_PASSWORD_POLICY, requireSpecialChars: true };
      const result = validatePasswordWithPolicy('Password123!', policy);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when uppercase is not required', () => {
      const policy = { ...DEFAULT_PASSWORD_POLICY, requireUppercase: false };
      const result = validatePasswordWithPolicy('password123', policy);
      expect(result.valid).toBe(true);
    });

    it('should pass when lowercase is not required', () => {
      const policy = { ...DEFAULT_PASSWORD_POLICY, requireLowercase: false };
      const result = validatePasswordWithPolicy('PASSWORD123', policy);
      expect(result.valid).toBe(true);
    });

    it('should pass when numbers are not required', () => {
      const policy = { ...DEFAULT_PASSWORD_POLICY, requireNumbers: false };
      const result = validatePasswordWithPolicy('PasswordAbc', policy);
      expect(result.valid).toBe(true);
    });

    it('should report multiple errors', () => {
      const result = validatePasswordWithPolicy('short', DEFAULT_PASSWORD_POLICY);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validatePasswordPolicySettings', () => {
    it('should pass for valid settings', () => {
      const result = validatePasswordPolicySettings({
        minLength: 10,
        maxLength: 100,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 30,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when minLength is less than 1', () => {
      const result = validatePasswordPolicySettings({ minLength: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('最小文字数は1〜50の範囲で設定してください。');
    });

    it('should fail when minLength is greater than 50', () => {
      const result = validatePasswordPolicySettings({ minLength: 51 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('最小文字数は1〜50の範囲で設定してください。');
    });

    it('should fail when maxLength is less than 50', () => {
      const result = validatePasswordPolicySettings({ maxLength: 49 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('最大文字数は50〜200の範囲で設定してください。');
    });

    it('should fail when maxLength is greater than 200', () => {
      const result = validatePasswordPolicySettings({ maxLength: 201 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('最大文字数は50〜200の範囲で設定してください。');
    });

    it('should fail when minLength is greater than maxLength', () => {
      const result = validatePasswordPolicySettings({ minLength: 60, maxLength: 50 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('最小文字数は最大文字数以下にしてください。');
    });

    it('should fail when expirationDays is negative', () => {
      const result = validatePasswordPolicySettings({ expirationDays: -1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワード有効期間は0〜365日の範囲で設定してください。');
    });

    it('should fail when expirationDays exceeds 365', () => {
      const result = validatePasswordPolicySettings({ expirationDays: 366 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワード有効期間は0〜365日の範囲で設定してください。');
    });

    it('should fail when preventReuse is negative', () => {
      const result = validatePasswordPolicySettings({ preventReuse: -1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        '過去のパスワード再利用禁止回数は0〜24の範囲で設定してください。'
      );
    });

    it('should fail when preventReuse exceeds 24', () => {
      const result = validatePasswordPolicySettings({ preventReuse: 25 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        '過去のパスワード再利用禁止回数は0〜24の範囲で設定してください。'
      );
    });

    it('should fail when maxLoginAttempts is less than 1', () => {
      const result = validatePasswordPolicySettings({ maxLoginAttempts: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('最大ログイン試行回数は1〜10の範囲で設定してください。');
    });

    it('should fail when maxLoginAttempts exceeds 10', () => {
      const result = validatePasswordPolicySettings({ maxLoginAttempts: 11 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('最大ログイン試行回数は1〜10の範囲で設定してください。');
    });

    it('should fail when lockoutDurationMinutes is less than 1', () => {
      const result = validatePasswordPolicySettings({ lockoutDurationMinutes: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ロック期間は1〜1440分（24時間）の範囲で設定してください。');
    });

    it('should fail when lockoutDurationMinutes exceeds 1440', () => {
      const result = validatePasswordPolicySettings({ lockoutDurationMinutes: 1441 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ロック期間は1〜1440分（24時間）の範囲で設定してください。');
    });

    it('should report multiple errors', () => {
      const result = validatePasswordPolicySettings({
        minLength: 0,
        maxLength: 300,
        maxLoginAttempts: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
