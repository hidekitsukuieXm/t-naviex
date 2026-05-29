/**
 * ベースライン承認API
 * POST /api/projects/[id]/test-specs/[testSpecId]/baselines/[baselineId]/approve - ベースラインを承認
 */

import { NextRequest, NextResponse } from 'next/server';
import { approveBaseline } from '@/repositories/baseline-repository';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; testSpecId: string; baselineId: string }>;
}

/**
 * ベースラインを承認
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { testSpecId, baselineId } = await params;

    const baseline = await approveBaseline(testSpecId, baselineId, session.user.id);

    return NextResponse.json(baseline);
  } catch (error) {
    console.error('Failed to approve baseline:', error);
    if (error instanceof Error) {
      if (error.message.includes('見つかりません')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('承認できます')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'ベースラインの承認に失敗しました' }, { status: 500 });
  }
}
