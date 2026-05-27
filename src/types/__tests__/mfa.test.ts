/**
 * MFA Types Unit Tests
 *
 * 多要素認証型定義の単体テスト
 */

import { describe, it, expect } from 'vitest';
import {
  MfaType,
  getMfaTypeLabel,
  getMfaTypeDescription,
  validateTotpCode,
  validateBackupCode,
  formatBackupCode,
  generateOtpAuthUrl,
  countRemainingBackupCodes,
  isMfaConfigured,
  DEFAULT_BACKUP_CODE_COUNT,
  TOTP_TIME_STEP,
  TOTP_WINDOW,
  type MfaSetting,
  type MfaBackupCode,
} from '../mfa';

describe('MfaType', () => {
  it('should have correct values', () => {
    expect(MfaType.TOTP).toBe('TOTP');
    expect(MfaType.SMS).toBe('SMS');
    expect(MfaType.EMAIL).toBe('EMAIL');
  });
});

describe('getMfaTypeLabel', () => {
  it('should return correct label for TOTP', () => {
    expect(getMfaTypeLabel(MfaType.TOTP)).toBe('認証アプリ');
  });

  it('should return correct label for SMS', () => {
    expect(getMfaTypeLabel(MfaType.SMS)).toBe('SMS認証');
  });

  it('should return correct label for EMAIL', () => {
    expect(getMfaTypeLabel(MfaType.EMAIL)).toBe('メール認証');
  });

  it('should return type itself for unknown type', () => {
    expect(getMfaTypeLabel('UNKNOWN' as typeof MfaType.TOTP)).toBe('UNKNOWN');
  });
});

describe('getMfaTypeDescription', () => {
  it('should return correct description for TOTP', () => {
    expect(getMfaTypeDescription(MfaType.TOTP)).toBe(
      'Google AuthenticatorなどのTOTP認証アプリを使用'
    );
  });

  it('should return correct description for SMS', () => {
    expect(getMfaTypeDescription(MfaType.SMS)).toBe('登録された電話番号にSMSでコードを送信');
  });

  it('should return correct description for EMAIL', () => {
    expect(getMfaTypeDescription(MfaType.EMAIL)).toBe('登録されたメールアドレスにコードを送信');
  });

  it('should return empty string for unknown type', () => {
    expect(getMfaTypeDescription('UNKNOWN' as typeof MfaType.TOTP)).toBe('');
  });
});

describe('validateTotpCode', () => {
  it('should validate correct 6-digit code', () => {
    expect(validateTotpCode('123456')).toBe(true);
    expect(validateTotpCode('000000')).toBe(true);
    expect(validateTotpCode('999999')).toBe(true);
  });

  it('should reject codes with wrong length', () => {
    expect(validateTotpCode('12345')).toBe(false);
    expect(validateTotpCode('1234567')).toBe(false);
    expect(validateTotpCode('')).toBe(false);
  });

  it('should reject codes with non-numeric characters', () => {
    expect(validateTotpCode('12345a')).toBe(false);
    expect(validateTotpCode('abcdef')).toBe(false);
    expect(validateTotpCode('12 456')).toBe(false);
  });
});

