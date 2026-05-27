import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { executeMerge, getMergeRequest } from '@/repositories/branch-repository';
import { MergeStatus } from '@/types/branch';

interface RouteParams {
  params: Promise<{ testSpecId: string; mergeRequestId: string }>;
}

// POST /api/test-specs/[testSpecId]/merge-requests/[mergeRequestId]/merge - マージ実行
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

    // マージリクエストの状態を確認
    const existingMergeRequest = await getMergeRequest(mergeRequestId);
    if (!existingMergeRequest) {
      return NextResponse.json({ error: 'マージリクエストが見つかりません。' }, { status: 404 });
    }

    if (existingMergeRequest.status === MergeStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'このマージリクエストは既に完了しています。' },
        { status: 400 }
      );
    }

    if (existingMergeRequest.status === MergeStatus.CANCELLED) {
      return NextResponse.json(
        { error: 'このマージリクエストはキャンセルされています。' },
        { status: 400 }
      );
    }

    const mergeRequest = await executeMerge(mergeRequestId, session.user.id);

    if (!mergeRequest) {
      return NextResponse.json({ error: 'マージリクエストが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(mergeRequest);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('未解決のコンフリクト')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes('スナップショットがありません')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('Execute merge error:', error);
    return NextResponse.json({ error: 'マージの実行に失敗しました。' }, { status: 500 });
  }
}
