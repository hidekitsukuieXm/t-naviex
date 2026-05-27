/**
 * Review Dashboard Component
 *
 * レビュー進捗ダッシュボードコンポーネント
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ReviewStats } from '@/types/review';
import { ReviewStatus, getReviewStatusLabel, getReviewStatusColor } from '@/types/review';

interface ReviewDashboardProps {
  testCaseId?: string;
  projectId?: string;
}

export function ReviewDashboard({
  testCaseId,
  projectId,
}: ReviewDashboardProps): React.ReactElement {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFetchedRef = useRef(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (testCaseId) params.set('testCaseId', testCaseId);
      if (projectId) params.set('projectId', projectId);

      const response = await fetch(`/api/reviews/stats?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : '統計の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [testCaseId, projectId]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchStats} className="mt-2 text-sm text-red-600 hover:underline">
          再試行
        </button>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-8 text-gray-500">統計データがありません</div>;
  }

  const completedCount = stats.approved + stats.rejected;
  const activeCount = stats.pending + stats.inReview;
  const completionRate = stats.total > 0 ? (completedCount / stats.total) * 100 : 0;
  const approvalRate = completedCount > 0 ? (stats.approved / completedCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">総レビュー数</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">進行中</p>
          <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">完了済み</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">期限切れ</p>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">レビュー進捗</h3>
        <div className="space-y-4">
          {/* 完了率 */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">完了率</span>
              <span className="font-medium">{completionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* 承認率 */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">承認率（完了分）</span>
              <span className="font-medium">{approvalRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${approvalRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ステータス別内訳 */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">ステータス別内訳</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatusCard status={ReviewStatus.PENDING} count={stats.pending} total={stats.total} />
          <StatusCard status={ReviewStatus.IN_REVIEW} count={stats.inReview} total={stats.total} />
          <StatusCard status={ReviewStatus.APPROVED} count={stats.approved} total={stats.total} />
          <StatusCard status={ReviewStatus.REJECTED} count={stats.rejected} total={stats.total} />
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600">期限切れ</span>
              <span className="text-lg font-bold text-red-700">{stats.overdue}</span>
            </div>
            {stats.total > 0 && (
              <div className="mt-1 text-xs text-red-500">
                {((stats.overdue / stats.total) * 100).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 平均レビュー時間 */}
      {stats.avgReviewTime !== undefined && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">レビュー効率</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-500">平均レビュー時間</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(stats.avgReviewTime)}
              </p>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-blue-600 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatusCardProps {
  status: ReviewStatus;
  count: number;
  total: number;
}

function StatusCard({ status, count, total }: StatusCardProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colorClass = getReviewStatusColor(status);

  return (
    <div
      className={`p-3 rounded-lg ${colorClass.replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 ')}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm ${colorClass.split(' ')[0]}`}>
          {getReviewStatusLabel(status)}
        </span>
        <span className={`text-lg font-bold ${colorClass.split(' ')[0]}`}>{count}</span>
      </div>
      {total > 0 && (
        <div className={`mt-1 text-xs ${colorClass.split(' ')[0]} opacity-75`}>
          {percentage.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}分`;
  } else if (hours < 24) {
    return `${hours.toFixed(1)}時間`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}日${remainingHours.toFixed(0)}時間`;
  }
}
