import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestCaseById,
  updateTestCase,
  deleteTestCase,
  testSpecExists,
  isTestSpecLocked,
  sectionExists,
  isTestCaseTitleTaken,
} from '@/lib/repositories/test-case-repository';
import { logTestCaseUpdate, logTestCaseDelete } from '@/lib/audit';
import { validateUpdateTestCaseInput } from '@/types/test-case';

interface RouteParams {
  params: Promise<{ id: string; caseId: string }>;
}

// GET /api/test-specs/[id]/cases/[caseId] - テストケース取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!caseId) {
      return NextResponse.json({ error: 'テストケースIDは必須です。' }, { status: 400 });
    }

    // テスト仕様書の存在確認
    const specExists = await testSpecExists(BigInt(testSpecId));
    if (!specExists) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    const testCase = await getTestCaseById(BigInt(caseId));

    if (!testCase) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // テスト仕様書との整合性チェック
    if (testCase.testSpecId !== testSpecId) {
      return NextResponse.json(
        { error: 'テストケースは指定されたテスト仕様書に属していません。' },
        { status: 400 }
      );
    }

    return NextResponse.json(testCase);
  } catch (error) {
    console.error('Get test case error:', error);
    return NextResponse.json({ error: 'テストケースの取得に失敗しました。' }, { status: 500 });
  }
}

// PATCH /api/test-specs/[id]/cases/[caseId] - テストケース更新
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!caseId) {
      return NextResponse.json({ error: 'テストケースIDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateUpdateTestCaseInput({
      sectionId: body.sectionId,
      title: body.title,
      description: body.description,
      preconditions: body.preconditions,
      expectedResult: body.expectedResult,
      checkpoint: body.checkpoint,
      scenario: body.scenario,
      testEnvironment: body.testEnvironment,
      notes: body.notes,
      tags: body.tags,
      classification: body.classification,
      referenceId: body.referenceId,
      estimatedTime: body.estimatedTime,
      priority: body.priority,
      testType: body.testType,
      testTechnique: body.testTechnique,
      isMatrix: body.isMatrix,
      sortOrder: body.sortOrder,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // テスト仕様書の存在確認
    const specExists = await testSpecExists(BigInt(testSpecId));
    if (!specExists) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // ロック状態確認
    const locked = await isTestSpecLocked(BigInt(testSpecId));
    if (locked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書のテストケースは更新できません。' },
        { status: 403 }
      );
    }

    // 既存のテストケースを取得
    const existingTestCase = await getTestCaseById(BigInt(caseId));
    if (!existingTestCase) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // テスト仕様書との整合性チェック
    if (existingTestCase.testSpecId !== testSpecId) {
      return NextResponse.json(
        { error: 'テストケースは指定されたテスト仕様書に属していません。' },
        { status: 400 }
      );
    }

    // セクションの存在確認（指定されている場合）
    if (body.sectionId !== undefined && body.sectionId !== null) {
      const sectionExistsResult = await sectionExists(BigInt(testSpecId), BigInt(body.sectionId));
      if (!sectionExistsResult) {
        return NextResponse.json({ error: 'セクションが見つかりません。' }, { status: 404 });
      }
    }

    // タイトル重複チェック（タイトルが変更される場合）
    if (body.title !== undefined) {
      const newSectionId =
        body.sectionId !== undefined
          ? body.sectionId
            ? BigInt(body.sectionId)
            : null
          : existingTestCase.sectionId
            ? BigInt(existingTestCase.sectionId)
            : null;

      const titleTaken = await isTestCaseTitleTaken(
        BigInt(testSpecId),
        newSectionId,
        body.title,
        BigInt(caseId)
      );
      if (titleTaken) {
        return NextResponse.json(
          { error: '同じセクション内に同名のテストケースが既に存在します。' },
          { status: 409 }
        );
      }
    }

    const testCase = await updateTestCase(BigInt(caseId), {
      sectionId: body.sectionId,
      title: body.title,
      description: body.description,
      preconditions: body.preconditions,
      expectedResult: body.expectedResult,
      checkpoint: body.checkpoint,
      scenario: body.scenario,
      testEnvironment: body.testEnvironment,
      notes: body.notes,
      tags: body.tags,
      classification: body.classification,
      referenceId: body.referenceId,
      estimatedTime: body.estimatedTime,
      priority: body.priority,
      testType: body.testType,
      testTechnique: body.testTechnique,
      isMatrix: body.isMatrix,
      sortOrder: body.sortOrder,
    });

    if (!testCase) {
      return NextResponse.json({ error: 'テストケースの更新に失敗しました。' }, { status: 500 });
    }

    // 監査ログ
    await logTestCaseUpdate(session.user.id, caseId, {
      testSpecId,
      title: testCase.title,
      changes: body,
    });

    return NextResponse.json(testCase);
  } catch (error) {
    console.error('Update test case error:', error);
    return NextResponse.json({ error: 'テストケースの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/test-specs/[id]/cases/[caseId] - テストケース削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, caseId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!caseId) {
      return NextResponse.json({ error: 'テストケースIDは必須です。' }, { status: 400 });
    }

    // テスト仕様書の存在確認
    const specExists = await testSpecExists(BigInt(testSpecId));
    if (!specExists) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // ロック状態確認
    const locked = await isTestSpecLocked(BigInt(testSpecId));
    if (locked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書のテストケースは削除できません。' },
        { status: 403 }
      );
    }

    // 既存のテストケースを取得
    const existingTestCase = await getTestCaseById(BigInt(caseId));
    if (!existingTestCase) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // テスト仕様書との整合性チェック
    if (existingTestCase.testSpecId !== testSpecId) {
      return NextResponse.json(
        { error: 'テストケースは指定されたテスト仕様書に属していません。' },
        { status: 400 }
      );
    }

    const result = await deleteTestCase(BigInt(caseId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    // 監査ログ
    await logTestCaseDelete(session.user.id, caseId, {
      testSpecId,
      title: existingTestCase.title,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test case error:', error);
    return NextResponse.json({ error: 'テストケースの削除に失敗しました。' }, { status: 500 });
  }
}
