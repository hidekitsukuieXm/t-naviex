/**
 * Test Design Knowledge Feedback API
 *
 * GET  /api/projects/[id]/test-design-knowledges/[knowledgeId]/feedback - ユーザーのフィードバック取得
 * POST /api/projects/[id]/test-design-knowledges/[knowledgeId]/feedback - フィードバック作成/更新
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createFeedback,
  updateFeedback,
  getUserFeedback,
  deleteFeedback,
} from '@/repositories/test-design-knowledge-repository';
import { validateRating } from '@/types/test-design-knowledge';

interface RouteParams {
  params: Promise<{
    id: string;
    knowledgeId: string;
  }>;
}

/**
 * GET /api/projects/[id]/test-design-knowledges/[knowledgeId]/feedback
 * 現在のユーザーのフィードバックを取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { knowledgeId } = await params;

  try {
    const feedback = await getUserFeedback(BigInt(knowledgeId), BigInt(session.user.id));

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
 * POST /api/projects/[id]/test-design-knowledges/[knowledgeId]/feedback
 * フィードバックを作成または更新
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { knowledgeId } = await params;

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
    const tdkId = BigInt(knowledgeId);

    // 既存のフィードバックを確認
    const existingFeedback = await getUserFeedback(tdkId, userId);

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

      feedback = await createFeedback(tdkId, {
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
 * DELETE /api/projects/[id]/test-design-knowledges/[knowledgeId]/feedback
 * フィードバックを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { knowledgeId } = await params;

  try {
    const feedback = await getUserFeedback(BigInt(knowledgeId), BigInt(session.user.id));

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
