/**
 * ベースライン比較API
 * POST /api/projects/[id]/test-specs/[testSpecId]/baselines/compare - ベースラインを比較
 */

import { NextRequest, NextResponse } from 'next/server';
import { compareBaselines } from '@/repositories/baseline-repository';

interface RouteParams {
  params: Promise<{ id: string; testSpecId: string }>;
}

/**
 * ベースラインを比較
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { testSpecId } = await params;
    const body = await request.json();

    const { sourceBaselineId, targetBaselineId } = body;

    if (!sourceBaselineId || !targetBaselineId) {
      return NextResponse.json(
        { error: 'sourceBaselineIdとtargetBaselineIdは必須です' },
        { status: 400 }
      );
    }

    if (sourceBaselineId === targetBaselineId) {
      return NextResponse.json(
        { error: '同じベースラインを比較することはできません' },
        { status: 400 }
      );
    }

    const result = await compareBaselines(testSpecId, sourceBaselineId, targetBaselineId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to compare baselines:', error);
    if (error instanceof Error) {
      if (error.message.includes('見つかりません')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'ベースラインの比較に失敗しました' }, { status: 500 });
  }
}
