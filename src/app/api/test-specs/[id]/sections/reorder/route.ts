import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  updateSortOrders,
  testSpecExists,
  isTestSpecLocked,
} from '@/lib/repositories/test-section-repository';
import { logTestSectionReorder } from '@/lib/audit';
import { validateBulkSortOrderUpdate } from '@/types/test-section';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/test-specs/[id]/sections/reorder - 並び順一括更新
export async function PUT(request: Request, { params }: RouteParams) {
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
    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json({ error: '並び順データが必要です。' }, { status: 400 });
    }

    const validation = validateBulkSortOrderUpdate(body.items);
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
        { error: 'ロックされているテスト仕様書のセクションは並び替えできません。' },
        { status: 403 }
      );
    }

    const sections = await updateSortOrders(testSpecId, body.items);

    // 監査ログ
    await logTestSectionReorder(session.user.id, testSpecId, {
      count: sections.length,
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Reorder test sections error:', error);
    return NextResponse.json(
      { error: 'テストセクションの並び替えに失敗しました。' },
      { status: 500 }
    );
  }
}
