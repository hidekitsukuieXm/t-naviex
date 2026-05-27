/**
 * Step Definition Detail API
 *
 * 個別ステップ定義の取得・更新・削除
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getStepDefinition,
  updateStepDefinition,
  deleteStepDefinition,
  incrementStepUsage,
} from '@/repositories/bdd-repository';

interface RouteParams {
  params: Promise<{ id: string; stepId: string }>;
}

/**
 * GET /api/projects/[id]/bdd/step-definitions/[stepId]
 * ステップ定義を取得
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { stepId } = await params;
    const stepDefinitionId = BigInt(stepId);

    const stepDefinition = await getStepDefinition(stepDefinitionId);

    if (!stepDefinition) {
      return NextResponse.json({ error: 'ステップ定義が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
      ...stepDefinition,
      id: stepDefinition.id.toString(),
      projectId: stepDefinition.projectId.toString(),
    });
  } catch (error) {
    console.error('Failed to fetch step definition:', error);
    return NextResponse.json({ error: 'ステップ定義の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/bdd/step-definitions/[stepId]
 * ステップ定義を更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { stepId } = await params;
    const stepDefinitionId = BigInt(stepId);
    const body = await request.json();

    const { displayText, description, parameters, isShared, isActive } = body;

    // 存在確認
    const existing = await getStepDefinition(stepDefinitionId);
    if (!existing) {
      return NextResponse.json({ error: 'ステップ定義が見つかりません' }, { status: 404 });
    }

    const stepDefinition = await updateStepDefinition(stepDefinitionId, {
      displayText,
      description,
      parameters,
      isShared,
      isActive,
    });

    return NextResponse.json({
      ...stepDefinition,
      id: stepDefinition.id.toString(),
      projectId: stepDefinition.projectId.toString(),
    });
  } catch (error) {
    console.error('Failed to update step definition:', error);
    return NextResponse.json({ error: 'ステップ定義の更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/bdd/step-definitions/[stepId]
 * ステップ定義を削除（論理削除）
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { stepId } = await params;
    const stepDefinitionId = BigInt(stepId);

    // 存在確認
    const existing = await getStepDefinition(stepDefinitionId);
    if (!existing) {
      return NextResponse.json({ error: 'ステップ定義が見つかりません' }, { status: 404 });
    }

    await deleteStepDefinition(stepDefinitionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete step definition:', error);
    return NextResponse.json({ error: 'ステップ定義の削除に失敗しました' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id]/bdd/step-definitions/[stepId]
 * ステップ定義の使用回数をインクリメント
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { stepId } = await params;
    const stepDefinitionId = BigInt(stepId);
    const body = await request.json();

    if (body.action === 'incrementUsage') {
      const stepDefinition = await incrementStepUsage(stepDefinitionId);

      return NextResponse.json({
        ...stepDefinition,
        id: stepDefinition.id.toString(),
        projectId: stepDefinition.projectId.toString(),
      });
    }

    return NextResponse.json({ error: '不明なアクションです' }, { status: 400 });
  } catch (error) {
    console.error('Failed to patch step definition:', error);
    return NextResponse.json({ error: 'ステップ定義の更新に失敗しました' }, { status: 500 });
  }
}
