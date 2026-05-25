/**
 * テスト結果（実行履歴） API
 * GET /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results - 結果履歴取得
 * POST /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results - 結果登録
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestResultsByTestRunCase,
  createTestResult,
  testRunCaseExists,
} from '@/lib/repositories/test-result-repository';
import { updateTestRunCase } from '@/lib/repositories/test-run-case-repository';
import { projectExists, testRunExistsInProject } from '@/lib/repositories/test-run-repository';
import { TEST_RUN_CASE_STATUS } from '@/types/test-run-case';
import type { TestRunCaseStatus } from '@/types/test-run-case';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string; caseId: string }>;
}

// GET /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, testRunId, caseId } = await params;

    if (!projectId || !testRunId || !caseId) {
      return NextResponse.json(
        { error: 'プロジェクトID、テストランID、ケースIDは必須です。' },
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

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const results = await getTestResultsByTestRunCase(BigInt(caseId), { limit, offset });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Get test results error:', error);
    return NextResponse.json({ error: '結果履歴の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/test-runs/[testRunId]/cases/[caseId]/results
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, testRunId, caseId } = await params;

    if (!projectId || !testRunId || !caseId) {
      return NextResponse.json(
        { error: 'プロジェクトID、テストランID、ケースIDは必須です。' },
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

    const body = await request.json();

    // ステータスのバリデーション
    if (!body.status) {
      return NextResponse.json({ error: 'ステータスは必須です。' }, { status: 400 });
    }

    const validStatuses = Object.values(TEST_RUN_CASE_STATUS);
    if (!validStatuses.includes(body.status as TestRunCaseStatus)) {
      return NextResponse.json(
        { error: `ステータスは次のいずれかである必要があります: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // テスト結果を作成
    const result = await createTestResult({
      testRunCaseId: caseId,
      executedById: session.user.id,
      status: body.status as TestRunCaseStatus,
      executionTime: body.executionTime ?? null,
      actualResult: body.actualResult ?? null,
      defects: body.defects ?? null,
      comment: body.comment ?? null,
      environment: body.environment ?? null,
      browserInfo: body.browserInfo ?? null,
    });

    // テストランケースのステータスも更新
    await updateTestRunCase(BigInt(caseId), {
      status: body.status as TestRunCaseStatus,
      executedAt: new Date().toISOString(),
      executionTime: body.executionTime ?? null,
      actualResult: body.actualResult ?? null,
      defects: body.defects ?? null,
      comment: body.comment ?? null,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Create test result error:', error);
    return NextResponse.json({ error: '結果の登録に失敗しました。' }, { status: 500 });
  }
}
