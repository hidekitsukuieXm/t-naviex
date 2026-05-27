/**
 * Test Case Edit History API
 *
 * GET /api/test-cases/[testCaseId]/edit-history - 編集履歴一覧取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEditHistories } from '@/repositories/edit-history-repository';

type RouteParams = {
  params: Promise<{ testCaseId: string }>;
};

/**
 * GET: 編集履歴一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getEditHistories(testCaseId, { limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get edit histories:', error);
    return NextResponse.json({ error: '編集履歴の取得に失敗しました' }, { status: 500 });
  }
}
