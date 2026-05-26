import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption';
import { AiSettings, AiSettingsUpdate } from '@/types/ai-settings';
import { ClaudeModel } from '@/types/claude';

export class AiSettingsRepository {
  /**
   * プロジェクトのAI設定を取得（なければ作成）
   */
  async getOrCreateSettings(projectId: bigint | null): Promise<AiSettings> {
    let settings = await prisma.aiSettings.findFirst({
      where: projectId ? { projectId } : { projectId: null },
    });

    if (!settings) {
      settings = await prisma.aiSettings.create({
        data: {
          projectId,
          isEnabled: false,
          model: 'claude-sonnet-4-20250514',
          maxTokens: 4096,
          temperature: 0.7,
        },
      });
    }

    return this.toAiSettings(settings);
  }

  /**
   * AI設定を更新
   */
  async updateSettings(projectId: bigint | null, update: AiSettingsUpdate): Promise<AiSettings> {
    const settings = await this.getOrCreateSettings(projectId);

    const updateData: Record<string, unknown> = {};

    if (update.isEnabled !== undefined) {
      updateData.isEnabled = update.isEnabled;
    }

    if (update.apiKey !== undefined) {
      if (update.apiKey) {
        updateData.apiKeyEncrypted = encrypt(update.apiKey);
      } else {
        updateData.apiKeyEncrypted = null;
      }
    }

    if (update.model !== undefined) {
      updateData.model = update.model;
    }

    if (update.maxTokens !== undefined) {
      updateData.maxTokens = update.maxTokens;
    }

    if (update.temperature !== undefined) {
      updateData.temperature = update.temperature;
    }

    const updated = await prisma.aiSettings.update({
      where: { id: settings.id },
      data: updateData,
    });

    return this.toAiSettings(updated);
  }

  /**
   * APIキーを取得（復号化）
   */
  async getDecryptedApiKey(projectId: bigint | null): Promise<string | null> {
    const settings = await prisma.aiSettings.findFirst({
      where: projectId ? { projectId } : { projectId: null },
    });

    if (!settings?.apiKeyEncrypted) {
      return null;
    }

    try {
      return decrypt(settings.apiKeyEncrypted);
    } catch {
      return null;
    }
  }

  /**
   * 使用量を記録
   */
  async recordUsage(projectId: bigint | null, tokens: number): Promise<void> {
    const settings = await this.getOrCreateSettings(projectId);

    await prisma.aiSettings.update({
      where: { id: settings.id },
      data: {
        usageToday: { increment: tokens },
        usageMonth: { increment: tokens },
        usageTotal: { increment: tokens },
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * 接続テスト日時を更新
   */
  async updateLastTestedAt(projectId: bigint | null): Promise<void> {
    const settings = await this.getOrCreateSettings(projectId);

    await prisma.aiSettings.update({
      where: { id: settings.id },
      data: {
        lastTestedAt: new Date(),
      },
    });
  }

  /**
   * 日次使用量をリセット
   */
  async resetDailyUsage(): Promise<void> {
    await prisma.aiSettings.updateMany({
      data: {
        usageToday: 0,
      },
    });
  }

  /**
   * 月次使用量をリセット
   */
  async resetMonthlyUsage(): Promise<void> {
    await prisma.aiSettings.updateMany({
      data: {
        usageMonth: 0,
      },
    });
  }

  private toAiSettings(settings: {
    id: bigint;
    projectId: bigint | null;
    isEnabled: boolean;
    apiKeyEncrypted: string | null;
    model: string;
    maxTokens: number;
    temperature: number;
    usageToday: number;
    usageMonth: number;
    usageTotal: number;
    lastUsedAt: Date | null;
    lastTestedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AiSettings {
    let decryptedApiKey: string | null = null;
    if (settings.apiKeyEncrypted) {
      try {
        decryptedApiKey = decrypt(settings.apiKeyEncrypted);
      } catch {
        // Decryption failed, treat as no key
      }
    }

    return {
      id: settings.id,
      projectId: settings.projectId,
      isEnabled: settings.isEnabled,
      hasApiKey: !!settings.apiKeyEncrypted,
      maskedApiKey: decryptedApiKey ? maskApiKey(decryptedApiKey) : null,
      model: settings.model as ClaudeModel,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      usageToday: settings.usageToday,
      usageMonth: settings.usageMonth,
      usageTotal: settings.usageTotal,
      lastUsedAt: settings.lastUsedAt,
      lastTestedAt: settings.lastTestedAt,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}

export const aiSettingsRepository = new AiSettingsRepository();
