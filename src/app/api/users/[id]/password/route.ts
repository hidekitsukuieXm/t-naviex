import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { changePassword, getUserById } from '@/lib/repositories/user-repository';
import { validatePassword } from '@/types/user';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/users/[id]/password - パスワード変更
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    // 自分のパスワードのみ変更可能
    if (session.user.id !== id) {
      return NextResponse.json(
        { error: '他のユーザーのパスワードは変更できません。' },
        { status: 403 }
      );
    }

    let userId: bigint;
    try {
      userId = BigInt(id);
    } catch {
      return NextResponse.json({ error: '無効なユーザーIDです。' }, { status: 400 });
    }

    // ユーザーが存在するか確認
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json(
        { error: '現在のパスワードと新しいパスワードは必須です。' },
        { status: 400 }
      );
    }

    // 新しいパスワードのバリデーション
    const passwordValidation = validatePassword(body.newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.errors.join(' ') }, { status: 400 });
    }

    // 現在のパスワードと新しいパスワードが同じでないか確認
    if (body.currentPassword === body.newPassword) {
      return NextResponse.json(
        { error: '新しいパスワードは現在のパスワードと異なる必要があります。' },
        { status: 400 }
      );
    }

    const result = await changePassword(userId, body.currentPassword, body.newPassword);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'パスワードを変更しました。' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'パスワードの変更に失敗しました。' }, { status: 500 });
  }
}
