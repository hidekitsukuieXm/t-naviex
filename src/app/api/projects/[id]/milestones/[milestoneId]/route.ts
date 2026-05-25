/**
 * マイルストーン個別 API
 * GET    /api/projects/[id]/milestones/[milestoneId] - マイルストーン取得
 * PUT    /api/projects/[id]/milestones/[milestoneId] - マイルストーン更新
 * DELETE /api/projects/[id]/milestones/[milestoneId] - マイルストーン削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  projectExists,
  milestoneExistsInProject,
  isMilestoneNameTaken,
  getMilestoneById,
  updateMilestone,
  deleteMilestone,
} from '@/lib/repositories/milestone-repository';
import { validateUpdateMilestoneInput } from '@/types/milestone';

interface RouteParams {
  params: Promise<{ id: string; milestoneId: string }>;
}

// GET /api/projects/[id]/milestones/[milestoneId] - マイルストーン取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, milestoneId } = await params;

    if (!projectId || !milestoneId) {
      return NextResponse.json(
        { error: 'プロジェクトIDとマイルストーンIDは必須です。' },
        { status: 400 }
      );
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // マイルストーン取得
    const milestone = await getMilestoneById(BigInt(milestoneId));

    if (!milestone) {
      return NextResponse.json({ error: 'マイルストーンが見つかりません。' }, { status: 404 });
    }

    // プロジェクトに属しているか確認
    if (milestone.projectId !== projectId) {
      return NextResponse.json({ error: 'マイルストーンが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Get milestone error:', error);
    return NextResponse.json({ error: 'マイルストーンの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/milestones/[milestoneId] - マイルストーン更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, milestoneId } = await params;

    if (!projectId || !milestoneId) {
      return NextResponse.json(
        { error: 'プロジェクトIDとマイルストーンIDは必須です。' },
        { status: 400 }
      );
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // マイルストーンの存在確認
    const milestoneExistsResult = await milestoneExistsInProject(
      BigInt(projectId),
      BigInt(milestoneId)
    );
    if (!milestoneExistsResult) {
      return NextResponse.json({ error: 'マイルストーンが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateUpdateMilestoneInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 名前変更時の重複チェック
    if (validation.data!.name) {
      const nameTaken = await isMilestoneNameTaken(
        BigInt(projectId),
        validation.data!.name,
        BigInt(milestoneId)
      );
      if (nameTaken) {
        return NextResponse.json(
          { error: '同じ名前のマイルストーンが既に存在します。' },
          { status: 409 }
        );
      }
    }

    // マイルストーン更新
    const milestone = await updateMilestone(BigInt(milestoneId), validation.data!);

    if (!milestone) {
      return NextResponse.json({ error: 'マイルストーンが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Update milestone error:', error);
    return NextResponse.json({ error: 'マイルストーンの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/milestones/[milestoneId] - マイルストーン削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, milestoneId } = await params;

    if (!projectId || !milestoneId) {
      return NextResponse.json(
        { error: 'プロジェクトIDとマイルストーンIDは必須です。' },
        { status: 400 }
      );
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // マイルストーンの存在確認
    const milestoneExistsResult = await milestoneExistsInProject(
      BigInt(projectId),
      BigInt(milestoneId)
    );
    if (!milestoneExistsResult) {
      return NextResponse.json({ error: 'マイルストーンが見つかりません。' }, { status: 404 });
    }

    // マイルストーン削除
    const result = await deleteMilestone(BigInt(milestoneId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete milestone error:', error);
    return NextResponse.json({ error: 'マイルストーンの削除に失敗しました。' }, { status: 500 });
  }
}
