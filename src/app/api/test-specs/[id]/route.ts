import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestSpecById,
  updateTestSpec,
  deleteTestSpec,
  isTestSpecNameTaken,
} from '@/lib/repositories/test-spec-repository';
import {
  logTestSpecUpdate,
  logTestSpecDelete,
  logTestSpecLock,
  logTestSpecUnlock,
} from '@/lib/audit';
import { validateTestSpec, VALID_TEST_SPEC_STATUSES } from '@/types/test-spec';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/test-specs/[id] - テスト仕様書詳細取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    const testSpec = await getTestSpecById(BigInt(id));

    if (!testSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(testSpec);
  } catch (error) {
    console.error('Get test spec error:', error);
    return NextResponse.json({ error: 'テスト仕様書の取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/test-specs/[id] - テスト仕様書更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateTestSpec({
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

    // 既存のテスト仕様書を取得
    const existingTestSpec = await getTestSpecById(BigInt(id));
    if (!existingTestSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // 名前を変更する場合、同一プロジェクト内での重複チェック
    if (body.name && body.name.trim() !== existingTestSpec.name) {
      const nameTaken = await isTestSpecNameTaken(
        BigInt(existingTestSpec.projectId),
        body.name.trim(),
        BigInt(id)
      );
      if (nameTaken) {
        return NextResponse.json(
          { error: '同じプロジェクト内に同名のテスト仕様書が既に存在します。' },
          { status: 409 }
        );
      }
    }

    // ロック状態の変更を検出
    const wasLocked = existingTestSpec.isLocked;
    const willBeLocked = body.isLocked !== undefined ? body.isLocked : wasLocked;

    const testSpec = await updateTestSpec(BigInt(id), {
      name: body.name,
      description: body.description,
      status: body.status,
      isLocked: body.isLocked,
    });

    if (!testSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // 監査ログ
    if (!wasLocked && willBeLocked) {
      // ロック
      await logTestSpecLock(session.user.id, id);
    } else if (wasLocked && !willBeLocked) {
      // ロック解除
      await logTestSpecUnlock(session.user.id, id);
    } else {
      // 通常の更新
      await logTestSpecUpdate(session.user.id, id, {
        name: testSpec.name,
        status: testSpec.status,
      });
    }

    return NextResponse.json(testSpec);
  } catch (error) {
    if (error instanceof Error && error.message.includes('ロックされている')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Update test spec error:', error);
    return NextResponse.json({ error: 'テスト仕様書の更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/test-specs/[id] - テスト仕様書削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    const result = await deleteTestSpec(BigInt(id));

    if (!result.success) {
      if (result.error?.includes('見つかりません')) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      if (result.error?.includes('ロック')) {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // 監査ログ
    await logTestSpecDelete(session.user.id, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test spec error:', error);
    return NextResponse.json({ error: 'テスト仕様書の削除に失敗しました。' }, { status: 500 });
  }
}
