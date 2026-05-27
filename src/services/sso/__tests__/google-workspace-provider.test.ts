/**
 * Google Workspace Provider Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GoogleWorkspaceProvider,
  GoogleWorkspaceUserProvisioner,
} from '../google-workspace-provider';
import type { SsoConfiguration } from '@/types/sso';

// fetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GoogleWorkspaceProvider', () => {
  const mockConfig = {
    clientId: 'test-client-id.apps.googleusercontent.com',
    clientSecret: 'test-client-secret',
    redirectUri: 'http://localhost:3000/api/sso/google-workspace/callback',
    hostedDomain: 'example.com',
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getAuthorizationUrl', () => {
    it('正しい認可URLを生成する', () => {
      const provider = new GoogleWorkspaceProvider(mockConfig);
      const state = 'test-state';
      const nonce = 'test-nonce';

      const url = provider.getAuthorizationUrl(state, nonce);

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id.apps.googleusercontent.com');
      expect(url).toContain('response_type=code');
      expect(url).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
      expect(url).toContain('state=test-state');
      expect(url).toContain('nonce=test-nonce');
      expect(url).toContain('scope=');
      expect(url).toContain('hd=example.com');
    });

    it('hostedDomainが未設定の場合はhdパラメータを含めない', () => {
      const configWithoutDomain = { ...mockConfig, hostedDomain: undefined };
      const provider = new GoogleWorkspaceProvider(configWithoutDomain);
      const state = 'test-state';
      const nonce = 'test-nonce';

      const url = provider.getAuthorizationUrl(state, nonce);

      expect(url).not.toContain('hd=');
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

      const provider = new GoogleWorkspaceProvider(mockConfig);
      const result = await provider.exchangeCodeForToken('test-code');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
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

      const provider = new GoogleWorkspaceProvider(mockConfig);

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
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/photo.jpg',
        email: 'test@example.com',
        email_verified: true,
        hd: 'example.com',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const provider = new GoogleWorkspaceProvider(mockConfig);
      const result = await provider.getUserProfile('access-token');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openidconnect.googleapis.com/v1/userinfo',
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
        groups: [
          { id: 'group-1', email: 'developers@example.com', name: 'Developers' },
          { id: 'group-2', email: 'qa@example.com', name: 'QA Team' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGroups),
      });

      const provider = new GoogleWorkspaceProvider(mockConfig);
      const result = await provider.getUserGroups('access-token', 'test@example.com');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Developers');
      expect(result[1].name).toBe('QA Team');
    });

    it('権限エラー時は空配列を返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: { message: 'Access denied' } }),
      });

      const provider = new GoogleWorkspaceProvider(mockConfig);
      const result = await provider.getUserGroups('access-token', 'test@example.com');

      expect(result).toEqual([]);
    });
  });

  describe('fromSsoConfiguration', () => {
    it('SsoConfigurationからプロバイダーを作成する', () => {
      const ssoConfig: SsoConfiguration = {
        id: '1',
        name: 'google-workspace',
        displayName: 'Google Workspace',
        providerType: 'OIDC',
        providerName: 'GOOGLE',
        status: 'ACTIVE',
        clientId: 'test-client-id.apps.googleusercontent.com',
        clientSecret: 'test-client-secret',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        scopes: ['openid', 'profile', 'email'],
        autoProvision: true,
        metadata: { hostedDomain: 'example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const provider = GoogleWorkspaceProvider.fromSsoConfiguration(
        ssoConfig,
        'http://localhost:3000/callback'
      );

      expect(provider).toBeInstanceOf(GoogleWorkspaceProvider);
    });

    it('クライアント情報が不足している場合は例外をスローする', () => {
      const ssoConfig: SsoConfiguration = {
        id: '1',
        name: 'google-workspace',
        displayName: 'Google Workspace',
        providerType: 'OIDC',
        providerName: 'GOOGLE',
        status: 'ACTIVE',
        autoProvision: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        GoogleWorkspaceProvider.fromSsoConfiguration(ssoConfig, 'http://localhost:3000/callback')
      ).toThrow('クライアントIDまたはクライアントシークレットが設定されていません');
    });
  });

  describe('authenticateUser', () => {
    it('認証フローを完了しユーザー情報を返す', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email',
      };

      const mockProfile = {
        sub: 'user-id-123',
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        picture: 'https://example.com/photo.jpg',
        email: 'test@example.com',
        email_verified: true,
        hd: 'example.com',
      };

      const mockGroups = {
        groups: [{ id: 'group-1', email: 'developers@example.com', name: 'Developers' }],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfile),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGroups),
        });

      const provider = new GoogleWorkspaceProvider(mockConfig);
      const result = await provider.authenticateUser('test-code');

      expect(result.id).toBe('user-id-123');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.picture).toBe('https://example.com/photo.jpg');
      expect(result.groups).toContain('Developers');
    });

    it('ホストドメインが一致しない場合は例外をスローする', async () => {
      const mockTokenResponse = {
        access_token: 'mock-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email',
      };

      const mockProfile = {
        sub: 'user-id-123',
        name: 'Test User',
        email: 'test@other.com',
        email_verified: true,
        hd: 'other.com', // 異なるドメイン
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

      const provider = new GoogleWorkspaceProvider(mockConfig);

      await expect(provider.authenticateUser('test-code')).rejects.toThrow(
        '許可されていないドメインです: other.com (要求: example.com)'
      );
    });
  });

  describe('testConnection', () => {
    it('接続テストを実行する', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 }) // authorization URL
        .mockResolvedValueOnce({ ok: true, status: 405 }) // token URL (POST only)
        .mockResolvedValueOnce({ ok: true }); // OpenID config

      const provider = new GoogleWorkspaceProvider(mockConfig);
      const result = await provider.testConnection();

      expect(result.success).toBe(true);
      expect(result.details?.authorizationUrl).toBe(true);
      expect(result.details?.tokenUrl).toBe(true);
      expect(result.details?.userInfoUrl).toBe(true);
    });
  });

  describe('getDefaultUrls', () => {
    it('デフォルトURLを返す', () => {
      const urls = GoogleWorkspaceProvider.getDefaultUrls();

      expect(urls.authorizationUrl).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(urls.tokenUrl).toBe('https://oauth2.googleapis.com/token');
      expect(urls.userInfoUrl).toBe('https://openidconnect.googleapis.com/v1/userinfo');
    });
  });
});

describe('GoogleWorkspaceUserProvisioner', () => {
  describe('mapToLocalUser', () => {
    it('SSOユーザー情報をローカルユーザーにマッピングする', () => {
      const ssoUserInfo = {
        id: 'google-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        groups: ['Developers', 'QA'],
        metadata: {
          hostedDomain: 'example.com',
          givenName: 'Test',
          familyName: 'User',
        },
      };

      const result = GoogleWorkspaceUserProvisioner.mapToLocalUser(ssoUserInfo);

      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.externalId).toBe('google-user-id');
      expect(result.metadata.ssoProvider).toBe('GOOGLE');
      expect(result.metadata.groups).toEqual(['Developers', 'QA']);
    });

    it('名前が未設定の場合はメールアドレスのローカル部を使用', () => {
      const ssoUserInfo = {
        id: 'google-user-id',
        email: 'john.doe@example.com',
      };

      const result = GoogleWorkspaceUserProvisioner.mapToLocalUser(ssoUserInfo);

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

      const result = GoogleWorkspaceUserProvisioner.mapGroupsToRoles(groups, mappings);

      expect(result).toContain('role-dev');
      expect(result).toContain('role-qa');
      expect(result).not.toContain('role-admin');
    });

    it('優先度順にマッピングされる', () => {
      const groups = ['QA', 'Admins', 'Developers'];

      const result = GoogleWorkspaceUserProvisioner.mapGroupsToRoles(groups, mappings);

      // 優先度が高い順に結果に含まれる
      expect(result[0]).toBe('role-admin');
    });

    it('マッピングのないグループは無視される', () => {
      const groups = ['UnknownGroup'];

      const result = GoogleWorkspaceUserProvisioner.mapGroupsToRoles(groups, mappings);

      expect(result).toHaveLength(0);
    });

    it('重複するロールは1つにまとめられる', () => {
      const duplicateMappings = [
        ...mappings,
        { ssoGroupName: 'TestTeam', localRoleId: 'role-dev', priority: 10 },
      ];
      const groups = ['Developers', 'TestTeam'];

      const result = GoogleWorkspaceUserProvisioner.mapGroupsToRoles(groups, duplicateMappings);

      const devRoleCount = result.filter((r) => r === 'role-dev').length;
      expect(devRoleCount).toBe(1);
    });
  });
});
