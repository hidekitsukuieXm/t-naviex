import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getBranchHistory } from '@/repositories/branch-repository';

interface RouteParams {
  params: Promise<{ testSpecId: string; branchId: string }>;
}

// GET /api/test-specs/[testSpecId]/branches/[branchId]/history - ブランチ履歴取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { branchId } = await params;

    if (!branchId) {
      return NextResponse.json({ error: 'ブランチIDは必須です。' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const result = await getBranchHistory(branchId, {
      ...(limit && { limit: parseInt(limit, 10) }),
      ...(offset && { offset: parseInt(offset, 10) }),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get branch history error:', error);
    return NextResponse.json({ error: 'ブランチ履歴の取得に失敗しました。' }, { status: 500 });
  }
}
