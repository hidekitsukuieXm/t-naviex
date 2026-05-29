/**
 * Bug Countermeasure Feedback API
 *
 * GET  /api/projects/[id]/bug-countermeasures/[countermeasureId]/feedback - ユーザーのフィードバック取得
 * POST /api/projects/[id]/bug-countermeasures/[countermeasureId]/feedback - フィードバック作成/更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createFeedback,
  updateFeedback,
  getUserFeedback,
  deleteFeedback,
} from '@/repositories/bug-countermeasure-repository';
import { validateRating } from '@/types/bug-countermeasure';

interface RouteParams {
  params: Promise<{
    id: string;
    countermeasureId: string;
  }>;
}

/**
 * GET /api/projects/[id]/bug-countermeasures/[countermeasureId]/feedback
 * 現在のユーザーのフィードバックを取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { countermeasureId } = await params;

  try {
    const feedback = await getUserFeedback(BigInt(countermeasureId), BigInt(session.user.id));

    if (!feedback) {
      return NextResponse.json({ feedback: null });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/bug-countermeasures/[countermeasureId]/feedback
 * フィードバックを作成または更新
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { countermeasureId } = await params;

  try {
    const body = await request.json();
    const { rating, comment, isHelpful } = body;

    // 評価のバリデーション
    if (rating !== undefined) {
      const ratingResult = validateRating(rating);
      if (!ratingResult.valid && ratingResult.error) {
        return NextResponse.json({ error: ratingResult.error }, { status: 400 });
      }
    }

    const userId = BigInt(session.user.id);
    const bcId = BigInt(countermeasureId);

    // 既存のフィードバックを確認
    const existingFeedback = await getUserFeedback(bcId, userId);

    let feedback;
    if (existingFeedback) {
      // 更新
      feedback = await updateFeedback(existingFeedback.id, {
        rating,
        comment,
        isHelpful,
      });
    } else {
      // 新規作成
      if (rating === undefined) {
        return NextResponse.json({ error: '評価は必須です' }, { status: 400 });
      }

      feedback = await createFeedback(bcId, {
        rating,
        comment,
        isHelpful,
        userId,
      });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Failed to save feedback:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/bug-countermeasures/[countermeasureId]/feedback
 * フィードバックを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { countermeasureId } = await params;

  try {
    const feedback = await getUserFeedback(BigInt(countermeasureId), BigInt(session.user.id));

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    await deleteFeedback(feedback.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete feedback:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
