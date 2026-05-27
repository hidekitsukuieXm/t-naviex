/**
 * Test Case Version Compare API
 *
 * GET /api/test-cases/[testCaseId]/versions/compare - バージョン間を比較
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  compareTestCaseVersions,
  compareWithCurrentTestCase,
} from '@/repositories/test-case-version-repository';

type RouteParams = {
  params: Promise<{ testCaseId: string }>;
};

/**
 * GET: バージョン間を比較
 *
 * Query params:
 * - sourceVersionId: 比較元バージョンID（'current'で現在の状態）
 * - targetVersionId: 比較先バージョンID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const { searchParams } = new URL(request.url);
    const sourceVersionId = searchParams.get('sourceVersionId');
    const targetVersionId = searchParams.get('targetVersionId');

    if (!sourceVersionId || !targetVersionId) {
      return NextResponse.json(
        { error: 'sourceVersionId と targetVersionId が必要です' },
        { status: 400 }
      );
    }

    let comparison;

    if (sourceVersionId === 'current') {
      // 現在の状態とバージョンを比較
      comparison = await compareWithCurrentTestCase(testCaseId, targetVersionId);
    } else {
      // 2つのバージョン間を比較
      comparison = await compareTestCaseVersions(sourceVersionId, targetVersionId);
    }

    if (!comparison) {
      return NextResponse.json({ error: 'バージョンが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Failed to compare test case versions:', error);
    return NextResponse.json({ error: 'バージョン比較に失敗しました' }, { status: 500 });
  }
}
