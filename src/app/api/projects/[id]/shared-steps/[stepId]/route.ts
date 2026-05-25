/**
 * 共有手順詳細・更新・削除 API
 * GET /api/projects/[id]/shared-steps/[stepId] - 共有手順詳細取得
 * PUT /api/projects/[id]/shared-steps/[stepId] - 共有手順更新
 * DELETE /api/projects/[id]/shared-steps/[stepId] - 共有手順削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getSharedStepDetail,
  updateSharedStep,
  deleteSharedStep,
  getSharedStepByName,
} from '@/lib/repositories/shared-step-repository';
import { projectExists } from '@/lib/repositories/project-repository';
import { validateUpdateSharedStepInput } from '@/types/shared-step';

type RouteParams = {
  params: Promise<{ id: string; stepId: string }>;
};

/**
 * GET /api/projects/[id]/shared-steps/[stepId]
 * 共有手順詳細を取得
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, stepId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const sharedStep = await getSharedStepDetail(projectId, stepId);
    if (!sharedStep) {
      return NextResponse.json({ error: '共有手順が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(sharedStep);
  } catch (error) {
    console.error('共有手順詳細取得エラー:', error);
    return NextResponse.json({ error: '共有手順の取得に失敗しました。' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/shared-steps/[stepId]
 * 共有手順を更新
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, stepId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // 共有手順存在確認
    const existingStep = await getSharedStepDetail(projectId, stepId);
    if (!existingStep) {
      return NextResponse.json({ error: '共有手順が見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 入力バリデーション
    const validation = validateUpdateSharedStepInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // 名前変更時の重複チェック
    if (body.name && body.name !== existingStep.name) {
      const duplicate = await getSharedStepByName(projectId, body.name);
      if (duplicate) {
        return NextResponse.json(
          { error: '同じ名前の共有手順が既に存在します。' },
          { status: 409 }
        );
      }
    }

    const sharedStep = await updateSharedStep(projectId, stepId, body);

    return NextResponse.json(sharedStep);
  } catch (error) {
    console.error('共有手順更新エラー:', error);
    return NextResponse.json({ error: '共有手順の更新に失敗しました。' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/shared-steps/[stepId]
 * 共有手順を削除
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, stepId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // 共有手順存在確認
    const existingStep = await getSharedStepDetail(projectId, stepId);
    if (!existingStep) {
      return NextResponse.json({ error: '共有手順が見つかりません。' }, { status: 404 });
    }

    await deleteSharedStep(projectId, stepId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('共有手順削除エラー:', error);
    return NextResponse.json({ error: '共有手順の削除に失敗しました。' }, { status: 500 });
  }
}
