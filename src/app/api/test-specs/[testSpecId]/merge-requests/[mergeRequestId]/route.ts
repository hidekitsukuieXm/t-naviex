import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMergeRequest, cancelMergeRequest } from '@/repositories/branch-repository';

interface RouteParams {
  params: Promise<{ testSpecId: string; mergeRequestId: string }>;
}

// GET /api/test-specs/[testSpecId]/merge-requests/[mergeRequestId] - マージリクエスト詳細取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { mergeRequestId } = await params;

    if (!mergeRequestId) {
      return NextResponse.json({ error: 'マージリクエストIDは必須です。' }, { status: 400 });
    }

    const mergeRequest = await getMergeRequest(mergeRequestId);

    if (!mergeRequest) {
      return NextResponse.json({ error: 'マージリクエストが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(mergeRequest);
  } catch (error) {
    console.error('Get merge request error:', error);
    return NextResponse.json({ error: 'マージリクエストの取得に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/test-specs/[testSpecId]/merge-requests/[mergeRequestId] - マージリクエストキャンセル
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { mergeRequestId } = await params;

    if (!mergeRequestId) {
      return NextResponse.json({ error: 'マージリクエストIDは必須です。' }, { status: 400 });
    }

    const mergeRequest = await cancelMergeRequest(mergeRequestId);

    if (!mergeRequest) {
      return NextResponse.json({ error: 'マージリクエストが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(mergeRequest);
  } catch (error) {
    console.error('Cancel merge request error:', error);
    return NextResponse.json(
      { error: 'マージリクエストのキャンセルに失敗しました。' },
      { status: 500 }
    );
  }
}
