/**
 * Single Sign-On (SSO) Types
 *
 * シングルサインオンの型定義
 */

// ====================================
// Enums
// ====================================

/**
 * SSOプロバイダータイプ
 */
export const SsoProviderType = {
  OAUTH2: 'OAUTH2',
  OIDC: 'OIDC',
  SAML: 'SAML',
} as const;

export type SsoProviderType = (typeof SsoProviderType)[keyof typeof SsoProviderType];

/**
 * SSOプロバイダー名
 */
export const SsoProviderName = {
  GOOGLE: 'GOOGLE',
  MICROSOFT: 'MICROSOFT',
  GITHUB: 'GITHUB',
  GITLAB: 'GITLAB',
  OKTA: 'OKTA',
  AUTH0: 'AUTH0',
  KEYCLOAK: 'KEYCLOAK',
  CUSTOM: 'CUSTOM',
} as const;

export type SsoProviderName = (typeof SsoProviderName)[keyof typeof SsoProviderName];

/**
 * SSO設定ステータス
 */
export const SsoConfigStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  TESTING: 'TESTING',
  ERROR: 'ERROR',
} as const;

export type SsoConfigStatus = (typeof SsoConfigStatus)[keyof typeof SsoConfigStatus];

// ====================================
// Core Types
// ====================================

/**
 * SSO設定
 */
export interface SsoConfiguration {
  id: string;
  name: string;
  displayName: string;
  providerType: SsoProviderType;
  providerName: SsoProviderName;
  status: SsoConfigStatus;

  // OAuth2/OIDC設定
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string[];

  // SAML設定
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  certificate?: string;
  privateKey?: string;

