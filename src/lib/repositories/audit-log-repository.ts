import { prisma } from '@/lib/prisma';
import type {
  AuditLog,
  AuditLogSearchParams,
  AuditLogListResponse,
  CreateAuditLogInput,
  AuditAction,
  AuditTargetType,
} from '@/types/audit-log';

// 監査ログを作成
export async function createAuditLog(data: CreateAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: data.userId ?? null,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId ?? null,
      details: data.details ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    },
  });
}

// 監査ログをIDで取得
export async function getAuditLogById(id: bigint): Promise<AuditLog | null> {
  const auditLog = await prisma.auditLog.findUnique({
    where: { id },
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

  if (!auditLog) {
    return null;
  }

  return serializeAuditLog(auditLog);
}

// 監査ログ一覧を取得
export async function getAuditLogs(
  params: AuditLogSearchParams = {}
): Promise<AuditLogListResponse> {
  const {
    userId,
    action,
    targetType,
    targetId,
    startDate,
    endDate,
    query,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const skip = (page - 1) * limit;

  // 検索条件を構築
  type WhereCondition = {
    userId?: bigint;
    action?: AuditAction;
    targetType?: AuditTargetType;
    targetId?: bigint;
    createdAt?: {
      gte?: Date;
      lte?: Date;
    };
    OR?: Array<
      | { action: { contains: string; mode: 'insensitive' } }
      | { targetType: { contains: string; mode: 'insensitive' } }
      | { user: { name: { contains: string; mode: 'insensitive' } } }
      | { user: { email: { contains: string; mode: 'insensitive' } } }
    >;
  };

  const where: WhereCondition = {};

  if (userId) {
    where.userId = BigInt(userId);
  }

  if (action) {
    where.action = action;
  }

  if (targetType) {
    where.targetType = targetType;
  }

  if (targetId) {
    where.targetId = BigInt(targetId);
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      // 終了日は23:59:59までを含む
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (query?.trim()) {
    where.OR = [
      { action: { contains: query, mode: 'insensitive' } },
      { targetType: { contains: query, mode: 'insensitive' } },
      { user: { name: { contains: query, mode: 'insensitive' } } },
      { user: { email: { contains: query, mode: 'insensitive' } } },
    ];
  }

  // 監査ログ数をカウント
  const total = await prisma.auditLog.count({ where });

  // 監査ログ一覧を取得
  const auditLogs = await prisma.auditLog.findMany({
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
    auditLogs: auditLogs.map(serializeAuditLog),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// 監査ログをCSV形式でエクスポート用に取得（ページネーションなし）
export async function getAuditLogsForExport(
  params: Omit<AuditLogSearchParams, 'page' | 'limit'>
): Promise<AuditLog[]> {
  const {
    userId,
    action,
    targetType,
    targetId,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  type WhereCondition = {
    userId?: bigint;
    action?: AuditAction;
    targetType?: AuditTargetType;
    targetId?: bigint;
    createdAt?: {
      gte?: Date;
      lte?: Date;
    };
  };

  const where: WhereCondition = {};

  if (userId) {
    where.userId = BigInt(userId);
  }

  if (action) {
    where.action = action;
  }

  if (targetType) {
    where.targetType = targetType;
  }

  if (targetId) {
    where.targetId = BigInt(targetId);
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const auditLogs = await prisma.auditLog.findMany({
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
    orderBy: { [sortBy]: sortOrder },
    take: 10000, // エクスポート最大件数を制限
  });

  return auditLogs.map(serializeAuditLog);
}

// 監査ログデータをシリアライズ（BigIntを文字列に変換）
function serializeAuditLog(auditLog: {
  id: bigint;
  userId: bigint | null;
  action: string;
  targetType: string;
  targetId: bigint | null;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    id: bigint;
    name: string;
    email: string;
  } | null;
}): AuditLog {
  return {
    id: auditLog.id.toString(),
    userId: auditLog.userId?.toString() ?? null,
    userName: auditLog.user?.name ?? null,
    userEmail: auditLog.user?.email ?? null,
    action: auditLog.action as AuditAction,
    targetType: auditLog.targetType as AuditTargetType,
    targetId: auditLog.targetId?.toString() ?? null,
    details: auditLog.details as Record<string, unknown> | null,
    ipAddress: auditLog.ipAddress,
    userAgent: auditLog.userAgent,
    createdAt: auditLog.createdAt.toISOString(),
  };
}
