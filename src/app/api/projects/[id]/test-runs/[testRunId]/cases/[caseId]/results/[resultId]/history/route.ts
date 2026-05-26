/**
 * テスト結果編集履歴 API
 * GET /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results/[resultId]/history - 編集履歴取得
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestResultHistories,
  testResultExists,
  testRunCaseExists,
} from '@/lib/repositories/test-result-repository';
import { projectExists, testRunExistsInProject } from '@/lib/repositories/test-run-repository';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string; caseId: string; resultId: string }>;
}

// GET /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results/[resultId]/history
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, testRunId, caseId, resultId } = await params;

    if (!projectId || !testRunId || !caseId || !resultId) {
      return NextResponse.json(
        { error: 'プロジェクトID、テストランID、ケースID、結果IDは必須です。' },
        { status: 400 }
      );
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // テストランの存在確認
    const testRunExistsResult = await testRunExistsInProject(BigInt(projectId), BigInt(testRunId));
    if (!testRunExistsResult) {
      return NextResponse.json({ error: 'テストランが見つかりません。' }, { status: 404 });
    }

    // テストランケースの存在確認
    const caseExists = await testRunCaseExists(BigInt(caseId));
    if (!caseExists) {
      return NextResponse.json({ error: 'テストランケースが見つかりません。' }, { status: 404 });
    }

    // テスト結果の存在確認
    const resultExists = await testResultExists(BigInt(resultId));
    if (!resultExists) {
      return NextResponse.json({ error: 'テスト結果が見つかりません。' }, { status: 404 });
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const { data, total } = await getTestResultHistories(BigInt(resultId), { limit, offset });

    return NextResponse.json({
      data,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get test result history error:', error);
    return NextResponse.json({ error: '履歴の取得に失敗しました。' }, { status: 500 });
  }
}
