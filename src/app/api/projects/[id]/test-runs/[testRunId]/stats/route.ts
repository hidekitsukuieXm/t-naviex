/**
 * テストラン統計 API
 * GET /api/projects/[id]/test-runs/[testRunId]/stats - テストラン進捗統計取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestRunProgress,
  getTestRunDailyExecutions,
  getTestRunCumulativeProgress,
  getTestRunBurndownData,
} from '@/repositories/stats-repository';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string }>;
}

// GET /api/projects/[id]/test-runs/[testRunId]/stats
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { testRunId } = await params;
    const testRunIdBigInt = BigInt(testRunId);

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'progress';

    switch (type) {
      case 'daily': {
        const daysParam = searchParams.get('days');
        const days = daysParam ? parseInt(daysParam, 10) : 30;
        const daily = await getTestRunDailyExecutions(testRunIdBigInt, days);
        return NextResponse.json({ daily });
      }

      case 'cumulative': {
        const daysParam = searchParams.get('days');
        const days = daysParam ? parseInt(daysParam, 10) : 30;
        const cumulative = await getTestRunCumulativeProgress(testRunIdBigInt, days);
        return NextResponse.json({ cumulative });
      }

      case 'burndown': {
        const burndown = await getTestRunBurndownData(testRunIdBigInt);
        return NextResponse.json({ burndown });
      }

      case 'progress':
      default: {
        const progress = await getTestRunProgress(testRunIdBigInt);
        return NextResponse.json({ progress });
      }
    }
  } catch (error) {
    console.error('Get test run stats error:', error);
    return NextResponse.json({ error: '統計情報の取得に失敗しました。' }, { status: 500 });
  }
}
