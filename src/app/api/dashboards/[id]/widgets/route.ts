/**
 * ダッシュボードウィジェット API
 * POST /api/dashboards/[id]/widgets - ウィジェット追加
 * PATCH /api/dashboards/[id]/widgets - ウィジェット一括更新（レイアウト変更）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import {
  getDashboardById,
  addWidget,
  updateWidgetPositions,
} from '@/repositories/dashboard-repository';
import { toDashboardSafe } from '@/types/dashboard';
import { WidgetType, Prisma } from '@/generated/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ウィジェットタイプのバリデーション用
const widgetTypeValues = [
  'PROGRESS_SUMMARY',
  'PROGRESS_CHART',
  'BUG_SUMMARY',
  'BUG_CHART',
  'TEAM_INFO',
  'MILESTONE',
  'RECENT_ACTIVITY',
  'COVERAGE_STATS',
  'BURNDOWN_CHART',
  'RELIABILITY_CHART',
  'CUSTOM',
] as const;

// POST用バリデーションスキーマ
const addWidgetSchema = z.object({
  widgetType: z.enum(widgetTypeValues),
  title: z.string().max(255).optional(),
  x: z.number().int().min(0).optional(),
  y: z.number().int().min(0).optional(),
  width: z.number().int().min(1).max(12).optional(),
  height: z.number().int().min(1).max(12).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

// PATCH用バリデーションスキーマ
const updateWidgetsSchema = z.object({
  widgets: z.array(
    z.object({
      id: z.string(),
      x: z.number().int().min(0),
      y: z.number().int().min(0),
      width: z.number().int().min(1).max(12),
      height: z.number().int().min(1).max(12),
      sortOrder: z.number().int().optional(),
    })
  ),
});

// POST /api/dashboards/[id]/widgets - ウィジェット追加
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const dashboardId = BigInt(id);

    // ダッシュボード確認
    const dashboard = await getDashboardById(dashboardId);
    if (!dashboard) {
      return NextResponse.json({ error: 'ダッシュボードが見つかりません。' }, { status: 404 });
    }

    // 所有者チェック
    const userId = BigInt(session.user.id);
    if (dashboard.userId !== userId) {
      return NextResponse.json(
        { error: 'このダッシュボードを編集する権限がありません。' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = addWidgetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { widgetType, title, x, y, width, height, config } = validation.data;

    const updatedDashboard = await addWidget({
      dashboardId,
      widgetType: widgetType as WidgetType,
      title,
      x,
      y,
      width,
      height,
      config: config as Prisma.InputJsonValue | undefined,
    });

    return NextResponse.json({ dashboard: toDashboardSafe(updatedDashboard) }, { status: 201 });
  } catch (error) {
    console.error('Add widget error:', error);
    return NextResponse.json({ error: 'ウィジェットの追加に失敗しました。' }, { status: 500 });
  }
}

// PATCH /api/dashboards/[id]/widgets - ウィジェット一括更新
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const dashboardId = BigInt(id);

    // ダッシュボード確認
    const dashboard = await getDashboardById(dashboardId);
    if (!dashboard) {
      return NextResponse.json({ error: 'ダッシュボードが見つかりません。' }, { status: 404 });
    }

    // 所有者チェック
    const userId = BigInt(session.user.id);
    if (dashboard.userId !== userId) {
      return NextResponse.json(
        { error: 'このダッシュボードを編集する権限がありません。' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = updateWidgetsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { widgets } = validation.data;

    // このダッシュボードのウィジェットのみ更新可能かチェック
    const dashboardWidgetIds = new Set(dashboard.widgets.map((w) => w.id.toString()));
    const invalidWidgets = widgets.filter((w) => !dashboardWidgetIds.has(w.id));

    if (invalidWidgets.length > 0) {
      return NextResponse.json(
        { error: '無効なウィジェットIDが含まれています。' },
        { status: 400 }
      );
    }

    await updateWidgetPositions(
      widgets.map((w) => ({
        id: BigInt(w.id),
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        sortOrder: w.sortOrder,
      }))
    );

    const updatedDashboard = await getDashboardById(dashboardId);

    return NextResponse.json({
      dashboard: toDashboardSafe(updatedDashboard!),
    });
  } catch (error) {
    console.error('Update widgets error:', error);
    return NextResponse.json({ error: 'ウィジェットの更新に失敗しました。' }, { status: 500 });
  }
}
