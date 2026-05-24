import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestSectionById,
  moveTestSection,
  isTestSpecLocked,
  parentSectionExists,
} from '@/lib/repositories/test-section-repository';
import { logTestSectionMove } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string; sectionId: string }>;
}

// PUT /api/test-specs/[id]/sections/[sectionId]/move - セクション移動
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
        { error: 'ロックされているテスト仕様書のセクションは移動できません。' },
        { status: 403 }
      );
    }

    // 親セクションの存在確認（nullでない場合）
    const newParentId = body.parentId ?? null;
    if (newParentId !== null) {
      const parentExists = await parentSectionExists(BigInt(testSpecId), BigInt(newParentId));
      if (!parentExists) {
        return NextResponse.json(
          { error: '移動先の親セクションが見つかりません。' },
          { status: 404 }
        );
      }
    }

    const section = await moveTestSection(BigInt(sectionId), {
      parentId: newParentId,
      sortOrder: body.sortOrder,
    });

    if (!section) {
      return NextResponse.json({ error: 'テストセクションが見つかりません。' }, { status: 404 });
    }

    // 監査ログ
    await logTestSectionMove(session.user.id, sectionId, {
      testSpecId,
      name: section.name,
      fromParentId: existing.parentId,
      toParentId: newParentId,
    });

    return NextResponse.json(section);
  } catch (error) {
    if (error instanceof Error && error.message.includes('循環参照')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Move test section error:', error);
    return NextResponse.json({ error: 'テストセクションの移動に失敗しました。' }, { status: 500 });
  }
}
