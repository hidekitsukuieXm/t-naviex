/**
 * クロスプロジェクトレポート API
 * GET /api/reports/cross-project - 複数プロジェクト横断集計
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getCrossProjectSummary,
  getCrossProjectUserWorkload,
  getCrossProjectComparison,
} from '@/repositories/stats-repository';

// GET /api/reports/cross-project
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'summary';
    const projectIdsParam = searchParams.get('projectIds');
    const daysParam = searchParams.get('days');

    // プロジェクトIDをパース
    const projectIds = projectIdsParam
      ? projectIdsParam.split(',').map((id) => BigInt(id.trim()))
      : undefined;

    const days = daysParam ? parseInt(daysParam, 10) : 30;

    switch (type) {
      case 'summary': {
        const summary = await getCrossProjectSummary(projectIds);
        return NextResponse.json({ summary });
      }

      case 'user-workload': {
        const userWorkload = await getCrossProjectUserWorkload(projectIds, days);
        return NextResponse.json({ userWorkload });
      }

      case 'comparison': {
        const comparison = await getCrossProjectComparison(projectIds);
        return NextResponse.json({ comparison });
      }

      default:
        return NextResponse.json({ error: '不正なタイプです。' }, { status: 400 });
    }
  } catch (error) {
    console.error('Get cross-project report error:', error);
    return NextResponse.json(
      { error: 'クロスプロジェクトレポートの取得に失敗しました。' },
      { status: 500 }
    );
  }
}
