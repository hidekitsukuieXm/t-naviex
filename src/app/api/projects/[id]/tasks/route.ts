/**
 * タスク API
 * GET  /api/projects/[id]/tasks - タスク一覧取得
 * POST /api/projects/[id]/tasks - タスク作成
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  projectExists,
  parentTaskExistsInProject,
  userExists,
  getTasks,
  createTask,
} from '@/lib/repositories/task-repository';
import { validateCreateTaskInput, type TaskStatus, type TaskPriority } from '@/types/task';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/tasks - タスク一覧取得
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
    const parentId = searchParams.get('parentId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const query = searchParams.get('query');
    const rootOnly = searchParams.get('rootOnly');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');
    const includeChildren = searchParams.get('includeChildren');

    const tasks = await getTasks(projectId, {
      parentId: parentId === 'null' ? null : parentId || undefined,
      status: (status as TaskStatus) || undefined,
      priority: (priority as TaskPriority) || undefined,
      assigneeId: assigneeId === 'null' ? null : assigneeId || undefined,
      query: query || undefined,
      rootOnly: rootOnly === 'true',
      sortBy:
        (sortBy as
          | 'title'
          | 'sortOrder'
          | 'startDate'
          | 'endDate'
          | 'status'
          | 'priority'
          | 'createdAt'
          | 'updatedAt') || undefined,
      sortOrder: (sortOrder as 'asc' | 'desc') || undefined,
      includeChildren: includeChildren === 'true',
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'タスクの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/tasks - タスク作成
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
    const validation = validateCreateTaskInput({ ...body, projectId });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 親タスクの存在確認
    if (validation.data!.parentId) {
      const parentExists = await parentTaskExistsInProject(
        BigInt(projectId),
        BigInt(validation.data!.parentId)
      );
      if (!parentExists) {
        return NextResponse.json({ error: '親タスクが見つかりません。' }, { status: 404 });
      }
    }

    // 担当者の存在確認
    if (validation.data!.assigneeId) {
      const assigneeExists = await userExists(BigInt(validation.data!.assigneeId));
      if (!assigneeExists) {
        return NextResponse.json({ error: '担当者が見つかりません。' }, { status: 404 });
      }
    }

    // タスク作成
    const task = await createTask(validation.data!);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'タスクの作成に失敗しました。' }, { status: 500 });
  }
}
