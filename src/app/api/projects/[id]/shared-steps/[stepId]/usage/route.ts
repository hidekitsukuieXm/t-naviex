/**
 * 共有手順使用状況 API
 * GET /api/projects/[id]/shared-steps/[stepId]/usage - 共有手順使用状況取得
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getSharedStepDetail,
  getTestStepsUsingSharedStep,
} from '@/lib/repositories/shared-step-repository';
import { projectExists } from '@/lib/repositories/project-repository';

type RouteParams = {
  params: Promise<{ id: string; stepId: string }>;
};

/**
 * GET /api/projects/[id]/shared-steps/[stepId]/usage
 * 共有手順の使用状況を取得
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, stepId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // 共有手順存在確認
    const existingStep = await getSharedStepDetail(projectId, stepId);
    if (!existingStep) {
      return NextResponse.json({ error: '共有手順が見つかりません。' }, { status: 404 });
    }

    const testSteps = await getTestStepsUsingSharedStep(projectId, stepId);

    return NextResponse.json({
      sharedStepId: stepId,
      sharedStepName: existingStep.name,
      usageCount: testSteps.length,
      testSteps,
    });
  } catch (error) {
    console.error('共有手順使用状況取得エラー:', error);
    return NextResponse.json({ error: '使用状況の取得に失敗しました。' }, { status: 500 });
  }
}
