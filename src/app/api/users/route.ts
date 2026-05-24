import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createUser,
  getUsers,
  isEmailTaken,
  type CreateUserInput,
  type UserSearchParams,
} from '@/lib/repositories/user-repository';
import { logUserCreate } from '@/lib/audit';
import { validatePassword, type UserStatus } from '@/types/user';

// GET /api/users - ユーザー一覧取得
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const params: UserSearchParams = {
      query: searchParams.get('query') || undefined,
      status: (searchParams.get('status') as UserStatus) || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sortBy: (searchParams.get('sortBy') as UserSearchParams['sortBy']) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as UserSearchParams['sortOrder']) || 'desc',
    };

    const result = await getUsers(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'ユーザー一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/users - ユーザー作成
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.email || !body.name || !body.password) {
      return NextResponse.json(
        { error: 'メールアドレス、名前、パスワードは必須です。' },
        { status: 400 }
      );
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'メールアドレスの形式が正しくありません。' },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    const emailTaken = await isEmailTaken(body.email);
    if (emailTaken) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています。' },
        { status: 400 }
      );
    }

    // パスワードバリデーション
    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.errors.join(' ') }, { status: 400 });
    }

    // ステータスのバリデーション
    const validStatuses: UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: '無効なステータスです。' }, { status: 400 });
    }

    const createData: CreateUserInput = {
      email: body.email,
      name: body.name,
      password: body.password,
      status: body.status,
    };

    const user = await createUser(createData);

    // 監査ログを記録
    await logUserCreate(session.user.id, user.id, {
      userName: user.name,
      userEmail: user.email,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'ユーザーの作成に失敗しました。' }, { status: 500 });
  }
}
