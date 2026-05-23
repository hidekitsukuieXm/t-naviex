import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  USER_STATUS_LABELS,
} from '../user';

describe('User Types', () => {
  describe('validatePassword', () => {
    it('should return valid for a strong password', () => {
      const result = validatePassword('Password123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for password shorter than minimum length', () => {
      const result = validatePassword('Pass1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`
      );
    });

    it('should return error for password longer than maximum length', () => {
      const longPassword = 'A'.repeat(PASSWORD_MAX_LENGTH + 1) + 'a1';

      const result = validatePassword(longPassword);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        `パスワードは${PASSWORD_MAX_LENGTH}文字以内で入力してください。`
      );
    });

    it('should return error for password without uppercase letters', () => {
      const result = validatePassword('password123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワードには大文字を含めてください。');
    });

    it('should return error for password without lowercase letters', () => {
      const result = validatePassword('PASSWORD123');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワードには小文字を含めてください。');
    });

    it('should return error for password without numbers', () => {
      const result = validatePassword('PasswordABC');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('パスワードには数字を含めてください。');
    });

    it('should return multiple errors for very weak password', () => {
      const result = validatePassword('abc');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain(
        `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`
      );
      expect(result.errors).toContain('パスワードには大文字を含めてください。');
      expect(result.errors).toContain('パスワードには数字を含めてください。');
    });

    it('should accept password with special characters', () => {
      const result = validatePassword('Password123!@#');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('USER_STATUS_LABELS', () => {
    it('should have labels for all statuses', () => {
      expect(USER_STATUS_LABELS.ACTIVE).toBe('有効');
      expect(USER_STATUS_LABELS.INACTIVE).toBe('無効');
      expect(USER_STATUS_LABELS.SUSPENDED).toBe('停止中');
      expect(USER_STATUS_LABELS.PENDING).toBe('保留中');
    });
  });

  describe('Password constants', () => {
    it('should have correct minimum length', () => {
      expect(PASSWORD_MIN_LENGTH).toBe(8);
    });

    it('should have correct maximum length', () => {
      expect(PASSWORD_MAX_LENGTH).toBe(100);
    });
  });
});
