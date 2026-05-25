/**
 * テストランケース一括更新 API
 * PATCH /api/projects/[id]/test-runs/[testRunId]/cases/bulk - テストランケース一括更新
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bulkUpdateTestRunCases, userExists } from '@/lib/repositories/test-run-case-repository';
import { projectExists, testRunExistsInProject } from '@/lib/repositories/test-run-repository';
import type { TestRunCaseStatus } from '@/types/test-run-case';
import { TEST_RUN_CASE_STATUS } from '@/types/test-run-case';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string }>;
}

// PATCH /api/projects/[id]/test-runs/[testRunId]/cases/bulk - テストランケース一括更新
export async function PATCH(request: Request, { params }: RouteParams) {
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
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: 'テストランケースIDの配列は必須です。' }, { status: 400 });
    }

    // ステータスのバリデーション
    if (body.status) {
      const validStatuses = Object.values(TEST_RUN_CASE_STATUS);
      if (!validStatuses.includes(body.status as TestRunCaseStatus)) {
        return NextResponse.json(
          { error: `ステータスは次のいずれかである必要があります: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // 担当者変更時のチェック
    if (body.assignedToId) {
      const userExistsResult = await userExists(BigInt(body.assignedToId));
      if (!userExistsResult) {
        return NextResponse.json({ error: '担当者が見つかりません。' }, { status: 404 });
      }
    }

    // 一括更新
    const updatedCases = await bulkUpdateTestRunCases({
      ids: body.ids,
      assignedToId: body.assignedToId !== undefined ? body.assignedToId : undefined,
      status: body.status,
      actualResult: body.actualResult,
      comment: body.comment,
      reproducibility: body.reproducibility,
    });

    return NextResponse.json({
      success: true,
      updatedCount: updatedCases.length,
      cases: updatedCases,
    });
  } catch (error) {
    console.error('Bulk update test run cases error:', error);
    return NextResponse.json(
      { error: 'テストランケースの一括更新に失敗しました。' },
      { status: 500 }
    );
  }
}
