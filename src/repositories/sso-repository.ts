/**
 * SSO Repository
 *
 * シングルサインオンのリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  SsoConfiguration,
  SsoRoleMapping,
  SsoLoginLog,
  SsoProviderType,
  SsoProviderName,
  SsoConfigStatus,
  CreateSsoConfigRequest,
  UpdateSsoConfigRequest,
  CreateRoleMappingRequest,
  SsoUserInfo,
} from '@/types/sso';
import crypto from 'crypto';

// ====================================
// Type Converters
// ====================================

function convertToSsoConfiguration(db: {
  id: bigint;
  name: string;
  displayName: string;
  providerType: string;
  providerName: string;
  status: string;
  clientId: string | null;
  clientSecret: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userInfoUrl: string | null;
  scopes: string[];
  entityId: string | null;
  ssoUrl: string | null;
  sloUrl: string | null;
  certificate: string | null;
  privateKey: string | null;
  allowedDomains: string[];
  autoProvision: boolean;
  defaultRoleId: bigint | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): SsoConfiguration {
  return {
    id: db.id.toString(),
    name: db.name,
    displayName: db.displayName,
    providerType: db.providerType as SsoProviderType,
    providerName: db.providerName as SsoProviderName,
    status: db.status as SsoConfigStatus,
    clientId: db.clientId || undefined,
    clientSecret: db.clientSecret || undefined,
    authorizationUrl: db.authorizationUrl || undefined,
    tokenUrl: db.tokenUrl || undefined,
    userInfoUrl: db.userInfoUrl || undefined,
    scopes: db.scopes,
    entityId: db.entityId || undefined,
    ssoUrl: db.ssoUrl || undefined,
    sloUrl: db.sloUrl || undefined,
    certificate: db.certificate || undefined,
    privateKey: db.privateKey || undefined,
    allowedDomains: db.allowedDomains,
    autoProvision: db.autoProvision,
    defaultRoleId: db.defaultRoleId?.toString(),
    metadata: db.metadata as Record<string, unknown> | undefined,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  };
}

function convertToSsoRoleMapping(db: {
  id: bigint;
  configId: bigint;
  ssoGroupName: string;
  localRoleId: bigint;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SsoRoleMapping {
  return {
    id: db.id.toString(),
    configId: db.configId.toString(),
    ssoGroupName: db.ssoGroupName,
    localRoleId: db.localRoleId.toString(),
    priority: db.priority,
    isActive: db.isActive,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  };
}

function convertToSsoLoginLog(db: {
  id: bigint;
  configId: bigint;
  userId: bigint | null;
  ssoUserId: string | null;
  ssoEmail: string | null;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: Date;
}): SsoLoginLog {
  return {
    id: db.id.toString(),
    configId: db.configId.toString(),
    userId: db.userId?.toString(),
    ssoUserId: db.ssoUserId || undefined,
    ssoEmail: db.ssoEmail || undefined,
    success: db.success,
    errorCode: db.errorCode || undefined,
    errorMessage: db.errorMessage || undefined,
    ipAddress: db.ipAddress || undefined,
    userAgent: db.userAgent || undefined,
    metadata: db.metadata as Record<string, unknown> | undefined,
    createdAt: db.createdAt,
  };
}

// ====================================
// Encryption Helpers
// ====================================

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY =
  process.env.SSO_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!!!';

function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    return encryptedText; // 暗号化されていない場合はそのまま返す
  }
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ====================================
// SSO Configuration Operations
// ====================================

/**
 * SSO設定を作成
 */
