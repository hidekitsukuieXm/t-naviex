/**
 * プロジェクトレポート API
 * GET /api/projects/[id]/reports - プロジェクトのレポートデータ取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ケースレポートデータ
interface CaseReportData {
  testSpecId: string;
  testSpecName: string;
  status: string;
  cases: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    executedCount: number;
    passedCount: number;
    failedCount: number;
    lastExecutedAt: string | null;
    tags: string[];
  }>;
}

// 欠陥レポートデータ
interface DefectReportData {
  summary: {
    total: number;
    open: number;
    resolved: number;
    closed: number;
  };
  byStatus: Array<{ status: string; label: string; count: number }>;
  bySeverity: Array<{ severity: string; label: string; count: number }>;
  byPriority: Array<{ priority: string; label: string; count: number }>;
  defects: Array<{
    id: string;
    title: string;
    status: string;
    severity: string;
    priority: string;
    assigneeName: string | null;
    reporterName: string | null;
    createdAt: string;
    resolvedAt: string | null;
    resolutionDays: number | null;
  }>;
}

// 結果レポートデータ
interface ResultReportData {
  testRunId: string;
  testRunName: string;
  summary: {
    totalCases: number;
    executed: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    executionRate: number;
    passRate: number;
  };
  results: Array<{
    caseId: string;
    caseTitle: string;
    status: string;
    executedAt: string | null;
    executedByName: string | null;
    executionTime: number | null;
    environment: string | null;
    bugCount: number;
  }>;
}

// GET /api/projects/[id]/reports
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'summary';
    const testRunId = searchParams.get('testRunId');

    switch (type) {
      case 'cases': {
        const caseReport = await getCaseReport(projectId);
        return NextResponse.json({ caseReport });
      }

      case 'defects': {
        const defectReport = await getDefectReport(projectId);
        return NextResponse.json({ defectReport });
      }

      case 'results': {
        if (!testRunId) {
          // テストラン一覧を返す
          const testRuns = await getTestRunList(projectId);
          return NextResponse.json({ testRuns });
        }
        const resultReport = await getResultReport(BigInt(testRunId));
        return NextResponse.json({ resultReport });
      }

      case 'summary': {
        const summaryReport = await getSummaryReport(projectId);
        return NextResponse.json({ summaryReport });
      }

      default:
        return NextResponse.json({ error: '不正なタイプです。' }, { status: 400 });
    }
  } catch (error) {
    console.error('Get project report error:', error);
    return NextResponse.json({ error: 'レポートの取得に失敗しました。' }, { status: 500 });
  }
}

// ケースレポート取得
async function getCaseReport(projectId: bigint): Promise<CaseReportData[]> {
  const testSpecs = await prisma.testSpec.findMany({
    where: { projectId },
    select: {
      id: true,
      name: true,
      status: true,
      testCases: {
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          priority: true,
          testRunCases: {
            select: {
              status: true,
              testResults: {
                select: {
                  status: true,
                  executedAt: true,
                },
                orderBy: { executedAt: 'desc' },
                take: 1,
              },
            },
          },
          testCaseTags: {
            select: {
              tag: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return testSpecs.map((spec) => ({
    testSpecId: spec.id.toString(),
    testSpecName: spec.name,
    status: spec.status,
    cases: spec.testCases.map((tc) => {
      const allResults = tc.testRunCases.flatMap((trc) => trc.testResults);
      const passedCount = allResults.filter((r) => r.status === 'PASSED').length;
      const failedCount = allResults.filter((r) => r.status === 'FAILED').length;
      const latestResult = allResults[0];
      const firstTestRunCase = tc.testRunCases[0];
      const currentStatus = firstTestRunCase ? firstTestRunCase.status : 'NOT_RUN';

      return {
        id: tc.id.toString(),
        title: tc.title,
        priority: tc.priority,
        status: currentStatus,
        executedCount: allResults.length,
        passedCount,
        failedCount,
        lastExecutedAt: latestResult?.executedAt?.toISOString() || null,
        tags: tc.testCaseTags.map((t) => t.tag.name),
      };
    }),
  }));
}

// 欠陥レポート取得
async function getDefectReport(projectId: bigint): Promise<DefectReportData> {
  const bugs = await prisma.bug.findMany({
    where: { projectId },
    select: {
      id: true,
      title: true,
      status: true,
      severity: true,
      priority: true,
      createdAt: true,
      resolvedAt: true,
      assignee: {
        select: { name: true },
      },
      reporter: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const statusLabels: Record<string, string> = {
    NEW: '新規',
    OPEN: 'オープン',
    IN_PROGRESS: '対応中',
    RESOLVED: '解決済み',
    VERIFIED: '検証済み',
    CLOSED: 'クローズ',
    REJECTED: '却下',
    DEFERRED: '保留',
  };

  const severityLabels: Record<string, string> = {
    BLOCKER: 'ブロッカー',
    CRITICAL: '致命的',
    MAJOR: '重大',
    MINOR: '軽微',
    TRIVIAL: '軽微（外観）',
  };

  const priorityLabels: Record<string, string> = {
    CRITICAL: '緊急',
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
  };

  const openStatuses = ['NEW', 'OPEN', 'IN_PROGRESS'];
  const resolvedStatuses = ['RESOLVED', 'VERIFIED'];
  const closedStatuses = ['CLOSED', 'REJECTED', 'DEFERRED'];

  // 集計
  const statusCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  let open = 0;
  let resolved = 0;
  let closed = 0;

  for (const bug of bugs) {
    statusCounts[bug.status] = (statusCounts[bug.status] || 0) + 1;
    severityCounts[bug.severity] = (severityCounts[bug.severity] || 0) + 1;
    priorityCounts[bug.priority] = (priorityCounts[bug.priority] || 0) + 1;

    if (openStatuses.includes(bug.status)) open++;
    else if (resolvedStatuses.includes(bug.status)) resolved++;
    else if (closedStatuses.includes(bug.status)) closed++;
  }

  return {
    summary: {
      total: bugs.length,
      open,
      resolved,
      closed,
    },
    byStatus: Object.entries(statusCounts).map(([status, count]) => ({
      status,
      label: statusLabels[status] || status,
      count,
    })),
    bySeverity: Object.entries(severityCounts).map(([severity, count]) => ({
      severity,
      label: severityLabels[severity] || severity,
      count,
    })),
    byPriority: Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      label: priorityLabels[priority] || priority,
      count,
    })),
    defects: bugs.map((bug) => {
      const resolutionDays = bug.resolvedAt
        ? Math.ceil((bug.resolvedAt.getTime() - bug.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: bug.id.toString(),
        title: bug.title,
        status: bug.status,
        severity: bug.severity,
        priority: bug.priority,
        assigneeName: bug.assignee?.name || null,
        reporterName: bug.reporter.name,
        createdAt: bug.createdAt.toISOString(),
        resolvedAt: bug.resolvedAt?.toISOString() || null,
        resolutionDays,
      };
    }),
  };
}

// テストラン一覧取得
async function getTestRunList(projectId: bigint) {
  const testRuns = await prisma.testRun.findMany({
    where: { projectId },
    select: {
      id: true,
      name: true,
      status: true,
      actualStartDate: true,
      actualEndDate: true,
      _count: {
        select: { testRunCases: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return testRuns.map((tr) => ({
    id: tr.id.toString(),
    name: tr.name,
    status: tr.status,
    startDate: tr.actualStartDate?.toISOString() || null,
    endDate: tr.actualEndDate?.toISOString() || null,
    caseCount: tr._count.testRunCases,
  }));
}

// 結果レポート取得
async function getResultReport(testRunId: bigint): Promise<ResultReportData> {
  const testRun = await prisma.testRun.findUnique({
    where: { id: testRunId },
    select: {
      id: true,
      name: true,
      testRunCases: {
        select: {
          id: true,
          status: true,
          testCase: {
            select: {
              id: true,
              title: true,
            },
          },
          testResults: {
            select: {
              status: true,
              executedAt: true,
              executionTime: true,
              environment: true,
              executedBy: {
                select: { name: true },
              },
              bugs: {
                select: { id: true },
              },
            },
            orderBy: { executedAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!testRun) {
    return {
      testRunId: '',
      testRunName: '',
      summary: {
        totalCases: 0,
        executed: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        skipped: 0,
        executionRate: 0,
        passRate: 0,
      },
      results: [],
    };
  }

  const totalCases = testRun.testRunCases.length;
  const executed = testRun.testRunCases.filter((trc) => trc.status !== 'NOT_RUN').length;
  const passed = testRun.testRunCases.filter((trc) => trc.status === 'PASSED').length;
  const failed = testRun.testRunCases.filter((trc) => trc.status === 'FAILED').length;
  const blocked = testRun.testRunCases.filter((trc) => trc.status === 'BLOCKED').length;
  const skipped = testRun.testRunCases.filter((trc) => trc.status === 'SKIPPED').length;

  return {
    testRunId: testRun.id.toString(),
    testRunName: testRun.name,
    summary: {
      totalCases,
      executed,
      passed,
      failed,
      blocked,
      skipped,
      executionRate: totalCases > 0 ? Math.round((executed / totalCases) * 100) : 0,
      passRate: executed > 0 ? Math.round((passed / executed) * 100) : 0,
    },
    results: testRun.testRunCases.map((trc) => {
      const latestResult = trc.testResults[0];
      return {
        caseId: trc.testCase.id.toString(),
        caseTitle: trc.testCase.title,
        status: trc.status,
        executedAt: latestResult?.executedAt?.toISOString() || null,
        executedByName: latestResult?.executedBy?.name || null,
        executionTime: latestResult?.executionTime || null,
        environment: latestResult?.environment || null,
        bugCount: latestResult?.bugs?.length || 0,
      };
    }),
  };
}

// サマリーレポート取得
async function getSummaryReport(projectId: bigint) {
  const [testSpecs, testCases, testRuns, bugs] = await Promise.all([
    prisma.testSpec.count({ where: { projectId } }),
    prisma.testCase.count({ where: { testSpec: { projectId }, deletedAt: null } }),
    prisma.testRun.findMany({
      where: { projectId },
      select: {
        status: true,
        testRunCases: {
          select: { status: true },
        },
      },
    }),
    prisma.bug.findMany({
      where: { projectId },
      select: { status: true },
    }),
  ]);

  // テスト結果集計
  let totalRunCases = 0;
  let executedCases = 0;
  let passedCases = 0;
  let failedCases = 0;

  for (const tr of testRuns) {
    for (const trc of tr.testRunCases) {
      totalRunCases++;
      if (trc.status !== 'NOT_RUN') executedCases++;
      if (trc.status === 'PASSED') passedCases++;
      if (trc.status === 'FAILED') failedCases++;
    }
  }

  // バグ集計
  const openStatuses = ['NEW', 'OPEN', 'IN_PROGRESS'];
  const resolvedStatuses = ['RESOLVED', 'VERIFIED'];
  const closedStatuses = ['CLOSED', 'REJECTED', 'DEFERRED'];

  const openBugs = bugs.filter((b) => openStatuses.includes(b.status)).length;
  const resolvedBugs = bugs.filter((b) => resolvedStatuses.includes(b.status)).length;
  const closedBugs = bugs.filter((b) => closedStatuses.includes(b.status)).length;

  return {
    overview: {
      testSpecCount: testSpecs,
      testCaseCount: testCases,
      testRunCount: testRuns.length,
      bugCount: bugs.length,
    },
    testProgress: {
      totalCases: totalRunCases,
      executedCases,
      passedCases,
      failedCases,
      executionRate: totalRunCases > 0 ? Math.round((executedCases / totalRunCases) * 100) : 0,
      passRate: executedCases > 0 ? Math.round((passedCases / executedCases) * 100) : 0,
    },
    bugStatus: {
      total: bugs.length,
      open: openBugs,
      resolved: resolvedBugs,
      closed: closedBugs,
    },
  };
}
