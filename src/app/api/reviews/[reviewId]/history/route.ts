/**
 * Review History API
 *
 * レビュー履歴取得API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReviewHistory } from '@/repositories/review-repository';

interface RouteContext {
  params: Promise<{ reviewId: string }>;
}

/**
 * GET /api/reviews/[reviewId]/history
 * レビュー履歴を取得
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { reviewId } = await context.params;

    const histories = await getReviewHistory(reviewId);

    return NextResponse.json({ histories });
  } catch (error) {
    console.error('Failed to get review history:', error);
    return NextResponse.json({ error: 'レビュー履歴の取得に失敗しました' }, { status: 500 });
  }
}
