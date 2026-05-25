import { z } from 'zod';

// Task status constants
export const TASK_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ON_HOLD: 'ON_HOLD',
  CANCELLED: 'CANCELLED',
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: '未着手',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
  ON_HOLD: '保留',
  CANCELLED: 'キャンセル',
};

// Task priority constants
export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type TaskPriority = (typeof TASK_PRIORITY)[keyof typeof TASK_PRIORITY];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '緊急',
};

// Validation constraints
export const TASK_TITLE_MAX_LENGTH = 500;
export const TASK_DESCRIPTION_MAX_LENGTH = 5000;

// Task type
export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Task with relations
export interface TaskWithRelations extends Task {
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  children?: Task[];
  parent?: Task | null;
}

// Validation schemas
export const taskTitleSchema = z
  .string()
  .min(1, 'タスク名は必須です。')
  .max(TASK_TITLE_MAX_LENGTH, `タスク名は${TASK_TITLE_MAX_LENGTH}文字以内で入力してください。`)
  .refine((val) => val.trim().length > 0, {
    message: 'タスク名は空白のみでは登録できません。',
  });

export const taskDescriptionSchema = z
  .string()
  .max(
    TASK_DESCRIPTION_MAX_LENGTH,
    `説明は${TASK_DESCRIPTION_MAX_LENGTH}文字以内で入力してください。`
  )
  .nullable()
  .optional();

export const taskStatusSchema = z.enum([
  TASK_STATUS.NOT_STARTED,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.COMPLETED,
  TASK_STATUS.ON_HOLD,
  TASK_STATUS.CANCELLED,
]);

export const taskPrioritySchema = z.enum([
  TASK_PRIORITY.LOW,
  TASK_PRIORITY.MEDIUM,
  TASK_PRIORITY.HIGH,
  TASK_PRIORITY.CRITICAL,
]);

export const taskDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で入力してください。')
  .nullable()
  .optional();

export const taskProgressSchema = z
  .number()
  .int()
  .min(0, '進捗は0以上で入力してください。')
  .max(100, '進捗は100以下で入力してください。');

// Validation functions
export function validateTaskTitle(title: string): { valid: boolean; error?: string } {
  const result = taskTitleSchema.safeParse(title);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateTaskDescription(description: string | null): {
  valid: boolean;
  error?: string;
} {
  const result = taskDescriptionSchema.safeParse(description);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateTaskDate(date: string | null): { valid: boolean; error?: string } {
  const result = taskDateSchema.safeParse(date);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

export function validateTaskProgress(progress: number): { valid: boolean; error?: string } {
  const result = taskProgressSchema.safeParse(progress);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

// Create/Update input types
export interface CreateTaskInput {
  projectId: string;
  parentId?: string | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progress?: number;
  sortOrder?: number;
}

export interface UpdateTaskInput {
  parentId?: string | null;
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  progress?: number;
  sortOrder?: number;
}

// List filter types
export interface TaskListFilter {
  parentId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  query?: string;
  rootOnly?: boolean; // only return tasks without parent
}

export interface TaskListOptions extends TaskListFilter {
  sortBy?:
    | 'title'
    | 'sortOrder'
    | 'startDate'
    | 'endDate'
    | 'status'
    | 'priority'
    | 'createdAt'
    | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  includeChildren?: boolean;
}

// Create input validation schema
export const createTaskInputSchema = z.object({
  projectId: z.string().min(1, 'プロジェクトIDは必須です。'),
  parentId: z.string().nullable().optional(),
  title: taskTitleSchema,
  description: taskDescriptionSchema,
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  startDate: taskDateSchema,
  endDate: taskDateSchema,
  progress: taskProgressSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Update input validation schema
export const updateTaskInputSchema = z.object({
  parentId: z.string().nullable().optional(),
  title: taskTitleSchema.optional(),
  description: taskDescriptionSchema,
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  startDate: taskDateSchema,
  endDate: taskDateSchema,
  progress: taskProgressSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Validation functions for API
export function validateCreateTaskInput(input: unknown): {
  valid: boolean;
  data?: CreateTaskInput;
  errors?: Record<string, string>;
} {
  const result = createTaskInputSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data as CreateTaskInput };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }
  return { valid: false, errors };
}

export function validateUpdateTaskInput(input: unknown): {
  valid: boolean;
  data?: UpdateTaskInput;
  errors?: Record<string, string>;
} {
  const result = updateTaskInputSchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data as UpdateTaskInput };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }
  return { valid: false, errors };
}

// Helper functions
export function getTaskStatusLabel(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status] || status;
}

export function getTaskStatusColor(status: TaskStatus): string {
  switch (status) {
    case TASK_STATUS.NOT_STARTED:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    case TASK_STATUS.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case TASK_STATUS.COMPLETED:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case TASK_STATUS.ON_HOLD:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case TASK_STATUS.CANCELLED:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getTaskPriorityLabel(priority: TaskPriority): string {
  return TASK_PRIORITY_LABELS[priority] || priority;
}

export function getTaskPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TASK_PRIORITY.LOW:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    case TASK_PRIORITY.MEDIUM:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case TASK_PRIORITY.HIGH:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case TASK_PRIORITY.CRITICAL:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function isTaskOverdue(task: Task): boolean {
  if (
    !task.endDate ||
    task.status === TASK_STATUS.COMPLETED ||
    task.status === TASK_STATUS.CANCELLED
  ) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(task.endDate);
  return endDate < today;
}

export function buildTaskTree(tasks: Task[]): TaskWithRelations[] {
  const taskMap = new Map<string, TaskWithRelations>();
  const roots: TaskWithRelations[] = [];

  // Create map of all tasks
  for (const task of tasks) {
    taskMap.set(task.id, { ...task, children: [] });
  }

  // Build tree structure
  for (const task of tasks) {
    const taskWithChildren = taskMap.get(task.id)!;
    if (task.parentId) {
      const parent = taskMap.get(task.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(taskWithChildren);
      }
    } else {
      roots.push(taskWithChildren);
    }
  }

  return roots;
}

export function flattenTaskTree(
  tasks: TaskWithRelations[],
  level: number = 0
): Array<TaskWithRelations & { level: number }> {
  const result: Array<TaskWithRelations & { level: number }> = [];

  for (const task of tasks) {
    result.push({ ...task, level });
    if (task.children && task.children.length > 0) {
      result.push(...flattenTaskTree(task.children as TaskWithRelations[], level + 1));
    }
  }

  return result;
}
