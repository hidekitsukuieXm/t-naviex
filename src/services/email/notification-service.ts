/**
 * メール通知サービス
 *
 * 各種通知メールの送信を管理
 */

import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { SmtpClient } from './smtp-client';
import { getSmtpSettingsWithPassword } from '@/lib/repositories/smtp-settings-repository';
import { getEmailTemplateByType } from '@/lib/repositories/email-template-repository';
import { substituteVariables, type EmailTemplateType } from '@/types/email-template';
import type {
  NotificationSettingType,
  SendNotificationRequest,
  SendNotificationResponse,
  SendEmailRequest,
  SendEmailResponse,
  BatchSendEmailRequest,
  BatchSendEmailResponse,
  EmailQueueStatus,
} from '@/types/notification';

/**
 * メール送信サービスクラス
 */
export class NotificationService {
  private smtpClient: SmtpClient | null = null;

  /**
   * SMTPクライアントを初期化
   */
  private async initializeSmtpClient(): Promise<SmtpClient | null> {
    if (this.smtpClient) {
      return this.smtpClient;
    }

    const settings = await getSmtpSettingsWithPassword();

    if (!settings.isEnabled || !settings.host || !settings.fromEmail) {
      return null;
    }

    this.smtpClient = SmtpClient.fromSettings(settings, settings.decryptedPassword);
    return this.smtpClient;
  }

  /**
   * ユーザーの通知設定を取得
   */
  async getUserNotificationSettings(
    userId: string,
    notificationType: NotificationSettingType
  ): Promise<{ emailEnabled: boolean; inAppEnabled: boolean }> {
    const settings = await prisma.userNotificationSettings.findUnique({
      where: {
        userId_notificationType: {
          userId: BigInt(userId),
          notificationType,
        },
      },
    });

    // デフォルト設定
    if (!settings) {
      return { emailEnabled: true, inAppEnabled: true };
    }

    return {
      emailEnabled: settings.emailEnabled,
      inAppEnabled: settings.inAppEnabled,
    };
  }

  /**
   * ユーザーの通知設定を更新
   */
  async updateUserNotificationSettings(
    userId: string,
    notificationType: NotificationSettingType,
    emailEnabled?: boolean,
    inAppEnabled?: boolean
  ): Promise<void> {
    await prisma.userNotificationSettings.upsert({
      where: {
        userId_notificationType: {
          userId: BigInt(userId),
          notificationType,
        },
      },
      create: {
        userId: BigInt(userId),
        notificationType,
        emailEnabled: emailEnabled ?? true,
        inAppEnabled: inAppEnabled ?? true,
      },
      update: {
        ...(emailEnabled !== undefined && { emailEnabled }),
        ...(inAppEnabled !== undefined && { inAppEnabled }),
      },
    });
  }

  /**
   * 通知タイプに対応するテンプレートタイプを取得
   */
  private getTemplateType(notificationType: NotificationSettingType): EmailTemplateType | null {
    const mapping: Record<NotificationSettingType, EmailTemplateType> = {
      TEST_ASSIGNED: 'TEST_ASSIGNED',
      TEST_COMPLETED: 'TEST_COMPLETED',
      BUG_REPORTED: 'BUG_REPORTED',
      BUG_ASSIGNED: 'BUG_ASSIGNED',
      BUG_UPDATED: 'BUG_UPDATED',
      BUG_RESOLVED: 'BUG_RESOLVED',
      REVIEW_REQUEST: 'REVIEW_REQUEST',
      MILESTONE_REMINDER: 'MILESTONE_REMINDER',
      DAILY_DIGEST: 'DAILY_DIGEST',
    };
    return mapping[notificationType] ?? null;
  }

