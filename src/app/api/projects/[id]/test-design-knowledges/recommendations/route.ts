/**
 * Test Design Knowledge Recommendations API
 *
 * POST /api/projects/[id]/test-design-knowledges/recommendations - コンテキストに応じた推奨取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRecommendations } from '@/repositories/test-design-knowledge-repository';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/projects/[id]/test-design-knowledges/recommendations
 * コンテキストに基づいてテスト設計ナレッジを推奨
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const projectId = BigInt(id);

  try {
    const body = await request.json();
    const { testType, category, keywords, excludeIds, limit = 5 } = body;

    const context = {
      projectId,
      testType,
      category,
      keywords,
      excludeIds: excludeIds?.map((id: string | number) => BigInt(id)),
    };

    const recommendations = await getRecommendations(context, limit);

    return NextResponse.json({
      recommendations,
      context: {
        testType,
        category,
        keywords,
      },
    });
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}
