/**
 * 共有手順複製 API
 * POST /api/projects/[id]/shared-steps/[stepId]/duplicate - 共有手順複製
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getSharedStepDetail,
  duplicateSharedStep,
  getSharedStepByName,
} from '@/lib/repositories/shared-step-repository';
import { projectExists } from '@/lib/repositories/project-repository';
import { validateSharedStepName } from '@/types/shared-step';

type RouteParams = {
  params: Promise<{ id: string; stepId: string }>;
};

/**
 * POST /api/projects/[id]/shared-steps/[stepId]/duplicate
 * 共有手順を複製
 */
export async function POST(request: Request, { params }: RouteParams) {
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
    const newName = body.name as string;

    // 名前バリデーション
    const nameValidation = validateSharedStepName(newName);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    // 名前重複チェック
    const duplicate = await getSharedStepByName(projectId, newName);
    if (duplicate) {
      return NextResponse.json({ error: '同じ名前の共有手順が既に存在します。' }, { status: 409 });
    }

    const sharedStep = await duplicateSharedStep(projectId, stepId, newName);

    return NextResponse.json(sharedStep, { status: 201 });
  } catch (error) {
    console.error('共有手順複製エラー:', error);
    return NextResponse.json({ error: '共有手順の複製に失敗しました。' }, { status: 500 });
  }
}
