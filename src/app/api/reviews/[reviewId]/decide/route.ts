/**
 * Review Decision API
 *
 * レビューの承認・却下API
 */

import { NextRequest, NextResponse } from 'next/server';
import { decideReview } from '@/repositories/review-repository';

interface RouteContext {
  params: Promise<{ reviewId: string }>;
}

/**
 * POST /api/reviews/[reviewId]/decide
 * レビューを承認または却下
 */
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { reviewId } = await context.params;
    const body = await request.json();

    // TODO: 実際の認証からユーザーIDを取得
    const userId = body.userId || '1';

    const { decision, comment } = body;

    if (!decision || !['approve', 'reject'].includes(decision)) {
      return NextResponse.json({ error: '決定（approve/reject）は必須です' }, { status: 400 });
    }

    const review = await decideReview(reviewId, userId, decision, comment);

    return NextResponse.json({
      review,
      message: decision === 'approve' ? 'レビューを承認しました' : 'レビューを却下しました',
    });
  } catch (error) {
    console.error('Failed to decide review:', error);
    return NextResponse.json({ error: 'レビューの決定に失敗しました' }, { status: 500 });
  }
}
