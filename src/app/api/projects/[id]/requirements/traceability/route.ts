/**
 * トレーサビリティマトリクス API
 * GET /api/projects/[id]/requirements/traceability - トレーサビリティマトリクス取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTraceabilityMatrix } from '@/repositories/requirement-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/requirements/traceability
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);

    const matrix = await getTraceabilityMatrix(projectId);

    return NextResponse.json({
      matrix: matrix.map((row) => ({
        requirement: {
          id: row.requirement.id.toString(),
          code: row.requirement.code,
          title: row.requirement.title,
          type: row.requirement.type,
          status: row.requirement.status,
          priority: row.requirement.priority,
        },
        testCases: row.testCases.map((tc) => ({
          id: tc.id.toString(),
          title: tc.title,
          testSpecId: tc.testSpecId.toString(),
          testSpecTitle: tc.testSpecTitle,
        })),
      })),
    });
  } catch (error) {
    console.error('Get traceability matrix error:', error);
    return NextResponse.json(
      { error: 'トレーサビリティマトリクスの取得に失敗しました。' },
      { status: 500 }
    );
  }
}
