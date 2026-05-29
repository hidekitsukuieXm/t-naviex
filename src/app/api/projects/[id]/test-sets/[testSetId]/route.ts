/**
 * テストセット個別API
 * GET /api/projects/[id]/test-sets/[testSetId] - テストセット詳細を取得
 * PUT /api/projects/[id]/test-sets/[testSetId] - テストセットを更新
 * DELETE /api/projects/[id]/test-sets/[testSetId] - テストセットを削除
 * POST /api/projects/[id]/test-sets/[testSetId] - テストセットを複製
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTestSetById,
  updateTestSet,
  deleteTestSet,
  duplicateTestSet,
  updateTestSetOrder,
} from '@/repositories/test-set-repository';
import { validateUpdateTestSetInput, validateTestSetName } from '@/types/test-set';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; testSetId: string }>;
}

/**
 * テストセット詳細を取得
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, testSetId } = await params;

    const testSet = await getTestSetById(projectId, testSetId);

    if (!testSet) {
      return NextResponse.json({ error: 'テストセットが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(testSet);
  } catch (error) {
    console.error('Failed to fetch test set:', error);
    return NextResponse.json({ error: 'テストセットの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * テストセットを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id: projectId, testSetId } = await params;
    const body = await request.json();

    // 並び順のみの更新の場合
    if (body.sortOrder !== undefined && Object.keys(body).length === 1) {
      await updateTestSetOrder(projectId, testSetId, body.sortOrder);
      return NextResponse.json({ success: true });
    }

    // バリデーション
    const validation = validateUpdateTestSetInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const testSet = await updateTestSet(projectId, testSetId, session.user.id, body);

    return NextResponse.json(testSet);
  } catch (error) {
    console.error('Failed to update test set:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: '同じ名前のテストセットが既に存在します' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'テストセットの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * テストセットを削除
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, testSetId } = await params;

    await deleteTestSet(projectId, testSetId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete test set:', error);
    return NextResponse.json({ error: 'テストセットの削除に失敗しました' }, { status: 500 });
  }
}

/**
 * テストセットを複製
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id: projectId, testSetId } = await params;
    const body = await request.json();

    if (body.action !== 'duplicate') {
      return NextResponse.json({ error: '不正なアクションです' }, { status: 400 });
    }

    // 名前のバリデーション
    const nameValidation = validateTestSetName(body.name);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    const testSet = await duplicateTestSet(projectId, testSetId, session.user.id, body.name);

    return NextResponse.json(testSet, { status: 201 });
  } catch (error) {
    console.error('Failed to duplicate test set:', error);
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: '同じ名前のテストセットが既に存在します' },
          { status: 409 }
        );
      }
      if (error.message.includes('見つかりません')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'テストセットの複製に失敗しました' }, { status: 500 });
  }
}