describe('validateBackupCode', () => {
  it('should validate correct backup codes without hyphen', () => {
    expect(validateBackupCode('ABCD1234')).toBe(true);
    expect(validateBackupCode('12345678')).toBe(true);
  });

  it('should validate correct backup codes with hyphen', () => {
    expect(validateBackupCode('ABCD-1234')).toBe(true);
    expect(validateBackupCode('1234-5678')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(validateBackupCode('abcd-1234')).toBe(true);
    expect(validateBackupCode('AbCd-1234')).toBe(true);
  });

  it('should reject invalid backup codes', () => {
    expect(validateBackupCode('ABC')).toBe(false);
    expect(validateBackupCode('ABCD12345')).toBe(false);
    expect(validateBackupCode('ABCD-12345')).toBe(false);
    expect(validateBackupCode('ABCD--1234')).toBe(false);
  });
});

describe('formatBackupCode', () => {
  it('should format backup code without hyphen', () => {
    expect(formatBackupCode('ABCD1234')).toBe('ABCD-1234');
  });

  it('should normalize backup code with hyphen', () => {
    expect(formatBackupCode('abcd-1234')).toBe('ABCD-1234');
  });

  it('should uppercase lowercase codes', () => {
    expect(formatBackupCode('abcd1234')).toBe('ABCD-1234');
  });
});

describe('generateOtpAuthUrl', () => {
  it('should generate correct OTP auth URL', () => {
    const url = generateOtpAuthUrl('JBSWY3DPEHPK3PXP', 'user@example.com');
    expect(url).toBe(
      'otpauth://totp/T-NaviEX:user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=T-NaviEX&algorithm=SHA1&digits=6&period=30'
    );
  });

  it('should use custom issuer', () => {
    const url = generateOtpAuthUrl('SECRET', 'user@example.com', 'CustomApp');
    expect(url).toContain('issuer=CustomApp');
    expect(url).toContain('otpauth://totp/CustomApp:');
  });

  it('should encode special characters', () => {
    const url = generateOtpAuthUrl('SECRET', 'user+test@example.com', 'App Name');
    expect(url).toContain('user%2Btest%40example.com');
    expect(url).toContain('App%20Name');
  });
});

describe('countRemainingBackupCodes', () => {
  it('should count unused codes', () => {
    const codes: MfaBackupCode[] = [
      { id: '1', mfaSettingId: '1', isUsed: false, createdAt: new Date() },
      { id: '2', mfaSettingId: '1', isUsed: true, usedAt: new Date(), createdAt: new Date() },
      { id: '3', mfaSettingId: '1', isUsed: false, createdAt: new Date() },
    ];
    expect(countRemainingBackupCodes(codes)).toBe(2);
  });

  it('should return 0 for all used codes', () => {
    const codes: MfaBackupCode[] = [
      { id: '1', mfaSettingId: '1', isUsed: true, usedAt: new Date(), createdAt: new Date() },
      { id: '2', mfaSettingId: '1', isUsed: true, usedAt: new Date(), createdAt: new Date() },
    ];
    expect(countRemainingBackupCodes(codes)).toBe(0);
  });

  it('should return full count for unused codes', () => {
    const codes: MfaBackupCode[] = [
      { id: '1', mfaSettingId: '1', isUsed: false, createdAt: new Date() },
      { id: '2', mfaSettingId: '1', isUsed: false, createdAt: new Date() },
      { id: '3', mfaSettingId: '1', isUsed: false, createdAt: new Date() },
    ];
    expect(countRemainingBackupCodes(codes)).toBe(3);
  });

  it('should return 0 for empty array', () => {
    expect(countRemainingBackupCodes([])).toBe(0);
  });
});

describe('isMfaConfigured', () => {
  it('should return true for enabled and verified MFA', () => {
    const setting: MfaSetting = {
      id: '1',
      userId: '1',
      mfaType: MfaType.TOTP,
      isEnabled: true,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(isMfaConfigured(setting)).toBe(true);
  });

  it('should return false for enabled but not verified MFA', () => {
    const setting: MfaSetting = {
      id: '1',
      userId: '1',
      mfaType: MfaType.TOTP,
      isEnabled: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(isMfaConfigured(setting)).toBe(false);
  });

  it('should return false for disabled MFA', () => {
    const setting: MfaSetting = {
      id: '1',
      userId: '1',
      mfaType: MfaType.TOTP,
      isEnabled: false,
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(isMfaConfigured(setting)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isMfaConfigured(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isMfaConfigured(undefined)).toBe(false);
  });
});

describe('Constants', () => {
  it('should have correct default backup code count', () => {
    expect(DEFAULT_BACKUP_CODE_COUNT).toBe(10);
  });

  it('should have correct TOTP time step', () => {
    expect(TOTP_TIME_STEP).toBe(30);
  });

  it('should have correct TOTP window', () => {
    expect(TOTP_WINDOW).toBe(1);
  });
});
