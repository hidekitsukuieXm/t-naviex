/**
 * Test Case Edit History Compare API
 *
 * GET /api/test-cases/[testCaseId]/edit-history/compare - 編集履歴またはバージョン間の比較
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  compareEditHistories,
  compareTestCaseSnapshots,
} from '@/repositories/edit-history-repository';

type RouteParams = {
  params: Promise<{ testCaseId: string }>;
};

/**
 * GET: 編集履歴またはバージョン間を比較
 *
 * Query params:
 * - type: 'history' | 'version' (比較タイプ)
 * - sourceId: 比較元ID
 * - targetId: 比較先ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'version';
    const sourceId = searchParams.get('sourceId');
    const targetId = searchParams.get('targetId');

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'sourceId と targetId が必要です' }, { status: 400 });
    }

    let comparison;

    if (type === 'history') {
      // 編集履歴間の比較
      comparison = await compareEditHistories(sourceId, targetId);
    } else {
      // バージョン間の比較
      comparison = await compareTestCaseSnapshots(testCaseId, sourceId, targetId);
    }

    if (!comparison) {
      return NextResponse.json({ error: '比較対象が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Failed to compare:', error);
    return NextResponse.json({ error: '比較に失敗しました' }, { status: 500 });
  }
}