export async function createSsoConfiguration(
  data: CreateSsoConfigRequest
): Promise<SsoConfiguration> {
  const config = await prisma.ssoConfiguration.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      providerType: data.providerType,
      providerName: data.providerName,
      clientId: data.clientId,
      clientSecret: data.clientSecret ? encrypt(data.clientSecret) : null,
      authorizationUrl: data.authorizationUrl,
      tokenUrl: data.tokenUrl,
      userInfoUrl: data.userInfoUrl,
      scopes: data.scopes || [],
      entityId: data.entityId,
      ssoUrl: data.ssoUrl,
      sloUrl: data.sloUrl,
      certificate: data.certificate,
      privateKey: data.privateKey ? encrypt(data.privateKey) : null,
      allowedDomains: data.allowedDomains || [],
      autoProvision: data.autoProvision ?? true,
      defaultRoleId: data.defaultRoleId ? BigInt(data.defaultRoleId) : null,
    },
  });

  return convertToSsoConfiguration(config);
}

/**
 * SSO設定を取得
 */
export async function getSsoConfiguration(id: string): Promise<SsoConfiguration | null> {
  const config = await prisma.ssoConfiguration.findUnique({
    where: { id: BigInt(id) },
  });

  if (!config) {
    return null;
  }

  const result = convertToSsoConfiguration(config);
  // シークレットは復号化して返す
  if (config.clientSecret) {
    result.clientSecret = decrypt(config.clientSecret);
  }
  if (config.privateKey) {
    result.privateKey = decrypt(config.privateKey);
  }

  return result;
}

/**
 * SSO設定を名前で取得
 */
export async function getSsoConfigurationByName(name: string): Promise<SsoConfiguration | null> {
  const config = await prisma.ssoConfiguration.findUnique({
    where: { name },
  });

  if (!config) {
    return null;
  }

  const result = convertToSsoConfiguration(config);
  if (config.clientSecret) {
    result.clientSecret = decrypt(config.clientSecret);
  }
  if (config.privateKey) {
    result.privateKey = decrypt(config.privateKey);
  }

  return result;
}

/**
 * 有効なSSO設定一覧を取得
 */
export async function getActiveSsoConfigurations(): Promise<SsoConfiguration[]> {
  const configs = await prisma.ssoConfiguration.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { displayName: 'asc' },
  });

  return configs.map(convertToSsoConfiguration);
}

/**
 * 全SSO設定一覧を取得
 */
export async function getAllSsoConfigurations(): Promise<SsoConfiguration[]> {
  const configs = await prisma.ssoConfiguration.findMany({
    orderBy: { displayName: 'asc' },
  });

  return configs.map(convertToSsoConfiguration);
}

/**
 * SSO設定を更新
 */
export async function updateSsoConfiguration(
  id: string,
  data: UpdateSsoConfigRequest
): Promise<SsoConfiguration> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.providerType !== undefined) updateData.providerType = data.providerType;
  if (data.providerName !== undefined) updateData.providerName = data.providerName;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.clientId !== undefined) updateData.clientId = data.clientId;
  if (data.clientSecret !== undefined) {
    updateData.clientSecret = data.clientSecret ? encrypt(data.clientSecret) : null;
  }
  if (data.authorizationUrl !== undefined) updateData.authorizationUrl = data.authorizationUrl;
  if (data.tokenUrl !== undefined) updateData.tokenUrl = data.tokenUrl;
  if (data.userInfoUrl !== undefined) updateData.userInfoUrl = data.userInfoUrl;
  if (data.scopes !== undefined) updateData.scopes = data.scopes;
  if (data.entityId !== undefined) updateData.entityId = data.entityId;
  if (data.ssoUrl !== undefined) updateData.ssoUrl = data.ssoUrl;
  if (data.sloUrl !== undefined) updateData.sloUrl = data.sloUrl;
  if (data.certificate !== undefined) updateData.certificate = data.certificate;
  if (data.privateKey !== undefined) {
    updateData.privateKey = data.privateKey ? encrypt(data.privateKey) : null;
  }
  if (data.allowedDomains !== undefined) updateData.allowedDomains = data.allowedDomains;
  if (data.autoProvision !== undefined) updateData.autoProvision = data.autoProvision;
  if (data.defaultRoleId !== undefined) {
    updateData.defaultRoleId = data.defaultRoleId ? BigInt(data.defaultRoleId) : null;
  }

  const config = await prisma.ssoConfiguration.update({
    where: { id: BigInt(id) },
    data: updateData,
  });

  return convertToSsoConfiguration(config);
}

