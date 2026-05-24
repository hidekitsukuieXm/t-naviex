import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createTestSection,
  getTestSections,
  getTestSectionTree,
  testSpecExists,
  isTestSpecLocked,
  isSectionNameTaken,
  parentSectionExists,
} from '@/lib/repositories/test-section-repository';
import { logTestSectionCreate } from '@/lib/audit';
import { validateCreateTestSectionInput } from '@/types/test-section';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/test-specs/[id]/sections - セクション一覧取得
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
    const format = searchParams.get('format');
    const parentId = searchParams.get('parentId');
    const query = searchParams.get('query');

    // ツリー形式で取得
    if (format === 'tree') {
      const tree = await getTestSectionTree(testSpecId);
      return NextResponse.json({ sections: tree });
    }

    // フラット形式で取得
    const sections = await getTestSections({
      testSpecId,
      parentId: parentId === 'null' ? null : (parentId ?? undefined),
      query: query ?? undefined,
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Get test sections error:', error);
    return NextResponse.json(
      { error: 'テストセクション一覧の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// POST /api/test-specs/[id]/sections - セクション作成
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
    const validation = validateCreateTestSectionInput({
      testSpecId,
      parentId: body.parentId,
      name: body.name,
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
        { error: 'ロックされているテスト仕様書にセクションを追加できません。' },
        { status: 403 }
      );
    }

    // 親セクションの存在確認
    if (body.parentId) {
      const parentExists = await parentSectionExists(BigInt(testSpecId), BigInt(body.parentId));
      if (!parentExists) {
        return NextResponse.json({ error: '親セクションが見つかりません。' }, { status: 404 });
      }
    }

    // 同じ階層での名前重複チェック
    const nameTaken = await isSectionNameTaken(
      BigInt(testSpecId),
      body.parentId ? BigInt(body.parentId) : null,
      body.name
    );
    if (nameTaken) {
      return NextResponse.json(
        { error: '同じ階層に同名のセクションが既に存在します。' },
        { status: 409 }
      );
    }

    const section = await createTestSection({
      testSpecId,
      parentId: body.parentId ?? null,
      name: body.name,
      sortOrder: body.sortOrder,
    });

    // 監査ログ
    await logTestSectionCreate(session.user.id, section.id, {
      testSpecId,
      name: section.name,
      parentId: section.parentId,
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Create test section error:', error);
    return NextResponse.json({ error: 'テストセクションの作成に失敗しました。' }, { status: 500 });
  }
}
