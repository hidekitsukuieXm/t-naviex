import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRoles, createRole, isRoleNameTaken } from '@/lib/repositories/role-repository';
import { logRoleCreate } from '@/lib/audit';
import { validateRoleName, isSystemRole, type CreateRoleData } from '@/types/role';

// GET /api/roles - ロール一覧取得
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const result = await getRoles();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: 'ロール一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/roles - ロール作成
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.name || !body.displayName) {
      return NextResponse.json({ error: 'ロール名と表示名は必須です。' }, { status: 400 });
    }

    // ロール名のバリデーション
    const nameValidation = validateRoleName(body.name);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    // システムロール名は使用不可
    if (isSystemRole(body.name)) {
      return NextResponse.json(
        { error: 'このロール名はシステムで予約されています。' },
        { status: 400 }
      );
    }

    // ロール名の重複チェック
    const nameTaken = await isRoleNameTaken(body.name);
    if (nameTaken) {
      return NextResponse.json({ error: 'このロール名は既に使用されています。' }, { status: 400 });
    }

    // 表示名の長さチェック
    if (body.displayName.length > 100) {
      return NextResponse.json(
        { error: '表示名は100文字以内で入力してください。' },
        { status: 400 }
      );
    }

    // 説明の長さチェック
    if (body.description && body.description.length > 500) {
      return NextResponse.json({ error: '説明は500文字以内で入力してください。' }, { status: 400 });
    }

    const createData: CreateRoleData = {
      name: body.name,
      displayName: body.displayName,
      description: body.description,
      permissions: body.permissions || {},
    };

    const role = await createRole(createData);

    // 監査ログを記録
    await logRoleCreate(session.user.id, role.id, {
      roleName: role.name,
      displayName: role.displayName,
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'ロールの作成に失敗しました。' }, { status: 500 });
  }
}
