/**
 * Okta Provider
 *
 * Okta との SSO 連携を提供
 */

import type { SsoConfiguration, SsoUserInfo, SsoConnectionTestResult } from '@/types/sso';

/**
 * Okta設定
 */
export interface OktaConfig {
  domain: string; // e.g., "dev-12345.okta.com"
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Oktaトークンレスポンス
 */
interface OktaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
  refresh_token?: string;
}

/**
 * Oktaユーザープロファイル
 */
interface OktaUserProfile {
  sub: string;
  name: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email: string;
  email_verified?: boolean;
  picture?: string;
  groups?: string[];
  zoneinfo?: string;
  locale?: string;
  updated_at?: number;
}

/**
 * Oktaグループ
 */
interface OktaGroup {
  id: string;
  profile: {
    name: string;
    description?: string;
  };
}

/**
 * Oktaプロバイダークラス
 */
export class OktaProvider {
  private config: OktaConfig;

  constructor(config: OktaConfig) {
    this.config = config;
  }

  /**
   * ベースURLを取得
   */
  private get baseUrl(): string {
    return `https://${this.config.domain}`;
  }

  /**
   * SSO設定からOktaプロバイダーを作成
   */
  static fromSsoConfiguration(ssoConfig: SsoConfiguration, redirectUri: string): OktaProvider {
    if (!ssoConfig.clientId || !ssoConfig.clientSecret) {
      throw new Error('クライアントIDまたはクライアントシークレットが設定されていません');
    }

    const domain = ssoConfig.metadata?.domain as string;
    if (!domain) {
      throw new Error('Oktaドメインが設定されていません');
    }

    return new OktaProvider({
      domain,
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
      scope: 'openid profile email groups',
      state,
      nonce,
    });

    return `${this.baseUrl}/oauth2/default/v1/authorize?${params.toString()}`;
  }

  /**
   * 認証コードからアクセストークンを取得
   */
  async exchangeCodeForToken(code: string): Promise<OktaTokenResponse> {
    const tokenUrl = `${this.baseUrl}/oauth2/default/v1/token`;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
    });

    // Basic認証ヘッダーを作成
    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
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
  async refreshToken(refreshToken: string): Promise<OktaTokenResponse> {
    const tokenUrl = `${this.baseUrl}/oauth2/default/v1/token`;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      'base64'
    );

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
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
  async getUserProfile(accessToken: string): Promise<OktaUserProfile> {
    const userInfoUrl = `${this.baseUrl}/oauth2/default/v1/userinfo`;

    const response = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `ユーザープロファイル取得エラー: ${error.error_description || 'Unknown error'}`
      );
    }

    return response.json();
  }

  /**
   * ユーザーのグループメンバーシップを取得（API Token必要）
   */
  async getUserGroups(userId: string, apiToken?: string): Promise<OktaGroup[]> {
    if (!apiToken) {
      console.warn('Okta API Tokenが設定されていないため、グループ取得をスキップします');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/users/${userId}/groups`, {
        headers: {
          Authorization: `SSWS ${apiToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('Oktaグループ取得に失敗しました');
        return [];
      }

      return response.json();
    } catch {
      console.warn('Oktaグループ取得でエラーが発生しました');
      return [];
    }
  }

  /**
   * SSO認証フローを実行してユーザー情報を取得
   */
  async authenticateUser(code: string, apiToken?: string): Promise<SsoUserInfo> {
    // トークン取得
    const tokenResponse = await this.exchangeCodeForToken(code);

    // ユーザープロファイル取得
    const profile = await this.getUserProfile(tokenResponse.access_token);

    // グループ取得
    let groups: string[] = profile.groups || [];

    // API Tokenが設定されている場合は追加でグループを取得
    if (apiToken && groups.length === 0) {
      try {
        const userGroups = await this.getUserGroups(profile.sub, apiToken);
        groups = userGroups.map((g) => g.profile.name);
      } catch {
        console.warn('グループ取得に失敗しました');
      }
    }

    return {
      id: profile.sub,
      email: profile.email,
      name: profile.name || profile.preferred_username || profile.email.split('@')[0],
      picture: profile.picture,
      groups,
      metadata: {
        domain: this.config.domain,
        givenName: profile.given_name,
        familyName: profile.family_name,
        emailVerified: profile.email_verified,
        locale: profile.locale,
        zoneinfo: profile.zoneinfo,
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
      const authUrl = `${this.baseUrl}/oauth2/default/v1/authorize`;
      const authResponse = await fetch(authUrl, { method: 'HEAD' });
      details.authorizationUrl = authResponse.ok || authResponse.status === 400;
    } catch {
      details.authorizationUrl = false;
    }

    try {
      // トークンエンドポイントのテスト
      const tokenUrl = `${this.baseUrl}/oauth2/default/v1/token`;
      const tokenResponse = await fetch(tokenUrl, { method: 'HEAD' });
      details.tokenUrl =
        tokenResponse.ok || tokenResponse.status === 400 || tokenResponse.status === 405;
    } catch {
      details.tokenUrl = false;
    }

    try {
      // OpenID設定の取得
      const openIdConfigUrl = `${this.baseUrl}/.well-known/openid-configuration`;
      const configResponse = await fetch(openIdConfigUrl);
      details.userInfoUrl = configResponse.ok;
    } catch {
      details.userInfoUrl = false;
    }

    const allPassed = Object.values(details).every((v) => v === true);

    return {
      success: allPassed,
      message: allPassed ? 'Okta接続テストに成功しました' : 'Okta接続テストに一部失敗しました',
      details,
      checks: [],
    };
  }

  /**
   * デフォルトURL設定を取得
   */
  static getDefaultUrls(domain: string): {
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
  } {
    const baseUrl = `https://${domain}`;
    return {
      authorizationUrl: `${baseUrl}/oauth2/default/v1/authorize`,
      tokenUrl: `${baseUrl}/oauth2/default/v1/token`,
      userInfoUrl: `${baseUrl}/oauth2/default/v1/userinfo`,
    };
  }
}

/**
 * Oktaの自動プロビジョニングサービス
 */
export class OktaUserProvisioner {
  /**
   * Oktaユーザーをローカルユーザーとしてプロビジョニング
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
        ssoProvider: 'OKTA',
        ...ssoUserInfo.metadata,
        groups: ssoUserInfo.groups,
      },
    };
  }

  /**
   * Oktaグループをローカルロールにマッピング
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
