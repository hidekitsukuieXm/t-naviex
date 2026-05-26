/**
 * バグコメント API
 * GET /api/projects/[id]/bugs/[bugId]/comments - コメント一覧取得
 * POST /api/projects/[id]/bugs/[bugId]/comments - コメント作成
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bugExistsInProject, projectExists } from '@/lib/repositories/bug-repository';
import { listBugComments, createBugComment } from '@/lib/repositories/bug-comment-repository';
import { validateCreateBugCommentInput } from '@/types/bug-comment';

interface RouteParams {
  params: Promise<{ id: string; bugId: string }>;
}

// GET /api/projects/[id]/bugs/[bugId]/comments
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, bugId } = await params;

    if (!projectId || !bugId) {
      return NextResponse.json({ error: 'プロジェクトIDとバグIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // バグの存在確認
    const bugExistsResult = await bugExistsInProject(BigInt(projectId), BigInt(bugId));
    if (!bugExistsResult) {
      return NextResponse.json({ error: 'バグが見つかりません。' }, { status: 404 });
    }

    // クエリパラメータ
    const { searchParams } = new URL(request.url);
    const includeInternal = searchParams.get('includeInternal') === 'true';

    const comments = await listBugComments(BigInt(bugId), { includeInternal });

    // BigIntをシリアライズ
    const serializedComments = comments.map((comment) => ({
      ...comment,
      id: comment.id.toString(),
      bugId: comment.bugId.toString(),
      authorId: comment.authorId.toString(),
      parentId: comment.parentId?.toString() || null,
      author: comment.author ? { ...comment.author, id: comment.author.id.toString() } : undefined,
      replies: comment.replies?.map((reply) => ({
        ...reply,
        id: reply.id.toString(),
        bugId: reply.bugId.toString(),
        authorId: reply.authorId.toString(),
        parentId: reply.parentId?.toString() || null,
      })),
    }));

    return NextResponse.json({ comments: serializedComments });
  } catch (error) {
    console.error('List bug comments error:', error);
    return NextResponse.json({ error: 'コメントの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/bugs/[bugId]/comments
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, bugId } = await params;

    if (!projectId || !bugId) {
      return NextResponse.json({ error: 'プロジェクトIDとバグIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // バグの存在確認
    const bugExistsResult = await bugExistsInProject(BigInt(projectId), BigInt(bugId));
    if (!bugExistsResult) {
      return NextResponse.json({ error: 'バグが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 入力値の検証
    const validation = validateCreateBugCommentInput({
      ...body,
      bugId: BigInt(bugId),
      authorId: BigInt(session.user.id),
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const comment = await createBugComment(validation.data!);

    // BigIntをシリアライズ
    const serializedComment = {
      ...comment,
      id: comment.id.toString(),
      bugId: comment.bugId.toString(),
      authorId: comment.authorId.toString(),
      parentId: comment.parentId?.toString() || null,
    };

    return NextResponse.json(serializedComment, { status: 201 });
  } catch (error) {
    console.error('Create bug comment error:', error);
    return NextResponse.json({ error: 'コメントの作成に失敗しました。' }, { status: 500 });
  }
}
