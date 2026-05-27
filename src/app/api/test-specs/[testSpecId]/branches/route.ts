import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createBranch, getBranches } from '@/repositories/branch-repository';
import { validateBranchName, BranchType, BranchStatus } from '@/types/branch';

interface RouteParams {
  params: Promise<{ testSpecId: string }>;
}

// GET /api/test-specs/[testSpecId]/branches - ブランチ一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { testSpecId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as BranchStatus | null;
    const type = searchParams.get('type') as BranchType | null;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const result = await getBranches(testSpecId, {
      ...(status && { status }),
      ...(type && { type }),
      ...(limit && { limit: parseInt(limit, 10) }),
      ...(offset && { offset: parseInt(offset, 10) }),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get branches error:', error);
    return NextResponse.json({ error: 'ブランチ一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/test-specs/[testSpecId]/branches - ブランチ作成
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { testSpecId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    const body = await request.json();

    // バリデーション
    const nameValidation = validateBranchName(body.name);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.message }, { status: 400 });
    }

    if (!body.type || !Object.values(BranchType).includes(body.type)) {
      return NextResponse.json({ error: '無効なブランチタイプです。' }, { status: 400 });
    }

    // MASTERブランチは1つのみ
    if (body.type === BranchType.MASTER) {
      const existing = await getBranches(testSpecId, { type: BranchType.MASTER });
      if (existing.total > 0) {
        return NextResponse.json({ error: 'マスターブランチは既に存在します。' }, { status: 409 });
      }
    }

    const branch = await createBranch(testSpecId, session.user.id, {
      name: body.name,
      description: body.description,
      type: body.type,
      parentBranchId: body.parentBranchId,
      copyTestCases: body.copyTestCases,
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    console.error('Create branch error:', error);
    return NextResponse.json({ error: 'ブランチの作成に失敗しました。' }, { status: 500 });
  }
}
