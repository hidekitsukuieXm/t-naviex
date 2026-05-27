/**
 * SSO Types Unit Tests
 *
 * SSO型定義の単体テスト
 */

import { describe, it, expect } from 'vitest';
import {
  SsoProviderType,
  SsoProviderName,
  SsoConfigStatus,
  getProviderTypeLabel,
  getProviderNameLabel,
  getConfigStatusLabel,
  getConfigStatusColor,
  getProviderIcon,
  getProviderDefaultConfig,
  validateSsoConfig,
  isAllowedDomain,
  generateAuthorizationUrl,
  generateState,
  generateNonce,
  SSO_PROVIDERS,
  type SsoConfiguration,
} from '../sso';

describe('SsoProviderType', () => {
  it('should have correct values', () => {
    expect(SsoProviderType.OAUTH2).toBe('OAUTH2');
    expect(SsoProviderType.OIDC).toBe('OIDC');
    expect(SsoProviderType.SAML).toBe('SAML');
  });
});

describe('SsoProviderName', () => {
  it('should have correct values', () => {
    expect(SsoProviderName.GOOGLE).toBe('GOOGLE');
    expect(SsoProviderName.MICROSOFT).toBe('MICROSOFT');
    expect(SsoProviderName.GITHUB).toBe('GITHUB');
    expect(SsoProviderName.GITLAB).toBe('GITLAB');
    expect(SsoProviderName.OKTA).toBe('OKTA');
    expect(SsoProviderName.AUTH0).toBe('AUTH0');
    expect(SsoProviderName.KEYCLOAK).toBe('KEYCLOAK');
    expect(SsoProviderName.CUSTOM).toBe('CUSTOM');
  });
});

describe('SsoConfigStatus', () => {
  it('should have correct values', () => {
    expect(SsoConfigStatus.ACTIVE).toBe('ACTIVE');
    expect(SsoConfigStatus.INACTIVE).toBe('INACTIVE');
    expect(SsoConfigStatus.TESTING).toBe('TESTING');
    expect(SsoConfigStatus.ERROR).toBe('ERROR');
  });
});

describe('getProviderTypeLabel', () => {
  it('should return correct label for OAUTH2', () => {
    expect(getProviderTypeLabel(SsoProviderType.OAUTH2)).toBe('OAuth 2.0');
  });

  it('should return correct label for OIDC', () => {
    expect(getProviderTypeLabel(SsoProviderType.OIDC)).toBe('OpenID Connect');
  });

  it('should return correct label for SAML', () => {
    expect(getProviderTypeLabel(SsoProviderType.SAML)).toBe('SAML 2.0');
  });

  it('should return type itself for unknown type', () => {
    expect(getProviderTypeLabel('UNKNOWN' as SsoProviderType)).toBe('UNKNOWN');
  });
});

describe('getProviderNameLabel', () => {
  it('should return correct label for GOOGLE', () => {
    expect(getProviderNameLabel(SsoProviderName.GOOGLE)).toBe('Google Workspace');
  });

  it('should return correct label for MICROSOFT', () => {
    expect(getProviderNameLabel(SsoProviderName.MICROSOFT)).toBe('Microsoft Entra ID');
  });

  it('should return correct label for GITHUB', () => {
    expect(getProviderNameLabel(SsoProviderName.GITHUB)).toBe('GitHub');
  });

  it('should return correct label for CUSTOM', () => {
    expect(getProviderNameLabel(SsoProviderName.CUSTOM)).toBe('カスタム');
  });
});

describe('getConfigStatusLabel', () => {
  it('should return correct label for ACTIVE', () => {
    expect(getConfigStatusLabel(SsoConfigStatus.ACTIVE)).toBe('有効');
  });

  it('should return correct label for INACTIVE', () => {
    expect(getConfigStatusLabel(SsoConfigStatus.INACTIVE)).toBe('無効');
  });

  it('should return correct label for TESTING', () => {
    expect(getConfigStatusLabel(SsoConfigStatus.TESTING)).toBe('テスト中');
  });

  it('should return correct label for ERROR', () => {
    expect(getConfigStatusLabel(SsoConfigStatus.ERROR)).toBe('エラー');
  });
});

