/**
 * Bug Countermeasure Recommendations API
 *
 * POST /api/projects/[id]/bug-countermeasures/recommendations - コンテキストに応じた推奨取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRecommendations } from '@/repositories/bug-countermeasure-repository';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/projects/[id]/bug-countermeasures/recommendations
 * コンテキストに基づいてバグ対策ナレッジを推奨
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const projectId = BigInt(id);

  try {
    const body = await request.json();
    const { bugType, category, severityLevel, keywords, excludeIds, limit = 5 } = body;

    const context = {
      projectId,
      bugType,
      category,
      severityLevel,
      keywords,
      excludeIds: excludeIds?.map((id: string | number) => BigInt(id)),
    };

    const recommendations = await getRecommendations(context, limit);

    return NextResponse.json({
      recommendations,
      context: {
        bugType,
        category,
        keywords,
      },
    });
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}
