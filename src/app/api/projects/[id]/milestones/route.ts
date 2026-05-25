/**
 * マイルストーン API
 * GET  /api/projects/[id]/milestones - マイルストーン一覧取得
 * POST /api/projects/[id]/milestones - マイルストーン作成
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  projectExists,
  isMilestoneNameTaken,
  getMilestones,
  createMilestone,
} from '@/lib/repositories/milestone-repository';
import { validateCreateMilestoneInput, isValidMilestoneStatus } from '@/types/milestone';
import type { MilestoneStatus } from '@/types/milestone';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/milestones - マイルストーン一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // クエリパラメータを解析
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const query = searchParams.get('query');

    // ステータスバリデーション
    if (status && !isValidMilestoneStatus(status)) {
      return NextResponse.json({ error: '無効なステータスです。' }, { status: 400 });
    }

    const milestones = await getMilestones({
      projectId,
      status: status as MilestoneStatus | undefined,
      query: query || undefined,
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error('Get milestones error:', error);
    return NextResponse.json({ error: 'マイルストーンの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/milestones - マイルストーン作成
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateCreateMilestoneInput({ ...body, projectId });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 名前重複チェック
    const nameTaken = await isMilestoneNameTaken(BigInt(projectId), validation.data!.name);
    if (nameTaken) {
      return NextResponse.json(
        { error: '同じ名前のマイルストーンが既に存在します。' },
        { status: 409 }
      );
    }

    // マイルストーン作成
    const milestone = await createMilestone(validation.data!);

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('Create milestone error:', error);
    return NextResponse.json({ error: 'マイルストーンの作成に失敗しました。' }, { status: 500 });
  }
}
