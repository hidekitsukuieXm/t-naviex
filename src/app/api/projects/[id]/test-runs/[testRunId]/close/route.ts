/**
 * テストランクローズ API
 * POST /api/projects/[id]/test-runs/[testRunId]/close - テストランをクローズ
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  closeTestRun,
  reopenTestRun,
  projectExists,
  testRunExistsInProject,
  getTestRunCaseStatusCounts,
} from '@/lib/repositories/test-run-repository';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string }>;
}

// GET /api/projects/[id]/test-runs/[testRunId]/close
// クローズ前の確認情報を取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, testRunId } = await params;

    if (!projectId || !testRunId) {
      return NextResponse.json(
        { error: 'プロジェクトIDとテストランIDは必須です。' },
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

    // ステータス別カウントを取得
    const statusCounts = await getTestRunCaseStatusCounts(BigInt(testRunId));
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const executed = total - statusCounts.NOT_RUN;
    const passRate = executed > 0 ? Math.round((statusCounts.PASSED / executed) * 100) : 0;

    return NextResponse.json({
      statusCounts,
      summary: {
        total,
        executed,
        notExecuted: statusCounts.NOT_RUN,
        passRate,
      },
    });
  } catch (error) {
    console.error('Get close info error:', error);
    return NextResponse.json({ error: 'クローズ情報の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/test-runs/[testRunId]/close
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, testRunId } = await params;

    if (!projectId || !testRunId) {
      return NextResponse.json(
        { error: 'プロジェクトIDとテストランIDは必須です。' },
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

    const body = await request.json().catch(() => ({}));

    const closedTestRun = await closeTestRun(BigInt(projectId), BigInt(testRunId), {
      notes: body.notes,
    });

    return NextResponse.json(closedTestRun);
  } catch (error) {
    console.error('Close test run error:', error);
    const message = error instanceof Error ? error.message : 'テストランのクローズに失敗しました。';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/test-runs/[testRunId]/close
// テストランを再オープン
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, testRunId } = await params;

    if (!projectId || !testRunId) {
      return NextResponse.json(
        { error: 'プロジェクトIDとテストランIDは必須です。' },
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

    const reopenedTestRun = await reopenTestRun(BigInt(projectId), BigInt(testRunId));

    return NextResponse.json(reopenedTestRun);
  } catch (error) {
    console.error('Reopen test run error:', error);
    const message =
      error instanceof Error ? error.message : 'テストランの再オープンに失敗しました。';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
