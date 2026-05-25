/**
 * タスクリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  Task,
  TaskWithRelations,
  TaskStatus,
  TaskPriority,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListOptions,
} from '@/types/task';
import { TASK_STATUS } from '@/types/task';

// ============================================
// セレクト定義
// ============================================

const taskSelect = {
  id: true,
  projectId: true,
  parentId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  assigneeId: true,
  startDate: true,
  endDate: true,
  progress: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

const taskWithRelationsSelect = {
  ...taskSelect,
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  children: {
    select: taskSelect,
    orderBy: { sortOrder: 'asc' as const },
  },
  parent: {
    select: taskSelect,
  },
};

// ============================================
// 変換関数
// ============================================

interface DbTask {
  id: bigint;
  projectId: bigint;
  parentId: bigint | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: bigint | null;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DbTaskWithRelations extends DbTask {
  assignee?: {
    id: bigint;
    name: string;
    email: string;
  } | null;
  children?: DbTask[];
  parent?: DbTask | null;
}

function serializeTask(task: DbTask): Task {
  return {
    id: task.id.toString(),
    projectId: task.projectId.toString(),
    parentId: task.parentId?.toString() ?? null,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority,
    assigneeId: task.assigneeId?.toString() ?? null,
    startDate: task.startDate?.toISOString().split('T')[0] ?? null,
    endDate: task.endDate?.toISOString().split('T')[0] ?? null,
    progress: task.progress,
    sortOrder: task.sortOrder,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function serializeTaskWithRelations(task: DbTaskWithRelations): TaskWithRelations {
  return {
    ...serializeTask(task),
    assignee: task.assignee
      ? {
          id: task.assignee.id.toString(),
          name: task.assignee.name,
          email: task.assignee.email,
        }
      : null,
    children: task.children?.map(serializeTask) ?? [],
    parent: task.parent ? serializeTask(task.parent) : null,
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * タスク作成
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const trimmedTitle = input.title.trim();

  // 並び順を決定（指定がなければ最後に追加）
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const maxSortOrder = await prisma.task.aggregate({
      where: {
        projectId: BigInt(input.projectId),
        parentId: input.parentId ? BigInt(input.parentId) : null,
      },
      _max: { sortOrder: true },
    });
    sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
  }

  const task = await prisma.task.create({
    data: {
      projectId: BigInt(input.projectId),
      parentId: input.parentId ? BigInt(input.parentId) : null,
      title: trimmedTitle,
      description: input.description ?? null,
      status: input.status ?? TASK_STATUS.NOT_STARTED,
      priority: input.priority ?? 'MEDIUM',
      assigneeId: input.assigneeId ? BigInt(input.assigneeId) : null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      progress: input.progress ?? 0,
      sortOrder,
    },
    select: taskSelect,
  });

  return serializeTask(task as DbTask);
}

/**
 * タスク取得（ID指定）
 */
export async function getTaskById(id: bigint): Promise<TaskWithRelations | null> {
  const task = await prisma.task.findUnique({
    where: { id },
    select: taskWithRelationsSelect,
  });

  if (!task) {
    return null;
  }

  return serializeTaskWithRelations(task as DbTaskWithRelations);
}

/**
 * タスク一覧取得
 */
export async function getTasks(
  projectId: string,
  options: TaskListOptions = {}
): Promise<TaskWithRelations[]> {
  type WhereClause = {
    projectId: bigint;
    parentId?: bigint | null | { not: null };
    status?: string;
    priority?: string;
    assigneeId?: bigint | null;
    OR?: Array<{ title: { contains: string; mode: 'insensitive' } }>;
  };

  const where: WhereClause = {
    projectId: BigInt(projectId),
  };

  // 親ID フィルター
  if (options.parentId !== undefined) {
    where.parentId = options.parentId ? BigInt(options.parentId) : null;
  }

  // ルートのみ
  if (options.rootOnly) {
    where.parentId = null;
  }

  // ステータスフィルター
  if (options.status) {
    where.status = options.status;
  }

  // 優先度フィルター
  if (options.priority) {
    where.priority = options.priority;
  }

  // 担当者フィルター
  if (options.assigneeId !== undefined) {
    where.assigneeId = options.assigneeId ? BigInt(options.assigneeId) : null;
  }

  // 検索クエリ
  if (options.query) {
    where.OR = [{ title: { contains: options.query, mode: 'insensitive' } }];
  }

  // ソート設定
  type OrderByField =
    | 'title'
    | 'sortOrder'
    | 'startDate'
    | 'endDate'
    | 'status'
    | 'priority'
    | 'createdAt'
    | 'updatedAt';
  const sortBy: OrderByField = options.sortBy ?? 'sortOrder';
  const sortOrder = options.sortOrder ?? 'asc';

  const tasks = await prisma.task.findMany({
    where,
    select: options.includeChildren ? taskWithRelationsSelect : taskSelect,
    orderBy: { [sortBy]: sortOrder },
  });

  return tasks.map((t) =>
    options.includeChildren
      ? serializeTaskWithRelations(t as DbTaskWithRelations)
      : { ...serializeTask(t as DbTask), children: [], assignee: null, parent: null }
  );
}

/**
 * タスク更新
 */
