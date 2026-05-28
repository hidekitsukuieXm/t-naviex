import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getNotificationService } from '@/services/email/notification-service';
import type { SendEmailRequest, BatchSendEmailRequest } from '@/types/notification';

// POST /api/notifications/email - メール送信
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const notificationService = getNotificationService();

    // バッチ送信
    if (action === 'batch') {
      const batchRequest: BatchSendEmailRequest = {
        templateId: body.templateId,
        templateType: body.templateType,
        recipients: body.recipients,
        subject: body.subject,
        body: body.body,
        priority: body.priority,
        scheduledAt: body.scheduledAt,
      };

      // バリデーション
      if (!batchRequest.recipients || batchRequest.recipients.length === 0) {
        return NextResponse.json({ error: '送信先を指定してください。' }, { status: 400 });
      }

      if (!batchRequest.templateId && !batchRequest.templateType && !batchRequest.body) {
        return NextResponse.json(
          { error: 'テンプレートまたは本文を指定してください。' },
          { status: 400 }
        );
      }

      const result = await notificationService.sendBatchEmail(batchRequest);
      return NextResponse.json(result);
    }

    // キュー処理
    if (action === 'process-queue') {
      const limit = body.limit || 10;
      const result = await notificationService.processEmailQueue(limit);
      return NextResponse.json({
        success: true,
        message: `${result.processed}件のメールを処理しました${result.failed > 0 ? `（${result.failed}件失敗）` : ''}。`,
        ...result,
      });
    }

    // 単一メール送信
    const emailRequest: SendEmailRequest = {
      templateId: body.templateId,
      templateType: body.templateType,
      toEmail: body.toEmail,
      toName: body.toName,
      subject: body.subject,
      body: body.body,
      variables: body.variables,
      priority: body.priority,
      scheduledAt: body.scheduledAt,
    };

    // バリデーション
    if (!emailRequest.toEmail) {
      return NextResponse.json(
        { error: '送信先メールアドレスを指定してください。' },
        { status: 400 }
      );
    }

    if (!emailRequest.templateId && !emailRequest.templateType && !emailRequest.body) {
      return NextResponse.json(
        { error: 'テンプレートまたは本文を指定してください。' },
        { status: 400 }
      );
    }

    const result = await notificationService.sendEmail(emailRequest);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json({ error: 'メール送信に失敗しました。' }, { status: 500 });
  }
}
