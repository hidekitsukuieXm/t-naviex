/**
 * 統計情報リポジトリ
 */

import { prisma } from '@/lib/prisma';
import type { TestRunCaseStatus, BugStatus } from '@/generated/prisma';

// テスト進捗統計
export interface TestProgressStats {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  skippedCases: number;
  retestCases: number;
  notRunCases: number;
  executedCases: number; // NOT_RUN以外
  passRate: number; // 合格率 (passed / executed)
  executionRate: number; // 実施率 (executed / total)
  remainingCases: number; // 残件数 (total - executed)
}

// バグ統計
export interface BugStats {
  total: number;
  byStatus: Record<BugStatus, number>;
  byPriority: Record<string, number>;
  bySeverity: Record<string, number>;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
}

// プロジェクト全体のテスト進捗取得
export async function getProjectTestProgress(projectId: bigint): Promise<TestProgressStats> {
  // 各テストランのテストランケースを取得
  const testRunCases = await prisma.testRunCase.findMany({
    where: {
      testRun: { projectId },
    },
    select: {
      status: true,
    },
  });

  const statusCounts: Record<TestRunCaseStatus, number> = {
    NOT_RUN: 0,
    PASSED: 0,
    FAILED: 0,
    BLOCKED: 0,
    SKIPPED: 0,
    RETEST: 0,
  };

  for (const trc of testRunCases) {
    statusCounts[trc.status]++;
  }

  const totalCases = testRunCases.length;
  const executedCases = totalCases - statusCounts.NOT_RUN;
  const passedCases = statusCounts.PASSED;

  return {
    totalCases,
    passedCases: statusCounts.PASSED,
    failedCases: statusCounts.FAILED,
    blockedCases: statusCounts.BLOCKED,
    skippedCases: statusCounts.SKIPPED,
    retestCases: statusCounts.RETEST,
    notRunCases: statusCounts.NOT_RUN,
    executedCases,
    passRate: executedCases > 0 ? Math.round((passedCases / executedCases) * 100) : 0,
    executionRate: totalCases > 0 ? Math.round((executedCases / totalCases) * 100) : 0,
    remainingCases: totalCases - executedCases,
  };
}

// テストラン単位のテスト進捗取得
export async function getTestRunProgress(testRunId: bigint): Promise<TestProgressStats> {
  const testRunCases = await prisma.testRunCase.findMany({
    where: { testRunId },
    select: { status: true },
  });

  const statusCounts: Record<TestRunCaseStatus, number> = {
    NOT_RUN: 0,
    PASSED: 0,
    FAILED: 0,
    BLOCKED: 0,
    SKIPPED: 0,
    RETEST: 0,
  };

  for (const trc of testRunCases) {
    statusCounts[trc.status]++;
  }

  const totalCases = testRunCases.length;
  const executedCases = totalCases - statusCounts.NOT_RUN;
  const passedCases = statusCounts.PASSED;

  return {
    totalCases,
    passedCases: statusCounts.PASSED,
    failedCases: statusCounts.FAILED,
    blockedCases: statusCounts.BLOCKED,
    skippedCases: statusCounts.SKIPPED,
    retestCases: statusCounts.RETEST,
    notRunCases: statusCounts.NOT_RUN,
    executedCases,
    passRate: executedCases > 0 ? Math.round((passedCases / executedCases) * 100) : 0,
    executionRate: totalCases > 0 ? Math.round((executedCases / totalCases) * 100) : 0,
    remainingCases: totalCases - executedCases,
  };
}

// プロジェクトのバグ統計取得
export async function getProjectBugStats(projectId: bigint): Promise<BugStats> {
  const bugs = await prisma.bug.findMany({
    where: { projectId },
    select: {
      status: true,
      priority: true,
      severity: true,
    },
  });

  const byStatus: Record<BugStatus, number> = {
    NEW: 0,
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    VERIFIED: 0,
    CLOSED: 0,
    REJECTED: 0,
    DEFERRED: 0,
  };

  const byPriority: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const bug of bugs) {
    byStatus[bug.status]++;
    byPriority[bug.priority] = (byPriority[bug.priority] || 0) + 1;
    bySeverity[bug.severity] = (bySeverity[bug.severity] || 0) + 1;
  }

  const openCount = byStatus.NEW + byStatus.OPEN + byStatus.IN_PROGRESS;
  const resolvedCount = byStatus.RESOLVED + byStatus.VERIFIED;
  const closedCount = byStatus.CLOSED + byStatus.REJECTED + byStatus.DEFERRED;

  return {
    total: bugs.length,
    byStatus,
    byPriority,
    bySeverity,
    openCount,
    resolvedCount,
    closedCount,
  };
}

