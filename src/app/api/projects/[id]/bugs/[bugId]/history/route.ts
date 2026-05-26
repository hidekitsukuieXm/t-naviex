/**
 * バグ履歴 API
 * GET /api/projects/[id]/bugs/[bugId]/history - 変更履歴取得
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bugExistsInProject, projectExists } from '@/lib/repositories/bug-repository';
import { listBugHistories } from '@/lib/repositories/bug-comment-repository';

interface RouteParams {
  params: Promise<{ id: string; bugId: string }>;
}

// GET /api/projects/[id]/bugs/[bugId]/history
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

    const histories = await listBugHistories(BigInt(bugId));

    // BigIntをシリアライズ
    const serializedHistories = histories.map((history) => ({
      ...history,
      id: history.id.toString(),
      bugId: history.bugId.toString(),
      changedById: history.changedById.toString(),
      changedBy: history.changedBy
        ? { ...history.changedBy, id: history.changedBy.id.toString() }
        : undefined,
    }));

    return NextResponse.json({ histories: serializedHistories });
  } catch (error) {
    console.error('List bug history error:', error);
    return NextResponse.json({ error: '履歴の取得に失敗しました。' }, { status: 500 });
  }
}
