/**
 * ダッシュボード共有 API
 * POST /api/dashboards/[id]/share - 共有トークン生成
 * DELETE /api/dashboards/[id]/share - 共有トークン無効化
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getDashboardById,
  generateShareToken,
  revokeShareToken,
} from '@/repositories/dashboard-repository';
import { toDashboardSafe } from '@/types/dashboard';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/dashboards/[id]/share - 共有トークン生成
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
        { error: 'このダッシュボードの共有設定を変更する権限がありません。' },
        { status: 403 }
      );
    }

    const token = await generateShareToken(dashboardId);
    const updatedDashboard = await getDashboardById(dashboardId);

    return NextResponse.json({
      shareToken: token,
      dashboard: toDashboardSafe(updatedDashboard!),
    });
  } catch (error) {
    console.error('Generate share token error:', error);
    return NextResponse.json({ error: '共有トークンの生成に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/dashboards/[id]/share - 共有トークン無効化
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
        { error: 'このダッシュボードの共有設定を変更する権限がありません。' },
        { status: 403 }
      );
    }

    await revokeShareToken(dashboardId);
    const updatedDashboard = await getDashboardById(dashboardId);

    return NextResponse.json({
      dashboard: toDashboardSafe(updatedDashboard!),
    });
  } catch (error) {
    console.error('Revoke share token error:', error);
    return NextResponse.json({ error: '共有トークンの無効化に失敗しました。' }, { status: 500 });
  }
}
