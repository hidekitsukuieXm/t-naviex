import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resolveConflict } from '@/repositories/branch-repository';
import { ResolutionType } from '@/types/branch';

interface RouteParams {
  params: Promise<{ testSpecId: string; mergeRequestId: string }>;
}

// POST /api/test-specs/[testSpecId]/merge-requests/[mergeRequestId]/resolve - コンフリクト解決
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { mergeRequestId } = await params;

    if (!mergeRequestId) {
      return NextResponse.json({ error: 'マージリクエストIDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.conflictId) {
      return NextResponse.json({ error: 'コンフリクトIDは必須です。' }, { status: 400 });
    }

    if (!body.resolutionType || !Object.values(ResolutionType).includes(body.resolutionType)) {
      return NextResponse.json({ error: '無効な解決タイプです。' }, { status: 400 });
    }

    // MANUAL_MERGEの場合はresolvedContentが必須
    if (body.resolutionType === ResolutionType.MANUAL_MERGE && !body.resolvedContent) {
      return NextResponse.json(
        { error: '手動マージの場合は解決後の内容が必須です。' },
        { status: 400 }
      );
    }

    const mergeRequest = await resolveConflict(mergeRequestId, session.user.id, {
      conflictId: body.conflictId,
      resolutionType: body.resolutionType,
      resolvedContent: body.resolvedContent,
      comment: body.comment,
    });

    if (!mergeRequest) {
      return NextResponse.json({ error: 'マージリクエストが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(mergeRequest);
  } catch (error) {
    console.error('Resolve conflict error:', error);
    return NextResponse.json({ error: 'コンフリクトの解決に失敗しました。' }, { status: 500 });
  }
}
