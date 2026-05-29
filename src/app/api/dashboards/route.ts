/**
 * ダッシュボード API
 * GET /api/dashboards - ダッシュボード一覧取得
 * POST /api/dashboards - ダッシュボード作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma';
import { getDashboardsByUser, createDashboard } from '@/repositories/dashboard-repository';
import { toDashboardSafe } from '@/types/dashboard';

// POST用バリデーションスキーマ
const createDashboardSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/dashboards - ユーザーのダッシュボード一覧
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const userId = BigInt(session.user.id);
    const dashboards = await getDashboardsByUser(userId);

    return NextResponse.json({
      dashboards: dashboards.map(toDashboardSafe),
    });
  } catch (error) {
    console.error('Get dashboards error:', error);
    return NextResponse.json({ error: 'ダッシュボードの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/dashboards - ダッシュボード作成
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createDashboardSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { projectId, name, description, isDefault, isPublic, layout } = validation.data;

    const dashboard = await createDashboard({
      projectId: projectId ? BigInt(projectId) : null,
      userId: BigInt(session.user.id),
      name,
      description,
      isDefault,
      isPublic,
      layout: layout as Prisma.InputJsonValue | undefined,
    });

    return NextResponse.json({ dashboard: toDashboardSafe(dashboard) }, { status: 201 });
  } catch (error) {
    console.error('Create dashboard error:', error);
    return NextResponse.json({ error: 'ダッシュボードの作成に失敗しました。' }, { status: 500 });
  }
}
