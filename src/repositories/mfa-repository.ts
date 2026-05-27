/**
 * MFA Repository
 *
 * 多要素認証のリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  MfaSetting,
  MfaBackupCode,
  MfaAuthLog,
  MfaType,
  MfaStatusResponse,
} from '@/types/mfa';
import { DEFAULT_BACKUP_CODE_COUNT } from '@/types/mfa';
import crypto from 'crypto';

// ====================================
// Type Converters
// ====================================

function convertToMfaSetting(dbSetting: {
  id: bigint;
  userId: bigint;
  mfaType: string;
  secret: string;
  isEnabled: boolean;
  isVerified: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): MfaSetting {
  return {
    id: dbSetting.id.toString(),
    userId: dbSetting.userId.toString(),
    mfaType: dbSetting.mfaType as MfaType,
    isEnabled: dbSetting.isEnabled,
    isVerified: dbSetting.isVerified,
    lastUsedAt: dbSetting.lastUsedAt || undefined,
    createdAt: dbSetting.createdAt,
    updatedAt: dbSetting.updatedAt,
  };
}

function convertToMfaBackupCode(dbCode: {
  id: bigint;
  mfaSettingId: bigint;
  codeHash: string;
  isUsed: boolean;
  usedAt: Date | null;
  createdAt: Date;
}): MfaBackupCode {
  return {
    id: dbCode.id.toString(),
    mfaSettingId: dbCode.mfaSettingId.toString(),
    isUsed: dbCode.isUsed,
    usedAt: dbCode.usedAt || undefined,
    createdAt: dbCode.createdAt,
  };
}

function convertToMfaAuthLog(dbLog: {
  id: bigint;
  userId: bigint;
  mfaType: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}): MfaAuthLog {
  return {
    id: dbLog.id.toString(),
    userId: dbLog.userId.toString(),
    mfaType: dbLog.mfaType as MfaType,
    success: dbLog.success,
    ipAddress: dbLog.ipAddress || undefined,
    userAgent: dbLog.userAgent || undefined,
    createdAt: dbLog.createdAt,
  };
}

// ====================================
// Utility Functions
// ====================================

/**
 * ランダムなTOTPシークレットを生成
 */
export function generateTotpSecret(): string {
  // Base32エンコード用の文字セット
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const secretLength = 32;
  let secret = '';

  const bytes = crypto.randomBytes(secretLength);
  for (let i = 0; i < secretLength; i++) {
    secret += base32Chars[bytes[i] % 32];
  }

  return secret;
}

/**
 * バックアップコードを生成
 */
export function generateBackupCodes(count: number = DEFAULT_BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(8);
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[bytes[j] % 36];
    }
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }

  return codes;
}

/**
 * バックアップコードをハッシュ化
 */