  // 共通設定
  allowedDomains?: string[];
  autoProvision: boolean;
  defaultRoleId?: string;
  metadata?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

/**
 * SSOロールマッピング
 */
export interface SsoRoleMapping {
  id: string;
  configId: string;
  ssoGroupName: string;
  localRoleId: string;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SSOログインログ
 */
export interface SsoLoginLog {
  id: string;
  configId: string;
  userId?: string;
  ssoUserId?: string;
  ssoEmail?: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ====================================
// API Types
// ====================================

/**
 * SSO設定作成リクエスト
 */
export interface CreateSsoConfigRequest {
  name: string;
  displayName: string;
  providerType: SsoProviderType;
  providerName: SsoProviderName;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string[];
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  certificate?: string;
  privateKey?: string;
  allowedDomains?: string[];
  autoProvision?: boolean;
  defaultRoleId?: string;
}

/**
 * SSO設定更新リクエスト
 */
export interface UpdateSsoConfigRequest extends Partial<CreateSsoConfigRequest> {
  status?: SsoConfigStatus;
}

/**
 * SSOロールマッピング作成リクエスト
 */
export interface CreateRoleMappingRequest {
  ssoGroupName: string;
  localRoleId: string;
  priority?: number;
}

/**
 * SSO認証開始レスポンス
 */
export interface SsoAuthStartResponse {
  authUrl: string;
  state: string;
  nonce?: string;
}

/**
 * SSO認証コールバックリクエスト
 */
export interface SsoAuthCallbackRequest {
  code: string;
  state: string;
}

/**
 * SSOユーザー情報
 */
export interface SsoUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  groups?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * SSO接続チェック項目
 */
export interface SsoConnectionCheck {
  name: string;
  passed: boolean;
  message?: string;
}

/**
 * SSO接続テスト結果
 */
export interface SsoConnectionTestResult {
  success: boolean;
  message: string;
  checks: SsoConnectionCheck[];
  responseTime?: number;
  details?: {
    authorizationUrl?: boolean;
    tokenUrl?: boolean;
    userInfoUrl?: boolean;
    certificate?: boolean;
  };
}

/**
 * SSOプロバイダー情報
 */
export interface SsoProviderInfo {
  name: SsoProviderName;
  displayName: string;
  description: string;
  providerType: SsoProviderType;
  icon: string;
  defaultConfig?: Partial<CreateSsoConfigRequest>;
}

// ====================================
// Utility Functions
// ====================================

/**
 * プロバイダータイプのラベルを取得
 */
export function getProviderTypeLabel(type: SsoProviderType): string {
  const labels: Record<SsoProviderType, string> = {
    [SsoProviderType.OAUTH2]: 'OAuth 2.0',
    [SsoProviderType.OIDC]: 'OpenID Connect',
    [SsoProviderType.SAML]: 'SAML 2.0',
  };
  return labels[type] || type;
}

/**
 * プロバイダー名のラベルを取得
 */
export function getProviderNameLabel(name: SsoProviderName): string {
  const labels: Record<SsoProviderName, string> = {
    [SsoProviderName.GOOGLE]: 'Google Workspace',
    [SsoProviderName.MICROSOFT]: 'Microsoft Entra ID',
    [SsoProviderName.GITHUB]: 'GitHub',
    [SsoProviderName.GITLAB]: 'GitLab',
    [SsoProviderName.OKTA]: 'Okta',
    [SsoProviderName.AUTH0]: 'Auth0',
    [SsoProviderName.KEYCLOAK]: 'Keycloak',
    [SsoProviderName.CUSTOM]: 'カスタム',
  };
  return labels[name] || name;
}

/**
 * ステータスのラベルを取得
 */
export function getConfigStatusLabel(status: SsoConfigStatus): string {
  const labels: Record<SsoConfigStatus, string> = {
    [SsoConfigStatus.ACTIVE]: '有効',
    [SsoConfigStatus.INACTIVE]: '無効',
    [SsoConfigStatus.TESTING]: 'テスト中',
    [SsoConfigStatus.ERROR]: 'エラー',
  };
  return labels[status] || status;
}

/**
 * ステータスの色を取得
 */
export function getConfigStatusColor(status: SsoConfigStatus): string {
  const colors: Record<SsoConfigStatus, string> = {
    [SsoConfigStatus.ACTIVE]: 'green',
    [SsoConfigStatus.INACTIVE]: 'gray',
    [SsoConfigStatus.TESTING]: 'yellow',
    [SsoConfigStatus.ERROR]: 'red',
  };
  return colors[status] || 'gray';
}

/**
 * プロバイダーのアイコンクラスを取得
 */
export function getProviderIcon(name: SsoProviderName): string {
  const icons: Record<SsoProviderName, string> = {
    [SsoProviderName.GOOGLE]: 'google',
    [SsoProviderName.MICROSOFT]: 'microsoft',
    [SsoProviderName.GITHUB]: 'github',
    [SsoProviderName.GITLAB]: 'gitlab',
    [SsoProviderName.OKTA]: 'okta',
    [SsoProviderName.AUTH0]: 'auth0',
    [SsoProviderName.KEYCLOAK]: 'keycloak',
    [SsoProviderName.CUSTOM]: 'key',
  };
  return icons[name] || 'key';
}

/**
 * プロバイダーのデフォルト設定を取得
 */
export function getProviderDefaultConfig(name: SsoProviderName): Partial<CreateSsoConfigRequest> {
  const defaults: Record<SsoProviderName, Partial<CreateSsoConfigRequest>> = {
    [SsoProviderName.GOOGLE]: {
      providerType: SsoProviderType.OIDC,
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      scopes: ['openid', 'email', 'profile'],
    },
    [SsoProviderName.MICROSOFT]: {
      providerType: SsoProviderType.OIDC,
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
      scopes: ['openid', 'email', 'profile'],
    },
    [SsoProviderName.GITHUB]: {
      providerType: SsoProviderType.OAUTH2,
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scopes: ['read:user', 'user:email'],
    },
    [SsoProviderName.GITLAB]: {
      providerType: SsoProviderType.OAUTH2,
      authorizationUrl: 'https://gitlab.com/oauth/authorize',
      tokenUrl: 'https://gitlab.com/oauth/token',
      userInfoUrl: 'https://gitlab.com/api/v4/user',
      scopes: ['read_user', 'openid', 'email'],
    },
    [SsoProviderName.OKTA]: {
      providerType: SsoProviderType.OIDC,
      scopes: ['openid', 'email', 'profile', 'groups'],
    },
    [SsoProviderName.AUTH0]: {
      providerType: SsoProviderType.OIDC,
      scopes: ['openid', 'email', 'profile'],
    },
    [SsoProviderName.KEYCLOAK]: {
      providerType: SsoProviderType.OIDC,
      scopes: ['openid', 'email', 'profile', 'roles'],
    },
    [SsoProviderName.CUSTOM]: {
      providerType: SsoProviderType.OAUTH2,
    },
  };
  return defaults[name] || {};
}

/**
 * SSO設定を検証
 */
export function validateSsoConfig(config: Partial<CreateSsoConfigRequest>): string[] {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('設定名は必須です');
  }

  if (!config.displayName || config.displayName.trim().length === 0) {
    errors.push('表示名は必須です');
  }

  if (!config.providerType) {
    errors.push('プロバイダータイプは必須です');
  }

