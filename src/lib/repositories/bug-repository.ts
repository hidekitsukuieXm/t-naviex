/**
 * バグリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  Bug,
  BugWithRelations,
  BugStatus,
  BugType,
  BugPriority,
  BugSeverity,
  CreateBugInput,
  UpdateBugInput,
  BugListFilters,
  BugListOptions,
  BugStatistics,
} from '@/types/bug';
import { isClosedStatus, isResolvedStatus } from '@/types/bug';

// ============================================
// セレクト定義
// ============================================

const bugSelect = {
  id: true,
  projectId: true,
  parentBugId: true,
  testResultId: true,
  title: true,
  description: true,
  type: true,
  status: true,
  priority: true,
  severity: true,
  assigneeId: true,
  reporterId: true,
  stepsToReproduce: true,
  expectedResult: true,
  actualResult: true,
  environment: true,
  version: true,
  fixedVersion: true,
  dueDate: true,
  resolvedAt: true,
  closedAt: true,
  externalId: true,
  externalUrl: true,
  createdAt: true,
  updatedAt: true,
};

const bugWithRelationsSelect = {
  ...bugSelect,
  project: {
    select: {
      id: true,
      name: true,
    },
  },
  parentBug: {
    select: {
      id: true,
      title: true,
    },
  },
  childBugs: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
  testResult: {
    select: {
      id: true,
    },
  },
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  reporter: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

// ============================================
// 変換関数
// ============================================

interface DbBug {
  id: bigint;
  projectId: bigint;
  parentBugId: bigint | null;
  testResultId: bigint | null;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  severity: string;
  assigneeId: bigint | null;
  reporterId: bigint;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  version: string | null;
  fixedVersion: string | null;
  dueDate: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  externalId: string | null;
  externalUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DbBugWithRelations extends DbBug {
  project: { id: bigint; name: string };
  parentBug: { id: bigint; title: string } | null;
  childBugs: { id: bigint; title: string; status: string }[];
  testResult: { id: bigint } | null;
  assignee: { id: bigint; name: string; email: string } | null;
  reporter: { id: bigint; name: string; email: string };
}

function toBug(dbBug: DbBug): Bug {
  return {
    ...dbBug,
    type: dbBug.type as BugType,
    status: dbBug.status as BugStatus,
    priority: dbBug.priority as BugPriority,
    severity: dbBug.severity as BugSeverity,
  };
}

function toBugWithRelations(dbBug: DbBugWithRelations): BugWithRelations {
  return {
    ...toBug(dbBug),
    project: dbBug.project,
    parentBug: dbBug.parentBug,
    childBugs: dbBug.childBugs.map((child) => ({
      ...child,
      status: child.status as BugStatus,
    })),
    testResult: dbBug.testResult,
    assignee: dbBug.assignee,
    reporter: dbBug.reporter,
  };
}

// ============================================
// 存在確認関数
// ============================================

export async function projectExists(projectId: bigint): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  return project !== null;
}

export async function bugExists(bugId: bigint): Promise<boolean> {
  const bug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: { id: true },
  });
  return bug !== null;
}

export async function bugExistsInProject(projectId: bigint, bugId: bigint): Promise<boolean> {
  const bug = await prisma.bug.findFirst({
    where: {
      id: bugId,
      projectId,
    },
    select: { id: true },
  });
  return bug !== null;
}

// ============================================
// CRUD操作
// ============================================

/**
 * バグを作成
 */
export async function createBug(input: CreateBugInput): Promise<Bug> {
  const dbBug = await prisma.bug.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      type: input.type ?? 'BUG',
      status: 'NEW',
      priority: input.priority ?? 'MEDIUM',
      severity: input.severity ?? 'MAJOR',
      assigneeId: input.assigneeId ?? null,
      reporterId: input.reporterId,
      parentBugId: input.parentBugId ?? null,
      testResultId: input.testResultId ?? null,
      stepsToReproduce: input.stepsToReproduce ?? null,
      expectedResult: input.expectedResult ?? null,
      actualResult: input.actualResult ?? null,
      environment: input.environment ?? null,
      version: input.version ?? null,
      dueDate: input.dueDate ?? null,
    },
    select: bugSelect,
  });

  return toBug(dbBug);
}

/**
 * バグを取得（ID指定）
 */
export async function getBugById(bugId: bigint): Promise<Bug | null> {
  const dbBug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: bugSelect,
  });

  if (!dbBug) return null;
  return toBug(dbBug);
}

/**
 * バグを取得（リレーション含む）
 */
export async function getBugWithRelations(bugId: bigint): Promise<BugWithRelations | null> {
  const dbBug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: bugWithRelationsSelect,
  });

  if (!dbBug) return null;
  return toBugWithRelations(dbBug as DbBugWithRelations);
}

/**
 * プロジェクト内のバグを取得
 */
export async function getBugInProject(
  projectId: bigint,
  bugId: bigint
): Promise<BugWithRelations | null> {
  const dbBug = await prisma.bug.findFirst({
    where: {
      id: bugId,
      projectId,
    },
    select: bugWithRelationsSelect,
  });

  if (!dbBug) return null;
  return toBugWithRelations(dbBug as DbBugWithRelations);
}

/**
 * バグ一覧を取得
 */
