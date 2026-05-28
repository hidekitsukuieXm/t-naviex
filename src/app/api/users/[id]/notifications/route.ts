import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getNotificationService } from '@/services/email/notification-service';
import type { NotificationSettingType } from '@/types/notification';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/types/notification';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id]/notifications - ユーザー通知設定取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    // 自分の設定のみ取得可能（または管理者）
    if (session.user.id !== id) {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    const settings = await prisma.userNotificationSettings.findMany({
      where: { userId: BigInt(id) },
    });

    // 全ての通知タイプに対する設定を返す
    const notificationTypes: NotificationSettingType[] = [
      'TEST_ASSIGNED',
      'TEST_COMPLETED',
      'BUG_REPORTED',
      'BUG_ASSIGNED',
      'BUG_UPDATED',
      'BUG_RESOLVED',
      'REVIEW_REQUEST',
      'MILESTONE_REMINDER',
      'DAILY_DIGEST',
    ];

    const result = notificationTypes.map((type) => {
      const setting = settings.find((s) => s.notificationType === type);
      const defaults = DEFAULT_NOTIFICATION_SETTINGS[type];

      return {
        notificationType: type,
        emailEnabled: setting?.emailEnabled ?? defaults.emailEnabled,
        inAppEnabled: setting?.inAppEnabled ?? defaults.inAppEnabled,
      };
    });

    return NextResponse.json({ settings: result });
  } catch (error) {
    console.error('Get notification settings error:', error);
    return NextResponse.json({ error: '通知設定の取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/users/[id]/notifications - ユーザー通知設定更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    // 自分の設定のみ更新可能（または管理者）
    if (session.user.id !== id) {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    const body = await request.json();
    const { notificationType, emailEnabled, inAppEnabled } = body;

    if (!notificationType) {
      return NextResponse.json({ error: '通知タイプを指定してください。' }, { status: 400 });
    }

    const notificationService = getNotificationService();
    await notificationService.updateUserNotificationSettings(
      id,
      notificationType,
      emailEnabled,
      inAppEnabled
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update notification settings error:', error);
    return NextResponse.json({ error: '通知設定の更新に失敗しました。' }, { status: 500 });
  }
}

// PATCH /api/users/[id]/notifications - 複数の通知設定を一括更新
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    // 自分の設定のみ更新可能（または管理者）
    if (session.user.id !== id) {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({ error: '設定の配列を指定してください。' }, { status: 400 });
    }

    const notificationService = getNotificationService();

    for (const setting of settings) {
      await notificationService.updateUserNotificationSettings(
        id,
        setting.notificationType,
        setting.emailEnabled,
        setting.inAppEnabled
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update notification settings error:', error);
    return NextResponse.json({ error: '通知設定の更新に失敗しました。' }, { status: 500 });
  }
}
