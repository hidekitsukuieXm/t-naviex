import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestStepById,
  updateTestStep,
  deleteTestStep,
  testCaseExists,
  isTestCaseLocked,
  isStepNoTaken,
} from '@/lib/repositories/test-step-repository';
import { logTestStepUpdate, logTestStepDelete } from '@/lib/audit';
import { validateUpdateTestStepInput } from '@/types/test-step';

interface RouteParams {
  params: Promise<{ id: string; caseId: string; stepId: string }>;
}

// GET /api/test-specs/[id]/cases/[caseId]/steps/[stepId] - テスト手順取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId: testCaseId, stepId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!testCaseId) {
      return NextResponse.json({ error: 'テストケースIDは必須です。' }, { status: 400 });
    }

    if (!stepId) {
      return NextResponse.json({ error: 'テスト手順IDは必須です。' }, { status: 400 });
    }

    // テストケースの存在確認
    const caseExists = await testCaseExists(BigInt(testCaseId));
    if (!caseExists) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    const step = await getTestStepById(BigInt(stepId));

    if (!step) {
      return NextResponse.json({ error: 'テスト手順が見つかりません。' }, { status: 404 });
    }

    // テストケースとの整合性チェック
    if (step.testCaseId !== testCaseId) {
      return NextResponse.json(
        { error: 'テスト手順は指定されたテストケースに属していません。' },
        { status: 400 }
      );
    }

    return NextResponse.json(step);
  } catch (error) {
    console.error('Get test step error:', error);
    return NextResponse.json({ error: 'テスト手順の取得に失敗しました。' }, { status: 500 });
  }
}

// PATCH /api/test-specs/[id]/cases/[caseId]/steps/[stepId] - テスト手順更新
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId: testCaseId, stepId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!testCaseId) {
      return NextResponse.json({ error: 'テストケースIDは必須です。' }, { status: 400 });
    }

    if (!stepId) {
      return NextResponse.json({ error: 'テスト手順IDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateUpdateTestStepInput({
      stepNo: body.stepNo,
      actionMd: body.actionMd,
      expectedMd: body.expectedMd,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // テストケースの存在確認
    const caseExists = await testCaseExists(BigInt(testCaseId));
    if (!caseExists) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // ロック状態確認
    const locked = await isTestCaseLocked(BigInt(testCaseId));
    if (locked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書のテスト手順は更新できません。' },
        { status: 403 }
      );
    }

    // 既存のテスト手順を取得
    const existingStep = await getTestStepById(BigInt(stepId));
    if (!existingStep) {
      return NextResponse.json({ error: 'テスト手順が見つかりません。' }, { status: 404 });
    }

    // テストケースとの整合性チェック
    if (existingStep.testCaseId !== testCaseId) {
      return NextResponse.json(
        { error: 'テスト手順は指定されたテストケースに属していません。' },
        { status: 400 }
      );
    }

    // 手順番号の重複チェック（変更される場合）
    if (body.stepNo !== undefined && body.stepNo !== existingStep.stepNo) {
      const stepNoTaken = await isStepNoTaken(BigInt(testCaseId), body.stepNo, BigInt(stepId));
      if (stepNoTaken) {
        return NextResponse.json(
          { error: '指定された手順番号は既に使用されています。' },
          { status: 409 }
        );
      }
    }

    const step = await updateTestStep(BigInt(stepId), {
      stepNo: body.stepNo,
      actionMd: body.actionMd,
      expectedMd: body.expectedMd,
    });

    if (!step) {
      return NextResponse.json({ error: 'テスト手順の更新に失敗しました。' }, { status: 500 });
    }

    // 監査ログ
    await logTestStepUpdate(session.user.id, stepId, {
      testCaseId,
      stepNo: step.stepNo,
      changes: body,
    });

    return NextResponse.json(step);
  } catch (error) {
    console.error('Update test step error:', error);
    return NextResponse.json({ error: 'テスト手順の更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/test-specs/[id]/cases/[caseId]/steps/[stepId] - テスト手順削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId: testCaseId, stepId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!testCaseId) {
      return NextResponse.json({ error: 'テストケースIDは必須です。' }, { status: 400 });
    }

    if (!stepId) {
      return NextResponse.json({ error: 'テスト手順IDは必須です。' }, { status: 400 });
    }

    // テストケースの存在確認
    const caseExists = await testCaseExists(BigInt(testCaseId));
    if (!caseExists) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // ロック状態確認
    const locked = await isTestCaseLocked(BigInt(testCaseId));
    if (locked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書のテスト手順は削除できません。' },
        { status: 403 }
      );
    }

    // 既存のテスト手順を取得
    const existingStep = await getTestStepById(BigInt(stepId));
    if (!existingStep) {
      return NextResponse.json({ error: 'テスト手順が見つかりません。' }, { status: 404 });
    }

    // テストケースとの整合性チェック
    if (existingStep.testCaseId !== testCaseId) {
      return NextResponse.json(
        { error: 'テスト手順は指定されたテストケースに属していません。' },
        { status: 400 }
      );
    }

    const result = await deleteTestStep(BigInt(stepId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    // 監査ログ
    await logTestStepDelete(session.user.id, stepId, {
      testCaseId,
      stepNo: existingStep.stepNo,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test step error:', error);
    return NextResponse.json({ error: 'テスト手順の削除に失敗しました。' }, { status: 500 });
  }
}
