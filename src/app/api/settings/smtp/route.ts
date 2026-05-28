import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getSmtpSettings,
  getSmtpSettingsWithPassword,
  updateSmtpSettings,
  recordSmtpTestResult,
} from '@/lib/repositories/smtp-settings-repository';
import { validateSmtpSettings } from '@/types/smtp-settings';
import { SmtpClient } from '@/services/email/smtp-client';
import { resetNotificationService } from '@/services/email/notification-service';

// GET /api/settings/smtp - SMTP設定取得
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const settings = await getSmtpSettings();

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get SMTP settings error:', error);
    return NextResponse.json({ error: 'SMTP設定の取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/settings/smtp - SMTP設定更新
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateSmtpSettings(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.map((e) => e.message).join(' ') },
        { status: 400 }
      );
    }

    const settings = await updateSmtpSettings(body);

    // 通知サービスをリセット（設定が変更されたため）
    resetNotificationService();

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update SMTP settings error:', error);
    return NextResponse.json({ error: 'SMTP設定の更新に失敗しました。' }, { status: 500 });
  }
}

// POST /api/settings/smtp - SMTP接続テスト
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();
    const { action, testEmail } = body;

    if (action !== 'test') {
      return NextResponse.json({ error: '無効なアクションです。' }, { status: 400 });
    }

    // SMTP設定を取得（パスワード復号化あり）
    const settings = await getSmtpSettingsWithPassword();

    if (!settings.host || !settings.fromEmail) {
      return NextResponse.json(
        {
          success: false,
          message: 'SMTP設定が不完全です。ホストと送信元メールアドレスを設定してください。',
        },
        { status: 400 }
      );
    }

    // SMTPクライアントを作成
    const client = SmtpClient.fromSettings(settings, settings.decryptedPassword);

    // 接続テスト
    const connectionResult = await client.testConnection();

    if (!connectionResult.success) {
      await recordSmtpTestResult(false);
      return NextResponse.json(connectionResult);
    }

    // テストメール送信（オプション）
    if (testEmail) {
      const sendResult = await client.sendTestMail(testEmail);
      await recordSmtpTestResult(sendResult.success);

      client.close();

      if (sendResult.success) {
        return NextResponse.json({
          success: true,
          message: `SMTP接続テストに成功しました。テストメールを ${testEmail} に送信しました。`,
          details: connectionResult.details,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `SMTP接続は成功しましたが、テストメールの送信に失敗しました: ${sendResult.error}`,
          details: connectionResult.details,
        });
      }
    }

    await recordSmtpTestResult(true);
    client.close();

    return NextResponse.json(connectionResult);
  } catch (error) {
    console.error('SMTP test error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: `SMTP接続テストに失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
