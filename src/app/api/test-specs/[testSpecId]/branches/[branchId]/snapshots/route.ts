import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createSnapshot,
  getSnapshotHistory,
  getLatestSnapshot,
} from '@/repositories/branch-repository';

interface RouteParams {
  params: Promise<{ testSpecId: string; branchId: string }>;
}

// GET /api/test-specs/[testSpecId]/branches/[branchId]/snapshots - スナップショット一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { branchId } = await params;

    if (!branchId) {
      return NextResponse.json({ error: 'ブランチIDは必須です。' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const latest = searchParams.get('latest');

    // 最新のみ取得
    if (latest === 'true') {
      const snapshot = await getLatestSnapshot(branchId);
      return NextResponse.json(snapshot);
    }

    const result = await getSnapshotHistory(branchId, {
      ...(limit && { limit: parseInt(limit, 10) }),
      ...(offset && { offset: parseInt(offset, 10) }),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get snapshots error:', error);
    return NextResponse.json(
      { error: 'スナップショット一覧の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// POST /api/test-specs/[testSpecId]/branches/[branchId]/snapshots - スナップショット作成（コミット）
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { branchId } = await params;

    if (!branchId) {
      return NextResponse.json({ error: 'ブランチIDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.commitMessage || typeof body.commitMessage !== 'string') {
      return NextResponse.json({ error: 'コミットメッセージは必須です。' }, { status: 400 });
    }

    if (!body.testCases || !Array.isArray(body.testCases)) {
      return NextResponse.json(
        { error: 'テストケースは配列で指定してください。' },
        { status: 400 }
      );
    }

    const snapshot = await createSnapshot(branchId, session.user.id, {
      commitMessage: body.commitMessage,
      testCases: body.testCases,
    });

    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    console.error('Create snapshot error:', error);
    return NextResponse.json({ error: 'スナップショットの作成に失敗しました。' }, { status: 500 });
  }
}
