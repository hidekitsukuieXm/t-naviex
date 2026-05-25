/**
 * テストラン個別 API
 * GET    /api/projects/[id]/test-runs/[testRunId] - テストラン取得
 * PUT    /api/projects/[id]/test-runs/[testRunId] - テストラン更新
 * DELETE /api/projects/[id]/test-runs/[testRunId] - テストラン削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  projectExists,
  testRunExistsInProject,
  milestoneExistsInProject,
  configurationExistsInProject,
  getTestRunById,
  updateTestRun,
  deleteTestRun,
} from '@/lib/repositories/test-run-repository';
import { validateUpdateTestRunInput } from '@/types/test-run';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string }>;
}

// GET /api/projects/[id]/test-runs/[testRunId] - テストラン取得
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

    // テストラン取得
    const testRun = await getTestRunById(BigInt(testRunId));

    if (!testRun) {
      return NextResponse.json({ error: 'テストランが見つかりません。' }, { status: 404 });
    }

    // プロジェクトに属しているか確認
    if (testRun.projectId !== projectId) {
      return NextResponse.json({ error: 'テストランが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(testRun);
  } catch (error) {
    console.error('Get test run error:', error);
    return NextResponse.json({ error: 'テストランの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/test-runs/[testRunId] - テストラン更新
export async function PUT(request: Request, { params }: RouteParams) {
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
    const validation = validateUpdateTestRunInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // マイルストーン変更時のチェック
    if (validation.data!.milestoneId) {
      const milestoneExists = await milestoneExistsInProject(
        BigInt(projectId),
        BigInt(validation.data!.milestoneId)
      );
      if (!milestoneExists) {
        return NextResponse.json({ error: 'マイルストーンが見つかりません。' }, { status: 404 });
      }
    }

    // コンフィギュレーション変更時のチェック
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

    // テストラン更新
    const testRun = await updateTestRun(BigInt(testRunId), validation.data!);

    if (!testRun) {
      return NextResponse.json({ error: 'テストランが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(testRun);
  } catch (error) {
    console.error('Update test run error:', error);
    return NextResponse.json({ error: 'テストランの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/test-runs/[testRunId] - テストラン削除
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

    // テストラン削除
    const result = await deleteTestRun(BigInt(testRunId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test run error:', error);
    return NextResponse.json({ error: 'テストランの削除に失敗しました。' }, { status: 500 });
  }
}