/**
 * SSO設定を削除
 */
export async function deleteSsoConfiguration(id: string): Promise<boolean> {
  try {
    await prisma.ssoConfiguration.delete({
      where: { id: BigInt(id) },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * SSO設定のステータスを更新
 */
export async function updateSsoConfigStatus(
  id: string,
  status: SsoConfigStatus
): Promise<SsoConfiguration> {
  const config = await prisma.ssoConfiguration.update({
    where: { id: BigInt(id) },
    data: { status },
  });

  return convertToSsoConfiguration(config);
}

// ====================================
// Role Mapping Operations
// ====================================

/**
 * ロールマッピングを作成
 */
export async function createRoleMapping(
  configId: string,
  data: CreateRoleMappingRequest
): Promise<SsoRoleMapping> {
  const mapping = await prisma.ssoRoleMapping.create({
    data: {
      configId: BigInt(configId),
      ssoGroupName: data.ssoGroupName,
      localRoleId: BigInt(data.localRoleId),
      priority: data.priority || 0,
    },
  });

  return convertToSsoRoleMapping(mapping);
}

/**
 * ロールマッピング一覧を取得
 */
export async function getRoleMappings(configId: string): Promise<SsoRoleMapping[]> {
  const mappings = await prisma.ssoRoleMapping.findMany({
    where: { configId: BigInt(configId), isActive: true },
    orderBy: { priority: 'desc' },
  });

  return mappings.map(convertToSsoRoleMapping);
}

/**
 * ロールマッピングを更新
 */
export async function updateRoleMapping(
  id: string,
  data: Partial<CreateRoleMappingRequest & { isActive?: boolean }>
): Promise<SsoRoleMapping> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (data.ssoGroupName !== undefined) updateData.ssoGroupName = data.ssoGroupName;
  if (data.localRoleId !== undefined) updateData.localRoleId = BigInt(data.localRoleId);
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const mapping = await prisma.ssoRoleMapping.update({
    where: { id: BigInt(id) },
    data: updateData,
  });

  return convertToSsoRoleMapping(mapping);
}

/**
 * ロールマッピングを削除
 */
export async function deleteRoleMapping(id: string): Promise<boolean> {
  try {
    await prisma.ssoRoleMapping.delete({
      where: { id: BigInt(id) },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * SSOグループからローカルロールIDを取得
 */
export async function getLocalRoleIdFromSsoGroups(
  configId: string,
  ssoGroups: string[]
): Promise<string | null> {
  if (!ssoGroups || ssoGroups.length === 0) {
    return null;
  }

  const mapping = await prisma.ssoRoleMapping.findFirst({
    where: {
      configId: BigInt(configId),
      ssoGroupName: { in: ssoGroups },
      isActive: true,
    },
    orderBy: { priority: 'desc' },
  });

  return mapping?.localRoleId.toString() || null;
}

// ====================================
// Login Log Operations
// ====================================

/**
 * ログインログを記録
 */
export async function logSsoLogin(
  configId: string,
  success: boolean,
  options: {
    userId?: string;
    ssoUserId?: string;
    ssoEmail?: string;
    errorCode?: string;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<SsoLoginLog> {
  const log = await prisma.ssoLoginLog.create({
    data: {
      configId: BigInt(configId),
      userId: options.userId ? BigInt(options.userId) : null,
      ssoUserId: options.ssoUserId,
      ssoEmail: options.ssoEmail,
      success,
      errorCode: options.errorCode,
      errorMessage: options.errorMessage,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata,
    },
  });

  return convertToSsoLoginLog(log);
}

/**
 * ログインログ一覧を取得
 */
export async function getSsoLoginLogs(
  configId?: string,
  limit: number = 100
): Promise<SsoLoginLog[]> {
  const logs = await prisma.ssoLoginLog.findMany({
    where: configId ? { configId: BigInt(configId) } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map(convertToSsoLoginLog);
}

/**
 * 最近の失敗ログインを取得
 */
export async function getRecentFailedLogins(
  configId: string,
  minutes: number = 15
): Promise<number> {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const count = await prisma.ssoLoginLog.count({
    where: {
      configId: BigInt(configId),
      success: false,
      createdAt: { gte: since },
    },
  });

  return count;
}

// ====================================
// User Provisioning
// ====================================

/**
 * SSOユーザーをプロビジョニング（ユーザー作成/更新）
 */
export async function provisionSsoUser(
  configId: string,
  userInfo: SsoUserInfo
): Promise<{ userId: string; isNew: boolean }> {
  const config = await getSsoConfiguration(configId);
  if (!config) {
    throw new Error('SSO設定が見つかりません');
  }

  // 既存ユーザーを検索
  let user = await prisma.user.findUnique({
    where: { email: userInfo.email },
  });

  if (user) {
    // 既存ユーザーを更新
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: userInfo.name || user.name,
        image: userInfo.picture || user.image,
      },
    });

    // Accountを更新/作成
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: config.providerName,
          providerAccountId: userInfo.id,
        },
      },
      create: {
        userId: user.id,
        type: 'oauth',
        provider: config.providerName,
        providerAccountId: userInfo.id,
      },
      update: {},
    });

    return { userId: user.id.toString(), isNew: false };
  }

  if (!config.autoProvision) {
    throw new Error('自動ユーザー作成が無効です');
  }

  // 新規ユーザーを作成
  user = await prisma.user.create({
    data: {
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split('@')[0],
      image: userInfo.picture,
      emailVerified: new Date(),
      status: 'ACTIVE',
    },
  });

  // Accountを作成
  await prisma.account.create({
    data: {
      userId: user.id,
      type: 'oauth',
      provider: config.providerName,
      providerAccountId: userInfo.id,
    },
  });

  // デフォルトロールを割り当て（将来的にプロジェクトメンバー割り当てを実装）
  if (config.defaultRoleId || userInfo.groups) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _roleId = userInfo.groups
      ? await getLocalRoleIdFromSsoGroups(configId, userInfo.groups)
      : config.defaultRoleId;
    // TODO: プロジェクトメンバーとしてロールを割り当てる処理を実装
  }

  return { userId: user.id.toString(), isNew: true };
}

// ====================================
// OAuth2/OIDC Token Exchange
// ====================================

/**
 * 認可コードをトークンに交換
 */
export async function exchangeCodeForToken(
  configId: string,
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}> {
  const config = await getSsoConfiguration(configId);
  if (!config || !config.tokenUrl || !config.clientId || !config.clientSecret) {
    throw new Error('SSO設定が不完全です');
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    expiresIn: data.expires_in,
  };
}

/**
 * ユーザー情報を取得
 */
export async function fetchUserInfo(configId: string, accessToken: string): Promise<SsoUserInfo> {
  const config = await getSsoConfiguration(configId);
  if (!config || !config.userInfoUrl) {
    throw new Error('SSO設定が不完全です');
  }

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`UserInfo fetch failed: ${error}`);
  }

  const data = await response.json();

  // プロバイダー固有のフィールドマッピング
  let userInfo: SsoUserInfo;

  switch (config.providerName) {
    case 'GITHUB':
      userInfo = {
        id: data.id.toString(),
        email: data.email,
        name: data.name || data.login,
        picture: data.avatar_url,
        groups: [],
      };
      // GitHubの場合、emailが別APIで取得が必要な場合がある
      if (!userInfo.email) {
        const emailResponse = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (emailResponse.ok) {
          const emails = await emailResponse.json();
          const primaryEmail = emails.find((e: { primary: boolean; email: string }) => e.primary);
          if (primaryEmail) {
            userInfo.email = primaryEmail.email;
          }
        }
      }
      break;

    case 'GOOGLE':
    case 'MICROSOFT':
    default:
      userInfo = {
        id: data.sub || data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        groups: data.groups || [],
      };
      break;
  }

  return userInfo;
}
