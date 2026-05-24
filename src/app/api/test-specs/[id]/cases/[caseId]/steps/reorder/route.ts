import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  reorderTestSteps,
  testCaseExists,
  isTestCaseLocked,
} from '@/lib/repositories/test-step-repository';
import { logTestStepReorder } from '@/lib/audit';
import { validateReorderTestStepsInput } from '@/types/test-step';

interface RouteParams {
  params: Promise<{ id: string; caseId: string }>;
}

// PUT /api/test-specs/[id]/cases/[caseId]/steps/reorder - テスト手順並び替え
export async function PUT(request: Request, { params }: RouteParams) {
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

    // バリデーション
    const validation = validateReorderTestStepsInput({
      items: body.items,
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
        { error: 'ロックされているテスト仕様書のテスト手順は並び替えできません。' },
        { status: 403 }
      );
    }

    const steps = await reorderTestSteps(testCaseId, {
      items: body.items,
    });

    // 監査ログ
    await logTestStepReorder(session.user.id, testCaseId, {
      testCaseId,
      reorderedCount: body.items.length,
    });

    return NextResponse.json({ steps });
  } catch (error) {
    console.error('Reorder test steps error:', error);
    return NextResponse.json({ error: 'テスト手順の並び替えに失敗しました。' }, { status: 500 });
  }
}
