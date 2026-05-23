import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getSessionSettings,
  updateSessionSettings,
} from '@/lib/repositories/session-settings-repository';
import { validateSessionSettings } from '@/types/session-settings';

// GET /api/session-settings - セッション設定取得
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const settings = await getSessionSettings();

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get session settings error:', error);
    return NextResponse.json({ error: 'セッション設定の取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/session-settings - セッション設定更新
export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateSessionSettings(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const settings = await updateSessionSettings(body);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update session settings error:', error);
    return NextResponse.json({ error: 'セッション設定の更新に失敗しました。' }, { status: 500 });
  }
}