describe('getConfigStatusColor', () => {
  it('should return correct color for ACTIVE', () => {
    expect(getConfigStatusColor(SsoConfigStatus.ACTIVE)).toBe('green');
  });

  it('should return correct color for INACTIVE', () => {
    expect(getConfigStatusColor(SsoConfigStatus.INACTIVE)).toBe('gray');
  });

  it('should return correct color for TESTING', () => {
    expect(getConfigStatusColor(SsoConfigStatus.TESTING)).toBe('yellow');
  });

  it('should return correct color for ERROR', () => {
    expect(getConfigStatusColor(SsoConfigStatus.ERROR)).toBe('red');
  });
});

describe('getProviderIcon', () => {
  it('should return correct icon for GOOGLE', () => {
    expect(getProviderIcon(SsoProviderName.GOOGLE)).toBe('google');
  });

  it('should return correct icon for GITHUB', () => {
    expect(getProviderIcon(SsoProviderName.GITHUB)).toBe('github');
  });

  it('should return correct icon for CUSTOM', () => {
    expect(getProviderIcon(SsoProviderName.CUSTOM)).toBe('key');
  });
});

describe('getProviderDefaultConfig', () => {
  it('should return Google default config', () => {
    const config = getProviderDefaultConfig(SsoProviderName.GOOGLE);
    expect(config.providerType).toBe(SsoProviderType.OIDC);
    expect(config.authorizationUrl).toContain('accounts.google.com');
    expect(config.scopes).toContain('openid');
  });

  it('should return Microsoft default config', () => {
    const config = getProviderDefaultConfig(SsoProviderName.MICROSOFT);
    expect(config.providerType).toBe(SsoProviderType.OIDC);
    expect(config.authorizationUrl).toContain('login.microsoftonline.com');
  });

  it('should return GitHub default config', () => {
    const config = getProviderDefaultConfig(SsoProviderName.GITHUB);
    expect(config.providerType).toBe(SsoProviderType.OAUTH2);
    expect(config.authorizationUrl).toContain('github.com');
  });

  it('should return empty config for unknown provider', () => {
    const config = getProviderDefaultConfig('UNKNOWN' as SsoProviderName);
    expect(config).toEqual({});
  });
});

describe('validateSsoConfig', () => {
  it('should return errors for empty config', () => {
    const errors = validateSsoConfig({});
    expect(errors).toContain('設定名は必須です');
    expect(errors).toContain('表示名は必須です');
    expect(errors).toContain('プロバイダータイプは必須です');
    expect(errors).toContain('プロバイダー名は必須です');
  });

  it('should validate OAuth2 config', () => {
    const errors = validateSsoConfig({
      name: 'test',
      displayName: 'Test',
      providerType: SsoProviderType.OAUTH2,
      providerName: SsoProviderName.GITHUB,
    });
    expect(errors).toContain('クライアントIDは必須です');
    expect(errors).toContain('クライアントシークレットは必須です');
    expect(errors).toContain('認可URLは必須です');
    expect(errors).toContain('トークンURLは必須です');
  });

  it('should validate SAML config', () => {
    const errors = validateSsoConfig({
      name: 'test',
      displayName: 'Test',
      providerType: SsoProviderType.SAML,
      providerName: SsoProviderName.OKTA,
    });
    expect(errors).toContain('エンティティIDは必須です');
    expect(errors).toContain('SSO URLは必須です');
    expect(errors).toContain('証明書は必須です');
  });

  it('should return no errors for valid OAuth2 config', () => {
    const errors = validateSsoConfig({
      name: 'test',
      displayName: 'Test',
      providerType: SsoProviderType.OAUTH2,
      providerName: SsoProviderName.GITHUB,
      clientId: 'client-id',
      clientSecret: 'client-secret',
      authorizationUrl: 'https://example.com/auth',
      tokenUrl: 'https://example.com/token',
    });
    expect(errors).toHaveLength(0);
  });

  it('should return no errors for valid SAML config', () => {
    const errors = validateSsoConfig({
      name: 'test',
      displayName: 'Test',
      providerType: SsoProviderType.SAML,
      providerName: SsoProviderName.OKTA,
      entityId: 'https://example.com/entity',
      ssoUrl: 'https://example.com/sso',
      certificate: 'CERTIFICATE',
    });
    expect(errors).toHaveLength(0);
  });
});

