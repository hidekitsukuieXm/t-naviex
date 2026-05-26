/**
 * 共有ダッシュボード API (認証不要)
 * GET /api/dashboards/shared/[token] - 共有ダッシュボード取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDashboardByShareToken } from '@/repositories/dashboard-repository';
import { toDashboardSafe } from '@/types/dashboard';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET /api/dashboards/shared/[token] - 共有ダッシュボード取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token || token.length !== 64) {
      return NextResponse.json({ error: '無効な共有トークンです。' }, { status: 400 });
    }

    const dashboard = await getDashboardByShareToken(token);

    if (!dashboard) {
      return NextResponse.json({ error: 'ダッシュボードが見つかりません。' }, { status: 404 });
    }

    if (!dashboard.isPublic) {
      return NextResponse.json(
        { error: 'このダッシュボードは公開されていません。' },
        { status: 403 }
      );
    }

    return NextResponse.json({ dashboard: toDashboardSafe(dashboard) });
  } catch (error) {
    console.error('Get shared dashboard error:', error);
    return NextResponse.json({ error: 'ダッシュボードの取得に失敗しました。' }, { status: 500 });
  }
}
