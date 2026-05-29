/**
 * テストセット一覧・作成API
 * GET /api/projects/[id]/test-sets - テストセット一覧を取得
 * POST /api/projects/[id]/test-sets - テストセットを作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTestSets, createTestSet } from '@/repositories/test-set-repository';
import { validateCreateTestSetInput, type TestSetStatus } from '@/types/test-set';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * テストセット一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') as TestSetStatus | undefined;
    const sortBy =
      (searchParams.get('sortBy') as
        | 'name'
        | 'createdAt'
        | 'updatedAt'
        | 'executionCount'
        | 'sortOrder') || 'sortOrder';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '50', 10);

    const result = await getTestSets(projectId, {
      search,
      status,
      sortBy,
      sortOrder,
      skip,
      take,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch test sets:', error);
    return NextResponse.json({ error: 'テストセットの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * テストセットを作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

    // バリデーション
    const validation = validateCreateTestSetInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const testSet = await createTestSet(projectId, session.user.id, body);

    return NextResponse.json(testSet, { status: 201 });
  } catch (error) {
    console.error('Failed to create test set:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: '同じ名前のテストセットが既に存在します' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'テストセットの作成に失敗しました' }, { status: 500 });
  }
}
