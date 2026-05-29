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

// 累積テスト進捗データ（登録/実施/結果の推移）
export interface CumulativeTestProgress {
  date: string;
  registered: number; // 累積登録数
  executed: number; // 累積実行数
  passed: number; // 累積合格数
  failed: number; // 累積失敗数
}

// プロジェクトの累積テスト進捗データ取得
export async function getCumulativeTestProgress(
  projectId: bigint,
  days: number = 30
): Promise<CumulativeTestProgress[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // 開始日以前に登録されたテストケース数（初期値）
  const initialRegistered = await prisma.testCase.count({
    where: {
      testSpec: { projectId },
      deletedAt: null,
      createdAt: { lt: startDate },
    },
  });

  // 期間中に登録されたテストケース（日別）
  const newCases = await prisma.testCase.findMany({
    where: {
      testSpec: { projectId },
      deletedAt: null,
      createdAt: { gte: startDate },
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // 開始日以前のテスト結果（初期値）
  const initialResults = await prisma.testResult.groupBy({
    by: ['status'],
    where: {
      testRunCase: { testRun: { projectId } },
      executedAt: { lt: startDate },
    },
    _count: { status: true },
  });

  let initialExecuted = 0;
  let initialPassed = 0;
  let initialFailed = 0;
  for (const r of initialResults) {
    initialExecuted += r._count.status;
    if (r.status === 'PASSED') initialPassed = r._count.status;
    if (r.status === 'FAILED') initialFailed = r._count.status;
  }

  // 期間中のテスト結果（日別）
  const testResults = await prisma.testResult.findMany({
    where: {
      testRunCase: { testRun: { projectId } },
      executedAt: { gte: startDate },
    },
    select: {
      executedAt: true,
      status: true,
    },
    orderBy: { executedAt: 'asc' },
  });

  // 日別データを初期化
  const dailyData: Record<
    string,
    { registered: number; executed: number; passed: number; failed: number }
  > = {};

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = { registered: 0, executed: 0, passed: 0, failed: 0 };
  }

  // テストケース登録を日別に集計
  for (const tc of newCases) {
    const dateStr = tc.createdAt.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].registered++;
    }
  }

  // テスト結果を日別に集計
  for (const result of testResults) {
    const dateStr = result.executedAt.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].executed++;
      if (result.status === 'PASSED') {
        dailyData[dateStr].passed++;
      } else if (result.status === 'FAILED') {
        dailyData[dateStr].failed++;
      }
    }
  }

  // 累積値を計算
  let cumulativeRegistered = initialRegistered;
  let cumulativeExecuted = initialExecuted;
  let cumulativePassed = initialPassed;
  let cumulativeFailed = initialFailed;

  const result: CumulativeTestProgress[] = [];

  const sortedDates = Object.keys(dailyData).sort();
  for (const dateStr of sortedDates) {
    cumulativeRegistered += dailyData[dateStr].registered;
    cumulativeExecuted += dailyData[dateStr].executed;
    cumulativePassed += dailyData[dateStr].passed;
    cumulativeFailed += dailyData[dateStr].failed;

    result.push({
      date: dateStr,
      registered: cumulativeRegistered,
      executed: cumulativeExecuted,
      passed: cumulativePassed,
      failed: cumulativeFailed,
    });
  }

  return result;
}

// テストラン別の累積テスト進捗データ取得
export async function getTestRunCumulativeProgress(
  testRunId: bigint,
  days: number = 30
): Promise<CumulativeTestProgress[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // テストランのテストケース数を取得
  const testRunCases = await prisma.testRunCase.findMany({
    where: { testRunId },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // 開始日以前のテストランケース数（初期値）
  const initialRegistered = testRunCases.filter((trc) => trc.createdAt < startDate).length;

  // 開始日以前のテスト結果（初期値）
  const initialResults = await prisma.testResult.groupBy({
    by: ['status'],
    where: {
      testRunCase: { testRunId },
      executedAt: { lt: startDate },
    },
    _count: { status: true },
  });

  let initialExecuted = 0;
  let initialPassed = 0;
  let initialFailed = 0;
  for (const r of initialResults) {
    initialExecuted += r._count.status;
    if (r.status === 'PASSED') initialPassed = r._count.status;
    if (r.status === 'FAILED') initialFailed = r._count.status;
  }

  // 期間中のテスト結果（日別）
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

  // 日別データを初期化
  const dailyData: Record<
    string,
    { registered: number; executed: number; passed: number; failed: number }
  > = {};

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = { registered: 0, executed: 0, passed: 0, failed: 0 };
  }

  // テストランケース登録を日別に集計
  for (const trc of testRunCases) {
    if (trc.createdAt < startDate) continue;
    const dateStr = trc.createdAt.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].registered++;
    }
  }

  // テスト結果を日別に集計
  for (const result of testResults) {
    const dateStr = result.executedAt.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].executed++;
      if (result.status === 'PASSED') {
        dailyData[dateStr].passed++;
      } else if (result.status === 'FAILED') {
        dailyData[dateStr].failed++;
      }
    }
  }

  // 累積値を計算
  let cumulativeRegistered = initialRegistered;
  let cumulativeExecuted = initialExecuted;
  let cumulativePassed = initialPassed;
  let cumulativeFailed = initialFailed;

  const result: CumulativeTestProgress[] = [];

  const sortedDates = Object.keys(dailyData).sort();
  for (const dateStr of sortedDates) {
    cumulativeRegistered += dailyData[dateStr].registered;
    cumulativeExecuted += dailyData[dateStr].executed;
    cumulativePassed += dailyData[dateStr].passed;
    cumulativeFailed += dailyData[dateStr].failed;

    result.push({
      date: dateStr,
      registered: cumulativeRegistered,
      executed: cumulativeExecuted,
      passed: cumulativePassed,
      failed: cumulativeFailed,
    });
  }

  return result;
}

// チームメンバー実行統計
export interface TeamMemberStats {
  userId: string;
  userName: string | null;
  email: string | null;
  executedCount: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
}

