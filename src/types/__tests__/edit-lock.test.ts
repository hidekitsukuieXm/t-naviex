/**
 * Edit Lock Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  LockTargetType,
  getLockTargetTypeLabel,
  isLockValid,
  getRemainingLockTime,
  formatRemainingTime,
  getLockExpirationTime,
  DEFAULT_LOCK_DURATION,
  MAX_LOCK_DURATION,
  LOCK_HEARTBEAT_INTERVAL,
  LOCK_WARNING_THRESHOLD,
  EditLock,
} from '../edit-lock';

describe('edit-lock types', () => {
  // ====================================
  // LockTargetType Tests
  // ====================================

  describe('LockTargetType', () => {
    it('should have all expected values', () => {
      expect(LockTargetType.TEST_CASE).toBe('TEST_CASE');
      expect(LockTargetType.TEST_SPEC).toBe('TEST_SPEC');
      expect(LockTargetType.TEST_SECTION).toBe('TEST_SECTION');
    });
  });

  // ====================================
  // getLockTargetTypeLabel Tests
  // ====================================

  describe('getLockTargetTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getLockTargetTypeLabel(LockTargetType.TEST_CASE)).toBe('テストケース');
      expect(getLockTargetTypeLabel(LockTargetType.TEST_SPEC)).toBe('テスト仕様書');
      expect(getLockTargetTypeLabel(LockTargetType.TEST_SECTION)).toBe('テストセクション');
    });

    it('should return type itself for unknown types', () => {
      expect(getLockTargetTypeLabel('UNKNOWN' as LockTargetType)).toBe('UNKNOWN');
    });
  });

  // ====================================
  // isLockValid Tests
  // ====================================

  describe('isLockValid', () => {
    it('should return false for undefined lock', () => {
      expect(isLockValid(undefined)).toBe(false);
    });

    it('should return true for non-expired lock', () => {
      const lock: EditLock = {
        id: '1',
        targetType: LockTargetType.TEST_CASE,
        targetId: '1',
        userId: '1',
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };
      expect(isLockValid(lock)).toBe(true);
    });

    it('should return false for expired lock', () => {
      const lock: EditLock = {
        id: '1',
        targetType: LockTargetType.TEST_CASE,
        targetId: '1',
        userId: '1',
        lockedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };
      expect(isLockValid(lock)).toBe(false);
    });
  });

  // ====================================
  // getRemainingLockTime Tests
  // ====================================

  describe('getRemainingLockTime', () => {
    it('should return 0 for undefined lock', () => {
      expect(getRemainingLockTime(undefined)).toBe(0);
    });

    it('should return positive value for non-expired lock', () => {
      const lock: EditLock = {
        id: '1',
        targetType: LockTargetType.TEST_CASE,
        targetId: '1',
        userId: '1',
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      };
      const remaining = getRemainingLockTime(lock);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(5 * 60);
    });

    it('should return 0 for expired lock', () => {
      const lock: EditLock = {
        id: '1',
        targetType: LockTargetType.TEST_CASE,
        targetId: '1',
        userId: '1',
        lockedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      };
      expect(getRemainingLockTime(lock)).toBe(0);
    });
  });

  // ====================================
  // formatRemainingTime Tests
  // ====================================

  describe('formatRemainingTime', () => {
    it('should return "期限切れ" for 0 or negative seconds', () => {
      expect(formatRemainingTime(0)).toBe('期限切れ');
      expect(formatRemainingTime(-10)).toBe('期限切れ');
    });

    it('should format seconds only', () => {
      expect(formatRemainingTime(30)).toBe('30秒');
      expect(formatRemainingTime(59)).toBe('59秒');
    });

    it('should format minutes and seconds', () => {
      expect(formatRemainingTime(90)).toBe('1分30秒');
      expect(formatRemainingTime(300)).toBe('5分0秒');
      expect(formatRemainingTime(3599)).toBe('59分59秒');
    });

    it('should format hours and minutes', () => {
      expect(formatRemainingTime(3600)).toBe('1時間0分');
      expect(formatRemainingTime(3660)).toBe('1時間1分');
      expect(formatRemainingTime(7200)).toBe('2時間0分');
    });
  });

  // ====================================
  // getLockExpirationTime Tests
  // ====================================

  describe('getLockExpirationTime', () => {
    it('should return correct expiration time with default duration', () => {
      const before = Date.now();
      const expiration = getLockExpirationTime();
      const after = Date.now();

      // Should be approximately 30 minutes from now
      const expectedMin = before + DEFAULT_LOCK_DURATION * 60 * 1000;
      const expectedMax = after + DEFAULT_LOCK_DURATION * 60 * 1000;

      expect(expiration.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiration.getTime()).toBeLessThanOrEqual(expectedMax);
    });

    it('should return correct expiration time with custom duration', () => {
      const customDuration = 60; // 60 minutes
      const before = Date.now();
      const expiration = getLockExpirationTime(customDuration);
      const after = Date.now();

      const expectedMin = before + customDuration * 60 * 1000;
      const expectedMax = after + customDuration * 60 * 1000;

      expect(expiration.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiration.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  // ====================================
  // Constants Tests
  // ====================================

  describe('constants', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_LOCK_DURATION).toBe(30);
      expect(MAX_LOCK_DURATION).toBe(120);
      expect(LOCK_HEARTBEAT_INTERVAL).toBe(60);
      expect(LOCK_WARNING_THRESHOLD).toBe(300);
    });
  });
});
