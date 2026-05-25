/**
 * テストラン API
 * GET  /api/projects/[id]/test-runs - テストラン一覧取得
 * POST /api/projects/[id]/test-runs - テストラン作成
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  projectExists,
  milestoneExistsInProject,
  configurationExistsInProject,
  getTestRuns,
  createTestRun,
} from '@/lib/repositories/test-run-repository';
import { validateCreateTestRunInput, type TestRunStatus } from '@/types/test-run';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/test-runs - テストラン一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // クエリパラメータを解析
    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get('milestoneId');
    const configurationId = searchParams.get('configurationId');
    const status = searchParams.get('status');
    const query = searchParams.get('query');

    const testRuns = await getTestRuns(projectId, {
      milestoneId: milestoneId === 'null' ? null : milestoneId || undefined,
      configurationId: configurationId === 'null' ? null : configurationId || undefined,
      status: (status as TestRunStatus) || undefined,
      query: query || undefined,
    });

    return NextResponse.json(testRuns);
  } catch (error) {
    console.error('Get test runs error:', error);
    return NextResponse.json({ error: 'テストランの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/test-runs - テストラン作成
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateCreateTestRunInput({ ...body, projectId });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // マイルストーンの存在確認
    if (validation.data!.milestoneId) {
      const milestoneExists = await milestoneExistsInProject(
        BigInt(projectId),
        BigInt(validation.data!.milestoneId)
      );
      if (!milestoneExists) {
        return NextResponse.json({ error: 'マイルストーンが見つかりません。' }, { status: 404 });
      }
    }

    // コンフィギュレーションの存在確認
    if (validation.data!.configurationId) {
      const configExists = await configurationExistsInProject(
        BigInt(projectId),
        BigInt(validation.data!.configurationId)
      );
      if (!configExists) {
        return NextResponse.json(
          { error: 'コンフィギュレーションが見つかりません。' },
          { status: 404 }
        );
      }
    }

    // テストラン作成
    const testRun = await createTestRun(validation.data!);

    return NextResponse.json(testRun, { status: 201 });
  } catch (error) {
    console.error('Create test run error:', error);
    return NextResponse.json({ error: 'テストランの作成に失敗しました。' }, { status: 500 });
  }
}
