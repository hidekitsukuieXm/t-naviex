import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { compareBranches } from '@/repositories/branch-repository';

interface RouteParams {
  params: Promise<{ testSpecId: string; branchId: string }>;
}

// GET /api/test-specs/[testSpecId]/branches/[branchId]/compare - ブランチ比較
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
    const targetBranchId = searchParams.get('targetBranchId');

    if (!targetBranchId) {
      return NextResponse.json({ error: '比較対象のブランチIDは必須です。' }, { status: 400 });
    }

    const comparison = await compareBranches(branchId, targetBranchId);

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Compare branches error:', error);
    return NextResponse.json({ error: 'ブランチ比較に失敗しました。' }, { status: 500 });
  }
}
