/**
 * 個別コメント API
 * GET    /api/comments/[id] - コメント取得
 * PATCH  /api/comments/[id] - コメント更新
 * DELETE /api/comments/[id] - コメント削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getCommentById,
  updateComment,
  deleteComment,
} from '@/lib/repositories/comment-repository';
import { validateCommentContent } from '@/types/comment';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/comments/[id]
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'コメントIDは必須です。' }, { status: 400 });
    }

    const comment = await getCommentById(id);

    if (!comment) {
      return NextResponse.json({ error: 'コメントが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Get comment error:', error);
    return NextResponse.json({ error: 'コメントの取得に失敗しました。' }, { status: 500 });
  }
}

// PATCH /api/comments/[id]
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'コメントIDは必須です。' }, { status: 400 });
    }

    const body = await request.json();
    const { content, mentionUserIds } = body;

    if (!content) {
      return NextResponse.json({ error: 'contentは必須です。' }, { status: 400 });
    }

    const contentValidation = validateCommentContent(content);
    if (!contentValidation.valid) {
      return NextResponse.json({ error: contentValidation.error }, { status: 400 });
    }

    const comment = await updateComment(id, { content, mentionUserIds }, session.user.id);

    if (!comment) {
      return NextResponse.json({ error: 'コメントが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Update comment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'コメントの更新に失敗しました。';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE /api/comments/[id]
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'コメントIDは必須です。' }, { status: 400 });
    }

    const result = await deleteComment(id, session.user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'コメントの削除に失敗しました。' }, { status: 500 });
  }
}
