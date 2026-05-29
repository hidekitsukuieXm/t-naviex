import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';
import {
  validateProjectLevel,
  type ProjectLevel,
  type CreateProjectLevelData,
  type ProjectLevelFeature,
  type ProjectLevelLimits,
} from '@/types/project-level';
import { logAudit } from '@/lib/audit';

// GET /api/settings/project-levels - プロジェクトレベル一覧取得
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const levels = await prisma.projectLevel.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const serialized: ProjectLevel[] = levels.map((level) => ({
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
    }));

    return NextResponse.json({
      levels: serialized,
      total: serialized.length,
    });
  } catch (error) {
    console.error('Get project levels error:', error);
    return NextResponse.json(
      { error: 'プロジェクトレベル一覧の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// POST /api/settings/project-levels - プロジェクトレベル作成
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body: CreateProjectLevelData = await request.json();

    // バリデーション
    const validation = validateProjectLevel(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // 名前の重複チェック
    const existing = await prisma.projectLevel.findUnique({
      where: { name: body.name },
    });

    if (existing) {
      return NextResponse.json({ error: 'このレベル名は既に使用されています。' }, { status: 400 });
    }

    // デフォルト設定の場合、他のデフォルトを解除
    if (body.isDefault) {
      await prisma.projectLevel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const level = await prisma.projectLevel.create({
      data: {
        name: body.name,
        displayName: body.displayName,
        description: body.description ?? null,
        features: body.features ?? [],
        limits: (body.limits ?? {}) as Prisma.InputJsonValue,
        isDefault: body.isDefault ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'PROJECT_LEVEL_CREATE',
      targetType: 'PROJECT_LEVEL',
      targetId: level.id.toString(),
      details: { name: level.name, displayName: level.displayName },
    });

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create project level error:', error);
    return NextResponse.json(
      { error: 'プロジェクトレベルの作成に失敗しました。' },
      { status: 500 }
    );
  }
}
