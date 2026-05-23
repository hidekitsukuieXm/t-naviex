import { describe, it, expect } from 'vitest';
import { validateSessionSettings, DEFAULT_SESSION_SETTINGS } from '../session-settings';

describe('Session Settings Validation', () => {
  describe('validateSessionSettings', () => {
    it('should pass for valid settings', () => {
      const result = validateSessionSettings({
        sessionTimeoutMinutes: 30,
        warningBeforeMinutes: 5,
        maxConcurrentSessions: 3,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for default settings', () => {
      const result = validateSessionSettings(DEFAULT_SESSION_SETTINGS);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when sessionTimeoutMinutes is less than 1', () => {
      const result = validateSessionSettings({ sessionTimeoutMinutes: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('セッションタイムアウトは1〜480分の範囲で設定してください。');
    });

    it('should fail when sessionTimeoutMinutes exceeds 480', () => {
      const result = validateSessionSettings({ sessionTimeoutMinutes: 481 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('セッションタイムアウトは1〜480分の範囲で設定してください。');
    });

    it('should fail when warningBeforeMinutes is less than 1', () => {
      const result = validateSessionSettings({ warningBeforeMinutes: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('タイムアウト警告時間は1〜30分の範囲で設定してください。');
    });

    it('should fail when warningBeforeMinutes exceeds 30', () => {
      const result = validateSessionSettings({ warningBeforeMinutes: 31 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('タイムアウト警告時間は1〜30分の範囲で設定してください。');
    });

    it('should fail when warningBeforeMinutes >= sessionTimeoutMinutes', () => {
      const result = validateSessionSettings({
        sessionTimeoutMinutes: 10,
        warningBeforeMinutes: 10,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('警告時間はタイムアウト時間より短く設定してください。');
    });

    it('should fail when warningBeforeMinutes > sessionTimeoutMinutes', () => {
      const result = validateSessionSettings({
        sessionTimeoutMinutes: 5,
        warningBeforeMinutes: 10,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('警告時間はタイムアウト時間より短く設定してください。');
    });

    it('should fail when maxConcurrentSessions is negative', () => {
      const result = validateSessionSettings({ maxConcurrentSessions: -1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('同時セッション数上限は0〜10の範囲で設定してください。');
    });

    it('should fail when maxConcurrentSessions exceeds 10', () => {
      const result = validateSessionSettings({ maxConcurrentSessions: 11 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('同時セッション数上限は0〜10の範囲で設定してください。');
    });

    it('should pass when maxConcurrentSessions is 0 (unlimited)', () => {
      const result = validateSessionSettings({ maxConcurrentSessions: 0 });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report multiple errors', () => {
      const result = validateSessionSettings({
        sessionTimeoutMinutes: 0,
        warningBeforeMinutes: 0,
        maxConcurrentSessions: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should pass when only extendOnActivity is provided', () => {
      const result = validateSessionSettings({ extendOnActivity: false });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for edge case values', () => {
      const result = validateSessionSettings({
        sessionTimeoutMinutes: 480,
        warningBeforeMinutes: 30,
        maxConcurrentSessions: 10,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for minimum valid values', () => {
      const result = validateSessionSettings({
        sessionTimeoutMinutes: 2,
        warningBeforeMinutes: 1,
        maxConcurrentSessions: 0,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
