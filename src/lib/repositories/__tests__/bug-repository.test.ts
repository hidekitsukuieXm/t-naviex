/**
 * バグリポジトリのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBug,
  getBugById,
  getBugWithRelations,
  getBugInProject,
  listBugs,
  updateBug,
  deleteBug,
  deleteBugInProject,
  projectExists,
  bugExists,
  bugExistsInProject,
  getChildBugs,
  getRootBugs,
  getBugStatistics,
  getBugsByTestResult,
} from '../bug-repository';
import { prisma } from '@/lib/prisma';
import type { CreateBugInput, UpdateBugInput } from '@/types/bug';

// Prismaをモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    bug: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// モックのリセット
beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// 存在確認関数のテスト
// ============================================

describe('projectExists', () => {
  it('should return true when project exists', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: BigInt(1) } as never);

    const result = await projectExists(BigInt(1));
    expect(result).toBe(true);
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      select: { id: true },
    });
  });

  it('should return false when project does not exist', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    const result = await projectExists(BigInt(999));
    expect(result).toBe(false);
  });
});

describe('bugExists', () => {
  it('should return true when bug exists', async () => {
    vi.mocked(prisma.bug.findUnique).mockResolvedValue({ id: BigInt(1) } as never);

    const result = await bugExists(BigInt(1));
    expect(result).toBe(true);
  });

  it('should return false when bug does not exist', async () => {
    vi.mocked(prisma.bug.findUnique).mockResolvedValue(null);

    const result = await bugExists(BigInt(999));
    expect(result).toBe(false);
  });
});

describe('bugExistsInProject', () => {
  it('should return true when bug exists in project', async () => {
    vi.mocked(prisma.bug.findFirst).mockResolvedValue({ id: BigInt(1) } as never);

    const result = await bugExistsInProject(BigInt(1), BigInt(1));
    expect(result).toBe(true);
    expect(prisma.bug.findFirst).toHaveBeenCalledWith({
      where: { id: BigInt(1), projectId: BigInt(1) },
      select: { id: true },
    });
  });

  it('should return false when bug does not exist in project', async () => {
    vi.mocked(prisma.bug.findFirst).mockResolvedValue(null);

    const result = await bugExistsInProject(BigInt(1), BigInt(999));
    expect(result).toBe(false);
  });
});

// ============================================
// CRUD操作のテスト
// ============================================

describe('createBug', () => {
  it('should create a bug with required fields', async () => {
    const input: CreateBugInput = {
      projectId: BigInt(1),
      title: 'テストバグ',
      reporterId: BigInt(1),
    };

    const mockBug = {
      id: BigInt(1),
      projectId: BigInt(1),
      parentBugId: null,
      testResultId: null,
      title: 'テストバグ',
      description: null,
      type: 'BUG',
      status: 'NEW',
      priority: 'MEDIUM',
      severity: 'MAJOR',
      assigneeId: null,
      reporterId: BigInt(1),
      stepsToReproduce: null,
      expectedResult: null,
      actualResult: null,
      environment: null,
      version: null,
      fixedVersion: null,
      dueDate: null,
      resolvedAt: null,
      closedAt: null,
      externalId: null,
      externalUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.bug.create).mockResolvedValue(mockBug as never);

    const result = await createBug(input);
    expect(result.title).toBe('テストバグ');
    expect(result.status).toBe('NEW');
    expect(result.type).toBe('BUG');
    expect(prisma.bug.create).toHaveBeenCalled();
  });

  it('should create a bug with all fields', async () => {
    const input: CreateBugInput = {
      projectId: BigInt(1),
      title: 'テストバグ',
      description: 'バグの説明',
      type: 'FEATURE',
      priority: 'HIGH',
      severity: 'CRITICAL',
      assigneeId: BigInt(2),
      reporterId: BigInt(1),
      parentBugId: BigInt(10),
      testResultId: BigInt(5),
      stepsToReproduce: '再現手順',
      expectedResult: '期待結果',
      actualResult: '実際の結果',
      environment: 'Chrome 100',
      version: '1.0.0',
      dueDate: new Date(),
    };

    const mockBug = {
      id: BigInt(1),
      ...input,
      status: 'NEW',
      fixedVersion: null,
      resolvedAt: null,
      closedAt: null,
      externalId: null,
      externalUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.bug.create).mockResolvedValue(mockBug as never);

    const result = await createBug(input);
    expect(result.title).toBe('テストバグ');
    expect(result.type).toBe('FEATURE');
    expect(result.priority).toBe('HIGH');
    expect(result.severity).toBe('CRITICAL');
  });
});

describe('getBugById', () => {
  it('should return bug when found', async () => {
    const mockBug = {
      id: BigInt(1),
      projectId: BigInt(1),
      parentBugId: null,
      testResultId: null,
      title: 'テストバグ',
      description: null,
      type: 'BUG',
      status: 'NEW',
      priority: 'MEDIUM',
      severity: 'MAJOR',
      assigneeId: null,
      reporterId: BigInt(1),
      stepsToReproduce: null,
      expectedResult: null,
      actualResult: null,
      environment: null,
      version: null,
      fixedVersion: null,
      dueDate: null,
      resolvedAt: null,
      closedAt: null,
      externalId: null,
      externalUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.bug.findUnique).mockResolvedValue(mockBug as never);

    const result = await getBugById(BigInt(1));
    expect(result).not.toBeNull();
    expect(result?.title).toBe('テストバグ');
  });

  it('should return null when bug not found', async () => {
    vi.mocked(prisma.bug.findUnique).mockResolvedValue(null);

    const result = await getBugById(BigInt(999));
    expect(result).toBeNull();
  });
});

describe('getBugWithRelations', () => {
  it('should return bug with relations', async () => {
    const mockBug = {
      id: BigInt(1),
      projectId: BigInt(1),
      parentBugId: null,
      testResultId: null,
      title: 'テストバグ',
      description: null,
      type: 'BUG',
      status: 'NEW',
      priority: 'MEDIUM',
      severity: 'MAJOR',
      assigneeId: BigInt(2),
      reporterId: BigInt(1),
      stepsToReproduce: null,
      expectedResult: null,
      actualResult: null,
      environment: null,
      version: null,
      fixedVersion: null,
      dueDate: null,
      resolvedAt: null,
      closedAt: null,
      externalId: null,
      externalUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: { id: BigInt(1), name: 'テストプロジェクト' },
      parentBug: null,
      childBugs: [],
      testResult: null,
      assignee: { id: BigInt(2), name: '担当者', email: 'assignee@example.com' },
      reporter: { id: BigInt(1), name: '報告者', email: 'reporter@example.com' },
    };

    vi.mocked(prisma.bug.findUnique).mockResolvedValue(mockBug as never);

    const result = await getBugWithRelations(BigInt(1));
    expect(result).not.toBeNull();
    expect(result?.project?.name).toBe('テストプロジェクト');
    expect(result?.assignee?.name).toBe('担当者');
    expect(result?.reporter?.name).toBe('報告者');
  });
});

describe('getBugInProject', () => {
  it('should return bug when found in project', async () => {
    const mockBug = {
      id: BigInt(1),
      projectId: BigInt(1),
      parentBugId: null,
      testResultId: null,
      title: 'テストバグ',
      description: null,
      type: 'BUG',
      status: 'NEW',
      priority: 'MEDIUM',
      severity: 'MAJOR',
      assigneeId: null,
      reporterId: BigInt(1),
      stepsToReproduce: null,
      expectedResult: null,
      actualResult: null,
      environment: null,
      version: null,
      fixedVersion: null,
      dueDate: null,
      resolvedAt: null,
      closedAt: null,
      externalId: null,
      externalUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      project: { id: BigInt(1), name: 'テストプロジェクト' },
      parentBug: null,
      childBugs: [],
      testResult: null,
      assignee: null,
      reporter: { id: BigInt(1), name: '報告者', email: 'reporter@example.com' },
    };

    vi.mocked(prisma.bug.findFirst).mockResolvedValue(mockBug as never);

    const result = await getBugInProject(BigInt(1), BigInt(1));
    expect(result).not.toBeNull();
    expect(result?.title).toBe('テストバグ');
  });

  it('should return null when bug not found in project', async () => {
    vi.mocked(prisma.bug.findFirst).mockResolvedValue(null);

    const result = await getBugInProject(BigInt(1), BigInt(999));
    expect(result).toBeNull();
  });
});

describe('listBugs', () => {
  it('should list bugs with filters', async () => {
    const mockBugs = [
      {
        id: BigInt(1),
        projectId: BigInt(1),
        parentBugId: null,
        testResultId: null,
        title: 'バグ1',
        description: null,
        type: 'BUG',
        status: 'NEW',
        priority: 'HIGH',
        severity: 'CRITICAL',
        assigneeId: null,
        reporterId: BigInt(1),
        stepsToReproduce: null,
        expectedResult: null,
        actualResult: null,
        environment: null,
        version: null,
        fixedVersion: null,
        dueDate: null,
        resolvedAt: null,
        closedAt: null,
        externalId: null,
        externalUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: { id: BigInt(1), name: 'テストプロジェクト' },
        parentBug: null,
        childBugs: [],
        testResult: null,
        assignee: null,
        reporter: { id: BigInt(1), name: '報告者', email: 'reporter@example.com' },
      },
    ];

    vi.mocked(prisma.bug.findMany).mockResolvedValue(mockBugs as never);
    vi.mocked(prisma.bug.count).mockResolvedValue(1);

    const result = await listBugs(
      { projectId: BigInt(1), status: 'NEW' },
      { take: 10, orderBy: { field: 'createdAt', direction: 'desc' } }
    );

    expect(result.bugs).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.bugs[0].title).toBe('バグ1');
  });

  it('should filter by multiple statuses', async () => {
    vi.mocked(prisma.bug.findMany).mockResolvedValue([]);
    vi.mocked(prisma.bug.count).mockResolvedValue(0);

    await listBugs({ projectId: BigInt(1), status: ['NEW', 'OPEN'] });

    expect(prisma.bug.findMany).toHaveBeenCalled();
  });

  it('should filter by query string', async () => {
    vi.mocked(prisma.bug.findMany).mockResolvedValue([]);
    vi.mocked(prisma.bug.count).mockResolvedValue(0);

    await listBugs({ projectId: BigInt(1), query: 'エラー' });

    expect(prisma.bug.findMany).toHaveBeenCalled();
  });
});

describe('updateBug', () => {
  it('should update bug fields', async () => {
    const currentBug = {
      status: 'NEW',
    };

    const updatedBug = {
      id: BigInt(1),
      projectId: BigInt(1),
      parentBugId: null,
      testResultId: null,
      title: '更新されたバグ',
      description: null,
      type: 'BUG',
      status: 'OPEN',
      priority: 'HIGH',
      severity: 'MAJOR',
      assigneeId: null,
      reporterId: BigInt(1),
      stepsToReproduce: null,
      expectedResult: null,
      actualResult: null,
      environment: null,
      version: null,
      fixedVersion: null,
      dueDate: null,
      resolvedAt: null,
      closedAt: null,
      externalId: null,
      externalUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.bug.findUnique).mockResolvedValue(currentBug as never);
    vi.mocked(prisma.bug.update).mockResolvedValue(updatedBug as never);

    const input: UpdateBugInput = {
      title: '更新されたバグ',
      status: 'OPEN',
      priority: 'HIGH',
    };

    const result = await updateBug(BigInt(1), input);
    expect(result.title).toBe('更新されたバグ');
    expect(result.status).toBe('OPEN');
    expect(result.priority).toBe('HIGH');
  });

  it('should set resolvedAt when status changes to RESOLVED', async () => {
    const currentBug = { status: 'IN_PROGRESS' };
    const updatedBug = {
      id: BigInt(1),
      projectId: BigInt(1),
      parentBugId: null,
      testResultId: null,
      title: 'バグ',
      description: null,
      type: 'BUG',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      severity: 'MAJOR',
      assigneeId: null,
      reporterId: BigInt(1),
      stepsToReproduce: null,
      expectedResult: null,
      actualResult: null,
      environment: null,
      version: null,
      fixedVersion: null,
      dueDate: null,
      resolvedAt: new Date(),
      closedAt: null,
      externalId: null,
      externalUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.bug.findUnique).mockResolvedValue(currentBug as never);
    vi.mocked(prisma.bug.update).mockResolvedValue(updatedBug as never);

    const result = await updateBug(BigInt(1), { status: 'RESOLVED' });
    expect(result.status).toBe('RESOLVED');
    expect(prisma.bug.update).toHaveBeenCalled();
  });

  it('should set closedAt when status changes to CLOSED', async () => {
    const currentBug = { status: 'VERIFIED' };
    const updatedBug = {
      id: BigInt(1),
      projectId: BigInt(1),
      parentBugId: null,
      testResultId: null,
      title: 'バグ',
      description: null,
      type: 'BUG',
      status: 'CLOSED',
      priority: 'MEDIUM',
      severity: 'MAJOR',
      assigneeId: null,
      reporterId: BigInt(1),
      stepsToReproduce: null,
      expectedResult: null,
      actualResult: null,
      environment: null,
      version: null,
      fixedVersion: null,
      dueDate: null,
      resolvedAt: new Date(),
      closedAt: new Date(),
      externalId: null,
      externalUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.bug.findUnique).mockResolvedValue(currentBug as never);
    vi.mocked(prisma.bug.update).mockResolvedValue(updatedBug as never);

    const result = await updateBug(BigInt(1), { status: 'CLOSED' });
    expect(result.status).toBe('CLOSED');
  });

  it('should throw error when bug not found', async () => {
    vi.mocked(prisma.bug.findUnique).mockResolvedValue(null);

    await expect(updateBug(BigInt(999), { title: 'test' })).rejects.toThrow('バグが見つかりません');
  });
});

describe('deleteBug', () => {
  it('should delete a bug', async () => {
    vi.mocked(prisma.bug.delete).mockResolvedValue({} as never);

    await deleteBug(BigInt(1));
    expect(prisma.bug.delete).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
    });
  });
});

describe('deleteBugInProject', () => {
  it('should delete a bug in specific project', async () => {
    vi.mocked(prisma.bug.deleteMany).mockResolvedValue({ count: 1 });

    await deleteBugInProject(BigInt(1), BigInt(1));
    expect(prisma.bug.deleteMany).toHaveBeenCalledWith({
      where: { id: BigInt(1), projectId: BigInt(1) },
    });
  });
});

// ============================================
// サブタスク関連のテスト
// ============================================

describe('getChildBugs', () => {
  it('should return child bugs', async () => {
    const mockBugs = [
      {
        id: BigInt(2),
        projectId: BigInt(1),
        parentBugId: BigInt(1),
        testResultId: null,
        title: '子バグ1',
        description: null,
        type: 'BUG',
        status: 'NEW',
        priority: 'MEDIUM',
        severity: 'MAJOR',
        assigneeId: null,
        reporterId: BigInt(1),
        stepsToReproduce: null,
        expectedResult: null,
        actualResult: null,
        environment: null,
        version: null,
        fixedVersion: null,
        dueDate: null,
        resolvedAt: null,
        closedAt: null,
        externalId: null,
        externalUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: { id: BigInt(1), name: 'テストプロジェクト' },
        parentBug: { id: BigInt(1), title: '親バグ' },
        childBugs: [],
        testResult: null,
        assignee: null,
        reporter: { id: BigInt(1), name: '報告者', email: 'reporter@example.com' },
      },
    ];

    vi.mocked(prisma.bug.findMany).mockResolvedValue(mockBugs as never);

    const result = await getChildBugs(BigInt(1));
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('子バグ1');
    expect(result[0].parentBug?.id).toBe(BigInt(1));
  });
});

describe('getRootBugs', () => {
  it('should return only root bugs (no parent)', async () => {
    vi.mocked(prisma.bug.findMany).mockResolvedValue([]);
    vi.mocked(prisma.bug.count).mockResolvedValue(0);

    await getRootBugs(BigInt(1));

    expect(prisma.bug.findMany).toHaveBeenCalled();
  });
});

// ============================================
// 統計関連のテスト
// ============================================

describe('getBugStatistics', () => {
  it('should calculate statistics correctly', async () => {
    const mockBugs = [
      { status: 'NEW', priority: 'HIGH', severity: 'CRITICAL', type: 'BUG' },
      { status: 'OPEN', priority: 'MEDIUM', severity: 'MAJOR', type: 'BUG' },
      { status: 'RESOLVED', priority: 'LOW', severity: 'MINOR', type: 'FEATURE' },
      { status: 'CLOSED', priority: 'HIGH', severity: 'TRIVIAL', type: 'TASK' },
    ];

    vi.mocked(prisma.bug.findMany).mockResolvedValue(mockBugs as never);

    const stats = await getBugStatistics(BigInt(1));

    expect(stats.total).toBe(4);
    expect(stats.byStatus.NEW).toBe(1);
    expect(stats.byStatus.OPEN).toBe(1);
    expect(stats.byStatus.RESOLVED).toBe(1);
    expect(stats.byStatus.CLOSED).toBe(1);
    expect(stats.byPriority.HIGH).toBe(2);
    expect(stats.byPriority.MEDIUM).toBe(1);
    expect(stats.byPriority.LOW).toBe(1);
    expect(stats.openCount).toBe(2);
    expect(stats.closedCount).toBe(1);
    expect(stats.resolvedCount).toBe(2);
  });

  it('should return zero statistics for empty project', async () => {
    vi.mocked(prisma.bug.findMany).mockResolvedValue([]);

    const stats = await getBugStatistics(BigInt(1));

    expect(stats.total).toBe(0);
    expect(stats.openCount).toBe(0);
    expect(stats.closedCount).toBe(0);
  });
});

describe('getBugsByTestResult', () => {
  it('should return bugs linked to test result', async () => {
    const mockBugs = [
      {
        id: BigInt(1),
        projectId: BigInt(1),
        parentBugId: null,
        testResultId: BigInt(5),
        title: 'テスト結果に紐づくバグ',
        description: null,
        type: 'BUG',
        status: 'NEW',
        priority: 'HIGH',
        severity: 'CRITICAL',
        assigneeId: null,
        reporterId: BigInt(1),
        stepsToReproduce: null,
        expectedResult: null,
        actualResult: null,
        environment: null,
        version: null,
        fixedVersion: null,
        dueDate: null,
        resolvedAt: null,
        closedAt: null,
        externalId: null,
        externalUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.mocked(prisma.bug.findMany).mockResolvedValue(mockBugs as never);

    const result = await getBugsByTestResult(BigInt(5));
    expect(result).toHaveLength(1);
    expect(result[0].testResultId).toBe(BigInt(5));
  });
});
