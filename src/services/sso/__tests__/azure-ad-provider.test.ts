/**
 * Azure AD Provider Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AzureAdProvider, AzureAdUserProvisioner } from '../azure-ad-provider';
import type { SsoConfiguration } from '@/types/sso';

// fetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AzureAdProvider', () => {
  const mockConfig = {
    tenantId: 'test-tenant-id',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/api/sso/azure-ad/callback',
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getAuthorizationUrl', () => {
    it('正しい認可URLを生成する', () => {
      const provider = new AzureAdProvider(mockConfig);
      const state = 'test-state';
      const nonce = 'test-nonce';

      const url = provider.getAuthorizationUrl(state, nonce);

      expect(url).toContain(
        'https://login.microsoftonline.com/test-tenant-id/oauth2/v2.0/authorize'
      );
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
      expect(url).toContain('state=test-state');
      expect(url).toContain('nonce=test-nonce');
      expect(url).toContain('scope=');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('認証コードをトークンと交換する', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email',
        id_token: 'mock-id-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const provider = new AzureAdProvider(mockConfig);
      const result = await provider.exchangeCodeForToken('test-code');

      expect(mockFetch).toHaveBeenCalledWith(
        `https://login.microsoftonline.com/${mockConfig.tenantId}/oauth2/v2.0/token`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      );
      expect(result).toEqual(mockTokenResponse);
    });

    it('トークン取得エラー時に例外をスローする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'invalid_grant', error_description: 'Code expired' }),
      });

      const provider = new AzureAdProvider(mockConfig);

      await expect(provider.exchangeCodeForToken('expired-code')).rejects.toThrow(
        'トークン取得エラー: Code expired'
      );
    });
  });

  describe('getUserProfile', () => {
    it('ユーザープロファイルを取得する', async () => {
      const mockProfile = {
        id: 'user-id',
        displayName: 'Test User',
        givenName: 'Test',
        surname: 'User',
        userPrincipalName: 'test@example.com',
        mail: 'test@example.com',
        jobTitle: 'Developer',
        department: 'Engineering',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const provider = new AzureAdProvider(mockConfig);
      const result = await provider.getUserProfile('access-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.microsoft.com/v1.0/me',
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
      const mockGroups = {
        value: [
          { '@odata.type': '#microsoft.graph.group', id: 'group-1', displayName: 'Developers' },
          { '@odata.type': '#microsoft.graph.group', id: 'group-2', displayName: 'Admins' },
          {
            '@odata.type': '#microsoft.graph.directoryRole',
            id: 'role-1',
            displayName: 'GlobalAdmin',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGroups),
      });

      const provider = new AzureAdProvider(mockConfig);
      const result = await provider.getUserGroups('access-token');

      expect(result).toHaveLength(2);
      expect(result[0].displayName).toBe('Developers');
      expect(result[1].displayName).toBe('Admins');
    });
  });

  describe('fromSsoConfiguration', () => {
    it('SsoConfigurationからプロバイダーを作成する', () => {
      const ssoConfig: SsoConfiguration = {
        id: '1',
        name: 'azure-ad',
        displayName: 'Azure AD',
        providerType: 'OIDC',
        providerName: 'MICROSOFT',
        status: 'ACTIVE',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        authorizationUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
        scopes: ['openid', 'profile', 'email'],
        autoProvision: true,
        metadata: { tenantId: 'custom-tenant' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const provider = AzureAdProvider.fromSsoConfiguration(
        ssoConfig,
        'http://localhost:3000/callback'
      );

      expect(provider).toBeInstanceOf(AzureAdProvider);
    });

    it('クライアント情報が不足している場合は例外をスローする', () => {
      const ssoConfig: SsoConfiguration = {
        id: '1',
        name: 'azure-ad',
        displayName: 'Azure AD',
        providerType: 'OIDC',
        providerName: 'MICROSOFT',
        status: 'ACTIVE',
        autoProvision: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        AzureAdProvider.fromSsoConfiguration(ssoConfig, 'http://localhost:3000/callback')
      ).toThrow('クライアントIDまたはクライアントシークレットが設定されていません');
    });
  });

  describe('testConnection', () => {
    it('接続テストを実行する', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 }) // authorization URL
        .mockResolvedValueOnce({ ok: true, status: 405 }) // token URL (POST only)
        .mockResolvedValueOnce({ ok: true }); // OpenID config

      const provider = new AzureAdProvider(mockConfig);
      const result = await provider.testConnection();

      expect(result.success).toBe(true);
      expect(result.details?.authorizationUrl).toBe(true);
      expect(result.details?.tokenUrl).toBe(true);
      expect(result.details?.userInfoUrl).toBe(true);
    });
  });

  describe('getDefaultUrls', () => {
    it('デフォルトURLを返す', () => {
      const urls = AzureAdProvider.getDefaultUrls('custom-tenant');

      expect(urls.authorizationUrl).toBe(
        'https://login.microsoftonline.com/custom-tenant/oauth2/v2.0/authorize'
      );
      expect(urls.tokenUrl).toBe(
        'https://login.microsoftonline.com/custom-tenant/oauth2/v2.0/token'
      );
      expect(urls.userInfoUrl).toBe('https://graph.microsoft.com/oidc/userinfo');
    });

    it('テナントID未指定時はcommonを使用', () => {
      const urls = AzureAdProvider.getDefaultUrls();

      expect(urls.authorizationUrl).toContain('/common/');
    });
  });
});

describe('AzureAdUserProvisioner', () => {
  describe('mapToLocalUser', () => {
    it('SSOユーザー情報をローカルユーザーにマッピングする', () => {
      const ssoUserInfo = {
        id: 'azure-user-id',
        email: 'test@example.com',
        name: 'Test User',
        groups: ['Developers', 'QA'],
        metadata: {
          tenantId: 'tenant-id',
          jobTitle: 'Developer',
        },
      };

      const result = AzureAdUserProvisioner.mapToLocalUser(ssoUserInfo);

      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.externalId).toBe('azure-user-id');
      expect(result.metadata.ssoProvider).toBe('MICROSOFT');
      expect(result.metadata.groups).toEqual(['Developers', 'QA']);
    });

    it('名前が未設定の場合はメールアドレスのローカル部を使用', () => {
      const ssoUserInfo = {
        id: 'azure-user-id',
        email: 'john.doe@example.com',
      };

      const result = AzureAdUserProvisioner.mapToLocalUser(ssoUserInfo);

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

      const result = AzureAdUserProvisioner.mapGroupsToRoles(groups, mappings);

      expect(result).toContain('role-dev');
      expect(result).toContain('role-qa');
      expect(result).not.toContain('role-admin');
    });

    it('優先度順にマッピングされる', () => {
      const groups = ['QA', 'Admins', 'Developers'];

      const result = AzureAdUserProvisioner.mapGroupsToRoles(groups, mappings);

      // 優先度が高い順に結果に含まれる
      expect(result[0]).toBe('role-admin');
    });

    it('マッピングのないグループは無視される', () => {
      const groups = ['UnknownGroup'];

      const result = AzureAdUserProvisioner.mapGroupsToRoles(groups, mappings);

      expect(result).toHaveLength(0);
    });

    it('重複するロールは1つにまとめられる', () => {
      const duplicateMappings = [
        ...mappings,
        { ssoGroupName: 'TestTeam', localRoleId: 'role-dev', priority: 10 },
      ];
      const groups = ['Developers', 'TestTeam'];

      const result = AzureAdUserProvisioner.mapGroupsToRoles(groups, duplicateMappings);

      const devRoleCount = result.filter((r) => r === 'role-dev').length;
      expect(devRoleCount).toBe(1);
    });
  });
});
