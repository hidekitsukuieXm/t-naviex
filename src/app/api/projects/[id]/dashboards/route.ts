/**
 * プロジェクト別ダッシュボード API
 * GET /api/projects/[id]/dashboards - プロジェクトのダッシュボード一覧
 * POST /api/projects/[id]/dashboards - プロジェクト用ダッシュボード作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma';
import {
  getDashboardsByProject,
  getDefaultDashboard,
  createDashboard,
} from '@/repositories/dashboard-repository';
import { toDashboardSafe } from '@/types/dashboard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST用バリデーションスキーマ
const createDashboardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
});

// GET /api/projects/[id]/dashboards - プロジェクトのダッシュボード一覧
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);
    const userId = BigInt(session.user.id);

    const searchParams = request.nextUrl.searchParams;
    const getDefault = searchParams.get('default') === 'true';

    if (getDefault) {
      const dashboard = await getDefaultDashboard(projectId, userId);
      return NextResponse.json({
        dashboard: dashboard ? toDashboardSafe(dashboard) : null,
      });
    }

    const dashboards = await getDashboardsByProject(projectId, userId);

    return NextResponse.json({
      dashboards: dashboards.map(toDashboardSafe),
    });
  } catch (error) {
    console.error('Get project dashboards error:', error);
    return NextResponse.json({ error: 'ダッシュボードの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/dashboards - プロジェクト用ダッシュボード作成
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);

    const body = await request.json();
    const validation = createDashboardSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, description, isDefault, isPublic, layout } = validation.data;

    const dashboard = await createDashboard({
      projectId,
      userId: BigInt(session.user.id),
      name,
      description,
      isDefault,
      isPublic,
      layout: layout as Prisma.InputJsonValue | undefined,
    });

    return NextResponse.json({ dashboard: toDashboardSafe(dashboard) }, { status: 201 });
  } catch (error) {
    console.error('Create project dashboard error:', error);
    return NextResponse.json({ error: 'ダッシュボードの作成に失敗しました。' }, { status: 500 });
  }
}
