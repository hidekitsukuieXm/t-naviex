import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  moveTestCase,
  testSpecExists,
  isTestSpecLocked,
  sectionExists,
  getTestCaseById,
} from '@/lib/repositories/test-case-repository';
import { logTestCaseMove } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string; caseId: string }>;
}

// POST /api/test-specs/[id]/cases/[caseId]/move - テストケース移動
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

    const body = await request.json();
    const { targetTestSpecId, targetSectionId } = body;

    // 元のテスト仕様書の存在確認
    const sourceSpecExists = await testSpecExists(BigInt(testSpecId));
    if (!sourceSpecExists) {
      return NextResponse.json({ error: '元のテスト仕様書が見つかりません。' }, { status: 404 });
    }

    // 元のテスト仕様書のロック状態確認
    const sourceLocked = await isTestSpecLocked(BigInt(testSpecId));
    if (sourceLocked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書からは移動できません。' },
        { status: 403 }
      );
    }

    // 移動先のテスト仕様書が指定されている場合
    const destTestSpecId = targetTestSpecId || testSpecId;
    if (targetTestSpecId && targetTestSpecId !== testSpecId) {
      const destSpecExists = await testSpecExists(BigInt(destTestSpecId));
      if (!destSpecExists) {
        return NextResponse.json(
          { error: '移動先のテスト仕様書が見つかりません。' },
          { status: 404 }
        );
      }

      const destLocked = await isTestSpecLocked(BigInt(destTestSpecId));
      if (destLocked) {
        return NextResponse.json(
          { error: 'ロックされているテスト仕様書には移動できません。' },
          { status: 403 }
        );
      }
    }

    // 移動先のセクションが指定されている場合、存在確認
    if (targetSectionId !== undefined && targetSectionId !== null) {
      const sectionExistsResult = await sectionExists(
        BigInt(destTestSpecId),
        BigInt(targetSectionId)
      );
      if (!sectionExistsResult) {
        return NextResponse.json(
          { error: '移動先のセクションが見つかりません。' },
          { status: 404 }
        );
      }
    }

    // 元のテストケース情報を取得（監査ログ用）
    const originalTestCase = await getTestCaseById(BigInt(caseId));
    if (!originalTestCase) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    const movedTestCase = await moveTestCase(BigInt(caseId), targetTestSpecId, targetSectionId);

    if (!movedTestCase) {
      return NextResponse.json(
        {
          error:
            'テストケースの移動に失敗しました。移動先に同名のテストケースが存在する可能性があります。',
        },
        { status: 400 }
      );
    }

    // 監査ログ
    await logTestCaseMove(session.user.id, caseId, {
      sourceTestSpecId: testSpecId,
      sourceSectionId: originalTestCase.sectionId,
      targetTestSpecId: destTestSpecId,
      targetSectionId: movedTestCase.sectionId,
      title: movedTestCase.title,
    });

    return NextResponse.json(movedTestCase);
  } catch (error) {
    console.error('Move test case error:', error);
    return NextResponse.json({ error: 'テストケースの移動に失敗しました。' }, { status: 500 });
  }
}
