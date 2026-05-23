import { prisma } from '@/lib/prisma';
import type { SessionSettings, UpdateSessionSettingsData } from '@/types/session-settings';
import { DEFAULT_SESSION_SETTINGS } from '@/types/session-settings';

// セッション設定を取得（存在しない場合は作成）
export async function getSessionSettings(): Promise<SessionSettings> {
  let settings = await prisma.sessionSettings.findFirst({
    orderBy: { id: 'asc' },
  });

  if (!settings) {
    settings = await prisma.sessionSettings.create({
      data: DEFAULT_SESSION_SETTINGS,
    });
  }

  return serializeSessionSettings(settings);
}

// セッション設定を更新
export async function updateSessionSettings(
  data: UpdateSessionSettingsData
): Promise<SessionSettings> {
  const existing = await prisma.sessionSettings.findFirst({
    orderBy: { id: 'asc' },
  });

  let settings;
  if (existing) {
    settings = await prisma.sessionSettings.update({
      where: { id: existing.id },
      data,
    });
  } else {
    settings = await prisma.sessionSettings.create({
      data: {
        ...DEFAULT_SESSION_SETTINGS,
        ...data,
      },
    });
  }

  return serializeSessionSettings(settings);
}

// セッション設定データをシリアライズ
function serializeSessionSettings(settings: {
  id: bigint;
  sessionTimeoutMinutes: number;
  warningBeforeMinutes: number;
  extendOnActivity: boolean;
  maxConcurrentSessions: number;
  createdAt: Date;
  updatedAt: Date;
}): SessionSettings {
  return {
    id: settings.id.toString(),
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    warningBeforeMinutes: settings.warningBeforeMinutes,
    extendOnActivity: settings.extendOnActivity,
    maxConcurrentSessions: settings.maxConcurrentSessions,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}