// プロジェクトのチームメンバー実行統計取得
export async function getTeamExecutionStats(projectId: bigint): Promise<TeamMemberStats[]> {
  const testResults = await prisma.testResult.findMany({
    where: {
      testRunCase: {
        testRun: { projectId },
      },
      executedById: { not: null },
    },
    select: {
      executedById: true,
      status: true,
      executedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const memberStats: Record<string, TeamMemberStats> = {};

  for (const result of testResults) {
    if (!result.executedById || !result.executedBy) continue;

    const memberId = result.executedById.toString();
    if (!memberStats[memberId]) {
      memberStats[memberId] = {
        userId: memberId,
        userName: result.executedBy.name,
        email: result.executedBy.email,
        executedCount: 0,
        passedCount: 0,
        failedCount: 0,
        passRate: 0,
      };
    }

    memberStats[memberId].executedCount++;
    if (result.status === 'PASSED') {
      memberStats[memberId].passedCount++;
    } else if (result.status === 'FAILED') {
      memberStats[memberId].failedCount++;
    }
  }

  // 合格率を計算してソート
  const stats = Object.values(memberStats).map((member) => ({
    ...member,
    passRate:
      member.executedCount > 0 ? Math.round((member.passedCount / member.executedCount) * 100) : 0,
  }));

  return stats.sort((a, b) => b.executedCount - a.executedCount);
}

// 累積不具合データ
export interface CumulativeBugData {
  date: string;
  newBugs: number; // 当日の新規不具合数
  resolvedBugs: number; // 当日の解決数
  cumulativeOpen: number; // 累積オープン数
  cumulativeResolved: number; // 累積解決数
  cumulativeTotal: number; // 累積合計
}

// プロジェクトの累積不具合データ取得
export async function getCumulativeBugData(
  projectId: bigint,
  days: number = 30
): Promise<CumulativeBugData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // 開始日以前の不具合数（初期値）
  const initialBugs = await prisma.bug.findMany({
    where: {
      projectId,
      createdAt: { lt: startDate },
    },
    select: {
      status: true,
      resolvedAt: true,
    },
  });

  let initialOpen = 0;
  let initialResolved = 0;
  for (const bug of initialBugs) {
    if (['RESOLVED', 'VERIFIED', 'CLOSED'].includes(bug.status)) {
      initialResolved++;
    } else if (!['REJECTED', 'DEFERRED'].includes(bug.status)) {
      initialOpen++;
    }
  }
  const initialTotal = initialBugs.length;

  // 期間中の不具合を取得
  const bugs = await prisma.bug.findMany({
    where: {
      projectId,
      OR: [{ createdAt: { gte: startDate } }, { resolvedAt: { gte: startDate } }],
    },
    select: {
      createdAt: true,
      resolvedAt: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // 日別データを初期化
  const dailyData: Record<string, { newBugs: number; resolvedBugs: number }> = {};

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = { newBugs: 0, resolvedBugs: 0 };
  }

  // 新規不具合を日別に集計
  for (const bug of bugs) {
    const createdDateStr = bug.createdAt.toISOString().split('T')[0];
    if (dailyData[createdDateStr] && bug.createdAt >= startDate) {
      dailyData[createdDateStr].newBugs++;
    }

    // 解決日を日別に集計
    if (
      bug.resolvedAt &&
      bug.resolvedAt >= startDate &&
      ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(bug.status)
    ) {
      const resolvedDateStr = bug.resolvedAt.toISOString().split('T')[0];
      if (dailyData[resolvedDateStr]) {
        dailyData[resolvedDateStr].resolvedBugs++;
      }
    }
  }

  // 累積値を計算
  let cumulativeOpen = initialOpen;
  let cumulativeResolved = initialResolved;
  let cumulativeTotal = initialTotal;

  const result: CumulativeBugData[] = [];

  const sortedDates = Object.keys(dailyData).sort();
  for (const dateStr of sortedDates) {
    const dayData = dailyData[dateStr];
    cumulativeTotal += dayData.newBugs;
    cumulativeResolved += dayData.resolvedBugs;
    cumulativeOpen = cumulativeTotal - cumulativeResolved;

    result.push({
      date: dateStr,
      newBugs: dayData.newBugs,
      resolvedBugs: dayData.resolvedBugs,
      cumulativeOpen,
      cumulativeResolved,
      cumulativeTotal,
    });
  }

  return result;
}

// バーンダウンチャートデータ
export interface BurndownChartData {
  date: string;
  remaining: number; // 残テストケース数
  ideal: number; // 理想線
  actualVelocity: number; // 実際の消化速度
}

export interface BurndownStats {
  data: BurndownChartData[];
  totalCases: number;
  completedCases: number;
  remainingCases: number;
  startDate: string;
  endDate: string | null;
  predictedEndDate: string | null;
  daysRemaining: number | null;
}

// テストランのバーンダウンチャートデータ取得
export async function getTestRunBurndownData(testRunId: bigint): Promise<BurndownStats> {
  // テストラン情報を取得
  const testRun = await prisma.testRun.findUnique({
    where: { id: testRunId },
    include: {
      testRunCases: {
        select: {
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!testRun) {
    return {
      data: [],
      totalCases: 0,
      completedCases: 0,
      remainingCases: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      predictedEndDate: null,
      daysRemaining: null,
    };
  }

  const totalCases = testRun.testRunCases.length;
  const completedStatuses = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'];
  const completedCases = testRun.testRunCases.filter((trc: { status: string }) =>
    completedStatuses.includes(trc.status)
  ).length;
  const remainingCases = totalCases - completedCases;

  const startDate = testRun.actualStartDate || testRun.plannedStartDate || new Date();
  const endDate = testRun.actualEndDate || testRun.plannedEndDate;

  // テスト結果から日別の完了数を取得
  const testResults = await prisma.testResult.findMany({
    where: {
      testRunCase: { testRunId },
    },
    select: {
      executedAt: true,
      status: true,
    },
    orderBy: { executedAt: 'asc' },
  });

  // 日別の完了数を集計
  const dailyCompletions: Record<string, number> = {};
  for (const result of testResults) {
    const dateStr = result.executedAt.toISOString().split('T')[0];
    if (completedStatuses.includes(result.status)) {
      dailyCompletions[dateStr] = (dailyCompletions[dateStr] || 0) + 1;
    }
  }

  // 期間を計算
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const chartEndDate = endDate || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const totalDays = Math.ceil(
    (chartEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 理想線と実績を計算
  const data: BurndownChartData[] = [];
  let cumulativeCompleted = 0;
  const dailyIdealBurn = totalCases / Math.max(totalDays, 1);

  for (let i = 0; i <= totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // 今日より先の日付は実績なし
    if (date <= today) {
      cumulativeCompleted += dailyCompletions[dateStr] || 0;
    }

    const ideal = Math.max(0, totalCases - dailyIdealBurn * i);
    const remaining = date <= today ? totalCases - cumulativeCompleted : 0;

    data.push({
      date: dateStr,
      remaining: date <= today ? remaining : 0,
      ideal: Math.round(ideal * 10) / 10,
      actualVelocity: dailyCompletions[dateStr] || 0,
    });
  }

  // 予測完了日を計算（直近7日の平均速度から）
  let predictedEndDate: string | null = null;
  let daysRemaining: number | null = null;

  if (remainingCases > 0 && completedCases > 0) {
    const recentDays = Object.entries(dailyCompletions)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7);

    if (recentDays.length > 0) {
      const totalRecentCompleted = recentDays.reduce((sum, [, count]) => sum + count, 0);
      const avgDailyVelocity = totalRecentCompleted / recentDays.length;

      if (avgDailyVelocity > 0) {
        daysRemaining = Math.ceil(remainingCases / avgDailyVelocity);
        const predicted = new Date(today);
        predicted.setDate(predicted.getDate() + daysRemaining);
        predictedEndDate = predicted.toISOString().split('T')[0];
      }
    }
  }

  return {
    data,
    totalCases,
    completedCases,
    remainingCases,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate?.toISOString().split('T')[0] || null,
    predictedEndDate,
    daysRemaining,
  };
}

// 環境別テスト実行統計
export interface EnvironmentStats {
  environment: string;
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  skippedCount: number;
  passRate: number;
  avgExecutionTime: number | null;
}

export interface EnvironmentStatsResult {
  environments: EnvironmentStats[];
  totalExecutions: number;
  uniqueEnvironments: number;
}

// プロジェクトの環境別テスト実行統計取得
export async function getProjectEnvironmentStats(
  projectId: bigint
): Promise<EnvironmentStatsResult> {
  const testResults = await prisma.testResult.findMany({
    where: {
      testRunCase: {
        testRun: { projectId },
      },
    },
    select: {
      environment: true,
      status: true,
      executionTime: true,
    },
  });

  const envStats: Record<string, EnvironmentStats> = {};

  for (const result of testResults) {
    const env = result.environment || '未設定';

    if (!envStats[env]) {
      envStats[env] = {
        environment: env,
        totalExecutions: 0,
        passedCount: 0,
        failedCount: 0,
        blockedCount: 0,
        skippedCount: 0,
        passRate: 0,
        avgExecutionTime: null,
      };
    }

    envStats[env].totalExecutions++;

    switch (result.status) {
      case 'PASSED':
        envStats[env].passedCount++;
        break;
      case 'FAILED':
        envStats[env].failedCount++;
        break;
      case 'BLOCKED':
        envStats[env].blockedCount++;
        break;
      case 'SKIPPED':
        envStats[env].skippedCount++;
        break;
    }
  }

  // 平均実行時間と合格率を計算
  const environments = Object.values(envStats).map((stat) => {
    const resultsWithTime = testResults.filter(
      (r) => (r.environment || '未設定') === stat.environment && r.executionTime !== null
    );

    const avgTime =
      resultsWithTime.length > 0
        ? Math.round(
            resultsWithTime.reduce((sum, r) => sum + (r.executionTime || 0), 0) /
              resultsWithTime.length
          )
        : null;

    return {
      ...stat,
      passRate:
        stat.totalExecutions > 0 ? Math.round((stat.passedCount / stat.totalExecutions) * 100) : 0,
      avgExecutionTime: avgTime,
    };
  });

  return {
    environments: environments.sort((a, b) => b.totalExecutions - a.totalExecutions),
    totalExecutions: testResults.length,
    uniqueEnvironments: environments.length,
  };
}

// テストランの環境別テスト実行統計取得
export async function getTestRunEnvironmentStats(
  testRunId: bigint
): Promise<EnvironmentStatsResult> {
  const testResults = await prisma.testResult.findMany({
    where: {
      testRunCase: { testRunId },
    },
    select: {
      environment: true,
      status: true,
      executionTime: true,
    },
  });

  const envStats: Record<string, EnvironmentStats> = {};

  for (const result of testResults) {
    const env = result.environment || '未設定';

    if (!envStats[env]) {
      envStats[env] = {
        environment: env,
        totalExecutions: 0,
        passedCount: 0,
        failedCount: 0,
        blockedCount: 0,
        skippedCount: 0,
        passRate: 0,
        avgExecutionTime: null,
      };
    }

    envStats[env].totalExecutions++;

    switch (result.status) {
      case 'PASSED':
        envStats[env].passedCount++;
        break;
      case 'FAILED':
        envStats[env].failedCount++;
        break;
      case 'BLOCKED':
        envStats[env].blockedCount++;
        break;
      case 'SKIPPED':
        envStats[env].skippedCount++;
        break;
    }
  }

  // 平均実行時間と合格率を計算
  const environments = Object.values(envStats).map((stat) => {
    const resultsWithTime = testResults.filter(
      (r) => (r.environment || '未設定') === stat.environment && r.executionTime !== null
    );

    const avgTime =
      resultsWithTime.length > 0
        ? Math.round(
            resultsWithTime.reduce((sum, r) => sum + (r.executionTime || 0), 0) /
              resultsWithTime.length
          )
        : null;

    return {
      ...stat,
      passRate:
        stat.totalExecutions > 0 ? Math.round((stat.passedCount / stat.totalExecutions) * 100) : 0,
      avgExecutionTime: avgTime,
    };
  });

  return {
    environments: environments.sort((a, b) => b.totalExecutions - a.totalExecutions),
    totalExecutions: testResults.length,
    uniqueEnvironments: environments.length,
  };
}

// プロジェクト全体のバーンダウンチャートデータ取得
export async function getProjectBurndownData(projectId: bigint): Promise<BurndownStats> {
  // アクティブなテストランのテストケース数を取得
  const testRuns = await prisma.testRun.findMany({
    where: {
      projectId,
      status: { in: ['PLANNED', 'IN_PROGRESS'] },
    },
    select: {
      id: true,
      plannedStartDate: true,
      plannedEndDate: true,
      actualStartDate: true,
      actualEndDate: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (testRuns.length === 0) {
    return {
      data: [],
      totalCases: 0,
      completedCases: 0,
      remainingCases: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      predictedEndDate: null,
      daysRemaining: null,
    };
  }

  // 最初のアクティブなテストランを使用
  const testRun = testRuns[0];
  return getTestRunBurndownData(testRun.id);
}

// 担当者別不具合統計
export interface AssigneeBugStats {
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  totalBugs: number;
  openBugs: number;
  resolvedBugs: number;
  closedBugs: number;
  resolveRate: number;
  avgResolutionDays: number | null;
}

// 報告者別不具合統計
export interface ReporterBugStats {
  reporterId: string;
  reporterName: string | null;
  reporterEmail: string | null;
  totalBugs: number;
  byPriority: Record<string, number>;
  bySeverity: Record<string, number>;
}

// タイプ別不具合統計
export interface TypeBugStats {
  type: string;
  totalBugs: number;
  openBugs: number;
  resolvedBugs: number;
  closedBugs: number;
}

export interface BugAnalysisResult {
  byAssignee: AssigneeBugStats[];
  byReporter: ReporterBugStats[];
  byType: TypeBugStats[];
  totalBugs: number;
  unassignedBugs: number;
}

// プロジェクトの不具合分析データ取得
export async function getProjectBugAnalysis(projectId: bigint): Promise<BugAnalysisResult> {
  const bugs = await prisma.bug.findMany({
    where: { projectId },
    select: {
      id: true,
      status: true,
      type: true,
      priority: true,
      severity: true,
      assigneeId: true,
      reporterId: true,
      createdAt: true,
      resolvedAt: true,
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
    },
  });

  // 担当者別集計
  const assigneeStats: Record<string, AssigneeBugStats> = {};
  const reporterStats: Record<string, ReporterBugStats> = {};
  const typeStats: Record<string, TypeBugStats> = {};

  const openStatuses = ['NEW', 'OPEN', 'IN_PROGRESS'];
  const resolvedStatuses = ['RESOLVED', 'VERIFIED'];
  const closedStatuses = ['CLOSED', 'REJECTED', 'DEFERRED'];

  for (const bug of bugs) {
    // 担当者別
    const assigneeKey = bug.assigneeId?.toString() || 'unassigned';
    if (!assigneeStats[assigneeKey]) {
      assigneeStats[assigneeKey] = {
        assigneeId: bug.assigneeId?.toString() || null,
        assigneeName: bug.assignee?.name || null,
        assigneeEmail: bug.assignee?.email || null,
        totalBugs: 0,
        openBugs: 0,
        resolvedBugs: 0,
        closedBugs: 0,
        resolveRate: 0,
        avgResolutionDays: null,
      };
    }
    assigneeStats[assigneeKey].totalBugs++;
    if (openStatuses.includes(bug.status)) {
      assigneeStats[assigneeKey].openBugs++;
    } else if (resolvedStatuses.includes(bug.status)) {
      assigneeStats[assigneeKey].resolvedBugs++;
    } else if (closedStatuses.includes(bug.status)) {
      assigneeStats[assigneeKey].closedBugs++;
    }

    // 報告者別
    const reporterKey = bug.reporterId.toString();
    if (!reporterStats[reporterKey]) {
      reporterStats[reporterKey] = {
        reporterId: reporterKey,
        reporterName: bug.reporter.name,
        reporterEmail: bug.reporter.email,
        totalBugs: 0,
        byPriority: {},
        bySeverity: {},
      };
    }
    reporterStats[reporterKey].totalBugs++;
    reporterStats[reporterKey].byPriority[bug.priority] =
      (reporterStats[reporterKey].byPriority[bug.priority] || 0) + 1;
    reporterStats[reporterKey].bySeverity[bug.severity] =
      (reporterStats[reporterKey].bySeverity[bug.severity] || 0) + 1;

    // タイプ別
    if (!typeStats[bug.type]) {
      typeStats[bug.type] = {
        type: bug.type,
        totalBugs: 0,
        openBugs: 0,
        resolvedBugs: 0,
        closedBugs: 0,
      };
    }
    typeStats[bug.type].totalBugs++;
    if (openStatuses.includes(bug.status)) {
      typeStats[bug.type].openBugs++;
    } else if (resolvedStatuses.includes(bug.status)) {
      typeStats[bug.type].resolvedBugs++;
    } else if (closedStatuses.includes(bug.status)) {
      typeStats[bug.type].closedBugs++;
    }
  }

  // 解決率と平均解決日数を計算
  for (const key of Object.keys(assigneeStats)) {
    const stats = assigneeStats[key];
    const total = stats.resolvedBugs + stats.closedBugs;
    stats.resolveRate = stats.totalBugs > 0 ? Math.round((total / stats.totalBugs) * 100) : 0;

    // 平均解決日数を計算
    const resolvedBugs = bugs.filter(
      (b) =>
        (b.assigneeId?.toString() || 'unassigned') === key &&
        b.resolvedAt &&
        [...resolvedStatuses, ...closedStatuses].includes(b.status)
    );
    if (resolvedBugs.length > 0) {
      const totalDays = resolvedBugs.reduce((sum, b) => {
        const days = Math.ceil(
          (b.resolvedAt!.getTime() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);
      stats.avgResolutionDays = Math.round(totalDays / resolvedBugs.length);
    }
  }

  const unassignedBugs = assigneeStats['unassigned']?.totalBugs || 0;

  return {
    byAssignee: Object.values(assigneeStats)
      .filter((s) => s.assigneeId !== null)
      .sort((a, b) => b.totalBugs - a.totalBugs),
    byReporter: Object.values(reporterStats).sort((a, b) => b.totalBugs - a.totalBugs),
    byType: Object.values(typeStats).sort((a, b) => b.totalBugs - a.totalBugs),
    totalBugs: bugs.length,
    unassignedBugs,
  };
}

// 信頼度成長曲線データポイント
export interface ReliabilityDataPoint {
  date: string;
  day: number;
  actual: number; // 実際の累積欠陥数
  gompertz: number | null; // ゴンペルツモデルによる予測
  logistic: number | null; // ロジスティックモデルによる予測
}

// 信頼度成長曲線パラメータ
export interface ReliabilityCurveParams {
  a: number; // 予測総欠陥数
  b: number; // パラメータ
  c: number; // パラメータ（成長率）
  r2: number; // 決定係数
}

export interface ReliabilityGrowthResult {
  data: ReliabilityDataPoint[];
  totalDefects: number;
  gompertzParams: ReliabilityCurveParams | null;
  logisticParams: ReliabilityCurveParams | null;
  predictedTotalGompertz: number | null;
  predictedTotalLogistic: number | null;
  startDate: string;
  endDate: string;
}

// ゴンペルツ曲線: N(t) = a * exp(-b * exp(-c*t))
function gompertzModel(t: number, a: number, b: number, c: number): number {
  return a * Math.exp(-b * Math.exp(-c * t));
}

// ロジスティック曲線: N(t) = a / (1 + b * exp(-c*t))
function logisticModel(t: number, a: number, b: number, c: number): number {
  return a / (1 + b * Math.exp(-c * t));
}

// 最小二乗法によるパラメータ推定（グリッドサーチ + 局所探索）
function fitCurve(
  data: Array<{ t: number; y: number }>,
  modelFn: (t: number, a: number, b: number, c: number) => number
): ReliabilityCurveParams | null {
  if (data.length < 3) return null;

  const maxY = Math.max(...data.map((d) => d.y));
  if (maxY === 0) return null;

  let bestParams = { a: maxY * 1.5, b: 10, c: 0.1 };
  let bestSSE = Infinity;

  // グリッドサーチ
  const aRange = [maxY, maxY * 1.2, maxY * 1.5, maxY * 2, maxY * 3];
  const bRange = [1, 5, 10, 20, 50];
  const cRange = [0.01, 0.05, 0.1, 0.2, 0.5];

  for (const a of aRange) {
    for (const b of bRange) {
      for (const c of cRange) {
        const sse = data.reduce((sum, d) => {
          const predicted = modelFn(d.t, a, b, c);
          return sum + Math.pow(d.y - predicted, 2);
        }, 0);

        if (sse < bestSSE) {
          bestSSE = sse;
          bestParams = { a, b, c };
        }
      }
    }
  }

  // 局所探索による改善
  const step = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    let improved = false;
    for (const delta of [-step, step]) {
      // aの調整
      const newA = bestParams.a * (1 + delta);
      if (newA > 0) {
        const sse = data.reduce((sum, d) => {
          const predicted = modelFn(d.t, newA, bestParams.b, bestParams.c);
          return sum + Math.pow(d.y - predicted, 2);
        }, 0);
        if (sse < bestSSE) {
          bestSSE = sse;
          bestParams.a = newA;
          improved = true;
        }
      }

      // bの調整
      const newB = bestParams.b * (1 + delta);
      if (newB > 0) {
        const sse = data.reduce((sum, d) => {
          const predicted = modelFn(d.t, bestParams.a, newB, bestParams.c);
          return sum + Math.pow(d.y - predicted, 2);
        }, 0);
        if (sse < bestSSE) {
          bestSSE = sse;
          bestParams.b = newB;
          improved = true;
        }
      }

      // cの調整
      const newC = bestParams.c * (1 + delta);
      if (newC > 0) {
        const sse = data.reduce((sum, d) => {
          const predicted = modelFn(d.t, bestParams.a, bestParams.b, newC);
          return sum + Math.pow(d.y - predicted, 2);
        }, 0);
        if (sse < bestSSE) {
          bestSSE = sse;
          bestParams.c = newC;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  // R²（決定係数）を計算
  const meanY = data.reduce((sum, d) => sum + d.y, 0) / data.length;
  const ssTot = data.reduce((sum, d) => sum + Math.pow(d.y - meanY, 2), 0);
  const r2 = ssTot > 0 ? 1 - bestSSE / ssTot : 0;

  return {
    a: Math.round(bestParams.a * 10) / 10,
    b: Math.round(bestParams.b * 100) / 100,
    c: Math.round(bestParams.c * 1000) / 1000,
    r2: Math.round(r2 * 1000) / 1000,
  };
}

// プロジェクトの信頼度成長曲線データ取得
export async function getProjectReliabilityGrowth(
  projectId: bigint,
  days: number = 60
): Promise<ReliabilityGrowthResult> {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // 期間内のバグを取得
  const bugs = await prisma.bug.findMany({
    where: {
      projectId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (bugs.length === 0) {
    return {
      data: [],
      totalDefects: 0,
      gompertzParams: null,
      logisticParams: null,
      predictedTotalGompertz: null,
      predictedTotalLogistic: null,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  // 日別の累積欠陥数を計算
  const dailyData: Record<string, number> = {};
  const bugCountByDate: Record<string, number> = {};

  // 日付範囲を初期化
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = 0;
    bugCountByDate[dateStr] = 0;
  }

  // バグを日別にカウント
  for (const bug of bugs) {
    const dateStr = bug.createdAt.toISOString().split('T')[0];
    if (bugCountByDate[dateStr] !== undefined) {
      bugCountByDate[dateStr]++;
    }
  }

  // 累積値を計算
  let cumulative = 0;
  const sortedDates = Object.keys(dailyData).sort();
  for (const dateStr of sortedDates) {
    cumulative += bugCountByDate[dateStr];
    dailyData[dateStr] = cumulative;
  }

  // フィッティング用データを準備
  const fittingData = sortedDates.map((dateStr, index) => ({
    t: index + 1,
    y: dailyData[dateStr],
  }));

  // カーブフィッティング
  const gompertzParams = fitCurve(fittingData, gompertzModel);
  const logisticParams = fitCurve(fittingData, logisticModel);

  // 予測値を含むデータを作成
  const data: ReliabilityDataPoint[] = sortedDates.map((dateStr, index) => ({
    date: dateStr,
    day: index + 1,
    actual: dailyData[dateStr],
    gompertz: gompertzParams
      ? Math.round(gompertzModel(index + 1, gompertzParams.a, gompertzParams.b, gompertzParams.c))
      : null,
    logistic: logisticParams
      ? Math.round(logisticModel(index + 1, logisticParams.a, logisticParams.b, logisticParams.c))
      : null,
  }));

  return {
    data,
    totalDefects: cumulative,
    gompertzParams,
    logisticParams,
    predictedTotalGompertz: gompertzParams ? Math.round(gompertzParams.a) : null,
    predictedTotalLogistic: logisticParams ? Math.round(logisticParams.a) : null,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// MTBF/MTTF データ
export interface MTBFDataPoint {
  date: string;
  failures: number;
  mtbf: number | null; // 平均故障間隔（時間）
  cumulativeFailures: number;
}

export interface MTBFStats {
  mtbf: number | null; // Mean Time Between Failures（時間）
  mttf: number | null; // Mean Time To Failure（時間）
  totalFailures: number;
  totalExecutions: number;
  failureRate: number; // 故障率（%）
  reliability: number; // 信頼度（%）
}

export interface MTBFResult {
  stats: MTBFStats;
  data: MTBFDataPoint[];
  startDate: string;
  endDate: string;
}

// プロジェクトのMTBF/MTTFデータ取得
export async function getProjectMTBF(projectId: bigint, days: number = 30): Promise<MTBFResult> {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // テスト結果を取得
  const testResults = await prisma.testResult.findMany({
    where: {
      testRunCase: {
        testRun: { projectId },
      },
      executedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      executedAt: true,
      status: true,
      executionTime: true,
    },
    orderBy: { executedAt: 'asc' },
  });

  if (testResults.length === 0) {
    return {
      stats: {
        mtbf: null,
        mttf: null,
        totalFailures: 0,
        totalExecutions: 0,
        failureRate: 0,
        reliability: 100,
      },
      data: [],
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  // 失敗した結果のみを抽出
  const failures = testResults.filter((r) => r.status === 'FAILED');
  const totalExecutions = testResults.length;
  const totalFailures = failures.length;

  // MTBF計算: 総実行時間 / 故障回数
  let mtbf: number | null = null;
  const totalExecutionTime = testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);

  if (totalFailures > 0 && totalExecutionTime > 0) {
    // 実行時間（秒）を時間に変換
    mtbf = Math.round((totalExecutionTime / totalFailures / 3600) * 100) / 100;
  }

  // MTTF計算: 最初の故障までの累積実行時間
  let mttf: number | null = null;
  if (failures.length > 0) {
    const firstFailure = failures[0];
    const resultsBeforeFirstFailure = testResults.filter(
      (r) => r.executedAt <= firstFailure.executedAt
    );
    const timeToFirstFailure = resultsBeforeFirstFailure.reduce(
      (sum, r) => sum + (r.executionTime || 0),
      0
    );
    mttf = Math.round((timeToFirstFailure / 3600) * 100) / 100;
  }

  // 故障率と信頼度
  const failureRate =
    totalExecutions > 0 ? Math.round((totalFailures / totalExecutions) * 10000) / 100 : 0;
  const reliability = 100 - failureRate;

  // 日別のMTBFデータを計算
  const dailyData: Record<string, { failures: number; executionTime: number }> = {};

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = { failures: 0, executionTime: 0 };
  }

  for (const result of testResults) {
    const dateStr = result.executedAt.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].executionTime += result.executionTime || 0;
      if (result.status === 'FAILED') {
        dailyData[dateStr].failures++;
      }
    }
  }

  // 累積と日別MTBFを計算
  let cumulativeFailures = 0;
  const data: MTBFDataPoint[] = [];
  const sortedDates = Object.keys(dailyData).sort();

  for (const dateStr of sortedDates) {
    const dayData = dailyData[dateStr];
    cumulativeFailures += dayData.failures;

    const dayMtbf =
      dayData.failures > 0 && dayData.executionTime > 0
        ? Math.round((dayData.executionTime / dayData.failures / 3600) * 100) / 100
        : null;

    data.push({
      date: dateStr,
      failures: dayData.failures,
      mtbf: dayMtbf,
      cumulativeFailures,
    });
  }

  return {
    stats: {
      mtbf,
      mttf,
      totalFailures,
      totalExecutions,
      failureRate,
      reliability,
    },
    data,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// ODC（Orthogonal Defect Classification）分類
export interface ODCTypeStats {
  type: string;
  label: string;
  count: number;
  percentage: number;
}

export interface ODCSeverityStats {
  severity: string;
  label: string;
  count: number;
  percentage: number;
}

export interface ODCPriorityStats {
  priority: string;
  label: string;
  count: number;
  percentage: number;
}

export interface ODCPhaseStats {
  phase: string;
  label: string;
  count: number;
  percentage: number;
}

export interface ODCTrendDataPoint {
  date: string;
  bug: number;
  feature: number;
  inquiry: number;
  task: number;
  improvement: number;
  total: number;
}

export interface ODCAnalysisResult {
  byType: ODCTypeStats[];
  bySeverity: ODCSeverityStats[];
  byPriority: ODCPriorityStats[];
  byPhase: ODCPhaseStats[];
  trend: ODCTrendDataPoint[];
  totalDefects: number;
  defectsWithTestResult: number;
  startDate: string;
  endDate: string;
}

// プロジェクトのODC分析データ取得
export async function getProjectODCAnalysis(
  projectId: bigint,
  days: number = 30
): Promise<ODCAnalysisResult> {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // バグを取得
  const bugs = await prisma.bug.findMany({
    where: {
      projectId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      type: true,
      severity: true,
      priority: true,
      createdAt: true,
      testResultId: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (bugs.length === 0) {
    return {
      byType: [],
      bySeverity: [],
      byPriority: [],
      byPhase: [],
      trend: [],
      totalDefects: 0,
      defectsWithTestResult: 0,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  const totalDefects = bugs.length;
  const defectsWithTestResult = bugs.filter((b) => b.testResultId !== null).length;

  // タイプ別集計
  const typeLabels: Record<string, string> = {
    BUG: '不具合',
    FEATURE: '機能要望',
    INQUIRY: '問い合わせ',
    TASK: 'タスク',
    IMPROVEMENT: '改善',
  };
  const typeCounts: Record<string, number> = {};
  for (const bug of bugs) {
    typeCounts[bug.type] = (typeCounts[bug.type] || 0) + 1;
  }
  const byType: ODCTypeStats[] = Object.entries(typeCounts)
    .map(([type, count]) => ({
      type,
      label: typeLabels[type] || type,
      count,
      percentage: Math.round((count / totalDefects) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  // 重大度別集計
  const severityLabels: Record<string, string> = {
    BLOCKER: 'ブロッカー',
    CRITICAL: '致命的',
    MAJOR: '重大',
    MINOR: '軽微',
    TRIVIAL: '軽微（外観）',
  };
  const severityCounts: Record<string, number> = {};
  for (const bug of bugs) {
    severityCounts[bug.severity] = (severityCounts[bug.severity] || 0) + 1;
  }
  const bySeverity: ODCSeverityStats[] = Object.entries(severityCounts)
    .map(([severity, count]) => ({
      severity,
      label: severityLabels[severity] || severity,
      count,
      percentage: Math.round((count / totalDefects) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  // 優先度別集計
  const priorityLabels: Record<string, string> = {
    CRITICAL: '緊急',
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
  };
  const priorityCounts: Record<string, number> = {};
  for (const bug of bugs) {
    priorityCounts[bug.priority] = (priorityCounts[bug.priority] || 0) + 1;
  }
  const byPriority: ODCPriorityStats[] = Object.entries(priorityCounts)
    .map(([priority, count]) => ({
      priority,
      label: priorityLabels[priority] || priority,
      count,
      percentage: Math.round((count / totalDefects) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  // フェーズ別集計（テスト結果にリンクされているバグのみ）
  const phaseCounts: Record<string, number> = {};
  for (const bug of bugs) {
    // phase情報はTestSpecには存在しないため、UNKNOWNを使用
    const phase = 'UNKNOWN';
    phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
  }
  const phaseLabels: Record<string, string> = {
    UNIT: '単体テスト',
    INTEGRATION: '結合テスト',
    SYSTEM: 'システムテスト',
    ACCEPTANCE: '受入テスト',
    REGRESSION: '回帰テスト',
    UNKNOWN: '未分類',
  };
  const byPhase: ODCPhaseStats[] = Object.entries(phaseCounts)
    .map(([phase, count]) => ({
      phase,
      label: phaseLabels[phase] || phase,
      count,
      percentage: Math.round((count / totalDefects) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  // 日別トレンドデータ
  const dailyData: Record<string, ODCTrendDataPoint> = {};
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyData[dateStr] = {
      date: dateStr,
      bug: 0,
      feature: 0,
      inquiry: 0,
      task: 0,
      improvement: 0,
      total: 0,
    };
  }

  for (const bug of bugs) {
    const dateStr = bug.createdAt.toISOString().split('T')[0];
    if (dailyData[dateStr]) {
      dailyData[dateStr].total++;
      const typeKey = bug.type.toLowerCase() as keyof Omit<ODCTrendDataPoint, 'date' | 'total'>;
      if (typeKey in dailyData[dateStr]) {
        (dailyData[dateStr][typeKey] as number)++;
      }
    }
  }

  const trend = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  return {
    byType,
    bySeverity,
    byPriority,
    byPhase,
    trend,
    totalDefects,
    defectsWithTestResult,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// MTBF/ODC統合結果
export interface MTBFODCResult {
  mtbf: MTBFResult;
  odc: ODCAnalysisResult;
}

// プロジェクトのMTBF/ODC統合データ取得
export async function getProjectMTBFODC(
  projectId: bigint,
  days: number = 30
): Promise<MTBFODCResult> {
  const [mtbf, odc] = await Promise.all([
    getProjectMTBF(projectId, days),
    getProjectODCAnalysis(projectId, days),
  ]);

  return { mtbf, odc };
}

// ============================================
// クロスプロジェクトレポート機能
// ============================================

// プロジェクト別サマリー統計
export interface ProjectSummaryStats {
  projectId: string;
  projectName: string;
  testProgress: {
    totalCases: number;
    executedCases: number;
    passedCases: number;
    failedCases: number;
    executionRate: number;
    passRate: number;
  };
  bugStats: {
    total: number;
    openCount: number;
    resolvedCount: number;
    closedCount: number;
  };
  testRunCount: number;
  activeTestRuns: number;
}

// クロスプロジェクトサマリー
export interface CrossProjectSummary {
  projects: ProjectSummaryStats[];
  totals: {
    totalProjects: number;
    totalTestCases: number;
    totalExecutedCases: number;
    totalPassedCases: number;
    totalFailedCases: number;
    totalBugs: number;
    openBugs: number;
    resolvedBugs: number;
    avgExecutionRate: number;
    avgPassRate: number;
  };
}

// ユーザー工数統計
export interface UserWorkloadStats {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  projectWorkloads: Array<{
    projectId: string;
    projectName: string;
    executedTests: number;
    executionTime: number; // 秒
    bugsReported: number;
    bugsAssigned: number;
    bugsResolved: number;
  }>;
  totals: {
    totalExecutedTests: number;
    totalExecutionTime: number;
    totalBugsReported: number;
    totalBugsAssigned: number;
    totalBugsResolved: number;
    projectCount: number;
  };
}

export interface CrossProjectUserWorkload {
  users: UserWorkloadStats[];
  startDate: string;
  endDate: string;
}

// クロスプロジェクトサマリー取得
export async function getCrossProjectSummary(projectIds?: bigint[]): Promise<CrossProjectSummary> {
  // プロジェクトを取得（指定がなければ全プロジェクト）
  const projects = await prisma.project.findMany({
    where: projectIds ? { id: { in: projectIds } } : {},
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  const projectStats: ProjectSummaryStats[] = [];

  for (const project of projects) {
    // テスト進捗を取得
    const testRunCases = await prisma.testRunCase.findMany({
      where: {
        testRun: { projectId: project.id },
      },
      select: {
        status: true,
      },
    });

    const totalCases = testRunCases.length;
    const executedCases = testRunCases.filter((c) => c.status !== 'NOT_RUN').length;
    const passedCases = testRunCases.filter((c) => c.status === 'PASSED').length;
    const failedCases = testRunCases.filter((c) => c.status === 'FAILED').length;

    // バグ統計を取得
    const bugs = await prisma.bug.findMany({
      where: { projectId: project.id },
      select: { status: true },
    });

    const openStatuses = ['NEW', 'OPEN', 'IN_PROGRESS'];
    const resolvedStatuses = ['RESOLVED', 'VERIFIED'];
    const closedStatuses = ['CLOSED', 'REJECTED', 'DEFERRED'];

    const openCount = bugs.filter((b) => openStatuses.includes(b.status)).length;
    const resolvedCount = bugs.filter((b) => resolvedStatuses.includes(b.status)).length;
    const closedCount = bugs.filter((b) => closedStatuses.includes(b.status)).length;

    // テストラン数
    const testRunCount = await prisma.testRun.count({
      where: { projectId: project.id },
    });
    const activeTestRuns = await prisma.testRun.count({
      where: { projectId: project.id, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
    });

    projectStats.push({
      projectId: project.id.toString(),
      projectName: project.name,
      testProgress: {
        totalCases,
        executedCases,
        passedCases,
        failedCases,
        executionRate: totalCases > 0 ? Math.round((executedCases / totalCases) * 100) : 0,
        passRate: executedCases > 0 ? Math.round((passedCases / executedCases) * 100) : 0,
      },
      bugStats: {
        total: bugs.length,
        openCount,
        resolvedCount,
        closedCount,
      },
      testRunCount,
      activeTestRuns,
    });
  }

  // 合計を計算
  const totals = projectStats.reduce(
    (acc, p) => ({
      totalProjects: acc.totalProjects + 1,
      totalTestCases: acc.totalTestCases + p.testProgress.totalCases,
      totalExecutedCases: acc.totalExecutedCases + p.testProgress.executedCases,
      totalPassedCases: acc.totalPassedCases + p.testProgress.passedCases,
      totalFailedCases: acc.totalFailedCases + p.testProgress.failedCases,
      totalBugs: acc.totalBugs + p.bugStats.total,
      openBugs: acc.openBugs + p.bugStats.openCount,
      resolvedBugs: acc.resolvedBugs + p.bugStats.resolvedCount,
      avgExecutionRate: 0, // 後で計算
      avgPassRate: 0, // 後で計算
    }),
    {
      totalProjects: 0,
      totalTestCases: 0,
      totalExecutedCases: 0,
      totalPassedCases: 0,
      totalFailedCases: 0,
      totalBugs: 0,
      openBugs: 0,
      resolvedBugs: 0,
      avgExecutionRate: 0,
      avgPassRate: 0,
    }
  );

  // 平均値を計算
  totals.avgExecutionRate =
    totals.totalTestCases > 0
      ? Math.round((totals.totalExecutedCases / totals.totalTestCases) * 100)
      : 0;
  totals.avgPassRate =
    totals.totalExecutedCases > 0
      ? Math.round((totals.totalPassedCases / totals.totalExecutedCases) * 100)
      : 0;

  return {
    projects: projectStats,
    totals,
  };
}

// ユーザー工数分析取得
export async function getCrossProjectUserWorkload(
  projectIds?: bigint[],
  days: number = 30
): Promise<CrossProjectUserWorkload> {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // ユーザーを取得（テスト実行またはバグに関連するユーザー）
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  });

  // プロジェクト一覧を取得
  const projects = await prisma.project.findMany({
    where: projectIds ? { id: { in: projectIds } } : {},
    select: {
      id: true,
      name: true,
    },
  });

  const userStats: UserWorkloadStats[] = [];

  for (const user of users) {
    const projectWorkloads = [];
    let hasActivity = false;

    for (const project of projects) {
      // テスト実行統計
      const testResults = await prisma.testResult.findMany({
        where: {
          executedById: user.id,
          executedAt: { gte: startDate, lte: endDate },
          testRunCase: {
            testRun: { projectId: project.id },
          },
        },
        select: {
          executionTime: true,
        },
      });

      const executedTests = testResults.length;
      const executionTime = testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);

      // バグ統計
      const bugsReported = await prisma.bug.count({
        where: {
          reporterId: user.id,
          projectId: project.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      const bugsAssigned = await prisma.bug.count({
        where: {
          assigneeId: user.id,
          projectId: project.id,
        },
      });

      const bugsResolved = await prisma.bug.count({
        where: {
          assigneeId: user.id,
          projectId: project.id,
          resolvedAt: { gte: startDate, lte: endDate },
        },
      });

      if (executedTests > 0 || bugsReported > 0 || bugsAssigned > 0 || bugsResolved > 0) {
        hasActivity = true;
        projectWorkloads.push({
          projectId: project.id.toString(),
          projectName: project.name,
          executedTests,
          executionTime,
          bugsReported,
          bugsAssigned,
          bugsResolved,
        });
      }
    }

    // アクティビティがあるユーザーのみ追加
    if (hasActivity) {
      const totals = projectWorkloads.reduce(
        (acc, p) => ({
          totalExecutedTests: acc.totalExecutedTests + p.executedTests,
          totalExecutionTime: acc.totalExecutionTime + p.executionTime,
          totalBugsReported: acc.totalBugsReported + p.bugsReported,
          totalBugsAssigned: acc.totalBugsAssigned + p.bugsAssigned,
          totalBugsResolved: acc.totalBugsResolved + p.bugsResolved,
          projectCount: acc.projectCount + (p.executedTests > 0 || p.bugsReported > 0 ? 1 : 0),
        }),
        {
          totalExecutedTests: 0,
          totalExecutionTime: 0,
          totalBugsReported: 0,
          totalBugsAssigned: 0,
          totalBugsResolved: 0,
          projectCount: 0,
        }
      );

      userStats.push({
        userId: user.id.toString(),
        userName: user.name,
        userEmail: user.email,
        projectWorkloads,
        totals,
      });
    }
  }

  // 実行テスト数でソート
  userStats.sort((a, b) => b.totals.totalExecutedTests - a.totals.totalExecutedTests);

  return {
    users: userStats,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// プロジェクト比較データ
export interface ProjectComparisonData {
  projectId: string;
  projectName: string;
  metrics: {
    testCaseCount: number;
    executionRate: number;
    passRate: number;
    bugCount: number;
    openBugRate: number;
    avgBugResolutionDays: number | null;
  };
}

export interface CrossProjectComparison {
  projects: ProjectComparisonData[];
  bestExecutionRate: { projectId: string; projectName: string; value: number } | null;
  bestPassRate: { projectId: string; projectName: string; value: number } | null;
  lowestOpenBugRate: { projectId: string; projectName: string; value: number } | null;
}

// プロジェクト比較データ取得
export async function getCrossProjectComparison(
  projectIds?: bigint[]
): Promise<CrossProjectComparison> {
  const projects = await prisma.project.findMany({
    where: projectIds ? { id: { in: projectIds } } : {},
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  const projectData: ProjectComparisonData[] = [];

  for (const project of projects) {
    // テストケース数と進捗
    const testRunCases = await prisma.testRunCase.findMany({
      where: {
        testRun: { projectId: project.id },
      },
      select: {
        status: true,
      },
    });

    const totalCases = testRunCases.length;
    const executedCases = testRunCases.filter((c) => c.status !== 'NOT_RUN').length;
    const passedCases = testRunCases.filter((c) => c.status === 'PASSED').length;

    // バグ統計
    const bugs = await prisma.bug.findMany({
      where: { projectId: project.id },
      select: {
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    const openStatuses = ['NEW', 'OPEN', 'IN_PROGRESS'];
    const openBugs = bugs.filter((b) => openStatuses.includes(b.status)).length;

    // 平均解決日数
    const resolvedBugs = bugs.filter((b) => b.resolvedAt !== null);
    const avgResolutionDays =
      resolvedBugs.length > 0
        ? Math.round(
            resolvedBugs.reduce((sum, b) => {
              const days = Math.ceil(
                (b.resolvedAt!.getTime() - b.createdAt.getTime()) / (1000 * 60 * 60 * 24)
              );
              return sum + days;
            }, 0) / resolvedBugs.length
          )
        : null;

    projectData.push({
      projectId: project.id.toString(),
      projectName: project.name,
      metrics: {
        testCaseCount: totalCases,
        executionRate: totalCases > 0 ? Math.round((executedCases / totalCases) * 100) : 0,
        passRate: executedCases > 0 ? Math.round((passedCases / executedCases) * 100) : 0,
        bugCount: bugs.length,
        openBugRate: bugs.length > 0 ? Math.round((openBugs / bugs.length) * 100) : 0,
        avgBugResolutionDays: avgResolutionDays,
      },
    });
  }

  // ベスト値を計算
  const validProjects = projectData.filter((p) => p.metrics.testCaseCount > 0);

  const bestExecutionRate =
    validProjects.length > 0
      ? validProjects.reduce(
          (best, p) =>
            p.metrics.executionRate > (best?.value || 0)
              ? {
                  projectId: p.projectId,
                  projectName: p.projectName,
                  value: p.metrics.executionRate,
                }
              : best,
          null as { projectId: string; projectName: string; value: number } | null
        )
      : null;

  const bestPassRate =
    validProjects.length > 0
      ? validProjects.reduce(
          (best, p) =>
            p.metrics.passRate > (best?.value || 0)
              ? { projectId: p.projectId, projectName: p.projectName, value: p.metrics.passRate }
              : best,
          null as { projectId: string; projectName: string; value: number } | null
        )
      : null;

  const projectsWithBugs = projectData.filter((p) => p.metrics.bugCount > 0);
  const lowestOpenBugRate =
    projectsWithBugs.length > 0
      ? projectsWithBugs.reduce(
          (best, p) =>
            best === null || p.metrics.openBugRate < best.value
              ? { projectId: p.projectId, projectName: p.projectName, value: p.metrics.openBugRate }
              : best,
          null as { projectId: string; projectName: string; value: number } | null
        )
      : null;

  return {
    projects: projectData,
    bestExecutionRate,
    bestPassRate,
    lowestOpenBugRate,
  };
}
