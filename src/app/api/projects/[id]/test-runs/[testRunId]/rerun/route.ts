/**
 * テストラン Re-Run API
 * POST /api/projects/[id]/test-runs/[testRunId]/rerun - Re-Run作成
 * GET /api/projects/[id]/test-runs/[testRunId]/rerun - Re-Run候補ケース数取得
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createReRun,
  projectExists,
  testRunExistsInProject,
  getTestRunCaseStatusCounts,
} from '@/lib/repositories/test-run-repository';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string }>;
}

// GET /api/projects/[id]/test-runs/[testRunId]/rerun
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

    return NextResponse.json({
      statusCounts,
      rerunCandidates: {
        failed: statusCounts.FAILED,
        blocked: statusCounts.BLOCKED,
        skipped: statusCounts.SKIPPED,
        retest: statusCounts.RETEST,
        total:
          statusCounts.FAILED + statusCounts.BLOCKED + statusCounts.SKIPPED + statusCounts.RETEST,
      },
    });
  } catch (error) {
    console.error('Get rerun candidates error:', error);
    return NextResponse.json({ error: 'Re-Run候補の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/test-runs/[testRunId]/rerun
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

    const body = await request.json();

    // バリデーション
    if (
      !body.includeStatuses ||
      !Array.isArray(body.includeStatuses) ||
      body.includeStatuses.length === 0
    ) {
      return NextResponse.json({ error: '対象ステータスを選択してください。' }, { status: 400 });
    }

    const validStatuses = ['FAILED', 'BLOCKED', 'SKIPPED', 'RETEST'];
    const invalidStatuses = body.includeStatuses.filter((s: string) => !validStatuses.includes(s));
    if (invalidStatuses.length > 0) {
      return NextResponse.json(
        { error: `無効なステータスが含まれています: ${invalidStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const newTestRun = await createReRun(BigInt(projectId), BigInt(testRunId), {
      name: body.name,
      description: body.description,
      includeStatuses: body.includeStatuses,
      assigneeId: body.assigneeId,
    });

    return NextResponse.json(newTestRun, { status: 201 });
  } catch (error) {
    console.error('Create rerun error:', error);
    const message = error instanceof Error ? error.message : 'Re-Runの作成に失敗しました。';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