  if (!config.providerName) {
    errors.push('プロバイダー名は必須です');
  }

  if (
    config.providerType === SsoProviderType.OAUTH2 ||
    config.providerType === SsoProviderType.OIDC
  ) {
    if (!config.clientId) {
      errors.push('クライアントIDは必須です');
    }
    if (!config.clientSecret) {
      errors.push('クライアントシークレットは必須です');
    }
    if (!config.authorizationUrl) {
      errors.push('認可URLは必須です');
    }
    if (!config.tokenUrl) {
      errors.push('トークンURLは必須です');
    }
  }

  if (config.providerType === SsoProviderType.SAML) {
    if (!config.entityId) {
      errors.push('エンティティIDは必須です');
    }
    if (!config.ssoUrl) {
      errors.push('SSO URLは必須です');
    }
    if (!config.certificate) {
      errors.push('証明書は必須です');
    }
  }

  return errors;
}

/**
 * メールドメインが許可されているかチェック
 */
export function isAllowedDomain(email: string, allowedDomains: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) {
    return false;
  }

  return allowedDomains.some((d) => d.toLowerCase() === domain);
}

/**
 * プロバイダー情報一覧
 */
export const SSO_PROVIDERS: SsoProviderInfo[] = [
  {
    name: SsoProviderName.GOOGLE,
    displayName: 'Google Workspace',
    description: 'GoogleアカウントでのSSO認証',
    providerType: SsoProviderType.OIDC,
    icon: 'google',
    defaultConfig: getProviderDefaultConfig(SsoProviderName.GOOGLE),
  },
  {
    name: SsoProviderName.MICROSOFT,
    displayName: 'Microsoft Entra ID',
    description: 'Microsoft 365/Azure ADでのSSO認証',
    providerType: SsoProviderType.OIDC,
    icon: 'microsoft',
    defaultConfig: getProviderDefaultConfig(SsoProviderName.MICROSOFT),
  },
  {
    name: SsoProviderName.GITHUB,
    displayName: 'GitHub',
    description: 'GitHubアカウントでのSSO認証',
    providerType: SsoProviderType.OAUTH2,
    icon: 'github',
    defaultConfig: getProviderDefaultConfig(SsoProviderName.GITHUB),
  },
  {
    name: SsoProviderName.GITLAB,
    displayName: 'GitLab',
    description: 'GitLabアカウントでのSSO認証',
    providerType: SsoProviderType.OAUTH2,
    icon: 'gitlab',
    defaultConfig: getProviderDefaultConfig(SsoProviderName.GITLAB),
  },
  {
    name: SsoProviderName.OKTA,
    displayName: 'Okta',
    description: 'OktaでのSSO認証',
    providerType: SsoProviderType.OIDC,
    icon: 'okta',
    defaultConfig: getProviderDefaultConfig(SsoProviderName.OKTA),
  },
  {
    name: SsoProviderName.AUTH0,
    displayName: 'Auth0',
    description: 'Auth0でのSSO認証',
    providerType: SsoProviderType.OIDC,
    icon: 'auth0',
    defaultConfig: getProviderDefaultConfig(SsoProviderName.AUTH0),
  },
  {
    name: SsoProviderName.KEYCLOAK,
    displayName: 'Keycloak',
    description: 'KeycloakでのSSO認証',
    providerType: SsoProviderType.OIDC,
    icon: 'keycloak',
    defaultConfig: getProviderDefaultConfig(SsoProviderName.KEYCLOAK),
  },
  {
    name: SsoProviderName.CUSTOM,
    displayName: 'カスタム',
    description: 'カスタムOAuth2/OIDC/SAMLプロバイダー',
    providerType: SsoProviderType.OAUTH2,
    icon: 'key',
    defaultConfig: getProviderDefaultConfig(SsoProviderName.CUSTOM),
  },
];

/**
 * OAuth2/OIDC認可URLを生成
 */
export function generateAuthorizationUrl(
  config: SsoConfiguration,
  redirectUri: string,
  state: string,
  nonce?: string
): string {
  if (!config.authorizationUrl || !config.clientId) {
    throw new Error('認可URLまたはクライアントIDが設定されていません');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });

  if (config.scopes && config.scopes.length > 0) {
    params.set('scope', config.scopes.join(' '));
  }

  if (config.providerType === SsoProviderType.OIDC && nonce) {
    params.set('nonce', nonce);
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * ランダムなstate値を生成
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * ランダムなnonce値を生成
 */
export function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
