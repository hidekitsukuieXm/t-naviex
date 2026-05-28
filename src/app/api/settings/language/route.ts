import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { isValidLocale, defaultLocale, type Locale } from '@/i18n/config';
import { LOCALE_COOKIE_NAME } from '@/i18n/request';
import { logAudit } from '@/lib/audit';

// GET /api/settings/language - 現在の言語設定を取得
export async function GET() {
  try {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

    let locale: Locale = defaultLocale;
    if (localeCookie && isValidLocale(localeCookie)) {
      locale = localeCookie;
    }

    return NextResponse.json({ locale });
  } catch (error) {
    console.error('Get language error:', error);
    return NextResponse.json({ error: '言語設定の取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/settings/language - 言語設定を変更
export async function PUT(request: Request) {
  try {
    const session = await auth();

    const body = await request.json();
    const { locale } = body;

    if (!locale || !isValidLocale(locale)) {
      return NextResponse.json({ error: '無効な言語コードです。' }, { status: 400 });
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE_NAME, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      httpOnly: false, // Allow client-side access
    });

    // Log audit if authenticated
    if (session?.user) {
      await logAudit({
        userId: session.user.id,
        action: 'LANGUAGE_CHANGE',
        targetType: 'SYSTEM',
        details: { locale },
      });
    }

    return NextResponse.json({
      locale,
      message: locale === 'ja' ? '言語を変更しました。' : 'Language changed successfully.',
    });
  } catch (error) {
    console.error('Change language error:', error);
    return NextResponse.json({ error: '言語設定の変更に失敗しました。' }, { status: 500 });
  }
}
