import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireSystemAdmin } from '@/lib/rbac/middleware';
import {
  getAccountLockout,
  unlockAccount,
  isAccountLocked,
} from '@/lib/repositories/password-policy-repository';

interface RouteParams {
  params: Promise<{
    userId: string;
  }>;
}

// GET /api/account-lockout/[userId] - アカウントロック状態取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { userId } = await params;
    const userIdBigInt = BigInt(userId);

    const lockStatus = await isAccountLocked(userIdBigInt);
    const lockout = await getAccountLockout(userIdBigInt);

    return NextResponse.json({
      ...lockStatus,
      lockout,
    });
  } catch (error) {
    console.error('Get account lockout error:', error);
    return NextResponse.json(
      { error: 'アカウントロック状態の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// DELETE /api/account-lockout/[userId] - アカウントロック解除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // システム管理者権限チェック
    try {
      await requireSystemAdmin(session.user.id);
    } catch {
      return NextResponse.json(
        { error: 'この操作にはシステム管理者権限が必要です。' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const userIdBigInt = BigInt(userId);

    await unlockAccount(userIdBigInt);

    return NextResponse.json({ success: true, message: 'アカウントロックを解除しました。' });
  } catch (error) {
    console.error('Unlock account error:', error);
    return NextResponse.json({ error: 'アカウントロックの解除に失敗しました。' }, { status: 500 });
  }
}
