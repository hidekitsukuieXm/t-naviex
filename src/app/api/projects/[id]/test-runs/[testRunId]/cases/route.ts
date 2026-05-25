/**
 * テストランケース API
 * GET  /api/projects/[id]/test-runs/[testRunId]/cases - テストランケース一覧取得
 * POST /api/projects/[id]/test-runs/[testRunId]/cases - テストランケース作成（一括対応）
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  testCaseExists,
  userExists,
  testRunCaseAlreadyExists,
  getTestRunCases,
  createTestRunCase,
  bulkCreateTestRunCases,
} from '@/lib/repositories/test-run-case-repository';
import { projectExists, testRunExistsInProject } from '@/lib/repositories/test-run-repository';
import { validateCreateTestRunCaseInput, type TestRunCaseStatus } from '@/types/test-run-case';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string }>;
}

// GET /api/projects/[id]/test-runs/[testRunId]/cases - テストランケース一覧取得
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

    // クエリパラメータを解析
    const { searchParams } = new URL(request.url);
    const testCaseId = searchParams.get('testCaseId');
    const assignedToId = searchParams.get('assignedToId');
    const status = searchParams.get('status');
    const query = searchParams.get('query');

    const testRunCases = await getTestRunCases(testRunId, {
      testCaseId: testCaseId || undefined,
      assignedToId: assignedToId === 'null' ? null : assignedToId || undefined,
      status: (status as TestRunCaseStatus) || undefined,
      query: query || undefined,
    });

    return NextResponse.json(testRunCases);
  } catch (error) {
    console.error('Get test run cases error:', error);
    return NextResponse.json({ error: 'テストランケースの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/test-runs/[testRunId]/cases - テストランケース作成
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

    // 一括作成か単体作成かを判定
    if (body.testCaseIds && Array.isArray(body.testCaseIds)) {
      // 一括作成
      // テストケースの存在確認
      for (const testCaseId of body.testCaseIds) {
        const testCaseExistsResult = await testCaseExists(BigInt(testCaseId));
        if (!testCaseExistsResult) {
          return NextResponse.json(
            { error: `テストケースID ${testCaseId} が見つかりません。` },
            { status: 404 }
          );
        }

        // 既に追加済みか確認
        const alreadyExists = await testRunCaseAlreadyExists(BigInt(testRunId), BigInt(testCaseId));
        if (alreadyExists) {
          return NextResponse.json(
            { error: `テストケースID ${testCaseId} は既にテストランに追加されています。` },
            { status: 409 }
          );
        }
      }

      // 担当者の存在確認
      if (body.assignedToId) {
        const userExistsResult = await userExists(BigInt(body.assignedToId));
        if (!userExistsResult) {
          return NextResponse.json({ error: '担当者が見つかりません。' }, { status: 404 });
        }
      }

      const testRunCases = await bulkCreateTestRunCases({
        testRunId,
        testCaseIds: body.testCaseIds,
        assignedToId: body.assignedToId ?? null,
      });

      return NextResponse.json(testRunCases, { status: 201 });
    } else {
      // 単体作成
      const validation = validateCreateTestRunCaseInput({ ...body, testRunId });
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'バリデーションエラー', details: validation.errors },
          { status: 400 }
        );
      }

      // テストケースの存在確認
      const testCaseExistsResult = await testCaseExists(BigInt(validation.data!.testCaseId));
      if (!testCaseExistsResult) {
        return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
      }

      // 既に追加済みか確認
      const alreadyExists = await testRunCaseAlreadyExists(
        BigInt(testRunId),
        BigInt(validation.data!.testCaseId)
      );
      if (alreadyExists) {
        return NextResponse.json(
          { error: 'このテストケースは既にテストランに追加されています。' },
          { status: 409 }
        );
      }

      // 担当者の存在確認
      if (validation.data!.assignedToId) {
        const userExistsResult = await userExists(BigInt(validation.data!.assignedToId));
        if (!userExistsResult) {
          return NextResponse.json({ error: '担当者が見つかりません。' }, { status: 404 });
        }
      }

      const testRunCase = await createTestRunCase(validation.data!);

      return NextResponse.json(testRunCase, { status: 201 });
    }
  } catch (error) {
    console.error('Create test run case error:', error);
    return NextResponse.json({ error: 'テストランケースの作成に失敗しました。' }, { status: 500 });
  }
}