describe('isAllowedDomain', () => {
  it('should allow any domain when allowedDomains is empty', () => {
    expect(isAllowedDomain('user@example.com', [])).toBe(true);
  });

  it('should allow domain in allowedDomains', () => {
    expect(isAllowedDomain('user@example.com', ['example.com'])).toBe(true);
  });

  it('should reject domain not in allowedDomains', () => {
    expect(isAllowedDomain('user@other.com', ['example.com'])).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isAllowedDomain('user@EXAMPLE.COM', ['example.com'])).toBe(true);
    expect(isAllowedDomain('user@example.com', ['EXAMPLE.COM'])).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(isAllowedDomain('invalid-email', ['example.com'])).toBe(false);
  });

  it('should handle multiple allowed domains', () => {
    const allowed = ['example.com', 'company.org'];
    expect(isAllowedDomain('user@example.com', allowed)).toBe(true);
    expect(isAllowedDomain('user@company.org', allowed)).toBe(true);
    expect(isAllowedDomain('user@other.com', allowed)).toBe(false);
  });
});

describe('generateAuthorizationUrl', () => {
  const mockConfig: SsoConfiguration = {
    id: '1',
    name: 'test',
    displayName: 'Test',
    providerType: SsoProviderType.OIDC,
    providerName: SsoProviderName.GOOGLE,
    status: SsoConfigStatus.ACTIVE,
    clientId: 'test-client-id',
    authorizationUrl: 'https://example.com/oauth/authorize',
    scopes: ['openid', 'email'],
    autoProvision: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should generate correct authorization URL', () => {
    const url = generateAuthorizationUrl(
      mockConfig,
      'https://myapp.com/callback',
      'state123',
      'nonce123'
    );
    expect(url).toContain('https://example.com/oauth/authorize');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fmyapp.com%2Fcallback');
    expect(url).toContain('response_type=code');
    expect(url).toContain('state=state123');
    expect(url).toContain('scope=openid+email');
    expect(url).toContain('nonce=nonce123');
  });

  it('should throw error when authorizationUrl is missing', () => {
    const invalidConfig = { ...mockConfig, authorizationUrl: undefined };
    expect(() =>
      generateAuthorizationUrl(invalidConfig, 'https://myapp.com/callback', 'state123')
    ).toThrow('認可URLまたはクライアントIDが設定されていません');
  });

  it('should throw error when clientId is missing', () => {
    const invalidConfig = { ...mockConfig, clientId: undefined };
    expect(() =>
      generateAuthorizationUrl(invalidConfig, 'https://myapp.com/callback', 'state123')
    ).toThrow('認可URLまたはクライアントIDが設定されていません');
  });
});

describe('generateState', () => {
  it('should generate 64 character hex string', () => {
    const state = generateState();
    expect(state).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(state)).toBe(true);
  });

  it('should generate unique values', () => {
    const state1 = generateState();
    const state2 = generateState();
    expect(state1).not.toBe(state2);
  });
});

describe('generateNonce', () => {
  it('should generate 64 character hex string', () => {
    const nonce = generateNonce();
    expect(nonce).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(nonce)).toBe(true);
  });

  it('should generate unique values', () => {
    const nonce1 = generateNonce();
    const nonce2 = generateNonce();
    expect(nonce1).not.toBe(nonce2);
  });
});

describe('SSO_PROVIDERS', () => {
  it('should have all providers', () => {
    expect(SSO_PROVIDERS).toHaveLength(8);
  });

  it('should have Google provider', () => {
    const google = SSO_PROVIDERS.find((p) => p.name === SsoProviderName.GOOGLE);
    expect(google).toBeDefined();
    expect(google?.displayName).toBe('Google Workspace');
    expect(google?.providerType).toBe(SsoProviderType.OIDC);
  });

  it('should have Microsoft provider', () => {
    const microsoft = SSO_PROVIDERS.find((p) => p.name === SsoProviderName.MICROSOFT);
    expect(microsoft).toBeDefined();
    expect(microsoft?.displayName).toBe('Microsoft Entra ID');
  });

  it('should have GitHub provider', () => {
    const github = SSO_PROVIDERS.find((p) => p.name === SsoProviderName.GITHUB);
    expect(github).toBeDefined();
    expect(github?.providerType).toBe(SsoProviderType.OAUTH2);
  });

  it('should have Custom provider', () => {
    const custom = SSO_PROVIDERS.find((p) => p.name === SsoProviderName.CUSTOM);
    expect(custom).toBeDefined();
    expect(custom?.displayName).toBe('カスタム');
  });
});
