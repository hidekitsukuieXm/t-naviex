import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDeletedTestCases, testSpecExists } from '@/lib/repositories/test-case-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/test-specs/[id]/cases/deleted - 削除済みテストケース一覧取得
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
    const specExists = await testSpecExists(BigInt(testSpecId));
    if (!specExists) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await getDeletedTestCases(testSpecId, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get deleted test cases error:', error);
    return NextResponse.json(
      { error: '削除済みテストケースの取得に失敗しました。' },
      { status: 500 }
    );
  }
}
