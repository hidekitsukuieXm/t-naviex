/**
 * MFA Auth Logs API Route
 *
 * MFA認証ログAPIルート
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getMfaAuthLogs,
  getRecentFailedAttempts,
  isMfaLockedOut,
} from '@/repositories/mfa-repository';

/**
 * MFA認証ログを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const action = searchParams.get('action');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // ロックアウト状態の確認
    if (action === 'check-lockout') {
      const isLockedOut = await isMfaLockedOut(userId);
      const failedAttempts = await getRecentFailedAttempts(userId);

      return NextResponse.json({
        isLockedOut,
        failedAttempts,
        maxAttempts: 5,
        lockoutMinutes: 15,
      });
    }

    // 認証ログの取得
    const logs = await getMfaAuthLogs(userId, limit);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to get MFA auth logs:', error);
    return NextResponse.json({ error: 'MFA認証ログの取得に失敗しました' }, { status: 500 });
  }
}