  /**
   * 通知を送信
   */
  async sendNotification(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    const { type, userId, variables } = request;

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { email: true, name: true },
    });

    if (!user) {
      return {
        success: false,
        emailSent: false,
        inAppSent: false,
        message: 'ユーザーが見つかりません。',
      };
    }

    // 通知設定を取得
    const settings = await this.getUserNotificationSettings(userId, type);

    let emailSent = false;
    let inAppSent = false;

    // メール通知
    if (settings.emailEnabled) {
      const templateType = this.getTemplateType(type);
      if (templateType) {
        const template = await getEmailTemplateByType(templateType);
        if (template) {
          const emailResult = await this.sendEmail({
            templateId: template.id,
            toEmail: user.email,
            toName: user.name,
            variables: {
              ...variables,
              userName: user.name,
            },
          });
          emailSent = emailResult.success;
        }
      }
    }

    // アプリ内通知（将来実装）
    if (settings.inAppEnabled) {
      // TODO: アプリ内通知の実装
      inAppSent = true;
    }

    return {
      success: emailSent || inAppSent,
      emailSent,
      inAppSent,
      message: emailSent || inAppSent ? '通知を送信しました。' : '通知の送信に失敗しました。',
    };
  }

  /**
   * メールを送信
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const client = await this.initializeSmtpClient();

    if (!client) {
      // SMTPが無効な場合はキューに追加
      const queueId = await this.queueEmail(request);
      return {
        success: true,
        queueId,
        message: 'メールをキューに追加しました。',
      };
    }

    let subject = request.subject || '';
    let body = request.body || '';

    // テンプレートを使用する場合
    if (request.templateId || request.templateType) {
      const template = request.templateId
        ? await prisma.emailTemplate.findUnique({
            where: { id: BigInt(request.templateId) },
          })
        : await prisma.emailTemplate.findFirst({
            where: {
              type: request.templateType as EmailTemplateType,
              isActive: true,
              isDefault: true,
            },
          });

      if (template) {
        subject = substituteVariables(template.subject, request.variables || {});
        body = substituteVariables(template.body, request.variables || {});
      }
    } else if (request.variables) {
      subject = substituteVariables(subject, request.variables);
      body = substituteVariables(body, request.variables);
    }

    // 即時送信
    const result = await client.sendMail({
      to: request.toEmail,
      subject,
      html: body,
    });

    // 送信ログを記録
    await this.logEmailSend({
      templateId: request.templateId ? BigInt(request.templateId) : null,
      toEmail: request.toEmail,
      subject,
      success: result.success,
      errorMessage: result.error,
      messageId: result.messageId,
    });

    return {
      success: result.success,
      message: result.success
        ? 'メールを送信しました。'
        : `メール送信に失敗しました: ${result.error}`,
    };
  }

  /**
   * バッチメール送信
   */
  async sendBatchEmail(request: BatchSendEmailRequest): Promise<BatchSendEmailResponse> {
    const queueIds: string[] = [];
    let queued = 0;
    let failed = 0;

    for (const recipient of request.recipients) {
      try {
        const queueId = await this.queueEmail({
          templateId: request.templateId,
          templateType: request.templateType,
          toEmail: recipient.toEmail,
          toName: recipient.toName,
          subject: request.subject,
          body: request.body,
          variables: recipient.variables,
          priority: request.priority,
          scheduledAt: request.scheduledAt,
        });
        queueIds.push(queueId);
        queued++;
      } catch {
        failed++;
      }
    }

    return {
      success: queued > 0,
      queued,
      failed,
      queueIds,
      message: `${queued}件のメールをキューに追加しました${failed > 0 ? `（${failed}件失敗）` : ''}。`,
    };
  }

  /**
   * メールをキューに追加
   */
  private async queueEmail(request: SendEmailRequest): Promise<string> {
    let subject = request.subject || '';
    let body = request.body || '';

    // テンプレートを使用する場合
    if (request.templateId || request.templateType) {
      const template = request.templateId
        ? await prisma.emailTemplate.findUnique({
            where: { id: BigInt(request.templateId) },
          })
        : await prisma.emailTemplate.findFirst({
            where: {
              type: request.templateType as EmailTemplateType,
              isActive: true,
              isDefault: true,
            },
          });

      if (template) {
        subject = substituteVariables(template.subject, request.variables || {});
        body = substituteVariables(template.body, request.variables || {});
      }
    }

    const queue = await prisma.emailQueue.create({
      data: {
        templateId: request.templateId ? BigInt(request.templateId) : null,
        toEmail: request.toEmail,
        toName: request.toName,
        subject,
        body,
        variables: request.variables ? (request.variables as Prisma.InputJsonValue) : Prisma.DbNull,
        status: 'PENDING',
        priority: request.priority ?? 0,
        scheduledAt: request.scheduledAt ? new Date(request.scheduledAt) : null,
      },
    });

    return queue.id.toString();
  }

  /**
   * キュー内のメールを処理
   */
  async processEmailQueue(limit: number = 10): Promise<{ processed: number; failed: number }> {
    const client = await this.initializeSmtpClient();

    if (!client) {
      return { processed: 0, failed: 0 };
    }

    // 送信待ちのメールを取得
    const queueItems = await prisma.emailQueue.findMany({
      where: {
        status: 'PENDING',
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
        attempts: { lt: 3 },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    });

    let processed = 0;
    let failed = 0;

    for (const item of queueItems) {
      // ステータスを送信中に更新
      await prisma.emailQueue.update({
        where: { id: item.id },
        data: {
          status: 'SENDING',
          attempts: { increment: 1 },
        },
      });

      const result = await client.sendMail({
        to: item.toEmail,
        subject: item.subject,
        html: item.body,
      });

      const newStatus: EmailQueueStatus = result.success ? 'SENT' : 'FAILED';

      await prisma.emailQueue.update({
        where: { id: item.id },
        data: {
          status: newStatus,
          sentAt: result.success ? new Date() : null,
          errorMessage: result.error,
        },
      });

      // 送信ログを記録
      await this.logEmailSend({
        queueId: item.id,
        templateId: item.templateId,
        toEmail: item.toEmail,
        subject: item.subject,
        success: result.success,
        errorMessage: result.error,
        messageId: result.messageId,
      });

      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * メール送信ログを記録
   */
  private async logEmailSend(data: {
    queueId?: bigint;
    templateId?: bigint | null;
    toEmail: string;
    subject: string;
    success: boolean;
    errorMessage?: string;
    messageId?: string;
  }): Promise<void> {
    await prisma.emailSendLog.create({
      data: {
        queueId: data.queueId ?? null,
        templateId: data.templateId ?? null,
        toEmail: data.toEmail,
        subject: data.subject,
        success: data.success,
        errorMessage: data.errorMessage ?? null,
        messageId: data.messageId ?? null,
      },
    });
  }

  /**
   * SMTPクライアントをリセット
   */
  resetSmtpClient(): void {
    if (this.smtpClient) {
      this.smtpClient.close();
      this.smtpClient = null;
    }
  }
}

// シングルトンインスタンス
let notificationServiceInstance: NotificationService | null = null;

/**
 * 通知サービスを取得
 */
export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

/**
 * 通知サービスをリセット
 */
export function resetNotificationService(): void {
  if (notificationServiceInstance) {
    notificationServiceInstance.resetSmtpClient();
    notificationServiceInstance = null;
  }
}
