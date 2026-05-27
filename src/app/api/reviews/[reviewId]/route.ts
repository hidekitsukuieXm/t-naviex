/**
 * Review API
 *
 * 個別レビューの取得・更新・削除API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getReview,
  updateReview,
  deleteReview,
  cancelReview,
  reopenReview,
} from '@/repositories/review-repository';
import type { UpdateReviewRequest } from '@/types/review';

interface RouteContext {
  params: Promise<{ reviewId: string }>;
}

/**
 * GET /api/reviews/[reviewId]
 * レビューを取得
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { reviewId } = await context.params;

    const review = await getReview(reviewId);

    if (!review) {
      return NextResponse.json({ error: 'レビューが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Failed to get review:', error);
    return NextResponse.json({ error: 'レビューの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * PATCH /api/reviews/[reviewId]
 * レビューを更新
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { reviewId } = await context.params;
    const body = await request.json();

    // TODO: 実際の認証からユーザーIDを取得
    const userId = body.userId || '1';

    // 特別なアクション
    if (body.action === 'cancel') {
      const review = await cancelReview(reviewId, userId);
      return NextResponse.json({ review });
    }

    if (body.action === 'reopen') {
      const review = await reopenReview(reviewId, userId);
      return NextResponse.json({ review });
    }

    const data: UpdateReviewRequest = {};

    if (body.reviewerId !== undefined) {
      data.reviewerId = body.reviewerId;
    }
    if (body.priority !== undefined) {
      data.priority = body.priority;
    }
    if (body.title !== undefined) {
      data.title = body.title;
    }
    if (body.description !== undefined) {
      data.description = body.description;
    }
    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate;
    }
    if (body.status !== undefined) {
      data.status = body.status;
    }

    const review = await updateReview(reviewId, userId, data);

    return NextResponse.json({ review });
  } catch (error) {
    console.error('Failed to update review:', error);
    return NextResponse.json({ error: 'レビューの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/reviews/[reviewId]
 * レビューを削除
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { reviewId } = await context.params;

    await deleteReview(reviewId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete review:', error);
    return NextResponse.json({ error: 'レビューの削除に失敗しました' }, { status: 500 });
  }
}
