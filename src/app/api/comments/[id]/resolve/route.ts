/**
 * コメント解決 API
 * PATCH /api/comments/[id]/resolve - コメントの解決状態を更新
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resolveComment } from '@/lib/repositories/comment-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/comments/[id]/resolve
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
    const { isResolved } = body;

    if (typeof isResolved !== 'boolean') {
      return NextResponse.json(
        { error: 'isResolvedはboolean型で指定してください。' },
        { status: 400 }
      );
    }

    const comment = await resolveComment(id, isResolved);

    if (!comment) {
      return NextResponse.json({ error: 'コメントが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Resolve comment error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'コメントの解決状態更新に失敗しました。';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
