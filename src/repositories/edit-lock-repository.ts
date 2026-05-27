/**
 * Edit Lock Repository
 *
 * 編集ロックのリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  EditLock,
  LockTargetType,
  AcquireLockResponse,
  LockStatusResponse,
} from '@/types/edit-lock';
import { DEFAULT_LOCK_DURATION, MAX_LOCK_DURATION, getLockExpirationTime } from '@/types/edit-lock';

// ====================================
// Type Converters
// ====================================

function convertToEditLock(dbLock: {
  id: bigint;
  targetType: string;
  targetId: bigint;
  userId: bigint;
  userName: string | null;
  lockedAt: Date;
  expiresAt: Date;
  metadata: unknown;
}): EditLock {
  return {
    id: dbLock.id.toString(),
    targetType: dbLock.targetType as LockTargetType,
    targetId: dbLock.targetId.toString(),
    userId: dbLock.userId.toString(),
    userName: dbLock.userName || undefined,
    lockedAt: dbLock.lockedAt,
    expiresAt: dbLock.expiresAt,
    metadata: dbLock.metadata as Record<string, unknown> | undefined,
  };
}

// ====================================
// Lock Operations
// ====================================

/**
 * ロックを取得
 */
export async function acquireLock(
  userId: string,
  userName: string | undefined,
  targetType: LockTargetType,
  targetId: string,
  durationMinutes?: number
): Promise<AcquireLockResponse> {
  const duration = Math.min(durationMinutes || DEFAULT_LOCK_DURATION, MAX_LOCK_DURATION);

  // 既存のロックをチェック
  const existingLock = await prisma.editLock.findUnique({
    where: {
      targetType_targetId: {
        targetType,
        targetId: BigInt(targetId),
      },
    },
  });

  // 既存ロックが有効な場合
  if (existingLock && new Date(existingLock.expiresAt) > new Date()) {
    // 自分のロックの場合は延長
    if (existingLock.userId.toString() === userId) {
      const updatedLock = await prisma.editLock.update({
        where: { id: existingLock.id },
        data: {
          expiresAt: getLockExpirationTime(duration),
        },
      });
      return {
        lock: convertToEditLock(updatedLock),
        acquired: true,
        message: 'ロックを延長しました',
      };
    }

    // 他者のロックの場合は取得失敗
    return {
      lock: convertToEditLock(existingLock),
      acquired: false,
      message: `${existingLock.userName || `ユーザー${existingLock.userId}`}が編集中です`,
    };
  }

  // 期限切れまたは存在しない場合は新規作成/更新
  const lock = await prisma.editLock.upsert({
    where: {
      targetType_targetId: {
        targetType,
        targetId: BigInt(targetId),
      },
    },
    create: {
      targetType,
      targetId: BigInt(targetId),
      userId: BigInt(userId),
      userName,
      expiresAt: getLockExpirationTime(duration),
    },
    update: {
      userId: BigInt(userId),
      userName,
      lockedAt: new Date(),
      expiresAt: getLockExpirationTime(duration),
    },
  });

  return {
    lock: convertToEditLock(lock),
    acquired: true,
    message: 'ロックを取得しました',
  };
}

/**
 * ロックを解放
 */
export async function releaseLock(
  userId: string,
  targetType: LockTargetType,
  targetId: string
): Promise<boolean> {
  const lock = await prisma.editLock.findUnique({
    where: {
      targetType_targetId: {
        targetType,
        targetId: BigInt(targetId),
      },
    },
  });

  if (!lock) {
    return true; // 既にロックがない場合は成功
  }

  // 自分のロックのみ解放可能
  if (lock.userId.toString() !== userId) {
    return false;
  }

  await prisma.editLock.delete({
    where: { id: lock.id },
  });

  return true;
}

/**
 * 強制ロック解除（管理者用）
 */
export async function forceReleaseLock(
  targetType: LockTargetType,
  targetId: string
): Promise<boolean> {
  const result = await prisma.editLock.deleteMany({
    where: {
      targetType,
      targetId: BigInt(targetId),
    },
  });

  return result.count > 0;
}

/**
 * ロック状態を確認
 */
export async function getLockStatus(
  userId: string,
  targetType: LockTargetType,
  targetId: string
): Promise<LockStatusResponse> {
  const lock = await prisma.editLock.findUnique({
    where: {
      targetType_targetId: {
        targetType,
        targetId: BigInt(targetId),
      },
    },
  });

  if (!lock) {
    return { isLocked: false };
  }

  const now = new Date();
  const isValid = new Date(lock.expiresAt) > now;

  if (!isValid) {
    // 期限切れのロックは自動削除
    await prisma.editLock.delete({ where: { id: lock.id } });
    return { isLocked: false };
  }

  const remainingTime = Math.floor((lock.expiresAt.getTime() - now.getTime()) / 1000);

  return {
    isLocked: true,
    lock: convertToEditLock(lock),
    isOwnLock: lock.userId.toString() === userId,
    remainingTime,
  };
}

/**
 * ロックを更新（ハートビート）
 */
export async function refreshLock(
  userId: string,
  targetType: LockTargetType,
  targetId: string,
  durationMinutes?: number
): Promise<EditLock | null> {
  const lock = await prisma.editLock.findUnique({
    where: {
      targetType_targetId: {
        targetType,
        targetId: BigInt(targetId),
      },
    },
  });

  if (!lock || lock.userId.toString() !== userId) {
    return null;
  }

  const duration = Math.min(durationMinutes || DEFAULT_LOCK_DURATION, MAX_LOCK_DURATION);

  const updated = await prisma.editLock.update({
    where: { id: lock.id },
    data: {
      expiresAt: getLockExpirationTime(duration),
    },
  });

  return convertToEditLock(updated);
}

/**
 * ユーザーの全ロックを取得
 */
export async function getUserLocks(userId: string): Promise<EditLock[]> {
  const locks = await prisma.editLock.findMany({
    where: {
      userId: BigInt(userId),
      expiresAt: { gt: new Date() },
    },
    orderBy: { lockedAt: 'desc' },
  });

  return locks.map(convertToEditLock);
}

/**
 * 期限切れロックをクリーンアップ
 */
export async function cleanupExpiredLocks(): Promise<number> {
  const result = await prisma.editLock.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}

/**
 * 特定対象の全ロックを取得（管理用）
 */
export async function getLocksByTarget(
  targetType: LockTargetType,
  targetIds: string[]
): Promise<Map<string, EditLock>> {
  const locks = await prisma.editLock.findMany({
    where: {
      targetType,
      targetId: { in: targetIds.map((id) => BigInt(id)) },
      expiresAt: { gt: new Date() },
    },
  });

  const lockMap = new Map<string, EditLock>();
  for (const lock of locks) {
    lockMap.set(lock.targetId.toString(), convertToEditLock(lock));
  }

  return lockMap;
}
