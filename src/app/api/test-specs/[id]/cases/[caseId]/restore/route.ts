import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  restoreTestCase,
  testSpecExists,
  isTestSpecLocked,
} from '@/lib/repositories/test-case-repository';
import { logTestCaseRestore } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string; caseId: string }>;
}

// POST /api/test-specs/[id]/cases/[caseId]/restore - テストケース復元
export async function POST(request: Request, { params }: RouteParams) {
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
        { error: 'ロックされているテスト仕様書のテストケースは復元できません。' },
        { status: 403 }
      );
    }

    const restoredTestCase = await restoreTestCase(BigInt(caseId));

    if (!restoredTestCase) {
      return NextResponse.json(
        { error: 'テストケースの復元に失敗しました。削除されていないか、見つかりません。' },
        { status: 404 }
      );
    }

    // 監査ログ
    await logTestCaseRestore(session.user.id, caseId, {
      testSpecId,
      title: restoredTestCase.title,
    });

    return NextResponse.json(restoredTestCase);
  } catch (error) {
    console.error('Restore test case error:', error);
    return NextResponse.json({ error: 'テストケースの復元に失敗しました。' }, { status: 500 });
  }
}
