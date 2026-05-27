import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getBranch, updateBranch, deleteBranch } from '@/repositories/branch-repository';
import { validateBranchName, BranchStatus } from '@/types/branch';

interface RouteParams {
  params: Promise<{ testSpecId: string; branchId: string }>;
}

// GET /api/test-specs/[testSpecId]/branches/[branchId] - ブランチ詳細取得
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

    const branch = await getBranch(branchId);

    if (!branch) {
      return NextResponse.json({ error: 'ブランチが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(branch);
  } catch (error) {
    console.error('Get branch error:', error);
    return NextResponse.json({ error: 'ブランチの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/test-specs/[testSpecId]/branches/[branchId] - ブランチ更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { branchId } = await params;

    if (!branchId) {
      return NextResponse.json({ error: 'ブランチIDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // 名前が指定されている場合はバリデーション
    if (body.name) {
      const nameValidation = validateBranchName(body.name);
      if (!nameValidation.valid) {
        return NextResponse.json({ error: nameValidation.message }, { status: 400 });
      }
    }

    // ステータスが指定されている場合はバリデーション
    if (body.status && !Object.values(BranchStatus).includes(body.status)) {
      return NextResponse.json({ error: '無効なステータスです。' }, { status: 400 });
    }

    const branch = await updateBranch(branchId, session.user.id, {
      name: body.name,
      description: body.description,
      status: body.status,
      metadata: body.metadata,
    });

    if (!branch) {
      return NextResponse.json({ error: 'ブランチが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(branch);
  } catch (error) {
    console.error('Update branch error:', error);
    return NextResponse.json({ error: 'ブランチの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/test-specs/[testSpecId]/branches/[branchId] - ブランチ削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { branchId } = await params;

    if (!branchId) {
      return NextResponse.json({ error: 'ブランチIDは必須です。' }, { status: 400 });
    }

    // MASTERブランチは削除不可
    const branch = await getBranch(branchId);
    if (branch?.type === 'MASTER') {
      return NextResponse.json({ error: 'マスターブランチは削除できません。' }, { status: 403 });
    }

    await deleteBranch(branchId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete branch error:', error);
    return NextResponse.json({ error: 'ブランチの削除に失敗しました。' }, { status: 500 });
  }
}
