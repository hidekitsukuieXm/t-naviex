import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createTestCase,
  getTestCases,
  testSpecExists,
  isTestSpecLocked,
  sectionExists,
  isTestCaseTitleTaken,
} from '@/lib/repositories/test-case-repository';
import { logTestCaseCreate } from '@/lib/audit';
import { validateCreateTestCaseInput } from '@/types/test-case';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/test-specs/[id]/cases - テストケース一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    // テスト仕様書の存在確認
    const exists = await testSpecExists(BigInt(testSpecId));
    if (!exists) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const query = searchParams.get('query');
    const priority = searchParams.get('priority');
    const testType = searchParams.get('testType');
    const testTechnique = searchParams.get('testTechnique');
    const isMatrixParam = searchParams.get('isMatrix');
    const tagsParam = searchParams.get('tags');
    const classification = searchParams.get('classification');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') as
      | 'title'
      | 'priority'
      | 'sortOrder'
      | 'createdAt'
      | 'updatedAt'
      | 'testType'
      | 'testTechnique'
      | null;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

    // タグをパース（カンマ区切り）
    const tags = tagsParam ? tagsParam.split(',').filter((t) => t.trim()) : undefined;

    const result = await getTestCases({
      testSpecId,
      sectionId: sectionId === 'null' ? null : (sectionId ?? undefined),
      query: query ?? undefined,
      priority: priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | undefined,
      testType: testType as
        | 'FUNCTIONAL'
        | 'INTEGRATION'
        | 'E2E'
        | 'PERFORMANCE'
        | 'SECURITY'
        | 'USABILITY'
        | 'OTHER'
        | undefined,
      testTechnique: testTechnique as
        | 'EQUIVALENCE_PARTITIONING'
        | 'BOUNDARY_VALUE_ANALYSIS'
        | 'DECISION_TABLE'
        | 'STATE_TRANSITION'
        | 'EXPLORATORY'
        | 'REGRESSION'
        | 'OTHER'
        | undefined,
      isMatrix: isMatrixParam === null ? undefined : isMatrixParam === 'true',
      tags,
      classification: classification ?? undefined,
      page,
      limit,
      sortBy: sortBy ?? undefined,
      sortOrder: sortOrder ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get test cases error:', error);
    return NextResponse.json({ error: 'テストケース一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/test-specs/[id]/cases - テストケース作成
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateCreateTestCaseInput({
      testSpecId,
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
    const exists = await testSpecExists(BigInt(testSpecId));
    if (!exists) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // ロック状態確認
    const locked = await isTestSpecLocked(BigInt(testSpecId));
    if (locked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書にテストケースを追加できません。' },
        { status: 403 }
      );
    }

    // セクションの存在確認（指定されている場合）
    if (body.sectionId) {
      const sectionExistsResult = await sectionExists(BigInt(testSpecId), BigInt(body.sectionId));
      if (!sectionExistsResult) {
        return NextResponse.json({ error: 'セクションが見つかりません。' }, { status: 404 });
      }
    }

    // 同じセクション内でのタイトル重複チェック
    const titleTaken = await isTestCaseTitleTaken(
      BigInt(testSpecId),
      body.sectionId ? BigInt(body.sectionId) : null,
      body.title
    );
    if (titleTaken) {
      return NextResponse.json(
        { error: '同じセクション内に同名のテストケースが既に存在します。' },
        { status: 409 }
      );
    }

    const testCase = await createTestCase({
      testSpecId,
      sectionId: body.sectionId ?? null,
      title: body.title,
      description: body.description ?? null,
      preconditions: body.preconditions ?? null,
      expectedResult: body.expectedResult ?? null,
      checkpoint: body.checkpoint ?? null,
      scenario: body.scenario ?? null,
      testEnvironment: body.testEnvironment ?? null,
      notes: body.notes ?? null,
      tags: body.tags ?? [],
      classification: body.classification ?? null,
      referenceId: body.referenceId ?? null,
      estimatedTime: body.estimatedTime ?? null,
      priority: body.priority,
      testType: body.testType,
      testTechnique: body.testTechnique,
      isMatrix: body.isMatrix,
      sortOrder: body.sortOrder,
    });

    // 監査ログ
    await logTestCaseCreate(session.user.id, testCase.id, {
      testSpecId,
      sectionId: testCase.sectionId,
      title: testCase.title,
      priority: testCase.priority,
      testType: testCase.testType,
    });

    return NextResponse.json(testCase, { status: 201 });
  } catch (error) {
    console.error('Create test case error:', error);
    return NextResponse.json({ error: 'テストケースの作成に失敗しました。' }, { status: 500 });
  }
}
