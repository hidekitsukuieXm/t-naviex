/**
 * 共有手順一覧・作成 API
 * GET /api/projects/[id]/shared-steps - 共有手順一覧取得
 * POST /api/projects/[id]/shared-steps - 共有手順作成
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getSharedSteps,
  createSharedStep,
  getSharedStepByName,
} from '@/lib/repositories/shared-step-repository';
import { projectExists } from '@/lib/repositories/project-repository';
import { validateCreateSharedStepInput } from '@/types/shared-step';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/shared-steps
 * 共有手順一覧を取得
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const result = await getSharedSteps(projectId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('共有手順一覧取得エラー:', error);
    return NextResponse.json({ error: '共有手順の取得に失敗しました。' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/shared-steps
 * 共有手順を作成
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 入力バリデーション
    const validation = validateCreateSharedStepInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // 名前重複チェック
    const existingStep = await getSharedStepByName(projectId, body.name);
    if (existingStep) {
      return NextResponse.json({ error: '同じ名前の共有手順が既に存在します。' }, { status: 409 });
    }

    const sharedStep = await createSharedStep(projectId, body);

    return NextResponse.json(sharedStep, { status: 201 });
  } catch (error) {
    console.error('共有手順作成エラー:', error);
    return NextResponse.json({ error: '共有手順の作成に失敗しました。' }, { status: 500 });
  }
}
