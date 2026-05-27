/**
 * ベースラインロックAPI
 * POST /api/projects/[id]/test-specs/[testSpecId]/baselines/[baselineId]/lock - ベースラインをロック
 */

import { NextRequest, NextResponse } from 'next/server';
import { lockBaseline } from '@/repositories/baseline-repository';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; testSpecId: string; baselineId: string }>;
}

/**
 * ベースラインをロック
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { testSpecId, baselineId } = await params;

    const baseline = await lockBaseline(testSpecId, baselineId);

    return NextResponse.json(baseline);
  } catch (error) {
    console.error('Failed to lock baseline:', error);
    if (error instanceof Error) {
      if (error.message.includes('見つかりません')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('ロックできます')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'ベースラインのロックに失敗しました' }, { status: 500 });
  }
}
