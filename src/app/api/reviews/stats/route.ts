/**
 * Review Stats API
 *
 * レビュー統計取得API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReviewStats } from '@/repositories/review-repository';

/**
 * GET /api/reviews/stats
 * レビュー統計を取得
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId') || undefined;
    const requesterId = searchParams.get('requesterId') || undefined;
    const reviewerId = searchParams.get('reviewerId') || undefined;

    const stats = await getReviewStats({
      testCaseId,
      requesterId,
      reviewerId,
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Failed to get review stats:', error);
    return NextResponse.json({ error: 'レビュー統計の取得に失敗しました' }, { status: 500 });
  }
}
