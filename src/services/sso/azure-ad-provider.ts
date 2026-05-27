/**
 * Azure AD Provider
 *
 * Azure Active Directory (Microsoft Entra ID) との SSO 連携を提供
 */

import type { SsoConfiguration, SsoUserInfo, SsoConnectionTestResult } from '@/types/sso';

/**
 * Azure AD設定
 */
export interface AzureAdConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Azure ADトークンレスポンス
 */
interface AzureAdTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
  refresh_token?: string;
}

/**
 * Azure ADユーザープロファイル
 */
interface AzureAdUserProfile {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  userPrincipalName: string;
  mail?: string;
  jobTitle?: string;
  department?: string;
  officeLocation?: string;
}

/**
 * Azure ADグループ
 */
interface AzureAdGroup {
  id: string;
  displayName: string;
  description?: string;
}

/**
 * Azure ADプロバイダークラス
 */
export class AzureAdProvider {
  private config: AzureAdConfig;
  private baseUrl = 'https://login.microsoftonline.com';
  private graphBaseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(config: AzureAdConfig) {
    this.config = config;
  }

  /**
   * SSO設定からAzure ADプロバイダーを作成
   */
  static fromSsoConfiguration(ssoConfig: SsoConfiguration, redirectUri: string): AzureAdProvider {
    const tenantId = (ssoConfig.metadata?.tenantId as string) || 'common';

    if (!ssoConfig.clientId || !ssoConfig.clientSecret) {
      throw new Error('クライアントIDまたはクライアントシークレットが設定されていません');
    }

    return new AzureAdProvider({
      tenantId,
      clientId: ssoConfig.clientId,
      clientSecret: ssoConfig.clientSecret,
      redirectUri,
    });
  }

  /**
   * 認可URLを生成
   */
  getAuthorizationUrl(state: string, nonce: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'openid profile email User.Read GroupMember.Read.All',
      state,
      nonce,
      response_mode: 'query',
    });

    return `${this.baseUrl}/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * 認証コードからアクセストークンを取得
   */
  async exchangeCodeForToken(code: string): Promise<AzureAdTokenResponse> {
    const tokenUrl = `${this.baseUrl}/${this.config.tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
      scope: 'openid profile email User.Read GroupMember.Read.All',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`トークン取得エラー: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * アクセストークンを更新
   */
  async refreshToken(refreshToken: string): Promise<AzureAdTokenResponse> {
    const tokenUrl = `${this.baseUrl}/${this.config.tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'openid profile email User.Read GroupMember.Read.All',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`トークン更新エラー: ${error.error_description || error.error}`);
    }

    return response.json();
  }

  /**
   * ユーザープロファイルを取得
   */
  async getUserProfile(accessToken: string): Promise<AzureAdUserProfile> {
    const response = await fetch(`${this.graphBaseUrl}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`ユーザープロファイル取得エラー: ${error.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * ユーザーのグループメンバーシップを取得
   */
  async getUserGroups(accessToken: string): Promise<AzureAdGroup[]> {
    const response = await fetch(`${this.graphBaseUrl}/me/memberOf`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`グループ取得エラー: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.value.filter(
      (member: { '@odata.type': string }) => member['@odata.type'] === '#microsoft.graph.group'
    );
  }

  /**
   * SSO認証フローを実行してユーザー情報を取得
   */
  async authenticateUser(code: string): Promise<SsoUserInfo> {
    // トークン取得
    const tokenResponse = await this.exchangeCodeForToken(code);

    // ユーザープロファイル取得
    const profile = await this.getUserProfile(tokenResponse.access_token);

    // グループ取得（オプション）
    let groups: string[] = [];
    try {
      const userGroups = await this.getUserGroups(tokenResponse.access_token);
      groups = userGroups.map((g) => g.displayName);
    } catch {
      // グループ取得に失敗してもログインは続行
      console.warn('グループ取得に失敗しました');
    }

    return {
      id: profile.id,
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
      picture: undefined, // Azure ADは直接画像URLを返さない
      groups,
      metadata: {
        tenantId: this.config.tenantId,
        jobTitle: profile.jobTitle,
        department: profile.department,
        officeLocation: profile.officeLocation,
      },
    };
  }

  /**
   * 接続テストを実行
   */
  async testConnection(): Promise<SsoConnectionTestResult> {
    const details: SsoConnectionTestResult['details'] = {};

    try {
      // 認可エンドポイントのテスト
      const authUrl = `${this.baseUrl}/${this.config.tenantId}/oauth2/v2.0/authorize`;
      const authResponse = await fetch(authUrl, { method: 'HEAD' });
      details.authorizationUrl = authResponse.ok || authResponse.status === 405;
    } catch {
      details.authorizationUrl = false;
    }

    try {
      // トークンエンドポイントのテスト
      const tokenUrl = `${this.baseUrl}/${this.config.tenantId}/oauth2/v2.0/token`;
      const tokenResponse = await fetch(tokenUrl, { method: 'HEAD' });
      details.tokenUrl = tokenResponse.ok || tokenResponse.status === 405;
    } catch {
      details.tokenUrl = false;
    }

    try {
      // OpenID設定の取得
      const openIdConfigUrl = `${this.baseUrl}/${this.config.tenantId}/v2.0/.well-known/openid-configuration`;
      const configResponse = await fetch(openIdConfigUrl);
      details.userInfoUrl = configResponse.ok;
    } catch {
      details.userInfoUrl = false;
    }

    const allPassed = Object.values(details).every((v) => v === true);

    return {
      success: allPassed,
      message: allPassed
        ? 'Azure AD接続テストに成功しました'
        : 'Azure AD接続テストに一部失敗しました',
      details,
    };
  }

  /**
   * テナントのデフォルトURL設定を取得
   */
  static getDefaultUrls(tenantId: string = 'common'): {
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
  } {
    return {
      authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    };
  }
}

/**
 * Azure ADの自動プロビジョニングサービス
 */
export class AzureAdUserProvisioner {
  /**
   * Azure ADユーザーをローカルユーザーとしてプロビジョニング
   */
  static mapToLocalUser(ssoUserInfo: SsoUserInfo): {
    email: string;
    name: string;
    externalId: string;
    metadata: Record<string, unknown>;
  } {
    return {
      email: ssoUserInfo.email,
      name: ssoUserInfo.name || ssoUserInfo.email.split('@')[0],
      externalId: ssoUserInfo.id,
      metadata: {
        ssoProvider: 'MICROSOFT',
        ...ssoUserInfo.metadata,
        groups: ssoUserInfo.groups,
      },
    };
  }

  /**
   * Azure ADグループをローカルロールにマッピング
   */
  static mapGroupsToRoles(
    groups: string[],
    mappings: Array<{ ssoGroupName: string; localRoleId: string; priority: number }>
  ): string[] {
    // 優先度順にソート
    const sortedMappings = [...mappings].sort((a, b) => b.priority - a.priority);

    const mappedRoleIds: string[] = [];
    // 優先度順に処理してユーザーが持つグループに一致するものを追加
    for (const mapping of sortedMappings) {
      if (groups.includes(mapping.ssoGroupName) && !mappedRoleIds.includes(mapping.localRoleId)) {
        mappedRoleIds.push(mapping.localRoleId);
      }
    }

    return mappedRoleIds;
  }
}
