import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createTestSpec,
  getTestSpecs,
  isTestSpecNameTaken,
  projectExists,
} from '@/lib/repositories/test-spec-repository';
import { logTestSpecCreate } from '@/lib/audit';
import {
  validateTestSpec,
  VALID_TEST_SPEC_STATUSES,
  type TestSpecStatus,
  type TestSpecSearchParams,
} from '@/types/test-spec';

// GET /api/test-specs - テスト仕様書一覧取得
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const params: TestSpecSearchParams = {
      projectId: searchParams.get('projectId') || undefined,
      query: searchParams.get('query') || undefined,
      status: (searchParams.get('status') as TestSpecStatus) || undefined,
      isLocked: searchParams.has('isLocked') ? searchParams.get('isLocked') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sortBy: (searchParams.get('sortBy') as TestSpecSearchParams['sortBy']) || 'updatedAt',
      sortOrder: (searchParams.get('sortOrder') as TestSpecSearchParams['sortOrder']) || 'desc',
    };

    // プロジェクトIDが指定されていない場合はエラー
    if (!params.projectId) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です。' }, { status: 400 });
    }

    const result = await getTestSpecs(params);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get test specs error:', error);
    return NextResponse.json({ error: 'テスト仕様書一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/test-specs - テスト仕様書作成
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.projectId || body.projectId.trim() === '') {
      return NextResponse.json({ error: 'プロジェクトIDは必須です。' }, { status: 400 });
    }

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'テスト仕様書名は必須です。' }, { status: 400 });
    }

    const validation = validateTestSpec({
      projectId: body.projectId,
      name: body.name,
      description: body.description,
      status: body.status,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // ステータスが指定されている場合、有効なステータスかチェック
    if (body.status && !VALID_TEST_SPEC_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: '無効なステータスです。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(body.projectId));
    if (!projectExistsResult) {
      return NextResponse.json(
        { error: '指定されたプロジェクトが見つかりません。' },
        { status: 404 }
      );
    }

    // 同一プロジェクト内での名前重複チェック
    const nameTaken = await isTestSpecNameTaken(BigInt(body.projectId), body.name.trim());
    if (nameTaken) {
      return NextResponse.json(
        { error: '同じプロジェクト内に同名のテスト仕様書が既に存在します。' },
        { status: 409 }
      );
    }

    const testSpec = await createTestSpec({
      projectId: body.projectId,
      name: body.name,
      description: body.description || null,
      status: body.status || 'DRAFT',
    });

    // 監査ログ
    await logTestSpecCreate(session.user.id, testSpec.id, {
      name: testSpec.name,
      projectId: testSpec.projectId,
    });

    return NextResponse.json(testSpec, { status: 201 });
  } catch (error) {
    console.error('Create test spec error:', error);
    return NextResponse.json({ error: 'テスト仕様書の作成に失敗しました。' }, { status: 500 });
  }
}
