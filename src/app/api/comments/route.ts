/**
 * コメント API
 * GET  /api/comments?targetType=...&targetId=... - コメント一覧取得
 * POST /api/comments - コメント作成
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createComment, getCommentsByTarget } from '@/lib/repositories/comment-repository';
import {
  validateCommentContent,
  validateTargetType,
  type CommentTargetType,
} from '@/types/comment';

// GET /api/comments
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'targetTypeとtargetIdは必須です。' }, { status: 400 });
    }

    const targetTypeValidation = validateTargetType(targetType);
    if (!targetTypeValidation.valid) {
      return NextResponse.json({ error: targetTypeValidation.error }, { status: 400 });
    }

    const comments = await getCommentsByTarget(targetType as CommentTargetType, targetId);

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: 'コメント一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/comments
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();
    const { targetType, targetId, parentId, content, mentionUserIds } = body;

    if (!targetType || !targetId || !content) {
      return NextResponse.json(
        { error: 'targetType、targetId、contentは必須です。' },
        { status: 400 }
      );
    }

    const targetTypeValidation = validateTargetType(targetType);
    if (!targetTypeValidation.valid) {
      return NextResponse.json({ error: targetTypeValidation.error }, { status: 400 });
    }

    const contentValidation = validateCommentContent(content);
    if (!contentValidation.valid) {
      return NextResponse.json({ error: contentValidation.error }, { status: 400 });
    }

    const comment = await createComment(
      {
        targetType,
        targetId,
        parentId: parentId || null,
        content,
        mentionUserIds,
      },
      session.user.id
    );

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ error: 'コメントの作成に失敗しました。' }, { status: 500 });
  }
}
