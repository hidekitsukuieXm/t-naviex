import { describe, it, expect } from 'vitest';
import {
  validateTokenName,
  validateScopes,
  validateExpiresAt,
  validateIpAddress,
  calculateExpirationDate,
  isTokenValid,
  getTokenRemainingDays,
  hasReadScope,
  hasWriteScope,
  hasRequiredScopes,
  API_TOKEN_SCOPE_LABELS,
  API_TOKEN_SCOPE_GROUPS,
  ALL_API_TOKEN_SCOPES,
  type ApiToken,
  type ApiTokenScope,
} from '../api-token';

describe('API Token Types', () => {
  describe('validateTokenName', () => {
    it('should accept valid token name', () => {
      const result = validateTokenName('My API Token');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty token name', () => {
      const result = validateTokenName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('トークン名は必須です。');
    });

    it('should reject whitespace-only token name', () => {
      const result = validateTokenName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('トークン名は必須です。');
    });

    it('should reject token name shorter than 3 characters', () => {
      const result = validateTokenName('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('トークン名は3文字以上で入力してください。');
    });

    it('should reject token name longer than 255 characters', () => {
      const longName = 'a'.repeat(256);
      const result = validateTokenName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('トークン名は255文字以内で入力してください。');
    });

    it('should accept token name with exactly 255 characters', () => {
      const maxName = 'a'.repeat(255);
      const result = validateTokenName(maxName);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateScopes', () => {
    it('should accept valid scopes', () => {
      const result = validateScopes(['READ_PROJECTS', 'WRITE_PROJECTS']);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept single scope', () => {
      const result = validateScopes(['ADMIN']);
      expect(result.valid).toBe(true);
    });

    it('should reject empty scopes array', () => {
      const result = validateScopes([]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('少なくとも1つのスコープを選択してください。');
    });

    it('should reject invalid scopes', () => {
      const result = validateScopes(['INVALID_SCOPE' as ApiTokenScope]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('無効なスコープが含まれています');
    });

    it('should reject mixed valid and invalid scopes', () => {
      const result = validateScopes(['READ_PROJECTS', 'INVALID' as ApiTokenScope]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('INVALID');
    });
  });

  describe('validateExpiresAt', () => {
    it('should accept null (no expiration)', () => {
      const result = validateExpiresAt(null);
      expect(result.valid).toBe(true);
    });

    it('should accept future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const result = validateExpiresAt(futureDate.toISOString());
      expect(result.valid).toBe(true);
    });

    it('should reject past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const result = validateExpiresAt(pastDate.toISOString());
      expect(result.valid).toBe(false);
      expect(result.error).toBe('有効期限は現在より後の日付を指定してください。');
    });

    it('should reject invalid date format', () => {
      const result = validateExpiresAt('invalid-date');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('有効期限の日付形式が正しくありません。');
    });
  });

  describe('validateIpAddress', () => {
    it('should accept valid IPv4 address', () => {
      const result = validateIpAddress('192.168.1.1');
      expect(result.valid).toBe(true);
    });

    it('should accept valid IPv4 CIDR', () => {
      const result = validateIpAddress('192.168.1.0/24');
      expect(result.valid).toBe(true);
    });

    it('should accept localhost', () => {
      const result = validateIpAddress('127.0.0.1');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid IPv4 address', () => {
      const result = validateIpAddress('256.256.256.256');
      expect(result.valid).toBe(false);
    });

    it('should reject invalid format', () => {
      const result = validateIpAddress('not-an-ip');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('有効なIPアドレスまたはCIDR形式で入力してください。');
    });

    it('should reject invalid CIDR prefix', () => {
      const result = validateIpAddress('192.168.1.0/33');
      expect(result.valid).toBe(false);
    });
  });

  describe('calculateExpirationDate', () => {
    it('should return null for null option', () => {
      const result = calculateExpirationDate(null);
      expect(result).toBeNull();
    });

    it('should calculate 7 days from now', () => {
      const result = calculateExpirationDate('7d');
      expect(result).toBeInstanceOf(Date);
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      // Compare dates (within a minute tolerance)
      expect(Math.abs(result!.getTime() - expected.getTime())).toBeLessThan(60000);
    });

    it('should calculate 30 days from now', () => {
      const result = calculateExpirationDate('30d');
      expect(result).toBeInstanceOf(Date);
      const expected = new Date();
      expected.setDate(expected.getDate() + 30);
      expect(Math.abs(result!.getTime() - expected.getTime())).toBeLessThan(60000);
    });

    it('should return null for invalid format', () => {
      const result = calculateExpirationDate('invalid');
      expect(result).toBeNull();
    });
  });

  describe('isTokenValid', () => {
    const createToken = (overrides: Partial<ApiToken> = {}): ApiToken => ({
      id: '1',
      userId: '1',
      name: 'Test Token',
      tokenPrefix: 'abc12345',
      scopes: ['READ_PROJECTS'],
      expiresAt: null,
      lastUsedAt: null,
      lastUsedIp: null,
      isActive: true,
      revokedAt: null,
      revokedReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    });

    it('should return true for active token without expiration', () => {
      const token = createToken();
      expect(isTokenValid(token)).toBe(true);
    });

    it('should return true for active token with future expiration', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const token = createToken({ expiresAt: futureDate.toISOString() });
      expect(isTokenValid(token)).toBe(true);
    });

    it('should return false for inactive token', () => {
      const token = createToken({ isActive: false });
      expect(isTokenValid(token)).toBe(false);
    });

    it('should return false for revoked token', () => {
      const token = createToken({ revokedAt: new Date().toISOString() });
      expect(isTokenValid(token)).toBe(false);
    });

    it('should return false for expired token', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const token = createToken({ expiresAt: pastDate.toISOString() });
      expect(isTokenValid(token)).toBe(false);
    });
  });

  describe('getTokenRemainingDays', () => {
    const createToken = (expiresAt: string | null): ApiToken => ({
      id: '1',
      userId: '1',
      name: 'Test Token',
      tokenPrefix: 'abc12345',
      scopes: ['READ_PROJECTS'],
      expiresAt,
      lastUsedAt: null,
      lastUsedIp: null,
      isActive: true,
      revokedAt: null,
      revokedReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    it('should return null for token without expiration', () => {
      const token = createToken(null);
      expect(getTokenRemainingDays(token)).toBeNull();
    });

    it('should return positive days for future expiration', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const token = createToken(futureDate.toISOString());
      const result = getTokenRemainingDays(token);
      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(31);
    });

    it('should return negative days for past expiration', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const token = createToken(pastDate.toISOString());
      const result = getTokenRemainingDays(token);
      expect(result).toBeLessThan(0);
    });
  });

  describe('hasReadScope', () => {
    it('should return true for ADMIN scope', () => {
      expect(hasReadScope(['ADMIN'], 'projects')).toBe(true);
    });

    it('should return true for matching read scope', () => {
      expect(hasReadScope(['READ_PROJECTS'], 'projects')).toBe(true);
    });

    it('should return false for write scope only', () => {
      expect(hasReadScope(['WRITE_PROJECTS'], 'projects')).toBe(false);
    });

    it('should return false for different resource', () => {
      expect(hasReadScope(['READ_PROJECTS'], 'bugs')).toBe(false);
    });
  });

  describe('hasWriteScope', () => {
    it('should return true for ADMIN scope', () => {
      expect(hasWriteScope(['ADMIN'], 'projects')).toBe(true);
    });

    it('should return true for matching write scope', () => {
      expect(hasWriteScope(['WRITE_PROJECTS'], 'projects')).toBe(true);
    });

    it('should return false for read scope only', () => {
      expect(hasWriteScope(['READ_PROJECTS'], 'projects')).toBe(false);
    });
  });

  describe('hasRequiredScopes', () => {
    it('should return true for ADMIN scope', () => {
      expect(hasRequiredScopes(['ADMIN'], ['READ_PROJECTS', 'WRITE_PROJECTS'])).toBe(true);
    });

    it('should return true when all required scopes are present', () => {
      expect(
        hasRequiredScopes(['READ_PROJECTS', 'WRITE_PROJECTS'], ['READ_PROJECTS', 'WRITE_PROJECTS'])
      ).toBe(true);
    });

    it('should return false when some required scopes are missing (requireAll=true)', () => {
      expect(hasRequiredScopes(['READ_PROJECTS'], ['READ_PROJECTS', 'WRITE_PROJECTS'], true)).toBe(
        false
      );
    });

    it('should return true when any required scope is present (requireAll=false)', () => {
      expect(hasRequiredScopes(['READ_PROJECTS'], ['READ_PROJECTS', 'WRITE_PROJECTS'], false)).toBe(
        true
      );
    });

    it('should return false when no required scopes are present', () => {
      expect(hasRequiredScopes(['READ_BUGS'], ['READ_PROJECTS', 'WRITE_PROJECTS'], false)).toBe(
        false
      );
    });
  });

  describe('Constants', () => {
    it('should have labels for all scopes', () => {
      ALL_API_TOKEN_SCOPES.forEach((scope) => {
        expect(API_TOKEN_SCOPE_LABELS[scope]).toBeDefined();
        expect(typeof API_TOKEN_SCOPE_LABELS[scope]).toBe('string');
      });
    });

    it('should have all scopes covered in groups', () => {
      const groupedScopes = API_TOKEN_SCOPE_GROUPS.flatMap((g) => g.scopes);
      ALL_API_TOKEN_SCOPES.forEach((scope) => {
        expect(groupedScopes).toContain(scope);
      });
    });

    it('should have 13 total scopes', () => {
      expect(ALL_API_TOKEN_SCOPES.length).toBe(13);
    });
  });
});
