/**
 * プロジェクト統計 API
 * GET /api/projects/[id]/stats - プロジェクトのテスト進捗・バグ統計取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProjectTestProgress,
  getProjectBugStats,
  getProjectSummary,
  getDailyTestExecutions,
  getTeamExecutionStats,
  getCumulativeTestProgress,
  getCumulativeBugData,
} from '@/repositories/stats-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/stats
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'summary';

    switch (type) {
      case 'progress':
        const progress = await getProjectTestProgress(projectId);
        return NextResponse.json({ progress });

      case 'bugs':
        const bugs = await getProjectBugStats(projectId);
        return NextResponse.json({ bugs });

      case 'daily': {
        const daysParam = searchParams.get('days');
        const days = daysParam ? parseInt(daysParam, 10) : 30;
        const daily = await getDailyTestExecutions(projectId, days);
        return NextResponse.json({ daily });
      }

      case 'team': {
        const team = await getTeamExecutionStats(projectId);
        return NextResponse.json({ team });
      }

      case 'cumulative': {
        const daysParam = searchParams.get('days');
        const days = daysParam ? parseInt(daysParam, 10) : 30;
        const cumulative = await getCumulativeTestProgress(projectId, days);
        return NextResponse.json({ cumulative });
      }

      case 'bugs-cumulative': {
        const daysParam = searchParams.get('days');
        const days = daysParam ? parseInt(daysParam, 10) : 30;
        const bugsCumulative = await getCumulativeBugData(projectId, days);
        return NextResponse.json({ bugsCumulative });
      }

      case 'summary':
      default:
        const summary = await getProjectSummary(projectId);
        return NextResponse.json({ summary });
    }
  } catch (error) {
    console.error('Get project stats error:', error);
    return NextResponse.json({ error: '統計情報の取得に失敗しました。' }, { status: 500 });
  }
}
