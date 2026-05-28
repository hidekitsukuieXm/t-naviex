/**
 * ADFS Provider Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdfsProvider, AdfsUserProvisioner, AdfsClaimTypes } from '../adfs-provider';
import type { SsoConfiguration } from '@/types/sso';

// fetchをモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AdfsProvider', () => {
  const mockConfig = {
    federationMetadataUrl:
      'https://adfs.example.com/FederationMetadata/2007-06/FederationMetadata.xml',
    entityId: 'https://myapp.example.com/',
    relyingPartyIdentifier: 'urn:myapp:example',
    redirectUri: 'http://localhost:3000/api/sso/adfs/callback',
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('getWsFederationSignInUrl', () => {
    it('正しいWS-FederationサインインURLを生成する', () => {
      const provider = new AdfsProvider(mockConfig);
      const wctx = 'test-context';

      const url = provider.getWsFederationSignInUrl(wctx);

      expect(url).toContain('https://adfs.example.com/adfs/ls/');
      expect(url).toContain('wa=wsignin1.0');
      expect(url).toContain(`wtrealm=${encodeURIComponent(mockConfig.relyingPartyIdentifier)}`);
      expect(url).toContain(`wreply=${encodeURIComponent(mockConfig.redirectUri)}`);
      expect(url).toContain(`wctx=${wctx}`);
    });
  });

  describe('getWsFederationSignOutUrl', () => {
    it('正しいWS-FederationサインアウトURLを生成する', () => {
      const provider = new AdfsProvider(mockConfig);
      const wreply = 'http://localhost:3000/logout';

      const url = provider.getWsFederationSignOutUrl(wreply);

      expect(url).toContain('https://adfs.example.com/adfs/ls/');
      expect(url).toContain('wa=wsignout1.0');
      expect(url).toContain(`wreply=${encodeURIComponent(wreply)}`);
    });
  });

  describe('getSamlAuthorizationUrl', () => {
    it('正しいSAML認可URLを生成する', () => {
      const provider = new AdfsProvider(mockConfig);
      const relayState = 'test-relay-state';

      const url = provider.getSamlAuthorizationUrl(relayState);

      expect(url).toContain('https://adfs.example.com/adfs/ls/');
      expect(url).toContain('SAMLRequest=');
      expect(url).toContain(`RelayState=${relayState}`);
    });
  });

  describe('fromSsoConfiguration', () => {
    it('SsoConfigurationからプロバイダーを作成する', () => {
      const ssoConfig: SsoConfiguration = {
        id: '1',
        name: 'adfs',
        displayName: 'ADFS',
        providerType: 'SAML',
        providerName: 'CUSTOM',
        status: 'ACTIVE',
        entityId: 'https://myapp.example.com/',
        ssoUrl: 'https://adfs.example.com/adfs/ls/',
        autoProvision: true,
        metadata: {
          federationMetadataUrl:
            'https://adfs.example.com/FederationMetadata/2007-06/FederationMetadata.xml',
          relyingPartyIdentifier: 'urn:myapp:example',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const provider = AdfsProvider.fromSsoConfiguration(
        ssoConfig,
        'http://localhost:3000/callback'
      );

      expect(provider).toBeInstanceOf(AdfsProvider);
    });

    it('フェデレーションメタデータURLが不足している場合は例外をスローする', () => {
      const ssoConfig: SsoConfiguration = {
        id: '1',
        name: 'adfs',
        displayName: 'ADFS',
        providerType: 'SAML',
        providerName: 'CUSTOM',
        status: 'ACTIVE',
        entityId: 'https://myapp.example.com/',
        autoProvision: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        AdfsProvider.fromSsoConfiguration(ssoConfig, 'http://localhost:3000/callback')
      ).toThrow('フェデレーションメタデータURLが設定されていません');
    });

    it('エンティティIDが不足している場合は例外をスローする', () => {
      const ssoConfig: SsoConfiguration = {
        id: '1',
        name: 'adfs',
        displayName: 'ADFS',
        providerType: 'SAML',
        providerName: 'CUSTOM',
        status: 'ACTIVE',
        autoProvision: true,
        metadata: {
          federationMetadataUrl:
            'https://adfs.example.com/FederationMetadata/2007-06/FederationMetadata.xml',
          relyingPartyIdentifier: 'urn:myapp:example',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        AdfsProvider.fromSsoConfiguration(ssoConfig, 'http://localhost:3000/callback')
      ).toThrow('エンティティIDが設定されていません');
    });
  });

  describe('extractUserInfo', () => {
    it('Claimからユーザー情報を抽出する', () => {
      const provider = new AdfsProvider(mockConfig);
      const claims: Record<string, string | string[]> = {
        [AdfsClaimTypes.NAME_IDENTIFIER]: 'user-123',
        [AdfsClaimTypes.EMAIL]: 'test@example.com',
        [AdfsClaimTypes.NAME]: 'Test User',
        [AdfsClaimTypes.GIVEN_NAME]: 'Test',
        [AdfsClaimTypes.SURNAME]: 'User',
        [AdfsClaimTypes.GROUP]: ['Domain Admins', 'Developers'],
        [AdfsClaimTypes.UPN]: 'test@example.com',
      };

      const userInfo = provider.extractUserInfo(claims);

      expect(userInfo.id).toBe('user-123');
      expect(userInfo.email).toBe('test@example.com');
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.groups).toContain('Domain Admins');
      expect(userInfo.groups).toContain('Developers');
    });

    it('名前が未設定の場合は姓名から構成する', () => {
      const provider = new AdfsProvider(mockConfig);
      const claims: Record<string, string | string[]> = {
        [AdfsClaimTypes.NAME_IDENTIFIER]: 'user-123',
        [AdfsClaimTypes.EMAIL]: 'test@example.com',
        [AdfsClaimTypes.GIVEN_NAME]: 'Test',
        [AdfsClaimTypes.SURNAME]: 'User',
      };

      const userInfo = provider.extractUserInfo(claims);

      expect(userInfo.name).toBe('Test User');
    });

    it('NAME_IDENTIFIERがない場合はUPNを使用する', () => {
      const provider = new AdfsProvider(mockConfig);
      const claims: Record<string, string | string[]> = {
        [AdfsClaimTypes.UPN]: 'test@example.com',
        [AdfsClaimTypes.EMAIL]: 'test@example.com',
      };

      const userInfo = provider.extractUserInfo(claims);

      expect(userInfo.id).toBe('test@example.com');
    });

    it('Role Claimもグループとして扱う', () => {
      const provider = new AdfsProvider(mockConfig);
      const claims: Record<string, string | string[]> = {
        [AdfsClaimTypes.NAME_IDENTIFIER]: 'user-123',
        [AdfsClaimTypes.EMAIL]: 'test@example.com',
        [AdfsClaimTypes.ROLE]: ['Admin', 'User'],
      };

      const userInfo = provider.extractUserInfo(claims);

      expect(userInfo.groups).toContain('Admin');
      expect(userInfo.groups).toContain('User');
    });
  });

  describe('testConnection', () => {
    it('接続テストを実行する', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Federation Metadata
        .mockResolvedValueOnce({ ok: true, status: 400 }) // Sign-in endpoint
        .mockResolvedValueOnce({ ok: true }); // OpenID config

      const provider = new AdfsProvider(mockConfig);
      const result = await provider.testConnection();

      expect(result.success).toBe(true);
      expect(result.details?.authorizationUrl).toBe(true);
      expect(result.details?.tokenUrl).toBe(true);
      expect(result.details?.userInfoUrl).toBe(true);
    });

    it('フェデレーションメタデータが取得できない場合は失敗', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false }) // Federation Metadata
        .mockResolvedValueOnce({ ok: true }) // Sign-in endpoint
        .mockResolvedValueOnce({ ok: true }); // OpenID config

      const provider = new AdfsProvider(mockConfig);
      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.details?.authorizationUrl).toBe(false);
    });
  });

  describe('getDefaultUrls', () => {
    it('デフォルトURLを返す', () => {
      const urls = AdfsProvider.getDefaultUrls('adfs.example.com');

      expect(urls.federationMetadataUrl).toBe(
        'https://adfs.example.com/FederationMetadata/2007-06/FederationMetadata.xml'
      );
      expect(urls.signInUrl).toBe('https://adfs.example.com/adfs/ls/');
      expect(urls.signOutUrl).toBe('https://adfs.example.com/adfs/ls/?wa=wsignout1.0');
    });

    it('https://付きのサーバー名も処理できる', () => {
      const urls = AdfsProvider.getDefaultUrls('https://adfs.example.com');

      expect(urls.federationMetadataUrl).toBe(
        'https://adfs.example.com/FederationMetadata/2007-06/FederationMetadata.xml'
      );
    });
  });
});

describe('AdfsUserProvisioner', () => {
  describe('mapToLocalUser', () => {
    it('SSOユーザー情報をローカルユーザーにマッピングする', () => {
      const ssoUserInfo = {
        id: 'adfs-user-id',
        email: 'test@example.com',
        name: 'Test User',
        groups: ['Domain Admins', 'Developers'],
        metadata: {
          windowsAccountName: 'DOMAIN\\test',
          upn: 'test@example.com',
        },
      };

      const result = AdfsUserProvisioner.mapToLocalUser(ssoUserInfo);

      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.externalId).toBe('adfs-user-id');
      expect(result.metadata.ssoProvider).toBe('ADFS');
      expect(result.metadata.groups).toEqual(['Domain Admins', 'Developers']);
    });

    it('名前が未設定の場合はメールアドレスのローカル部を使用', () => {
      const ssoUserInfo = {
        id: 'adfs-user-id',
        email: 'john.doe@example.com',
      };

      const result = AdfsUserProvisioner.mapToLocalUser(ssoUserInfo);

      expect(result.name).toBe('john.doe');
    });
  });

  describe('mapGroupsToRoles', () => {
    const mappings = [
      { ssoGroupName: 'Domain Admins', localRoleId: 'role-admin', priority: 100 },
      { ssoGroupName: 'Developers', localRoleId: 'role-dev', priority: 50 },
      { ssoGroupName: 'Users', localRoleId: 'role-user', priority: 25 },
    ];

    it('グループをロールにマッピングする', () => {
      const groups = ['Developers', 'Users'];

      const result = AdfsUserProvisioner.mapGroupsToRoles(groups, mappings);

      expect(result).toContain('role-dev');
      expect(result).toContain('role-user');
      expect(result).not.toContain('role-admin');
    });

    it('優先度順にマッピングされる', () => {
      const groups = ['Users', 'Domain Admins', 'Developers'];

      const result = AdfsUserProvisioner.mapGroupsToRoles(groups, mappings);

      // 優先度が高い順に結果に含まれる
      expect(result[0]).toBe('role-admin');
    });

    it('マッピングのないグループは無視される', () => {
      const groups = ['UnknownGroup'];

      const result = AdfsUserProvisioner.mapGroupsToRoles(groups, mappings);

      expect(result).toHaveLength(0);
    });

    it('重複するロールは1つにまとめられる', () => {
      const duplicateMappings = [
        ...mappings,
        { ssoGroupName: 'DevTeam', localRoleId: 'role-dev', priority: 10 },
      ];
      const groups = ['Developers', 'DevTeam'];

      const result = AdfsUserProvisioner.mapGroupsToRoles(groups, duplicateMappings);

      const devRoleCount = result.filter((r) => r === 'role-dev').length;
      expect(devRoleCount).toBe(1);
    });
  });
});
