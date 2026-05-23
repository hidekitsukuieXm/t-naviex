import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { PasswordPolicy, UpdatePasswordPolicyData } from '@/types/password-policy';
import { DEFAULT_PASSWORD_POLICY } from '@/types/password-policy';

// パスワードポリシーを取得（存在しない場合は作成）
export async function getPasswordPolicy(): Promise<PasswordPolicy> {
  let policy = await prisma.passwordPolicy.findFirst({
    orderBy: { id: 'asc' },
  });

  if (!policy) {
    policy = await prisma.passwordPolicy.create({
      data: DEFAULT_PASSWORD_POLICY,
    });
  }

  return serializePasswordPolicy(policy);
}

// パスワードポリシーを更新
export async function updatePasswordPolicy(
  data: UpdatePasswordPolicyData
): Promise<PasswordPolicy> {
  const existing = await prisma.passwordPolicy.findFirst({
    orderBy: { id: 'asc' },
  });

  let policy;
  if (existing) {
    policy = await prisma.passwordPolicy.update({
      where: { id: existing.id },
      data,
    });
  } else {
    policy = await prisma.passwordPolicy.create({
      data: {
        ...DEFAULT_PASSWORD_POLICY,
        ...data,
      },
    });
  }

  return serializePasswordPolicy(policy);
}

// アカウントロック情報を取得
export async function getAccountLockout(userId: bigint) {
  const lockout = await prisma.accountLockout.findUnique({
    where: { userId },
  });

  if (!lockout) {
    return null;
  }

  return serializeAccountLockout(lockout);
}

// ログイン失敗を記録
export async function recordFailedLogin(userId: bigint): Promise<{
  failedAttempts: number;
  isLocked: boolean;
  lockedUntil: string | null;
}> {
  const policy = await getPasswordPolicy();
  const now = new Date();

  let lockout = await prisma.accountLockout.findUnique({
    where: { userId },
  });

  if (!lockout) {
    lockout = await prisma.accountLockout.create({
      data: {
        userId,
        failedAttempts: 1,
        lastFailedAt: now,
      },
    });
  } else {
    const newFailedAttempts = lockout.failedAttempts + 1;
    let lockedUntil: Date | null = null;

    if (newFailedAttempts >= policy.maxLoginAttempts) {
      lockedUntil = new Date(now.getTime() + policy.lockoutDurationMinutes * 60 * 1000);
    }

    lockout = await prisma.accountLockout.update({
      where: { userId },
      data: {
        failedAttempts: newFailedAttempts,
        lastFailedAt: now,
        lockedUntil,
      },
    });
  }

  return {
    failedAttempts: lockout.failedAttempts,
    isLocked: lockout.lockedUntil !== null && lockout.lockedUntil > now,
    lockedUntil: lockout.lockedUntil?.toISOString() || null,
  };
}

// ログイン成功を記録（ロック情報をリセット）
export async function recordSuccessfulLogin(userId: bigint): Promise<void> {
  await prisma.accountLockout.upsert({
    where: { userId },
    create: {
      userId,
      failedAttempts: 0,
    },
    update: {
      failedAttempts: 0,
      lastFailedAt: null,
      lockedUntil: null,
    },
  });
}

// アカウントがロック中かどうかをチェック
export async function isAccountLocked(userId: bigint): Promise<{
  isLocked: boolean;
  lockedUntil: string | null;
  remainingMinutes: number | null;
}> {
  const lockout = await prisma.accountLockout.findUnique({
    where: { userId },
  });

  if (!lockout || !lockout.lockedUntil) {
    return { isLocked: false, lockedUntil: null, remainingMinutes: null };
  }

  const now = new Date();
  if (lockout.lockedUntil > now) {
    const remainingMs = lockout.lockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    return {
      isLocked: true,
      lockedUntil: lockout.lockedUntil.toISOString(),
      remainingMinutes,
    };
  }

  return { isLocked: false, lockedUntil: null, remainingMinutes: null };
}

// アカウントロックを解除
export async function unlockAccount(userId: bigint): Promise<void> {
  await prisma.accountLockout.upsert({
    where: { userId },
    create: {
      userId,
      failedAttempts: 0,
    },
    update: {
      failedAttempts: 0,
      lastFailedAt: null,
      lockedUntil: null,
    },
  });
}

// パスワード履歴を追加
export async function addPasswordHistory(userId: bigint, passwordHash: string): Promise<void> {
  await prisma.passwordHistory.create({
    data: {
      userId,
      passwordHash,
    },
  });
}

// パスワードが履歴にあるかチェック
export async function isPasswordInHistory(
  userId: bigint,
  password: string,
  preventReuseCount: number
): Promise<boolean> {
  if (preventReuseCount <= 0) {
    return false;
  }

  const histories = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: preventReuseCount,
    select: { passwordHash: true },
  });

  for (const history of histories) {
    const isMatch = await bcrypt.compare(password, history.passwordHash);
    if (isMatch) {
      return true;
    }
  }

  return false;
}

// 古いパスワード履歴をクリーンアップ
export async function cleanupPasswordHistory(userId: bigint, keepCount: number): Promise<void> {
  if (keepCount <= 0) {
    await prisma.passwordHistory.deleteMany({
      where: { userId },
    });
    return;
  }

  const histories = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: keepCount,
    select: { id: true },
  });

  if (histories.length > 0) {
    await prisma.passwordHistory.deleteMany({
      where: {
        id: {
          in: histories.map((h) => h.id),
        },
      },
    });
  }
}

// パスワードポリシーデータをシリアライズ
function serializePasswordPolicy(policy: {
  id: bigint;
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
  preventReuse: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}): PasswordPolicy {
  return {
    id: policy.id.toString(),
    minLength: policy.minLength,
    maxLength: policy.maxLength,
    requireUppercase: policy.requireUppercase,
    requireLowercase: policy.requireLowercase,
    requireNumbers: policy.requireNumbers,
    requireSpecialChars: policy.requireSpecialChars,
    expirationDays: policy.expirationDays,
    preventReuse: policy.preventReuse,
    maxLoginAttempts: policy.maxLoginAttempts,
    lockoutDurationMinutes: policy.lockoutDurationMinutes,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

// アカウントロック情報をシリアライズ
function serializeAccountLockout(lockout: {
  id: bigint;
  userId: bigint;
  failedAttempts: number;
  lastFailedAt: Date | null;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: lockout.id.toString(),
    userId: lockout.userId.toString(),
    failedAttempts: lockout.failedAttempts,
    lastFailedAt: lockout.lastFailedAt?.toISOString() || null,
    lockedUntil: lockout.lockedUntil?.toISOString() || null,
    createdAt: lockout.createdAt.toISOString(),
    updatedAt: lockout.updatedAt.toISOString(),
  };
}
