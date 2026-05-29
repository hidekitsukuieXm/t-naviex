import crypto from 'crypto';
import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type { ApiTokenScope } from '@/types/api-token';

// トークン生成設定
const TOKEN_BYTES = 32; // 256ビットのトークン
const TOKEN_PREFIX_LENGTH = 8; // トークン先頭8文字を識別用に保存
const HASH_ALGORITHM = 'sha256';

// 型定義
export interface CreateApiTokenInput {
  userId: bigint;
  name: string;
  scopes: ApiTokenScope[];
  expiresAt?: Date | null;
  ipWhitelists?: string[];
}

export interface UpdateApiTokenInput {
  name?: string;
  scopes?: ApiTokenScope[];
  expiresAt?: Date | null;
  isActive?: boolean;
}

export interface ApiTokenSearchParams {
  userId?: bigint;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'lastUsedAt' | 'expiresAt';
  sortOrder?: 'asc' | 'desc';
}

export interface UsageLogSearchParams {
  tokenId: bigint;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * 安全なランダムトークンを生成
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * トークンをハッシュ化
 */
export function hashToken(token: string): string {
  return crypto.createHash(HASH_ALGORITHM).update(token).digest('hex');
}

/**
 * トークンを検証（プレーンテキストとハッシュを比較）
 */
export function verifyToken(plainToken: string, hashedToken: string): boolean {
  const hash = hashToken(plainToken);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedToken));
}

/**
 * トークンの先頭部分を取得
 */
export function getTokenPrefix(token: string): string {
  return token.substring(0, TOKEN_PREFIX_LENGTH);
}

/**
 * APIトークンを作成
 */
export async function createApiToken(
  input: CreateApiTokenInput
): Promise<{ token: ReturnType<typeof serializeApiToken>; plainToken: string }> {
  const plainToken = generateSecureToken();
  const tokenHash = hashToken(plainToken);
  const tokenPrefix = getTokenPrefix(plainToken);

  const apiToken = await prisma.$transaction(async (tx) => {
    // トークンを作成
    const token = await tx.apiToken.create({
      data: {
        userId: input.userId,
        name: input.name,
        tokenHash,
        tokenPrefix,
        scopes: input.scopes,
        expiresAt: input.expiresAt ?? null,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // IPホワイトリストがあれば作成
    if (input.ipWhitelists && input.ipWhitelists.length > 0) {
      await tx.apiTokenIpWhitelist.createMany({
        data: input.ipWhitelists.map((ip) => ({
          tokenId: token.id,
          ipAddress: ip,
        })),
      });
    }

    return token;
  });

  return {
    token: serializeApiToken(apiToken),
    plainToken,
  };
}

/**
 * トークンをIDで取得
 */
export async function getApiTokenById(id: bigint) {
  const token = await prisma.apiToken.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      ipWhitelists: true,
    },
  });

  if (!token) {
    return null;
  }

  return serializeApiTokenWithWhitelists(token);
}

/**
 * トークンをハッシュで取得（認証用）
 */
export async function getApiTokenByHash(tokenHash: string) {
  const token = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      },
      ipWhitelists: true,
    },
  });

  if (!token) {
    return null;
  }

  return token;
}

/**
 * プレーンテキストトークンで認証
 */
export async function authenticateByToken(plainToken: string) {
  const tokenHash = hashToken(plainToken);
  const token = await getApiTokenByHash(tokenHash);

  if (!token) {
    return { valid: false, error: 'トークンが見つかりません' };
  }

  if (!token.isActive) {
    return { valid: false, error: 'トークンが無効化されています' };
  }

  if (token.revokedAt) {
    return { valid: false, error: 'トークンは失効しています' };
  }

  if (token.expiresAt && token.expiresAt <= new Date()) {
    return { valid: false, error: 'トークンの有効期限が切れています' };
  }

  if (token.user.status !== 'ACTIVE') {
    return { valid: false, error: 'ユーザーアカウントが無効です' };
  }

  return { valid: true, token };
}

/**
 * トークン一覧を取得
 */
