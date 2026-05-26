/**
 * 統計情報リポジトリのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getProjectTestProgress,
  getTestRunProgress,
  getProjectBugStats,
  getProjectTestRunsWithProgress,
  getProjectSummary,
  getDailyTestExecutions,
  getTestRunDailyExecutions,
  getCumulativeTestProgress,
  getTestRunCumulativeProgress,
} from '@/repositories/stats-repository';

// Prismaモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    testRun: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    testRunCase: {
      findMany: vi.fn(),
    },
    bug: {
      findMany: vi.fn(),
    },
    testSpec: {
      count: vi.fn(),
    },
    testCase: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    requirement: {
      count: vi.fn(),
    },
    testResult: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('stats-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProjectTestProgress', () => {
    it('プロジェクトのテスト進捗を取得する', async () => {
      vi.mocked(prisma.testRun.findMany).mockResolvedValue([]);
      vi.mocked(prisma.testRunCase.findMany).mockResolvedValue([
        { status: 'PASSED' },
        { status: 'PASSED' },
        { status: 'FAILED' },
        { status: 'NOT_RUN' },
        { status: 'NOT_RUN' },
      ] as never);

      const result = await getProjectTestProgress(BigInt(1));

      expect(result.totalCases).toBe(5);
      expect(result.passedCases).toBe(2);
      expect(result.failedCases).toBe(1);
      expect(result.notRunCases).toBe(2);
      expect(result.executedCases).toBe(3);
      expect(result.passRate).toBe(67); // 2/3 = 66.67%
      expect(result.executionRate).toBe(60); // 3/5 = 60%
      expect(result.remainingCases).toBe(2);
    });

    it('テストケースがない場合は0を返す', async () => {
      vi.mocked(prisma.testRun.findMany).mockResolvedValue([]);
      vi.mocked(prisma.testRunCase.findMany).mockResolvedValue([]);

      const result = await getProjectTestProgress(BigInt(1));

      expect(result.totalCases).toBe(0);
      expect(result.passRate).toBe(0);
      expect(result.executionRate).toBe(0);
    });
  });

  describe('getTestRunProgress', () => {
    it('テストランの進捗を取得する', async () => {
      vi.mocked(prisma.testRunCase.findMany).mockResolvedValue([
        { status: 'PASSED' },
        { status: 'FAILED' },
        { status: 'BLOCKED' },
        { status: 'SKIPPED' },
        { status: 'RETEST' },
        { status: 'NOT_RUN' },
      ] as never);

      const result = await getTestRunProgress(BigInt(1));

      expect(result.totalCases).toBe(6);
      expect(result.passedCases).toBe(1);
      expect(result.failedCases).toBe(1);
      expect(result.blockedCases).toBe(1);
      expect(result.skippedCases).toBe(1);
      expect(result.retestCases).toBe(1);
      expect(result.notRunCases).toBe(1);
      expect(result.executedCases).toBe(5);
    });
  });

  describe('getProjectBugStats', () => {
    it('プロジェクトのバグ統計を取得する', async () => {
      vi.mocked(prisma.bug.findMany).mockResolvedValue([
        { status: 'NEW', priority: 'HIGH', severity: 'MAJOR' },
        { status: 'OPEN', priority: 'MEDIUM', severity: 'MINOR' },
        { status: 'IN_PROGRESS', priority: 'HIGH', severity: 'MAJOR' },
        { status: 'RESOLVED', priority: 'LOW', severity: 'TRIVIAL' },
        { status: 'CLOSED', priority: 'MEDIUM', severity: 'MINOR' },
      ] as never);

      const result = await getProjectBugStats(BigInt(1));

      expect(result.total).toBe(5);
      expect(result.byStatus.NEW).toBe(1);
      expect(result.byStatus.OPEN).toBe(1);
      expect(result.byStatus.IN_PROGRESS).toBe(1);
      expect(result.byStatus.RESOLVED).toBe(1);
      expect(result.byStatus.CLOSED).toBe(1);
      expect(result.openCount).toBe(3); // NEW + OPEN + IN_PROGRESS
      expect(result.resolvedCount).toBe(1); // RESOLVED + VERIFIED
      expect(result.closedCount).toBe(1); // CLOSED + REJECTED + DEFERRED
      expect(result.byPriority.HIGH).toBe(2);
      expect(result.byPriority.MEDIUM).toBe(2);
      expect(result.byPriority.LOW).toBe(1);
    });

    it('バグがない場合は空の統計を返す', async () => {
      vi.mocked(prisma.bug.findMany).mockResolvedValue([]);

      const result = await getProjectBugStats(BigInt(1));

      expect(result.total).toBe(0);
      expect(result.openCount).toBe(0);
      expect(result.resolvedCount).toBe(0);
      expect(result.closedCount).toBe(0);
    });
  });

  describe('getProjectTestRunsWithProgress', () => {
    it('テストラン一覧と進捗を取得する', async () => {
      vi.mocked(prisma.testRun.findMany).mockResolvedValue([
        { id: BigInt(1), name: 'Test Run 1', status: 'IN_PROGRESS' },
        { id: BigInt(2), name: 'Test Run 2', status: 'COMPLETED' },
      ] as never);
      vi.mocked(prisma.testRunCase.findMany)
        .mockResolvedValueOnce([{ status: 'PASSED' }, { status: 'NOT_RUN' }] as never)
        .mockResolvedValueOnce([{ status: 'PASSED' }, { status: 'PASSED' }] as never);

      const result = await getProjectTestRunsWithProgress(BigInt(1));

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Run 1');
      expect(result[0].progress.totalCases).toBe(2);
      expect(result[1].name).toBe('Test Run 2');
      expect(result[1].progress.passRate).toBe(100);
    });
  });

  describe('getProjectSummary', () => {
    it('プロジェクトサマリーを取得する', async () => {
      vi.mocked(prisma.testRun.findMany).mockResolvedValue([]);
      vi.mocked(prisma.testRunCase.findMany).mockResolvedValue([{ status: 'PASSED' }] as never);
      vi.mocked(prisma.bug.findMany).mockResolvedValue([]);
      vi.mocked(prisma.testRun.count).mockResolvedValueOnce(5).mockResolvedValueOnce(2);
      vi.mocked(prisma.testSpec.count).mockResolvedValue(3);
      vi.mocked(prisma.testCase.count).mockResolvedValue(10);
      vi.mocked(prisma.requirement.count).mockResolvedValue(8);

      const result = await getProjectSummary(BigInt(1));

      expect(result.testRunCount).toBe(5);
      expect(result.testSpecCount).toBe(3);
      expect(result.testCaseCount).toBe(10);
      expect(result.requirementCount).toBe(8);
      expect(result.activeTestRuns).toBe(2);
      expect(result.testProgress).toBeDefined();
      expect(result.bugStats).toBeDefined();
    });
  });

  describe('getDailyTestExecutions', () => {
    it('日別テスト実行データを取得する', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      vi.mocked(prisma.testResult.findMany).mockResolvedValue([
        { executedAt: today, status: 'PASSED' },
        { executedAt: today, status: 'PASSED' },
        { executedAt: today, status: 'FAILED' },
        { executedAt: yesterday, status: 'PASSED' },
        { executedAt: yesterday, status: 'BLOCKED' },
      ] as never);

      const result = await getDailyTestExecutions(BigInt(1), 7);

      expect(result).toHaveLength(8); // 7日 + 今日
      expect(result.every((d) => d.date && typeof d.passed === 'number')).toBe(true);
    });

    it('テスト結果がない場合は0埋めされたデータを返す', async () => {
      vi.mocked(prisma.testResult.findMany).mockResolvedValue([]);

      const result = await getDailyTestExecutions(BigInt(1), 7);

      expect(result).toHaveLength(8);
      expect(result.every((d) => d.total === 0)).toBe(true);
    });
  });

  describe('getTestRunDailyExecutions', () => {
    it('テストラン別の日別テスト実行データを取得する', async () => {
      vi.mocked(prisma.testResult.findMany).mockResolvedValue([]);

      const result = await getTestRunDailyExecutions(BigInt(1), 7);

      // 8日分のデータ（7日前から今日まで）が返される
      expect(result).toHaveLength(8);
      // 各エントリが正しい形式であることを確認
      expect(result.every((d) => d.date && typeof d.passed === 'number')).toBe(true);
      expect(result.every((d) => typeof d.failed === 'number')).toBe(true);
      expect(result.every((d) => typeof d.blocked === 'number')).toBe(true);
      expect(result.every((d) => typeof d.skipped === 'number')).toBe(true);
      expect(result.every((d) => typeof d.total === 'number')).toBe(true);
      // 日付順にソートされていることを確認
      const dates = result.map((d) => d.date);
      const sortedDates = [...dates].sort();
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('getCumulativeTestProgress', () => {
    it('プロジェクトの累積テスト進捗を取得する', async () => {
      // 初期登録数
      vi.mocked(prisma.testCase.count).mockResolvedValue(10);
      // 期間中の新規登録
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([]);
      // 初期結果
      vi.mocked(prisma.testResult.groupBy).mockResolvedValue([
        { status: 'PASSED', _count: { status: 5 } },
        { status: 'FAILED', _count: { status: 2 } },
      ] as never);
      // 期間中の結果
      vi.mocked(prisma.testResult.findMany).mockResolvedValue([]);

      const result = await getCumulativeTestProgress(BigInt(1), 7);

      expect(result).toHaveLength(8);
      // 累積値が返されていることを確認
      expect(result.every((d) => d.date && typeof d.registered === 'number')).toBe(true);
      expect(result.every((d) => typeof d.executed === 'number')).toBe(true);
      expect(result.every((d) => typeof d.passed === 'number')).toBe(true);
      expect(result.every((d) => typeof d.failed === 'number')).toBe(true);
    });

    it('データがない場合は初期値が維持される', async () => {
      vi.mocked(prisma.testCase.count).mockResolvedValue(0);
      vi.mocked(prisma.testCase.findMany).mockResolvedValue([]);
      vi.mocked(prisma.testResult.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.testResult.findMany).mockResolvedValue([]);

      const result = await getCumulativeTestProgress(BigInt(1), 7);

      expect(result).toHaveLength(8);
      expect(result.every((d) => d.registered === 0)).toBe(true);
      expect(result.every((d) => d.executed === 0)).toBe(true);
    });
  });

  describe('getTestRunCumulativeProgress', () => {
    it('テストランの累積テスト進捗を取得する', async () => {
      vi.mocked(prisma.testRunCase.findMany).mockResolvedValue([]);
      vi.mocked(prisma.testResult.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.testResult.findMany).mockResolvedValue([]);

      const result = await getTestRunCumulativeProgress(BigInt(1), 7);

      expect(result).toHaveLength(8);
      expect(result.every((d) => d.date && typeof d.registered === 'number')).toBe(true);
      expect(result.every((d) => typeof d.executed === 'number')).toBe(true);
      expect(result.every((d) => typeof d.passed === 'number')).toBe(true);
      expect(result.every((d) => typeof d.failed === 'number')).toBe(true);
    });
  });
});