// テストラン一覧取得（進捗情報付き）
export async function getProjectTestRunsWithProgress(projectId: bigint): Promise<
  Array<{
    id: string;
    name: string;
    status: string;
    progress: TestProgressStats;
  }>
> {
  const testRuns = await prisma.testRun.findMany({
    where: { projectId },
    select: {
      id: true,
      name: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = [];
  for (const tr of testRuns) {
    const progress = await getTestRunProgress(tr.id);
    result.push({
      id: tr.id.toString(),
      name: tr.name,
      status: tr.status,
      progress,
    });
  }

  return result;
}

// プロジェクトサマリー（ダッシュボード用）
export interface ProjectSummary {
  testProgress: TestProgressStats;
  bugStats: BugStats;
  testRunCount: number;
  testSpecCount: number;
  testCaseCount: number;
  requirementCount: number;
  activeTestRuns: number;
}

export async function getProjectSummary(projectId: bigint): Promise<ProjectSummary> {
  const [
    testProgress,
    bugStats,
    testRunCount,
    testSpecCount,
    testCaseCount,
    requirementCount,
    activeTestRuns,
  ] = await Promise.all([
    getProjectTestProgress(projectId),
    getProjectBugStats(projectId),
    prisma.testRun.count({ where: { projectId } }),
    prisma.testSpec.count({ where: { projectId } }),
    prisma.testCase.count({
      where: { testSpec: { projectId }, deletedAt: null },
    }),
    prisma.requirement.count({ where: { projectId } }),
    prisma.testRun.count({
      where: { projectId, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
    }),
  ]);

  return {
    testProgress,
    bugStats,
    testRunCount,
    testSpecCount,
    testCaseCount,
    requirementCount,
    activeTestRuns,
  };
}

// 日別テスト実行データ
export interface DailyTestExecution {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  total: number;
}

// プロジェクトの日別テスト実行データ取得
export async function getDailyTestExecutions(
  projectId: bigint,
  days: number = 30
): Promise<DailyTestExecution[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // テスト結果から日別の実行データを取得
  const testResults = await prisma.testResult.findMany({
    where: {
      testRunCase: {
        testRun: { projectId },
      },
      executedAt: {
        gte: startDate,
      },
    },
    select: {
      executedAt: true,
      status: true,
    },
    orderBy: { executedAt: 'asc' },
  });

  // 日別に集計
  const dailyData: Record<string, DailyTestExecution> = {};

  // 日付の範囲を初期化
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = {
      date: dateStr,
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      total: 0,
    };
  }

  // テスト結果を日別に集計
  for (const result of testResults) {
    const dateStr = result.executedAt.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].total++;
      switch (result.status) {
        case 'PASSED':
          dailyData[dateStr].passed++;
          break;
        case 'FAILED':
          dailyData[dateStr].failed++;
          break;
        case 'BLOCKED':
          dailyData[dateStr].blocked++;
          break;
        case 'SKIPPED':
          dailyData[dateStr].skipped++;
          break;
      }
    }
  }

  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
}

// テストラン別の日別テスト実行データ取得
export async function getTestRunDailyExecutions(
  testRunId: bigint,
  days: number = 30
): Promise<DailyTestExecution[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const testResults = await prisma.testResult.findMany({
    where: {
      testRunCase: { testRunId },
      executedAt: { gte: startDate },
    },
    select: {
      executedAt: true,
      status: true,
    },
    orderBy: { executedAt: 'asc' },
  });

  const dailyData: Record<string, DailyTestExecution> = {};

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = {
      date: dateStr,
      passed: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      total: 0,
    };
  }

  for (const result of testResults) {
    const dateStr = result.executedAt.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].total++;
      switch (result.status) {
        case 'PASSED':
          dailyData[dateStr].passed++;
          break;
        case 'FAILED':
          dailyData[dateStr].failed++;
          break;
        case 'BLOCKED':
          dailyData[dateStr].blocked++;
          break;
        case 'SKIPPED':
          dailyData[dateStr].skipped++;
          break;
      }
    }
  }

  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
}
