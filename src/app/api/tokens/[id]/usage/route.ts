import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getApiTokenById,
  getTokenUsageLogs,
  getTokenUsageStats,
} from '@/lib/repositories/api-token-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tokens/[id]/usage - トークンの使用履歴と統計を取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const tokenId = BigInt(id);

    // トークンの存在確認と所有者確認
    const token = await getApiTokenById(tokenId);
    if (!token) {
      return NextResponse.json({ error: 'トークンが見つかりません。' }, { status: 404 });
    }

    // 自分のトークンまたは管理者のみアクセス可能
    if (token.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'stats';
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (view === 'logs') {
      // 使用ログ一覧
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
      const method = searchParams.get('method') || undefined;
      const endpoint = searchParams.get('endpoint') || undefined;
      const statusCode = searchParams.get('statusCode')
        ? parseInt(searchParams.get('statusCode')!, 10)
        : undefined;

      const startDate = searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined;
      const endDate = searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined;

      const logs = await getTokenUsageLogs({
        tokenId,
        method,
        endpoint,
        statusCode,
        startDate,
        endDate,
        page,
        limit,
      });

      return NextResponse.json(logs);
    } else {
      // 使用統計
      const stats = await getTokenUsageStats(tokenId, days);
      return NextResponse.json(stats);
    }
  } catch (error) {
    console.error('Get token usage error:', error);
    return NextResponse.json({ error: '使用履歴の取得に失敗しました。' }, { status: 500 });
  }
}
