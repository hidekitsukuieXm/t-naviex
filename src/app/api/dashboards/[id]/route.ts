/**
 * ダッシュボード個別 API
 * GET /api/dashboards/[id] - ダッシュボード取得
 * PUT /api/dashboards/[id] - ダッシュボード更新
 * DELETE /api/dashboards/[id] - ダッシュボード削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma';
import {
  getDashboardById,
  updateDashboard,
  deleteDashboard,
  duplicateDashboard,
} from '@/repositories/dashboard-repository';
import { toDashboardSafe } from '@/types/dashboard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT用バリデーションスキーマ
const updateDashboardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  layout: z.record(z.string(), z.unknown()).optional(),
  duplicate: z.boolean().optional(), // 複製モード
  newName: z.string().optional(), // 複製時の新しい名前
});

// GET /api/dashboards/[id] - ダッシュボード取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const dashboardId = BigInt(id);

    const dashboard = await getDashboardById(dashboardId);

    if (!dashboard) {
      return NextResponse.json({ error: 'ダッシュボードが見つかりません。' }, { status: 404 });
    }

    // アクセス権チェック
    const userId = BigInt(session.user.id);
    if (dashboard.userId !== userId && !dashboard.isPublic) {
      return NextResponse.json(
        { error: 'このダッシュボードにアクセスする権限がありません。' },
        { status: 403 }
      );
    }

    return NextResponse.json({ dashboard: toDashboardSafe(dashboard) });
  } catch (error) {
    console.error('Get dashboard error:', error);
    return NextResponse.json({ error: 'ダッシュボードの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/dashboards/[id] - ダッシュボード更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const dashboardId = BigInt(id);

    const body = await request.json();
    const validation = updateDashboardSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.error.issues },
        { status: 400 }
      );
    }

    // 既存ダッシュボード確認
    const existing = await getDashboardById(dashboardId);
    if (!existing) {
      return NextResponse.json({ error: 'ダッシュボードが見つかりません。' }, { status: 404 });
    }

    // 所有者チェック
    const userId = BigInt(session.user.id);
    if (existing.userId !== userId) {
      return NextResponse.json(
        { error: 'このダッシュボードを編集する権限がありません。' },
        { status: 403 }
      );
    }

    const { duplicate, newName, description, layout, ...updateData } = validation.data;

    // 複製モードの場合
    if (duplicate) {
      const duplicated = await duplicateDashboard(dashboardId, userId, newName);
      return NextResponse.json({ dashboard: toDashboardSafe(duplicated) });
    }

    // 通常更新 (null を undefined に変換, layout を InputJsonValue にキャスト)
    const dashboard = await updateDashboard(dashboardId, {
      ...updateData,
      description: description ?? undefined,
      layout: layout as Prisma.InputJsonValue | undefined,
    });

    return NextResponse.json({ dashboard: toDashboardSafe(dashboard) });
  } catch (error) {
    console.error('Update dashboard error:', error);
    return NextResponse.json({ error: 'ダッシュボードの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/dashboards/[id] - ダッシュボード削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const dashboardId = BigInt(id);

    // 既存ダッシュボード確認
    const existing = await getDashboardById(dashboardId);
    if (!existing) {
      return NextResponse.json({ error: 'ダッシュボードが見つかりません。' }, { status: 404 });
    }

    // 所有者チェック
    const userId = BigInt(session.user.id);
    if (existing.userId !== userId) {
      return NextResponse.json(
        { error: 'このダッシュボードを削除する権限がありません。' },
        { status: 403 }
      );
    }

    await deleteDashboard(dashboardId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete dashboard error:', error);
    return NextResponse.json({ error: 'ダッシュボードの削除に失敗しました。' }, { status: 500 });
  }
}
