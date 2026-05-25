/**
 * テストランケース個別 API
 * GET    /api/projects/[id]/test-runs/[testRunId]/cases/[caseId] - テストランケース取得
 * PUT    /api/projects/[id]/test-runs/[testRunId]/cases/[caseId] - テストランケース更新
 * DELETE /api/projects/[id]/test-runs/[testRunId]/cases/[caseId] - テストランケース削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  testRunCaseExistsInTestRun,
  userExists,
  getTestRunCaseById,
  updateTestRunCase,
  deleteTestRunCase,
} from '@/lib/repositories/test-run-case-repository';
import { projectExists, testRunExistsInProject } from '@/lib/repositories/test-run-repository';
import { validateUpdateTestRunCaseInput } from '@/types/test-run-case';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string; caseId: string }>;
}

// GET /api/projects/[id]/test-runs/[testRunId]/cases/[caseId] - テストランケース取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, testRunId, caseId } = await params;

    if (!projectId || !testRunId || !caseId) {
      return NextResponse.json(
        { error: 'プロジェクトID、テストランID、テストランケースIDは必須です。' },
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

    // テストランケース取得
    const testRunCase = await getTestRunCaseById(BigInt(caseId));

    if (!testRunCase) {
      return NextResponse.json({ error: 'テストランケースが見つかりません。' }, { status: 404 });
    }

    // テストランに属しているか確認
    if (testRunCase.testRunId !== testRunId) {
      return NextResponse.json({ error: 'テストランケースが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(testRunCase);
  } catch (error) {
    console.error('Get test run case error:', error);
    return NextResponse.json({ error: 'テストランケースの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/test-runs/[testRunId]/cases/[caseId] - テストランケース更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, testRunId, caseId } = await params;

    if (!projectId || !testRunId || !caseId) {
      return NextResponse.json(
        { error: 'プロジェクトID、テストランID、テストランケースIDは必須です。' },
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
    const testRunCaseExistsResult = await testRunCaseExistsInTestRun(
      BigInt(testRunId),
      BigInt(caseId)
    );
    if (!testRunCaseExistsResult) {
      return NextResponse.json({ error: 'テストランケースが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateUpdateTestRunCaseInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 担当者変更時のチェック
    if (validation.data!.assignedToId) {
      const userExistsResult = await userExists(BigInt(validation.data!.assignedToId));
      if (!userExistsResult) {
        return NextResponse.json({ error: '担当者が見つかりません。' }, { status: 404 });
      }
    }

    // テストランケース更新
    const testRunCase = await updateTestRunCase(BigInt(caseId), validation.data!);

    if (!testRunCase) {
      return NextResponse.json({ error: 'テストランケースが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(testRunCase);
  } catch (error) {
    console.error('Update test run case error:', error);
    return NextResponse.json({ error: 'テストランケースの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/test-runs/[testRunId]/cases/[caseId] - テストランケース削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, testRunId, caseId } = await params;

    if (!projectId || !testRunId || !caseId) {
      return NextResponse.json(
        { error: 'プロジェクトID、テストランID、テストランケースIDは必須です。' },
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
    const testRunCaseExistsResult = await testRunCaseExistsInTestRun(
      BigInt(testRunId),
      BigInt(caseId)
    );
    if (!testRunCaseExistsResult) {
      return NextResponse.json({ error: 'テストランケースが見つかりません。' }, { status: 404 });
    }

    // テストランケース削除
    const result = await deleteTestRunCase(BigInt(caseId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test run case error:', error);
    return NextResponse.json({ error: 'テストランケースの削除に失敗しました。' }, { status: 500 });
  }
}
