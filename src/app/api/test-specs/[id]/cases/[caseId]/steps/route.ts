import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createTestStep,
  createTestStepsBulk,
  getTestSteps,
  testCaseExists,
  isTestCaseLocked,
  hasReachedMaxSteps,
  getTestStepCount,
} from '@/lib/repositories/test-step-repository';
import { logTestStepCreate } from '@/lib/audit';
import {
  validateCreateTestStepInput,
  validateBulkCreateTestStepsInput,
  MAX_STEPS_PER_CASE,
} from '@/types/test-step';

interface RouteParams {
  params: Promise<{ id: string; caseId: string }>;
}

// GET /api/test-specs/[id]/cases/[caseId]/steps - テスト手順一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId: testCaseId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!testCaseId) {
      return NextResponse.json({ error: 'テストケースIDは必須です。' }, { status: 400 });
    }

    // テストケースの存在確認
    const exists = await testCaseExists(BigInt(testCaseId));
    if (!exists) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    const steps = await getTestSteps({
      testCaseId,
      query: query ?? undefined,
    });

    return NextResponse.json({ steps });
  } catch (error) {
    console.error('Get test steps error:', error);
    return NextResponse.json({ error: 'テスト手順一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/test-specs/[id]/cases/[caseId]/steps - テスト手順作成
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId: testCaseId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!testCaseId) {
      return NextResponse.json({ error: 'テストケースIDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // テストケースの存在確認
    const exists = await testCaseExists(BigInt(testCaseId));
    if (!exists) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // ロック状態確認
    const locked = await isTestCaseLocked(BigInt(testCaseId));
    if (locked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書にテスト手順を追加できません。' },
        { status: 403 }
      );
    }

    // 一括作成の場合
    if (body.steps && Array.isArray(body.steps)) {
      // バリデーション
      const validation = validateBulkCreateTestStepsInput({
        testCaseId,
        steps: body.steps,
      });

      if (!validation.valid) {
        return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
      }

      // 手順数上限チェック
      const currentCount = await getTestStepCount(BigInt(testCaseId));
      if (currentCount + body.steps.length > MAX_STEPS_PER_CASE) {
        return NextResponse.json(
          { error: `手順数が上限（${MAX_STEPS_PER_CASE}件）を超えます。` },
          { status: 400 }
        );
      }

      const steps = await createTestStepsBulk(testCaseId, body.steps);

      // 監査ログ（一括作成の場合は件数を記録）
      await logTestStepCreate(session.user.id, testCaseId, {
        testCaseId,
        bulkCreate: true,
        count: steps.length,
      });

      return NextResponse.json({ steps }, { status: 201 });
    }

    // 単一作成の場合
    // バリデーション
    const validation = validateCreateTestStepInput({
      testCaseId,
      stepNo: body.stepNo,
      actionMd: body.actionMd,
      expectedMd: body.expectedMd,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // 手順数上限チェック
    const reachedMax = await hasReachedMaxSteps(BigInt(testCaseId));
    if (reachedMax) {
      return NextResponse.json(
        { error: `手順数が上限（${MAX_STEPS_PER_CASE}件）に達しています。` },
        { status: 400 }
      );
    }

    const step = await createTestStep({
      testCaseId,
      stepNo: body.stepNo,
      actionMd: body.actionMd,
      expectedMd: body.expectedMd,
    });

    // 監査ログ
    await logTestStepCreate(session.user.id, step.id, {
      testCaseId,
      stepNo: step.stepNo,
      actionMd: step.actionMd.substring(0, 100),
    });

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    console.error('Create test step error:', error);
    return NextResponse.json({ error: 'テスト手順の作成に失敗しました。' }, { status: 500 });
  }
}
