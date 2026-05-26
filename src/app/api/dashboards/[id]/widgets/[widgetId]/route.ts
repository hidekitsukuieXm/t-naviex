/**
 * ダッシュボードウィジェット個別 API
 * PUT /api/dashboards/[id]/widgets/[widgetId] - ウィジェット更新
 * DELETE /api/dashboards/[id]/widgets/[widgetId] - ウィジェット削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { getDashboardById, updateWidget, deleteWidget } from '@/repositories/dashboard-repository';
import { toDashboardSafe } from '@/types/dashboard';

interface RouteParams {
  params: Promise<{ id: string; widgetId: string }>;
}

// PUT用バリデーションスキーマ
const updateWidgetSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  x: z.number().int().min(0).optional(),
  y: z.number().int().min(0).optional(),
  width: z.number().int().min(1).max(12).optional(),
  height: z.number().int().min(1).max(12).optional(),
  config: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
});

// PUT /api/dashboards/[id]/widgets/[widgetId] - ウィジェット更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, widgetId } = await params;
    const dashboardId = BigInt(id);
    const widgetIdBigInt = BigInt(widgetId);

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

    // ウィジェットがこのダッシュボードに属しているか確認
    const widget = dashboard.widgets.find((w) => w.id === widgetIdBigInt);
    if (!widget) {
      return NextResponse.json({ error: 'ウィジェットが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateWidgetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.error.errors },
        { status: 400 }
      );
    }

    await updateWidget(widgetIdBigInt, validation.data);

    const updatedDashboard = await getDashboardById(dashboardId);

    return NextResponse.json({
      dashboard: toDashboardSafe(updatedDashboard!),
    });
  } catch (error) {
    console.error('Update widget error:', error);
    return NextResponse.json({ error: 'ウィジェットの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/dashboards/[id]/widgets/[widgetId] - ウィジェット削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, widgetId } = await params;
    const dashboardId = BigInt(id);
    const widgetIdBigInt = BigInt(widgetId);

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

    // ウィジェットがこのダッシュボードに属しているか確認
    const widget = dashboard.widgets.find((w) => w.id === widgetIdBigInt);
    if (!widget) {
      return NextResponse.json({ error: 'ウィジェットが見つかりません。' }, { status: 404 });
    }

    await deleteWidget(widgetIdBigInt);

    const updatedDashboard = await getDashboardById(dashboardId);

    return NextResponse.json({
      dashboard: toDashboardSafe(updatedDashboard!),
    });
  } catch (error) {
    console.error('Delete widget error:', error);
    return NextResponse.json({ error: 'ウィジェットの削除に失敗しました。' }, { status: 500 });
  }
}
