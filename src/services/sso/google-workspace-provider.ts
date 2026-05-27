/**
 * Google Workspace Provider
 *
 * Google Workspace (旧 G Suite) との SSO 連携を提供
 */

import type { SsoConfiguration, SsoUserInfo, SsoConnectionTestResult } from '@/types/sso';

/**
 * Google Workspace設定
 */
export interface GoogleWorkspaceConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  hostedDomain?: string; // Google Workspace ドメイン制限
}

/**
 * Googleトークンレスポンス
 */
interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
  refresh_token?: string;
}

/**
 * Googleユーザープロファイル
 */
interface GoogleUserProfile {
  sub: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email: string;
  email_verified: boolean;
  hd?: string; // hosted domain (Google Workspace)
}

/**
 * Google Admin Directory APIグループ
 */
interface GoogleGroup {
  id: string;
  email: string;
  name: string;
  description?: string;
}

/**
 * Google Workspaceプロバイダークラス
 */
export class GoogleWorkspaceProvider {
  private config: GoogleWorkspaceConfig;
  private authBaseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private tokenUrl = 'https://oauth2.googleapis.com/token';
  private userInfoUrl = 'https://openidconnect.googleapis.com/v1/userinfo';
  private adminApiBaseUrl = 'https://admin.googleapis.com/admin/directory/v1';

  constructor(config: GoogleWorkspaceConfig) {
    this.config = config;
  }

  /**
   * SSO設定からGoogle Workspaceプロバイダーを作成
   */
  static fromSsoConfiguration(
    ssoConfig: SsoConfiguration,
    redirectUri: string
  ): GoogleWorkspaceProvider {
    if (!ssoConfig.clientId || !ssoConfig.clientSecret) {
      throw new Error('クライアントIDまたはクライアントシークレットが設定されていません');
    }

    const hostedDomain = ssoConfig.metadata?.hostedDomain as string | undefined;

    return new GoogleWorkspaceProvider({
      clientId: ssoConfig.clientId,
      clientSecret: ssoConfig.clientSecret,
      redirectUri,
      hostedDomain,
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
      scope: 'openid profile email',
      state,
      nonce,
      access_type: 'offline',
      prompt: 'consent',
    });

    // ホストドメイン制限
    if (this.config.hostedDomain) {
      params.set('hd', this.config.hostedDomain);
    }

    return `${this.authBaseUrl}?${params.toString()}`;
  }

  /**
   * 認証コードからアクセストークンを取得
   */
  async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(this.tokenUrl, {
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
  async refreshToken(refreshToken: string): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(this.tokenUrl, {
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
  async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const response = await fetch(this.userInfoUrl, {
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
   * ユーザーのグループメンバーシップを取得 (Admin SDK)
   * 注意: Admin SDK アクセスにはサービスアカウントまたは適切なスコープが必要
   */
  async getUserGroups(accessToken: string, userEmail: string): Promise<GoogleGroup[]> {
    try {
      const response = await fetch(
        `${this.adminApiBaseUrl}/groups?userKey=${encodeURIComponent(userEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        // Admin API へのアクセスがない場合は空配列を返す
        if (response.status === 403) {
          console.warn('Google Admin API へのアクセス権限がありません');
          return [];
        }
        const error = await response.json();
        throw new Error(`グループ取得エラー: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.groups || [];
    } catch {
      // Admin API エラーは無視してログインは続行
      console.warn('Google グループ取得に失敗しました');
      return [];
    }
  }

  /**
   * SSO認証フローを実行してユーザー情報を取得
   */
  async authenticateUser(code: string): Promise<SsoUserInfo> {
    // トークン取得
    const tokenResponse = await this.exchangeCodeForToken(code);

    // ユーザープロファイル取得
    const profile = await this.getUserProfile(tokenResponse.access_token);

    // ホストドメインの検証
    if (this.config.hostedDomain && profile.hd !== this.config.hostedDomain) {
      throw new Error(
        `許可されていないドメインです: ${profile.hd || 'N/A'} (要求: ${this.config.hostedDomain})`
      );
    }

    // グループ取得（オプション）
    let groups: string[] = [];
    try {
      const userGroups = await this.getUserGroups(tokenResponse.access_token, profile.email);
      groups = userGroups.map((g) => g.name);
    } catch {
      // グループ取得に失敗してもログインは続行
      console.warn('グループ取得に失敗しました');
    }

    return {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      groups,
      metadata: {
        hostedDomain: profile.hd,
        givenName: profile.given_name,
        familyName: profile.family_name,
        emailVerified: profile.email_verified,
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
      const authResponse = await fetch(this.authBaseUrl, { method: 'HEAD' });
      details.authorizationUrl = authResponse.ok || authResponse.status === 405;
    } catch {
      details.authorizationUrl = false;
    }

    try {
      // トークンエンドポイントのテスト
      const tokenResponse = await fetch(this.tokenUrl, { method: 'HEAD' });
      details.tokenUrl = tokenResponse.ok || tokenResponse.status === 405;
    } catch {
      details.tokenUrl = false;
    }

    try {
      // OpenID設定の取得
      const openIdConfigUrl = 'https://accounts.google.com/.well-known/openid-configuration';
      const configResponse = await fetch(openIdConfigUrl);
      details.userInfoUrl = configResponse.ok;
    } catch {
      details.userInfoUrl = false;
    }

    const allPassed = Object.values(details).every((v) => v === true);

    return {
      success: allPassed,
      message: allPassed
        ? 'Google Workspace接続テストに成功しました'
        : 'Google Workspace接続テストに一部失敗しました',
      details,
    };
  }

  /**
   * デフォルトURL設定を取得
   */
  static getDefaultUrls(): {
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
  } {
    return {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    };
  }
}

/**
 * Google Workspaceの自動プロビジョニングサービス
 */
export class GoogleWorkspaceUserProvisioner {
  /**
   * Google Workspaceユーザーをローカルユーザーとしてプロビジョニング
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
        ssoProvider: 'GOOGLE',
        ...ssoUserInfo.metadata,
        groups: ssoUserInfo.groups,
      },
    };
  }

  /**
   * Google Workspaceグループをローカルロールにマッピング
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