function hashBackupCode(code: string): string {
  const normalized = code.replace(/-/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// ====================================
// MFA Settings Operations
// ====================================

/**
 * MFA設定を取得
 */
export async function getMfaSetting(userId: string): Promise<MfaSetting | null> {
  const setting = await prisma.mfaSetting.findUnique({
    where: { userId: BigInt(userId) },
  });

  if (!setting) {
    return null;
  }

  return convertToMfaSetting(setting);
}

/**
 * MFA設定のステータスを取得
 */
export async function getMfaStatus(userId: string): Promise<MfaStatusResponse> {
  const setting = await prisma.mfaSetting.findUnique({
    where: { userId: BigInt(userId) },
    include: {
      backupCodes: {
        where: { isUsed: false },
      },
    },
  });

  if (!setting || !setting.isEnabled) {
    return { isEnabled: false };
  }

  return {
    isEnabled: true,
    mfaType: setting.mfaType as MfaType,
    backupCodesRemaining: setting.backupCodes.length,
    lastUsedAt: setting.lastUsedAt || undefined,
  };
}

/**
 * MFA設定を開始（シークレット生成）
 */
export async function initializeMfaSetup(
  userId: string,
  mfaType: MfaType = 'TOTP' as MfaType
): Promise<{ secret: string; backupCodes: string[] }> {
  const secret = generateTotpSecret();
  const backupCodes = generateBackupCodes();

  // 既存の設定を削除（未検証の場合）
  await prisma.mfaSetting.deleteMany({
    where: {
      userId: BigInt(userId),
      isVerified: false,
    },
  });

  // 新しい設定を作成
  const setting = await prisma.mfaSetting.create({
    data: {
      userId: BigInt(userId),
      mfaType,
      secret: secret, // 本番環境では暗号化が必要
      isEnabled: false,
      isVerified: false,
    },
  });

  // バックアップコードを保存
  await prisma.mfaBackupCode.createMany({
    data: backupCodes.map((code) => ({
      mfaSettingId: setting.id,
      codeHash: hashBackupCode(code),
      isUsed: false,
    })),
  });

  return { secret, backupCodes };
}

/**
 * MFAを有効化（検証済みに設定）
 */
export async function enableMfa(userId: string): Promise<MfaSetting | null> {
  const setting = await prisma.mfaSetting.findUnique({
    where: { userId: BigInt(userId) },
  });

  if (!setting) {
    return null;
  }

  const updated = await prisma.mfaSetting.update({
    where: { id: setting.id },
    data: {
      isEnabled: true,
      isVerified: true,
    },
  });

  return convertToMfaSetting(updated);
}

/**
 * MFAを無効化
 */
export async function disableMfa(userId: string): Promise<boolean> {
  const setting = await prisma.mfaSetting.findUnique({
    where: { userId: BigInt(userId) },
  });

  if (!setting) {
    return false;
  }

  // バックアップコードも削除
  await prisma.mfaBackupCode.deleteMany({
    where: { mfaSettingId: setting.id },
  });

  await prisma.mfaSetting.delete({
    where: { id: setting.id },
  });

  return true;
}

/**
 * MFA最終使用日時を更新
 */
export async function updateMfaLastUsed(userId: string): Promise<void> {
  await prisma.mfaSetting.update({
    where: { userId: BigInt(userId) },
    data: { lastUsedAt: new Date() },
  });
}

// ====================================
// Backup Code Operations
// ====================================

/**
 * バックアップコードを取得
 */
export async function getBackupCodes(userId: string): Promise<MfaBackupCode[]> {
  const setting = await prisma.mfaSetting.findUnique({
    where: { userId: BigInt(userId) },
  });

  if (!setting) {
    return [];
  }

  const codes = await prisma.mfaBackupCode.findMany({
    where: { mfaSettingId: setting.id },
    orderBy: { createdAt: 'asc' },
  });

  return codes.map(convertToMfaBackupCode);
}

/**
 * バックアップコードを検証
 */
export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const setting = await prisma.mfaSetting.findUnique({
    where: { userId: BigInt(userId) },
  });

  if (!setting || !setting.isEnabled) {
    return false;
  }

  const codeHash = hashBackupCode(code);

  const backupCode = await prisma.mfaBackupCode.findFirst({
    where: {
      mfaSettingId: setting.id,
      codeHash,
      isUsed: false,
    },
  });

  if (!backupCode) {
    return false;
  }

  // コードを使用済みに設定
  await prisma.mfaBackupCode.update({
    where: { id: backupCode.id },
    data: {
      isUsed: true,
      usedAt: new Date(),
    },
  });

  // 最終使用日時を更新
  await updateMfaLastUsed(userId);

  return true;
}

/**
 * バックアップコードを再生成
 */
export async function regenerateBackupCodes(userId: string): Promise<string[] | null> {
  const setting = await prisma.mfaSetting.findUnique({
    where: { userId: BigInt(userId) },
  });

  if (!setting || !setting.isEnabled) {
    return null;
  }

  // 既存のコードを削除
  await prisma.mfaBackupCode.deleteMany({
    where: { mfaSettingId: setting.id },
  });

  // 新しいコードを生成
  const backupCodes = generateBackupCodes();

  await prisma.mfaBackupCode.createMany({
    data: backupCodes.map((code) => ({
      mfaSettingId: setting.id,
      codeHash: hashBackupCode(code),
      isUsed: false,
    })),
  });

  return backupCodes;
}

// ====================================
// Auth Log Operations
// ====================================

/**
 * MFA認証ログを記録
 */
export async function logMfaAuth(
  userId: string,
  mfaType: MfaType,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<MfaAuthLog> {
  const log = await prisma.mfaAuthLog.create({
    data: {
      userId: BigInt(userId),
      mfaType,
      success,
      ipAddress,
      userAgent,
    },
  });

  return convertToMfaAuthLog(log);
}

/**
 * MFA認証ログを取得
 */
export async function getMfaAuthLogs(userId: string, limit: number = 20): Promise<MfaAuthLog[]> {
  const logs = await prisma.mfaAuthLog.findMany({
    where: { userId: BigInt(userId) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map(convertToMfaAuthLog);
}

/**
 * 最近の失敗試行回数を取得
 */
export async function getRecentFailedAttempts(
  userId: string,
  minutes: number = 15
): Promise<number> {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const count = await prisma.mfaAuthLog.count({
    where: {
      userId: BigInt(userId),
      success: false,
      createdAt: { gte: since },
    },
  });

  return count;
}

/**
 * ユーザーがMFAロックアウト中かチェック
 */
export async function isMfaLockedOut(
  userId: string,
  maxAttempts: number = 5,
  lockoutMinutes: number = 15
): Promise<boolean> {
  const failedAttempts = await getRecentFailedAttempts(userId, lockoutMinutes);
  return failedAttempts >= maxAttempts;
}

// ====================================
// TOTP Verification (Stub)
// ====================================

/**
 * TOTPコードを検証
 *
 * 注意: 本番環境では、speakeasyやotpauth等のライブラリを使用して
 * 実際のTOTP検証を行う必要があります。
 */
export async function verifyTotpCode(userId: string, code: string): Promise<boolean> {
  const setting = await prisma.mfaSetting.findUnique({
    where: { userId: BigInt(userId) },
  });

  if (!setting || !setting.isEnabled || setting.mfaType !== 'TOTP') {
    return false;
  }

  // TODO: 実際のTOTP検証ロジックを実装
  // const isValid = speakeasy.totp.verify({
  //   secret: setting.secret,
  //   encoding: 'base32',
  //   token: code,
  //   window: TOTP_WINDOW,
  // });

  // 開発用スタブ: 常にtrueを返す（本番環境では絶対に使用しないこと）
  const isValid = code.length === 6 && /^\d+$/.test(code);

  if (isValid) {
    await updateMfaLastUsed(userId);
  }

  return isValid;
}

/**
 * MFA検証（TOTPまたはバックアップコード）
 */
export async function verifyMfa(
  userId: string,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  const setting = await getMfaSetting(userId);

  if (!setting || !setting.isEnabled) {
    return true; // MFA未設定の場合は認証不要
  }

  // ロックアウトチェック
  if (await isMfaLockedOut(userId)) {
    await logMfaAuth(userId, setting.mfaType, false, ipAddress, userAgent);
    return false;
  }

  let success = false;

  // TOTPコードとして検証
  if (code.length === 6 && /^\d+$/.test(code)) {
    success = await verifyTotpCode(userId, code);
  }
  // バックアップコードとして検証
  else if (/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(code)) {
    success = await verifyBackupCode(userId, code);
  }

  // 認証ログを記録
  await logMfaAuth(userId, setting.mfaType, success, ipAddress, userAgent);

  return success;
}
