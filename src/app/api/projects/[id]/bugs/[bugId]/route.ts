/**
 * バグ詳細・更新・削除 API
 * GET /api/projects/[id]/bugs/[bugId] - バグ詳細取得
 * PUT /api/projects/[id]/bugs/[bugId] - バグ更新
 * DELETE /api/projects/[id]/bugs/[bugId] - バグ削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getBugInProject,
  updateBug,
  deleteBugInProject,
  projectExists,
  bugExistsInProject,
} from '@/lib/repositories/bug-repository';
import { validateUpdateBugInput } from '@/types/bug';

interface RouteParams {
  params: Promise<{ id: string; bugId: string }>;
}

// GET /api/projects/[id]/bugs/[bugId]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, bugId } = await params;

    if (!projectId || !bugId) {
      return NextResponse.json({ error: 'プロジェクトIDとバグIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const bug = await getBugInProject(BigInt(projectId), BigInt(bugId));

    if (!bug) {
      return NextResponse.json({ error: 'バグが見つかりません。' }, { status: 404 });
    }

    // BigIntをシリアライズ可能な形式に変換
    const serializedBug = {
      ...bug,
      id: bug.id.toString(),
      projectId: bug.projectId.toString(),
      parentBugId: bug.parentBugId?.toString() || null,
      testResultId: bug.testResultId?.toString() || null,
      assigneeId: bug.assigneeId?.toString() || null,
      reporterId: bug.reporterId.toString(),
      project: bug.project ? { ...bug.project, id: bug.project.id.toString() } : undefined,
      parentBug: bug.parentBug ? { ...bug.parentBug, id: bug.parentBug.id.toString() } : null,
      childBugs: bug.childBugs?.map((child) => ({
        ...child,
        id: child.id.toString(),
      })),
      testResult: bug.testResult ? { id: bug.testResult.id.toString() } : null,
      assignee: bug.assignee ? { ...bug.assignee, id: bug.assignee.id.toString() } : null,
      reporter: bug.reporter ? { ...bug.reporter, id: bug.reporter.id.toString() } : undefined,
    };

    return NextResponse.json(serializedBug);
  } catch (error) {
    console.error('Get bug error:', error);
    return NextResponse.json({ error: 'バグの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/bugs/[bugId]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, bugId } = await params;

    if (!projectId || !bugId) {
      return NextResponse.json({ error: 'プロジェクトIDとバグIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // バグの存在確認
    const bugExistsResult = await bugExistsInProject(BigInt(projectId), BigInt(bugId));
    if (!bugExistsResult) {
      return NextResponse.json({ error: 'バグが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 入力値の検証
    const validation = validateUpdateBugInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const updatedBug = await updateBug(BigInt(bugId), validation.data!);

    // BigIntをシリアライズ可能な形式に変換
    const serializedBug = {
      ...updatedBug,
      id: updatedBug.id.toString(),
      projectId: updatedBug.projectId.toString(),
      parentBugId: updatedBug.parentBugId?.toString() || null,
      testResultId: updatedBug.testResultId?.toString() || null,
      assigneeId: updatedBug.assigneeId?.toString() || null,
      reporterId: updatedBug.reporterId.toString(),
    };

    return NextResponse.json(serializedBug);
  } catch (error) {
    console.error('Update bug error:', error);
    const message = error instanceof Error ? error.message : 'バグの更新に失敗しました。';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/bugs/[bugId]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, bugId } = await params;

    if (!projectId || !bugId) {
      return NextResponse.json({ error: 'プロジェクトIDとバグIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // バグの存在確認
    const bugExistsResult = await bugExistsInProject(BigInt(projectId), BigInt(bugId));
    if (!bugExistsResult) {
      return NextResponse.json({ error: 'バグが見つかりません。' }, { status: 404 });
    }

    await deleteBugInProject(BigInt(projectId), BigInt(bugId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete bug error:', error);
    return NextResponse.json({ error: 'バグの削除に失敗しました。' }, { status: 500 });
  }
}
