import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getUserById,
  updateUser,
  deleteUser,
  isEmailTaken,
  type UpdateUserInput,
} from '@/lib/repositories/user-repository';
import { validatePassword, type UserStatus } from '@/types/user';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - ユーザー詳細取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    let userId: bigint;
    try {
      userId = BigInt(id);
    } catch {
      return NextResponse.json({ error: '無効なユーザーIDです。' }, { status: 400 });
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'ユーザーの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/users/[id] - ユーザー更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

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

    // メールアドレスの形式チェック
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'メールアドレスの形式が正しくありません。' },
          { status: 400 }
        );
      }

      // メールアドレスの重複チェック（自分自身は除外）
      const emailTaken = await isEmailTaken(body.email, userId);
      if (emailTaken) {
        return NextResponse.json(
          { error: 'このメールアドレスは既に使用されています。' },
          { status: 400 }
        );
      }
    }

    // パスワードバリデーション（パスワードが指定されている場合のみ）
    if (body.password) {
      const passwordValidation = validatePassword(body.password);
      if (!passwordValidation.valid) {
        return NextResponse.json({ error: passwordValidation.errors.join(' ') }, { status: 400 });
      }
    }

    // ステータスのバリデーション
    const validStatuses: UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: '無効なステータスです。' }, { status: 400 });
    }

    const updateData: UpdateUserInput = {};

    if (body.email !== undefined) {
      updateData.email = body.email;
    }

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.password !== undefined) {
      updateData.password = body.password;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.image !== undefined) {
      updateData.image = body.image;
    }

    if (body.mfaEnabled !== undefined) {
      updateData.mfaEnabled = body.mfaEnabled;
    }

    if (body.mfaType !== undefined) {
      updateData.mfaType = body.mfaType;
    }

    const user = await updateUser(userId, updateData);

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'ユーザーの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - ユーザー削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

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

    // 自分自身は削除できない
    if (session.user.id === id) {
      return NextResponse.json({ error: '自分自身を削除することはできません。' }, { status: 400 });
    }

    await deleteUser(userId);

    return NextResponse.json({ message: 'ユーザーを削除しました。' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'ユーザーの削除に失敗しました。' }, { status: 500 });
  }
}
