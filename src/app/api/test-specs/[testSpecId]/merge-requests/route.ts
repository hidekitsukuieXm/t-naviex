import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createMergeRequest, getMergeRequests } from '@/repositories/branch-repository';
import { MergeStatus } from '@/types/branch';

interface RouteParams {
  params: Promise<{ testSpecId: string }>;
}

// GET /api/test-specs/[testSpecId]/merge-requests - マージリクエスト一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { testSpecId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as MergeStatus | null;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const result = await getMergeRequests(testSpecId, {
      ...(status && { status }),
      ...(limit && { limit: parseInt(limit, 10) }),
      ...(offset && { offset: parseInt(offset, 10) }),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get merge requests error:', error);
    return NextResponse.json(
      { error: 'マージリクエスト一覧の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// POST /api/test-specs/[testSpecId]/merge-requests - マージリクエスト作成
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { testSpecId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.sourceBranchId) {
      return NextResponse.json({ error: 'ソースブランチIDは必須です。' }, { status: 400 });
    }

    if (!body.targetBranchId) {
      return NextResponse.json({ error: 'ターゲットブランチIDは必須です。' }, { status: 400 });
    }

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'タイトルは必須です。' }, { status: 400 });
    }

    if (body.sourceBranchId === body.targetBranchId) {
      return NextResponse.json(
        { error: 'ソースとターゲットは異なるブランチを指定してください。' },
        { status: 400 }
      );
    }

    const mergeRequest = await createMergeRequest(testSpecId, session.user.id, {
      sourceBranchId: body.sourceBranchId,
      targetBranchId: body.targetBranchId,
      title: body.title,
      description: body.description,
    });

    return NextResponse.json(mergeRequest, { status: 201 });
  } catch (error) {
    console.error('Create merge request error:', error);
    return NextResponse.json({ error: 'マージリクエストの作成に失敗しました。' }, { status: 500 });
  }
}
