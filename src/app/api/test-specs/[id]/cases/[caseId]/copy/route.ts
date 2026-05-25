import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  copyTestCase,
  testSpecExists,
  isTestSpecLocked,
  sectionExists,
} from '@/lib/repositories/test-case-repository';
import { logTestCaseCopy } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string; caseId: string }>;
}

// POST /api/test-specs/[id]/cases/[caseId]/copy - テストケースコピー
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

    // コピー先のテスト仕様書が指定されている場合、存在確認
    const destTestSpecId = targetTestSpecId || testSpecId;
    const specExists = await testSpecExists(BigInt(destTestSpecId));
    if (!specExists) {
      return NextResponse.json(
        { error: 'コピー先のテスト仕様書が見つかりません。' },
        { status: 404 }
      );
    }

    // ロック状態確認
    const locked = await isTestSpecLocked(BigInt(destTestSpecId));
    if (locked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書にはコピーできません。' },
        { status: 403 }
      );
    }

    // コピー先のセクションが指定されている場合、存在確認
    if (targetSectionId !== undefined && targetSectionId !== null) {
      const sectionExistsResult = await sectionExists(
        BigInt(destTestSpecId),
        BigInt(targetSectionId)
      );
      if (!sectionExistsResult) {
        return NextResponse.json(
          { error: 'コピー先のセクションが見つかりません。' },
          { status: 404 }
        );
      }
    }

    const copiedTestCase = await copyTestCase(BigInt(caseId), targetTestSpecId, targetSectionId);

    if (!copiedTestCase) {
      return NextResponse.json({ error: 'テストケースのコピーに失敗しました。' }, { status: 500 });
    }

    // 監査ログ
    await logTestCaseCopy(session.user.id, caseId, {
      sourceTestSpecId: testSpecId,
      targetTestSpecId: destTestSpecId,
      newTestCaseId: copiedTestCase.id,
      title: copiedTestCase.title,
    });

    return NextResponse.json(copiedTestCase);
  } catch (error) {
    console.error('Copy test case error:', error);
    return NextResponse.json({ error: 'テストケースのコピーに失敗しました。' }, { status: 500 });
  }
}
