import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  validateProjectLevel,
  type UpdateProjectLevelData,
  type ProjectLevelFeature,
  type ProjectLevelLimits,
} from '@/types/project-level';
import { logAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

// GET /api/settings/project-levels/[id] - プロジェクトレベル詳細取得
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const levelId = BigInt(id);

    const level = await prisma.projectLevel.findUnique({
      where: { id: levelId },
    });

    if (!level) {
      return NextResponse.json({ error: 'プロジェクトレベルが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json({
      id: level.id.toString(),
      name: level.name,
      displayName: level.displayName,
      description: level.description,
      features: level.features as ProjectLevelFeature[],
      limits: level.limits as ProjectLevelLimits,
      isDefault: level.isDefault,
      sortOrder: level.sortOrder,
      createdAt: level.createdAt.toISOString(),
      updatedAt: level.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Get project level error:', error);
    return NextResponse.json(
      { error: 'プロジェクトレベルの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/project-levels/[id] - プロジェクトレベル更新
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const levelId = BigInt(id);

    const body: UpdateProjectLevelData = await request.json();

    // バリデーション
    const validation = validateProjectLevel(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const existing = await prisma.projectLevel.findUnique({
      where: { id: levelId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'プロジェクトレベルが見つかりません。' }, { status: 404 });
    }

    // 名前変更時の重複チェック
    if (body.name && body.name !== existing.name) {
      const duplicate = await prisma.projectLevel.findUnique({
        where: { name: body.name },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'このレベル名は既に使用されています。' },
          { status: 400 }
        );
      }
    }

    // デフォルト設定の場合、他のデフォルトを解除
    if (body.isDefault && !existing.isDefault) {
      await prisma.projectLevel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const level = await prisma.projectLevel.update({
      where: { id: levelId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.displayName !== undefined && { displayName: body.displayName }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.features !== undefined && { features: body.features }),
        ...(body.limits !== undefined && { limits: body.limits }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'PROJECT_LEVEL_UPDATE',
      targetType: 'PROJECT_LEVEL',
      targetId: level.id.toString(),
      details: { name: level.name, displayName: level.displayName },
    });

    return NextResponse.json({
      id: level.id.toString(),
      name: level.name,
      displayName: level.displayName,
      description: level.description,
      features: level.features,
      limits: level.limits,
      isDefault: level.isDefault,
      sortOrder: level.sortOrder,
      createdAt: level.createdAt.toISOString(),
      updatedAt: level.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Update project level error:', error);
    return NextResponse.json(
      { error: 'プロジェクトレベルの更新に失敗しました。' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/project-levels/[id] - プロジェクトレベル削除
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const levelId = BigInt(id);

    const existing = await prisma.projectLevel.findUnique({
      where: { id: levelId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'プロジェクトレベルが見つかりません。' }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'デフォルトのプロジェクトレベルは削除できません。' },
        { status: 400 }
      );
    }

    await prisma.projectLevel.delete({
      where: { id: levelId },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'PROJECT_LEVEL_DELETE',
      targetType: 'PROJECT_LEVEL',
      targetId: id,
      details: { name: existing.name, displayName: existing.displayName },
    });

    return NextResponse.json({ message: 'プロジェクトレベルを削除しました。' });
  } catch (error) {
    console.error('Delete project level error:', error);
    return NextResponse.json(
      { error: 'プロジェクトレベルの削除に失敗しました。' },
      { status: 500 }
    );
  }
}
