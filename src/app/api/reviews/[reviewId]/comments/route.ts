/**
 * Review Comments API
 *
 * レビューコメントの一覧取得・追加API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getComments,
  addComment,
  resolveComment,
  unresolveComment,
  deleteComment,
} from '@/repositories/review-repository';
import type { CreateCommentRequest } from '@/types/review';

interface RouteContext {
  params: Promise<{ reviewId: string }>;
}

/**
 * GET /api/reviews/[reviewId]/comments
 * コメント一覧を取得
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { reviewId } = await context.params;

    const comments = await getComments(reviewId);

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Failed to get comments:', error);
    return NextResponse.json({ error: 'コメント一覧の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/reviews/[reviewId]/comments
 * コメントを追加
 */
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { reviewId } = await context.params;
    const body = await request.json();

    // TODO: 実際の認証からユーザーIDを取得
    const authorId = body.authorId || '1';

    const data: CreateCommentRequest = {
      content: body.content,
      lineRef: body.lineRef,
      parentId: body.parentId,
    };

    if (!data.content) {
      return NextResponse.json({ error: 'コメント内容は必須です' }, { status: 400 });
    }

    const comment = await addComment(reviewId, authorId, data);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Failed to add comment:', error);
    return NextResponse.json({ error: 'コメントの追加に失敗しました' }, { status: 500 });
  }
}

/**
 * PATCH /api/reviews/[reviewId]/comments
 * コメントを解決/未解決に変更
 */
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    await context.params; // reviewId not needed for resolve/unresolve
    const body = await request.json();

    const { commentId, action, userId } = body;

    if (!commentId) {
      return NextResponse.json({ error: 'コメントIDは必須です' }, { status: 400 });
    }

    let comment;
    if (action === 'resolve') {
      comment = await resolveComment(commentId, userId || '1');
    } else if (action === 'unresolve') {
      comment = await unresolveComment(commentId);
    } else {
      return NextResponse.json({ error: '無効なアクションです' }, { status: 400 });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Failed to update comment:', error);
    return NextResponse.json({ error: 'コメントの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/reviews/[reviewId]/comments
 * コメントを削除
 */
export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    await context.params; // reviewId not needed for delete
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json({ error: 'コメントIDは必須です' }, { status: 400 });
    }

    await deleteComment(commentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return NextResponse.json({ error: 'コメントの削除に失敗しました' }, { status: 500 });
  }
}
