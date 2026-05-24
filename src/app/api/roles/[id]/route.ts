import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getRoleById,
  updateRole,
  deleteRole,
  isRoleNameTaken,
  type UpdateRoleData,
} from '@/lib/repositories/role-repository';
import { logRoleUpdate, logRoleDelete } from '@/lib/audit';
import { validateRoleName, isSystemRole } from '@/types/role';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/roles/[id] - ロール詳細取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    let roleId: bigint;
    try {
      roleId = BigInt(id);
    } catch {
      return NextResponse.json({ error: '無効なロールIDです。' }, { status: 400 });
    }

    const role = await getRoleById(roleId);

    if (!role) {
      return NextResponse.json({ error: 'ロールが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error('Get role error:', error);
    return NextResponse.json({ error: 'ロールの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/roles/[id] - ロール更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    let roleId: bigint;
    try {
      roleId = BigInt(id);
    } catch {
      return NextResponse.json({ error: '無効なロールIDです。' }, { status: 400 });
    }

    // ロールが存在するか確認
    const existingRole = await getRoleById(roleId);
    if (!existingRole) {
      return NextResponse.json({ error: 'ロールが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // ロール名の変更バリデーション
    if (body.name !== undefined) {
      // システムロールの名前は変更不可
      if (existingRole.isSystemRole && body.name !== existingRole.name) {
        return NextResponse.json(
          { error: 'システムロールの名前は変更できません。' },
          { status: 400 }
        );
      }

      // ロール名のバリデーション
      const nameValidation = validateRoleName(body.name);
      if (!nameValidation.valid) {
        return NextResponse.json({ error: nameValidation.error }, { status: 400 });
      }

      // システムロール名は使用不可
      if (isSystemRole(body.name) && body.name !== existingRole.name) {
        return NextResponse.json(
          { error: 'このロール名はシステムで予約されています。' },
          { status: 400 }
        );
      }

      // ロール名の重複チェック（自分自身は除外）
      const nameTaken = await isRoleNameTaken(body.name, roleId);
      if (nameTaken) {
        return NextResponse.json(
          { error: 'このロール名は既に使用されています。' },
          { status: 400 }
        );
      }
    }

    // 表示名の長さチェック
    if (body.displayName !== undefined && body.displayName.length > 100) {
      return NextResponse.json(
        { error: '表示名は100文字以内で入力してください。' },
        { status: 400 }
      );
    }

    // 説明の長さチェック
    if (
      body.description !== undefined &&
      body.description !== null &&
      body.description.length > 500
    ) {
      return NextResponse.json({ error: '説明は500文字以内で入力してください。' }, { status: 400 });
    }

    const updateData: UpdateRoleData = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.displayName !== undefined) {
      updateData.displayName = body.displayName;
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.permissions !== undefined) {
      updateData.permissions = body.permissions;
    }

    const role = await updateRole(roleId, updateData);

    // 監査ログを記録
    await logRoleUpdate(session.user.id, id, {
      roleName: role.name,
      updatedFields: Object.keys(updateData),
    });

    return NextResponse.json(role);
  } catch (error) {
    console.error('Update role error:', error);
    if (error instanceof Error && error.message.includes('システムロール')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'ロールの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/roles/[id] - ロール削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    let roleId: bigint;
    try {
      roleId = BigInt(id);
    } catch {
      return NextResponse.json({ error: '無効なロールIDです。' }, { status: 400 });
    }

    const result = await deleteRole(roleId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // 監査ログを記録
    await logRoleDelete(session.user.id, id);

    return NextResponse.json({ message: 'ロールを削除しました。' });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'ロールの削除に失敗しました。' }, { status: 500 });
  }
}
