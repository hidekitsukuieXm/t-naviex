/**
 * タスク個別 API
 * GET    /api/projects/[id]/tasks/[taskId] - タスク取得
 * PUT    /api/projects/[id]/tasks/[taskId] - タスク更新
 * DELETE /api/projects/[id]/tasks/[taskId] - タスク削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  projectExists,
  taskExistsInProject,
  parentTaskExistsInProject,
  userExists,
  checkCircularReference,
  getTaskById,
  updateTask,
  deleteTask,
} from '@/lib/repositories/task-repository';
import { validateUpdateTaskInput } from '@/types/task';

interface RouteParams {
  params: Promise<{ id: string; taskId: string }>;
}

// GET /api/projects/[id]/tasks/[taskId] - タスク取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;

    if (!projectId || !taskId) {
      return NextResponse.json({ error: 'プロジェクトIDとタスクIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // タスク取得
    const task = await getTaskById(BigInt(taskId));

    if (!task) {
      return NextResponse.json({ error: 'タスクが見つかりません。' }, { status: 404 });
    }

    // プロジェクトに属しているか確認
    if (task.projectId !== projectId) {
      return NextResponse.json({ error: 'タスクが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json({ error: 'タスクの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/tasks/[taskId] - タスク更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;

    if (!projectId || !taskId) {
      return NextResponse.json({ error: 'プロジェクトIDとタスクIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // タスクの存在確認
    const taskExistsResult = await taskExistsInProject(BigInt(projectId), BigInt(taskId));
    if (!taskExistsResult) {
      return NextResponse.json({ error: 'タスクが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateUpdateTaskInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 親タスク変更時のチェック
    if (validation.data!.parentId !== undefined) {
      if (validation.data!.parentId) {
        // 親タスクの存在確認
        const parentExists = await parentTaskExistsInProject(
          BigInt(projectId),
          BigInt(validation.data!.parentId)
        );
        if (!parentExists) {
          return NextResponse.json({ error: '親タスクが見つかりません。' }, { status: 404 });
        }

        // 循環参照チェック
        const isCircular = await checkCircularReference(
          BigInt(taskId),
          BigInt(validation.data!.parentId)
        );
        if (isCircular) {
          return NextResponse.json(
            { error: '循環参照が発生するため、この親タスクは設定できません。' },
            { status: 400 }
          );
        }
      }
    }

    // 担当者変更時のチェック
    if (validation.data!.assigneeId) {
      const assigneeExists = await userExists(BigInt(validation.data!.assigneeId));
      if (!assigneeExists) {
        return NextResponse.json({ error: '担当者が見つかりません。' }, { status: 404 });
      }
    }

    // タスク更新
    const task = await updateTask(BigInt(taskId), validation.data!);

    if (!task) {
      return NextResponse.json({ error: 'タスクが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'タスクの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/tasks/[taskId] - タスク削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, taskId } = await params;

    if (!projectId || !taskId) {
      return NextResponse.json({ error: 'プロジェクトIDとタスクIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // タスクの存在確認
    const taskExistsResult = await taskExistsInProject(BigInt(projectId), BigInt(taskId));
    if (!taskExistsResult) {
      return NextResponse.json({ error: 'タスクが見つかりません。' }, { status: 404 });
    }

    // タスク削除
    const result = await deleteTask(BigInt(taskId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'タスクの削除に失敗しました。' }, { status: 500 });
  }
}