export async function updateTask(id: bigint, input: UpdateTaskInput): Promise<Task | null> {
  const existing = await prisma.task.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return null;
  }

  const updateData: {
    parentId?: bigint | null;
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    assigneeId?: bigint | null;
    startDate?: Date | null;
    endDate?: Date | null;
    progress?: number;
    sortOrder?: number;
  } = {};

  if (input.parentId !== undefined) {
    updateData.parentId = input.parentId ? BigInt(input.parentId) : null;
  }

  if (input.title !== undefined) {
    updateData.title = input.title.trim();
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;
    // ステータスが完了になったら進捗を100%に
    if (input.status === TASK_STATUS.COMPLETED) {
      updateData.progress = 100;
    }
  }

  if (input.priority !== undefined) {
    updateData.priority = input.priority;
  }

  if (input.assigneeId !== undefined) {
    updateData.assigneeId = input.assigneeId ? BigInt(input.assigneeId) : null;
  }

  if (input.startDate !== undefined) {
    updateData.startDate = input.startDate ? new Date(input.startDate) : null;
  }

  if (input.endDate !== undefined) {
    updateData.endDate = input.endDate ? new Date(input.endDate) : null;
  }

  if (input.progress !== undefined) {
    updateData.progress = input.progress;
  }

  if (input.sortOrder !== undefined) {
    updateData.sortOrder = input.sortOrder;
  }

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
    select: taskSelect,
  });

  return serializeTask(task as DbTask);
}

/**
 * タスク削除（子タスクも連動削除）
 */
export async function deleteTask(id: bigint): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.task.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, error: 'タスクが見つかりません。' };
  }

  // Cascade delete will remove children automatically
  await prisma.task.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * 並び順一括更新
 */
export async function updateTaskSortOrders(
  projectId: string,
  items: { id: string; sortOrder: number; parentId?: string | null }[]
): Promise<Task[]> {
  const updates = items.map((item) =>
    prisma.task.update({
      where: {
        id: BigInt(item.id),
        projectId: BigInt(projectId),
      },
      data: {
        sortOrder: item.sortOrder,
        ...(item.parentId !== undefined && {
          parentId: item.parentId ? BigInt(item.parentId) : null,
        }),
      },
      select: taskSelect,
    })
  );

  const tasks = await prisma.$transaction(updates);

  return tasks.map((t) => serializeTask(t as DbTask));
}

/**
 * タスク移動（親変更）
 */
export async function moveTask(id: bigint, newParentId: bigint | null): Promise<Task | null> {
  const existing = await prisma.task.findUnique({
    where: { id },
    select: { id: true, projectId: true },
  });

  if (!existing) {
    return null;
  }

  // 循環参照チェック
  if (newParentId) {
    const isCircular = await checkCircularReference(id, newParentId);
    if (isCircular) {
      return null;
    }
  }

  // 新しい親の下での並び順を取得
  const maxSortOrder = await prisma.task.aggregate({
    where: {
      projectId: existing.projectId,
      parentId: newParentId,
    },
    _max: { sortOrder: true },
  });

  const task = await prisma.task.update({
    where: { id },
    data: {
      parentId: newParentId,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
    select: taskSelect,
  });

  return serializeTask(task as DbTask);
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * プロジェクトが存在するか確認
 */
export async function projectExists(projectId: bigint): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  return project !== null;
}

/**
 * タスクがプロジェクトに属しているか確認
 */
export async function taskExistsInProject(projectId: bigint, taskId: bigint): Promise<boolean> {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
    },
    select: { id: true },
  });

  return task !== null;
}

/**
 * ユーザーが存在するか確認
 */
export async function userExists(userId: bigint): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  return user !== null;
}

/**
 * 親タスクが同じプロジェクトに存在するか確認
 */
export async function parentTaskExistsInProject(
  projectId: bigint,
  parentId: bigint
): Promise<boolean> {
  const parent = await prisma.task.findFirst({
    where: {
      id: parentId,
      projectId,
    },
    select: { id: true },
  });

  return parent !== null;
}

/**
 * 循環参照チェック
 */
export async function checkCircularReference(
  taskId: bigint,
  newParentId: bigint
): Promise<boolean> {
  // タスク自身を親に設定しようとしている
  if (taskId === newParentId) {
    return true;
  }

  // 新しい親の祖先を辿って、自分が含まれていないかチェック
  let currentParentId: bigint | null = newParentId;

  while (currentParentId) {
    const parent = await prisma.task.findUnique({
      where: { id: currentParentId },
      select: { id: true, parentId: true },
    });

    if (!parent) {
      break;
    }

    if (parent.id === taskId) {
      return true;
    }

    currentParentId = parent.parentId;
  }

  return false;
}

/**
 * プロジェクトのタスク数を取得
 */
export async function getTaskCount(projectId: bigint, status?: TaskStatus): Promise<number> {
  const where: { projectId: bigint; status?: string } = {
    projectId,
  };

  if (status) {
    where.status = status;
  }

  return prisma.task.count({ where });
}

/**
 * 子タスクを取得
 */
export async function getChildTasks(taskId: bigint): Promise<Task[]> {
  const tasks = await prisma.task.findMany({
    where: { parentId: taskId },
    select: taskSelect,
    orderBy: { sortOrder: 'asc' },
  });

  return tasks.map((t) => serializeTask(t as DbTask));
}