export async function getApiTokens(params: ApiTokenSearchParams = {}) {
  const {
    userId,
    isActive,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const skip = (page - 1) * limit;

  const where: {
    userId?: bigint;
    isActive?: boolean;
  } = {};

  if (userId !== undefined) {
    where.userId = userId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const total = await prisma.apiToken.count({ where });

  const tokens = await prisma.apiToken.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  return {
    tokens: tokens.map(serializeApiToken),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * トークンを更新
 */
export async function updateApiToken(id: bigint, input: UpdateApiTokenInput) {
  const token = await prisma.apiToken.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.scopes !== undefined && { scopes: input.scopes }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return serializeApiToken(token);
}

/**
 * トークンを失効
 */
export async function revokeApiToken(id: bigint, reason?: string) {
  const token = await prisma.apiToken.update({
    where: { id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason ?? null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return serializeApiToken(token);
}

/**
 * トークンを削除
 */
export async function deleteApiToken(id: bigint): Promise<void> {
  await prisma.apiToken.delete({
    where: { id },
  });
}

/**
 * トークンの最終使用を更新
 */
export async function updateTokenLastUsed(id: bigint, ipAddress?: string) {
  await prisma.apiToken.update({
    where: { id },
    data: {
      lastUsedAt: new Date(),
      lastUsedIp: ipAddress ?? null,
    },
  });
}

/**
 * 使用ログを記録
 */
export async function logTokenUsage(data: {
  tokenId: bigint;
  method: string;
  endpoint: string;
  statusCode: number;
  ipAddress?: string;
  userAgent?: string;
  requestBody?: object;
  responseTime?: number;
  errorMessage?: string;
}) {
  await prisma.apiTokenUsageLog.create({
    data: {
      tokenId: data.tokenId,
      method: data.method,
      endpoint: data.endpoint,
      statusCode: data.statusCode,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      requestBody: data.requestBody ? (data.requestBody as Prisma.InputJsonValue) : Prisma.DbNull,
      responseTime: data.responseTime ?? null,
      errorMessage: data.errorMessage ?? null,
    },
  });
}

/**
 * 使用ログを取得
 */
export async function getTokenUsageLogs(params: UsageLogSearchParams) {
  const {
    tokenId,
    method,
    endpoint,
    statusCode,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = params;

  const skip = (page - 1) * limit;

  const where: {
    tokenId: bigint;
    method?: string;
    endpoint?: { contains: string };
    statusCode?: number;
    createdAt?: { gte?: Date; lte?: Date };
  } = {
    tokenId,
  };

  if (method) {
    where.method = method;
  }

  if (endpoint) {
    where.endpoint = { contains: endpoint };
  }

  if (statusCode !== undefined) {
    where.statusCode = statusCode;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const total = await prisma.apiTokenUsageLog.count({ where });

  const logs = await prisma.apiTokenUsageLog.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return {
    logs: logs.map(serializeUsageLog),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 使用統計を取得
 */
export async function getTokenUsageStats(tokenId: bigint, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.apiTokenUsageLog.findMany({
    where: {
      tokenId,
      createdAt: { gte: startDate },
    },
  });

  const totalRequests = logs.length;
  const successfulRequests = logs.filter((l) => l.statusCode >= 200 && l.statusCode < 400).length;
  const failedRequests = logs.filter((l) => l.statusCode >= 400).length;

  const responseTimes = logs
    .filter((l) => l.responseTime !== null)
    .map((l) => l.responseTime as number);
  const averageResponseTime =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  // エンドポイント別集計
  const endpointCounts = new Map<string, number>();
  logs.forEach((l) => {
    const count = endpointCounts.get(l.endpoint) || 0;
    endpointCounts.set(l.endpoint, count + 1);
  });
  const requestsByEndpoint = Array.from(endpointCounts.entries())
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // メソッド別集計
  const methodCounts = new Map<string, number>();
  logs.forEach((l) => {
    const count = methodCounts.get(l.method) || 0;
    methodCounts.set(l.method, count + 1);
  });
  const requestsByMethod = Array.from(methodCounts.entries())
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);

  // 日別集計
  const dayCounts = new Map<string, number>();
  logs.forEach((l) => {
    const date = l.createdAt.toISOString().split('T')[0];
    const count = dayCounts.get(date) || 0;
    dayCounts.set(date, count + 1);
  });
  const requestsByDay = Array.from(dayCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    tokenId: tokenId.toString(),
    totalRequests,
    successfulRequests,
    failedRequests,
    averageResponseTime,
    requestsByEndpoint,
    requestsByMethod,
    requestsByDay,
  };
}

/**
 * IPホワイトリストを追加
 */
export async function addIpWhitelist(tokenId: bigint, ipAddress: string, description?: string) {
  const whitelist = await prisma.apiTokenIpWhitelist.create({
    data: {
      tokenId,
      ipAddress,
      description: description ?? null,
    },
  });

  return serializeIpWhitelist(whitelist);
}

/**
 * IPホワイトリストを削除
 */
export async function removeIpWhitelist(id: bigint): Promise<void> {
  await prisma.apiTokenIpWhitelist.delete({
    where: { id },
  });
}

/**
 * トークンのIPホワイトリストを取得
 */
export async function getTokenIpWhitelists(tokenId: bigint) {
  const whitelists = await prisma.apiTokenIpWhitelist.findMany({
    where: { tokenId },
    orderBy: { createdAt: 'asc' },
  });

  return whitelists.map(serializeIpWhitelist);
}

/**
 * IPアドレスがホワイトリストに含まれるかチェック
 */
export async function isIpWhitelisted(tokenId: bigint, ipAddress: string): Promise<boolean> {
  const whitelists = await prisma.apiTokenIpWhitelist.findMany({
    where: { tokenId },
  });

  // ホワイトリストが空の場合は全てのIPを許可
  if (whitelists.length === 0) {
    return true;
  }

  return whitelists.some((w) => {
    // 完全一致チェック
    if (w.ipAddress === ipAddress) {
      return true;
    }

    // CIDR範囲チェック（簡易実装）
    if (w.ipAddress.includes('/')) {
      return isIpInCidr(ipAddress, w.ipAddress);
    }

    return false;
  });
}

/**
 * IPアドレスがCIDR範囲内かチェック（IPv4のみ）
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);

  const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const rangeNum =
    (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * レート制限をチェック・更新
 */
export async function checkAndUpdateRateLimit(
  tokenId: bigint,
  maxRequests: number = 1000,
  windowMinutes: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (windowMinutes * 60 * 1000)) * windowMinutes * 60 * 1000
  );
  const resetAt = new Date(windowStart.getTime() + windowMinutes * 60 * 1000);

  // 既存のレート制限レコードを取得または作成
  const rateLimit = await prisma.apiRateLimit.upsert({
    where: {
      tokenId_windowStart: {
        tokenId,
        windowStart,
      },
    },
    create: {
      tokenId,
      windowStart,
      requestCount: 1,
      maxRequests,
      windowMinutes,
    },
    update: {
      requestCount: {
        increment: 1,
      },
    },
  });

  const allowed = rateLimit.requestCount <= maxRequests;
  const remaining = Math.max(0, maxRequests - rateLimit.requestCount);

  return { allowed, remaining, resetAt };
}

/**
 * 期限切れトークンをクリーンアップ
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.apiToken.updateMany({
    where: {
      isActive: true,
      expiresAt: { lte: new Date() },
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: '有効期限切れ',
    },
  });

  return result.count;
}

/**
 * 古い使用ログをクリーンアップ
 */
export async function cleanupOldUsageLogs(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.apiTokenUsageLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

// シリアライズ関数

function serializeApiToken(token: {
  id: bigint;
  userId: bigint;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  isActive: boolean;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: bigint; name: string; email: string };
}) {
  return {
    id: token.id.toString(),
    userId: token.userId.toString(),
    name: token.name,
    tokenPrefix: token.tokenPrefix,
    scopes: token.scopes as ApiTokenScope[],
    expiresAt: token.expiresAt?.toISOString() ?? null,
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    lastUsedIp: token.lastUsedIp,
    isActive: token.isActive,
    revokedAt: token.revokedAt?.toISOString() ?? null,
    revokedReason: token.revokedReason,
    createdAt: token.createdAt.toISOString(),
    updatedAt: token.updatedAt.toISOString(),
    ...(token.user && {
      user: {
        id: token.user.id.toString(),
        name: token.user.name,
        email: token.user.email,
      },
    }),
  };
}

function serializeApiTokenWithWhitelists(token: {
  id: bigint;
  userId: bigint;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  isActive: boolean;
  revokedAt: Date | null;
  revokedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: bigint; name: string; email: string };
  ipWhitelists?: {
    id: bigint;
    tokenId: bigint;
    ipAddress: string;
    description: string | null;
    createdAt: Date;
  }[];
}) {
  return {
    ...serializeApiToken(token),
    ipWhitelists: token.ipWhitelists?.map(serializeIpWhitelist) ?? [],
  };
}

function serializeUsageLog(log: {
  id: bigint;
  tokenId: bigint;
  method: string;
  endpoint: string;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;
  responseTime: number | null;
  errorMessage: string | null;
  createdAt: Date;
}) {
  return {
    id: log.id.toString(),
    tokenId: log.tokenId.toString(),
    method: log.method,
    endpoint: log.endpoint,
    statusCode: log.statusCode,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    responseTime: log.responseTime,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt.toISOString(),
  };
}

function serializeIpWhitelist(whitelist: {
  id: bigint;
  tokenId: bigint;
  ipAddress: string;
  description: string | null;
  createdAt: Date;
}) {
  return {
    id: whitelist.id.toString(),
    tokenId: whitelist.tokenId.toString(),
    ipAddress: whitelist.ipAddress,
    description: whitelist.description,
    createdAt: whitelist.createdAt.toISOString(),
  };
}
