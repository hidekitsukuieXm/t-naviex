/**
 * SMTP設定リポジトリ
 */

import { prisma } from '@/lib/prisma';
import type { SmtpSettings, UpdateSmtpSettingsInput } from '@/types/smtp-settings';
import { DEFAULT_SMTP_SETTINGS, maskPassword } from '@/types/smtp-settings';
import { encrypt, decrypt } from '@/lib/encryption';

/**
 * SMTP設定を取得（存在しない場合は作成）
 */
export async function getSmtpSettings(): Promise<SmtpSettings> {
  let settings = await prisma.smtpSettings.findFirst({
    orderBy: { id: 'asc' },
  });

  if (!settings) {
    settings = await prisma.smtpSettings.create({
      data: {
        host: DEFAULT_SMTP_SETTINGS.host,
        port: DEFAULT_SMTP_SETTINGS.port,
        secure: DEFAULT_SMTP_SETTINGS.secure,
        authEnabled: DEFAULT_SMTP_SETTINGS.authEnabled,
        fromEmail: DEFAULT_SMTP_SETTINGS.fromEmail,
        isEnabled: DEFAULT_SMTP_SETTINGS.isEnabled,
      },
    });
  }

  return serializeSmtpSettings(settings);
}

/**
 * SMTP設定を取得（パスワード復号化あり）
 */
export async function getSmtpSettingsWithPassword(): Promise<
  SmtpSettings & { decryptedPassword?: string }
> {
  const settings = await getSmtpSettings();

  // パスワードを復号化
  let decryptedPassword: string | undefined;
  const rawSettings = await prisma.smtpSettings.findFirst({
    orderBy: { id: 'asc' },
  });

  if (rawSettings?.password) {
    try {
      decryptedPassword = decrypt(rawSettings.password);
    } catch {
      // 復号化に失敗した場合は無視
    }
  }

  return {
    ...settings,
    decryptedPassword,
  };
}

/**
 * SMTP設定を更新
 */
export async function updateSmtpSettings(data: UpdateSmtpSettingsInput): Promise<SmtpSettings> {
  const existing = await prisma.smtpSettings.findFirst({
    orderBy: { id: 'asc' },
  });

  // パスワードを暗号化
  let encryptedPassword: string | undefined | null;
  if (data.password !== undefined) {
    if (data.password === null || data.password === '') {
      encryptedPassword = null;
    } else {
      encryptedPassword = encrypt(data.password);
    }
  }

  const updateData: Parameters<typeof prisma.smtpSettings.update>[0]['data'] = {
    ...(data.host !== undefined && { host: data.host }),
    ...(data.port !== undefined && { port: data.port }),
    ...(data.secure !== undefined && { secure: data.secure }),
    ...(data.authEnabled !== undefined && { authEnabled: data.authEnabled }),
    ...(data.username !== undefined && { username: data.username }),
    ...(encryptedPassword !== undefined && { password: encryptedPassword }),
    ...(data.fromEmail !== undefined && { fromEmail: data.fromEmail }),
    ...(data.fromName !== undefined && { fromName: data.fromName }),
    ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
  };

  let settings;
  if (existing) {
    settings = await prisma.smtpSettings.update({
      where: { id: existing.id },
      data: updateData,
    });
  } else {
    settings = await prisma.smtpSettings.create({
      data: {
        host: data.host ?? DEFAULT_SMTP_SETTINGS.host,
        port: data.port ?? DEFAULT_SMTP_SETTINGS.port,
        secure: data.secure ?? DEFAULT_SMTP_SETTINGS.secure,
        authEnabled: data.authEnabled ?? DEFAULT_SMTP_SETTINGS.authEnabled,
        username: data.username,
        password: encryptedPassword ?? null,
        fromEmail: data.fromEmail ?? DEFAULT_SMTP_SETTINGS.fromEmail,
        fromName: data.fromName,
        isEnabled: data.isEnabled ?? DEFAULT_SMTP_SETTINGS.isEnabled,
      },
    });
  }

  return serializeSmtpSettings(settings);
}

/**
 * SMTP接続テスト結果を記録
 */
export async function recordSmtpTestResult(success: boolean): Promise<void> {
  const existing = await prisma.smtpSettings.findFirst({
    orderBy: { id: 'asc' },
  });

  if (existing) {
    await prisma.smtpSettings.update({
      where: { id: existing.id },
      data: {
        lastTestedAt: new Date(),
        lastTestSuccess: success,
      },
    });
  }
}

/**
 * SMTP設定データをシリアライズ
 */
function serializeSmtpSettings(settings: {
  id: bigint;
  host: string;
  port: number;
  secure: boolean;
  authEnabled: boolean;
  username: string | null;
  password: string | null;
  fromEmail: string;
  fromName: string | null;
  isEnabled: boolean;
  lastTestedAt: Date | null;
  lastTestSuccess: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}): SmtpSettings {
  return {
    id: settings.id.toString(),
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    authEnabled: settings.authEnabled,
    username: settings.username,
    password: maskPassword(settings.password), // パスワードはマスク表示
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    isEnabled: settings.isEnabled,
    lastTestedAt: settings.lastTestedAt?.toISOString() ?? null,
    lastTestSuccess: settings.lastTestSuccess,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}
