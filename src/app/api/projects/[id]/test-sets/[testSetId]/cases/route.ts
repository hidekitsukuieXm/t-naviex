/**
 * テストセットのテストケース管理API
 * POST /api/projects/[id]/test-sets/[testSetId]/cases - テストケースを追加
 * DELETE /api/projects/[id]/test-sets/[testSetId]/cases - テストケースを削除
 * PUT /api/projects/[id]/test-sets/[testSetId]/cases - テストケースの並び順を更新
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  addTestCasesToTestSet,
  removeTestCasesFromTestSet,
  updateTestSetCaseOrder,
} from '@/repositories/test-set-repository';
import { validateTestSetCasesInput } from '@/types/test-set';

interface RouteParams {
  params: Promise<{ id: string; testSetId: string }>;
}

/**
 * テストセットにテストケースを追加
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, testSetId } = await params;
    const body = await request.json();

    // バリデーション
    const validation = validateTestSetCasesInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    await addTestCasesToTestSet(projectId, testSetId, body.testCaseIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add test cases to test set:', error);
    if (error instanceof Error && error.message.includes('見つかりません')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'テストケースの追加に失敗しました' }, { status: 500 });
  }
}

/**
 * テストセットからテストケースを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, testSetId } = await params;
    const body = await request.json();

    // バリデーション
    const validation = validateTestSetCasesInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    await removeTestCasesFromTestSet(projectId, testSetId, body.testCaseIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove test cases from test set:', error);
    if (error instanceof Error && error.message.includes('見つかりません')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'テストケースの削除に失敗しました' }, { status: 500 });
  }
}

/**
 * テストセット内のテストケースの並び順を更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, testSetId } = await params;
    const body = await request.json();

    if (!Array.isArray(body.orders)) {
      return NextResponse.json({ error: 'ordersは配列である必要があります' }, { status: 400 });
    }

    // ordersの各要素をバリデーション
    for (const order of body.orders) {
      if (typeof order.testCaseId !== 'string' || typeof order.sortOrder !== 'number') {
        return NextResponse.json({ error: '無効な並び順データです' }, { status: 400 });
      }
    }

    await updateTestSetCaseOrder(projectId, testSetId, body.orders);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update test case order:', error);
    if (error instanceof Error && error.message.includes('見つかりません')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'テストケースの並び順の更新に失敗しました' },
      { status: 500 }
    );
  }
}
