import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestSectionById,
  updateTestSection,
  deleteTestSection,
  isTestSpecLocked,
  isSectionNameTaken,
  parentSectionExists,
} from '@/lib/repositories/test-section-repository';
import { logTestSectionUpdate, logTestSectionDelete } from '@/lib/audit';
import { validateUpdateTestSectionInput } from '@/types/test-section';

interface RouteParams {
  params: Promise<{ id: string; sectionId: string }>;
}

// GET /api/test-specs/[id]/sections/[sectionId] - セクション詳細取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, sectionId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!sectionId) {
      return NextResponse.json({ error: 'セクションIDは必須です。' }, { status: 400 });
    }

    const section = await getTestSectionById(BigInt(sectionId));

    if (!section) {
      return NextResponse.json({ error: 'テストセクションが見つかりません。' }, { status: 404 });
    }

    // テスト仕様書の一致確認
    if (section.testSpecId !== testSpecId) {
      return NextResponse.json({ error: 'テストセクションが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Get test section error:', error);
    return NextResponse.json({ error: 'テストセクションの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/test-specs/[id]/sections/[sectionId] - セクション更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, sectionId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!sectionId) {
      return NextResponse.json({ error: 'セクションIDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateUpdateTestSectionInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // 既存セクションの確認
    const existing = await getTestSectionById(BigInt(sectionId));
    if (!existing) {
      return NextResponse.json({ error: 'テストセクションが見つかりません。' }, { status: 404 });
    }

    // テスト仕様書の一致確認
    if (existing.testSpecId !== testSpecId) {
      return NextResponse.json({ error: 'テストセクションが見つかりません。' }, { status: 404 });
    }

    // ロック状態確認
    const locked = await isTestSpecLocked(BigInt(testSpecId));
    if (locked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書のセクションは更新できません。' },
        { status: 403 }
      );
    }

    // 親セクションの存在確認（変更する場合）
    if (body.parentId !== undefined && body.parentId !== null) {
      const parentExists = await parentSectionExists(BigInt(testSpecId), BigInt(body.parentId));
      if (!parentExists) {
        return NextResponse.json({ error: '親セクションが見つかりません。' }, { status: 404 });
      }
    }

    // 名前変更時の重複チェック
    if (body.name !== undefined && body.name.trim() !== existing.name) {
      const parentId =
        body.parentId !== undefined
          ? body.parentId
            ? BigInt(body.parentId)
            : null
          : existing.parentId
            ? BigInt(existing.parentId)
            : null;

      const nameTaken = await isSectionNameTaken(
        BigInt(testSpecId),
        parentId,
        body.name,
        BigInt(sectionId)
      );
      if (nameTaken) {
        return NextResponse.json(
          { error: '同じ階層に同名のセクションが既に存在します。' },
          { status: 409 }
        );
      }
    }

    const section = await updateTestSection(BigInt(sectionId), body);

    if (!section) {
      return NextResponse.json({ error: 'テストセクションが見つかりません。' }, { status: 404 });
    }

    // 監査ログ
    await logTestSectionUpdate(session.user.id, sectionId, {
      testSpecId,
      name: section.name,
      changes: body,
    });

    return NextResponse.json(section);
  } catch (error) {
    if (error instanceof Error && error.message.includes('循環参照')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Update test section error:', error);
    return NextResponse.json({ error: 'テストセクションの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/test-specs/[id]/sections/[sectionId] - セクション削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId, sectionId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!sectionId) {
      return NextResponse.json({ error: 'セクションIDは必須です。' }, { status: 400 });
    }

    // 既存セクションの確認
    const existing = await getTestSectionById(BigInt(sectionId));
    if (!existing) {
      return NextResponse.json({ error: 'テストセクションが見つかりません。' }, { status: 404 });
    }

    // テスト仕様書の一致確認
    if (existing.testSpecId !== testSpecId) {
      return NextResponse.json({ error: 'テストセクションが見つかりません。' }, { status: 404 });
    }

    // ロック状態確認
    const locked = await isTestSpecLocked(BigInt(testSpecId));
    if (locked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書のセクションは削除できません。' },
        { status: 403 }
      );
    }

    const result = await deleteTestSection(BigInt(sectionId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    // 監査ログ
    await logTestSectionDelete(session.user.id, sectionId, {
      testSpecId,
      name: existing.name,
      deletedCount: result.deletedCount,
    });

    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Delete test section error:', error);
    return NextResponse.json({ error: 'テストセクションの削除に失敗しました。' }, { status: 500 });
  }
}
