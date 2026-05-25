/**
 * テスト結果個別 API
 * GET /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results/[resultId] - 結果詳細取得
 * DELETE /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results/[resultId] - 結果削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestResultDetail,
  deleteTestResult,
  testRunCaseExists,
} from '@/lib/repositories/test-result-repository';
import { projectExists, testRunExistsInProject } from '@/lib/repositories/test-run-repository';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string; caseId: string; resultId: string }>;
}

// GET /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results/[resultId]
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

    const result = await getTestResultDetail(BigInt(resultId));

    if (!result) {
      return NextResponse.json({ error: 'テスト結果が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get test result error:', error);
    return NextResponse.json({ error: '結果の取得に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results/[resultId]
export async function DELETE(request: Request, { params }: RouteParams) {
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

    const deleted = await deleteTestResult(BigInt(resultId));

    if (!deleted) {
      return NextResponse.json({ error: 'テスト結果が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test result error:', error);
    return NextResponse.json({ error: '結果の削除に失敗しました。' }, { status: 500 });
  }
}