export async function listBugs(
  filters: BugListFilters,
  options: BugListOptions = {}
): Promise<{ bugs: BugWithRelations[]; total: number }> {
  const { skip = 0, take = 50, orderBy = { field: 'createdAt', direction: 'desc' } } = options;

  // WHERE条件を構築
  const where: Record<string, unknown> = {
    projectId: filters.projectId,
  };

  if (filters.status) {
    where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
  }

  if (filters.type) {
    where.type = Array.isArray(filters.type) ? { in: filters.type } : filters.type;
  }

  if (filters.priority) {
    where.priority = Array.isArray(filters.priority) ? { in: filters.priority } : filters.priority;
  }

  if (filters.severity) {
    where.severity = Array.isArray(filters.severity) ? { in: filters.severity } : filters.severity;
  }

  if (filters.assigneeId !== undefined) {
    where.assigneeId = filters.assigneeId;
  }

  if (filters.reporterId) {
    where.reporterId = filters.reporterId;
  }

  if (filters.parentBugId !== undefined) {
    where.parentBugId = filters.parentBugId;
  }

  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query, mode: 'insensitive' } },
      { description: { contains: filters.query, mode: 'insensitive' } },
    ];
  }

  const [dbBugs, total] = await Promise.all([
    prisma.bug.findMany({
      where,
      select: bugWithRelationsSelect,
      skip,
      take,
      orderBy: { [orderBy.field]: orderBy.direction },
    }),
    prisma.bug.count({ where }),
  ]);

  return {
    bugs: dbBugs.map((bug) => toBugWithRelations(bug as DbBugWithRelations)),
    total,
  };
}

/**
 * バグを更新
 */
export async function updateBug(bugId: bigint, input: UpdateBugInput): Promise<Bug> {
  // 現在のバグを取得
  const currentBug = await prisma.bug.findUnique({
    where: { id: bugId },
    select: { status: true },
  });

  if (!currentBug) {
    throw new Error('バグが見つかりません');
  }

  // ステータス変更に伴う日時の自動設定
  const updateData: Record<string, unknown> = { ...input };

  if (input.status) {
    const currentStatus = currentBug.status as BugStatus;
    const newStatus = input.status as BugStatus;

    // 解決済みステータスに変更された場合
    if (!isResolvedStatus(currentStatus) && isResolvedStatus(newStatus)) {
      updateData.resolvedAt = new Date();
    }

    // クローズステータスに変更された場合
    if (!isClosedStatus(currentStatus) && isClosedStatus(newStatus)) {
      updateData.closedAt = new Date();
    }

    // 再オープンされた場合
    if (isClosedStatus(currentStatus) && !isClosedStatus(newStatus)) {
      updateData.closedAt = null;
    }
  }

  const dbBug = await prisma.bug.update({
    where: { id: bugId },
    data: updateData,
    select: bugSelect,
  });

  return toBug(dbBug);
}

/**
 * バグを削除
 */
export async function deleteBug(bugId: bigint): Promise<void> {
  await prisma.bug.delete({
    where: { id: bugId },
  });
}

/**
 * プロジェクト内のバグを削除
 */
export async function deleteBugInProject(projectId: bigint, bugId: bigint): Promise<void> {
  await prisma.bug.deleteMany({
    where: {
      id: bugId,
      projectId,
    },
  });
}

// ============================================
// サブタスク関連
// ============================================

/**
 * サブタスクを取得
 */
export async function getChildBugs(parentBugId: bigint): Promise<BugWithRelations[]> {
  const dbBugs = await prisma.bug.findMany({
    where: { parentBugId },
    select: bugWithRelationsSelect,
    orderBy: { createdAt: 'asc' },
  });

  return dbBugs.map((bug) => toBugWithRelations(bug as DbBugWithRelations));
}

/**
 * ルートバグのみを取得（親がないバグ）
 */
export async function getRootBugs(
  projectId: bigint,
  options: BugListOptions = {}
): Promise<{ bugs: BugWithRelations[]; total: number }> {
  return listBugs({ projectId, parentBugId: null }, options);
}

// ============================================
// 統計関連
// ============================================

/**
 * プロジェクトのバグ統計を取得
 */
export async function getBugStatistics(projectId: bigint): Promise<BugStatistics> {
  const bugs = await prisma.bug.findMany({
    where: { projectId },
    select: {
      status: true,
      priority: true,
      severity: true,
      type: true,
    },
  });

  const stats: BugStatistics = {
    total: bugs.length,
    byStatus: {
      NEW: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      VERIFIED: 0,
      CLOSED: 0,
      REJECTED: 0,
      DEFERRED: 0,
    },
    byPriority: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    },
    bySeverity: {
      BLOCKER: 0,
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
      TRIVIAL: 0,
    },
    byType: {
      BUG: 0,
      FEATURE: 0,
      INQUIRY: 0,
      TASK: 0,
      IMPROVEMENT: 0,
    },
    openCount: 0,
    closedCount: 0,
    resolvedCount: 0,
  };

  for (const bug of bugs) {
    const status = bug.status as BugStatus;
    const priority = bug.priority as BugPriority;
    const severity = bug.severity as BugSeverity;
    const type = bug.type as BugType;

    stats.byStatus[status]++;
    stats.byPriority[priority]++;
    stats.bySeverity[severity]++;
    stats.byType[type]++;

    if (['NEW', 'OPEN', 'IN_PROGRESS'].includes(status)) {
      stats.openCount++;
    }
    if (['CLOSED', 'REJECTED'].includes(status)) {
      stats.closedCount++;
    }
    if (['RESOLVED', 'VERIFIED', 'CLOSED'].includes(status)) {
      stats.resolvedCount++;
    }
  }

  return stats;
}

/**
 * テスト結果に紐づくバグを取得
 */
export async function getBugsByTestResult(testResultId: bigint): Promise<Bug[]> {
  const dbBugs = await prisma.bug.findMany({
    where: { testResultId },
    select: bugSelect,
    orderBy: { createdAt: 'desc' },
  });

  return dbBugs.map(toBug);
}
