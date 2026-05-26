/**
 * 要求仕様カバレッジ API
 * GET /api/projects/[id]/requirements/coverage - カバレッジ統計取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getRequirementCoverage,
  getProjectCoverageStats,
} from '@/repositories/requirement-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/requirements/coverage
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);

    const searchParams = request.nextUrl.searchParams;
    const detail = searchParams.get('detail') === 'true';

    if (detail) {
      const coverage = await getRequirementCoverage(projectId);
      return NextResponse.json({
        coverage: coverage.map((c) => ({
          requirementId: c.requirementId.toString(),
          code: c.code,
          title: c.title,
          type: c.type,
          status: c.status,
          priority: c.priority,
          testCaseCount: c.testCaseCount,
          isCovered: c.isCovered,
        })),
      });
    }

    const stats = await getProjectCoverageStats(projectId);

    return NextResponse.json({
      stats: {
        totalRequirements: stats.totalRequirements,
        coveredRequirements: stats.coveredRequirements,
        uncoveredRequirements: stats.uncoveredRequirements,
        coveragePercentage: stats.coveragePercentage,
        byType: stats.byType,
        byPriority: stats.byPriority,
      },
    });
  } catch (error) {
    console.error('Get coverage error:', error);
    return NextResponse.json(
      { error: 'カバレッジの取得に失敗しました。' },
      { status: 500 }
    );
  }
}
