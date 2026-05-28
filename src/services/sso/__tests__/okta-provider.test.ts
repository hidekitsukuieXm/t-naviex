/**
 * Okta Provider Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OktaProvider, OktaUserProvisioner } from '../okta-provider';
import type { SsoConfiguration } from '@/types/sso';

// fetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OktaProvider', () => {
  const mockConfig = {
    domain: 'dev-12345.okta.com',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/api/sso/okta/callback',
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getAuthorizationUrl', () => {
    it('正しい認可URLを生成する', () => {
      const provider = new OktaProvider(mockConfig);
      const state = 'test-state';
      const nonce = 'test-nonce';

      const url = provider.getAuthorizationUrl(state, nonce);

      expect(url).toContain('https://dev-12345.okta.com/oauth2/default/v1/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
      expect(url).toContain('state=test-state');
      expect(url).toContain('nonce=test-nonce');
      expect(url).toContain('scope=openid+profile+email+groups');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('認証コードをトークンと交換する', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email groups',
        id_token: 'mock-id-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const provider = new OktaProvider(mockConfig);
      const result = await provider.exchangeCodeForToken('test-code');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev-12345.okta.com/oauth2/default/v1/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
      expect(result).toEqual(mockTokenResponse);
    });

    it('トークン取得エラー時に例外をスローする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'invalid_grant', error_description: 'Code expired' }),
      });

      const provider = new OktaProvider(mockConfig);

      await expect(provider.exchangeCodeForToken('expired-code')).rejects.toThrow(
        'トークン取得エラー: Code expired'
      );
    });
  });

  describe('getUserProfile', () => {
    it('ユーザープロファイルを取得する', async () => {
      const mockProfile = {
        sub: 'user-id-123',
        name: 'Test User',
        preferred_username: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
        email: 'test@example.com',
        email_verified: true,
        groups: ['Developers', 'Everyone'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const provider = new OktaProvider(mockConfig);
      const result = await provider.getUserProfile('access-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev-12345.okta.com/oauth2/default/v1/userinfo',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer access-token',
          },
        })
      );
      expect(result).toEqual(mockProfile);
    });
  });

  describe('getUserGroups', () => {
    it('ユーザーのグループを取得する', async () => {
      const mockGroups = [
        { id: 'group-1', profile: { name: 'Developers', description: 'Dev team' } },
        { id: 'group-2', profile: { name: 'Everyone' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGroups),
      });

      const provider = new OktaProvider(mockConfig);
      const result = await provider.getUserGroups('user-id', 'api-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev-12345.okta.com/api/v1/users/user-id/groups',
        expect.objectContaining({
          headers: {
            Authorization: 'SSWS api-token',
            Accept: 'application/json',
          },
        })
      );
      expect(result).toHaveLength(2);
      expect(result[0].profile.name).toBe('Developers');
    });

    it('API Token未設定時は空配列を返す', async () => {
      const provider = new OktaProvider(mockConfig);
      const result = await provider.getUserGroups('user-id', undefined);

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('fromSsoConfiguration', () => {
    it('SsoConfigurationからプロバイダーを作成する', () => {
      const ssoConfig: SsoConfiguration = {
        id: '1',
        name: 'okta',
        displayName: 'Okta',
        providerType: 'OIDC',
        providerName: 'OKTA',
        status: 'ACTIVE',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: 'https://dev-12345.okta.com/oauth2/default/v1/authorize',
        tokenUrl: 'https://dev-12345.okta.com/oauth2/default/v1/token',
        userInfoUrl: 'https://dev-12345.okta.com/oauth2/default/v1/userinfo',
        scopes: ['openid', 'profile', 'email', 'groups'],
        autoProvision: true,
        metadata: { domain: 'dev-12345.okta.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const provider = OktaProvider.fromSsoConfiguration(
        ssoConfig,
        'http://localhost:3000/callback'
      );

      expect(provider).toBeInstanceOf(OktaProvider);
    });

    it('クライアント情報が不足している場合は例外をスローする', () => {
      const ssoConfig: SsoConfiguration = {
        id: '1',
        name: 'okta',
        displayName: 'Okta',
        providerType: 'OIDC',
        providerName: 'OKTA',
        status: 'ACTIVE',
        autoProvision: true,
        metadata: { domain: 'dev-12345.okta.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        OktaProvider.fromSsoConfiguration(ssoConfig, 'http://localhost:3000/callback')
      ).toThrow('クライアントIDまたはクライアントシークレットが設定されていません');
    });

    it('ドメインが不足している場合は例外をスローする', () => {
      const ssoConfig: SsoConfiguration = {
        id: '1',
        name: 'okta',
        displayName: 'Okta',
        providerType: 'OIDC',
        providerName: 'OKTA',
        status: 'ACTIVE',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        autoProvision: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        OktaProvider.fromSsoConfiguration(ssoConfig, 'http://localhost:3000/callback')
      ).toThrow('Oktaドメインが設定されていません');
    });
  });

  describe('authenticateUser', () => {
    it('認証フローを完了しユーザー情報を返す', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email groups',
      };

      const mockProfile = {
        sub: 'user-id-123',
        name: 'Test User',
        preferred_username: 'test@example.com',
        given_name: 'Test',
        family_name: 'User',
        email: 'test@example.com',
        email_verified: true,
        groups: ['Developers', 'Everyone'],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfile),
        });

      const provider = new OktaProvider(mockConfig);
      const result = await provider.authenticateUser('test-code');

      expect(result.id).toBe('user-id-123');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.groups).toContain('Developers');
      expect(result.groups).toContain('Everyone');
    });
  });

  describe('testConnection', () => {
    it('接続テストを実行する', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 400 }) // authorization URL
        .mockResolvedValueOnce({ ok: true, status: 405 }) // token URL (POST only)
        .mockResolvedValueOnce({ ok: true }); // OpenID config

      const provider = new OktaProvider(mockConfig);
      const result = await provider.testConnection();

      expect(result.success).toBe(true);
      expect(result.details?.authorizationUrl).toBe(true);
      expect(result.details?.tokenUrl).toBe(true);
      expect(result.details?.userInfoUrl).toBe(true);
    });
  });

  describe('getDefaultUrls', () => {
    it('デフォルトURLを返す', () => {
      const urls = OktaProvider.getDefaultUrls('dev-12345.okta.com');

      expect(urls.authorizationUrl).toBe('https://dev-12345.okta.com/oauth2/default/v1/authorize');
      expect(urls.tokenUrl).toBe('https://dev-12345.okta.com/oauth2/default/v1/token');
      expect(urls.userInfoUrl).toBe('https://dev-12345.okta.com/oauth2/default/v1/userinfo');
    });
  });
});

describe('OktaUserProvisioner', () => {
  describe('mapToLocalUser', () => {
    it('SSOユーザー情報をローカルユーザーにマッピングする', () => {
      const ssoUserInfo = {
        id: 'okta-user-id',
        email: 'test@example.com',
        name: 'Test User',
        groups: ['Developers', 'QA'],
        metadata: {
          domain: 'dev-12345.okta.com',
          givenName: 'Test',
          familyName: 'User',
        },
      };

      const result = OktaUserProvisioner.mapToLocalUser(ssoUserInfo);

      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.externalId).toBe('okta-user-id');
      expect(result.metadata.ssoProvider).toBe('OKTA');
      expect(result.metadata.groups).toEqual(['Developers', 'QA']);
    });

    it('名前が未設定の場合はメールアドレスのローカル部を使用', () => {
      const ssoUserInfo = {
        id: 'okta-user-id',
        email: 'john.doe@example.com',
      };

      const result = OktaUserProvisioner.mapToLocalUser(ssoUserInfo);

      expect(result.name).toBe('john.doe');
    });
  });

  describe('mapGroupsToRoles', () => {
    const mappings = [
      { ssoGroupName: 'Admins', localRoleId: 'role-admin', priority: 100 },
      { ssoGroupName: 'Developers', localRoleId: 'role-dev', priority: 50 },
      { ssoGroupName: 'QA', localRoleId: 'role-qa', priority: 25 },
    ];

    it('グループをロールにマッピングする', () => {
      const groups = ['Developers', 'QA'];

      const result = OktaUserProvisioner.mapGroupsToRoles(groups, mappings);

      expect(result).toContain('role-dev');
      expect(result).toContain('role-qa');
      expect(result).not.toContain('role-admin');
    });

    it('優先度順にマッピングされる', () => {
      const groups = ['QA', 'Admins', 'Developers'];

      const result = OktaUserProvisioner.mapGroupsToRoles(groups, mappings);

      // 優先度が高い順に結果に含まれる
      expect(result[0]).toBe('role-admin');
    });

    it('マッピングのないグループは無視される', () => {
      const groups = ['UnknownGroup'];

      const result = OktaUserProvisioner.mapGroupsToRoles(groups, mappings);

      expect(result).toHaveLength(0);
    });

    it('重複するロールは1つにまとめられる', () => {
      const duplicateMappings = [
        ...mappings,
        { ssoGroupName: 'TestTeam', localRoleId: 'role-dev', priority: 10 },
      ];
      const groups = ['Developers', 'TestTeam'];

      const result = OktaUserProvisioner.mapGroupsToRoles(groups, duplicateMappings);

      const devRoleCount = result.filter((r) => r === 'role-dev').length;
      expect(devRoleCount).toBe(1);
    });
  });
});
