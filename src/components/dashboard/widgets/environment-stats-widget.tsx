'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Loader2, Monitor, BarChart3, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidgetSafe } from '@/types/dashboard';

interface EnvironmentStats {
  environment: string;
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  skippedCount: number;
  passRate: number;
  avgExecutionTime: number | null;
}

interface EnvironmentStatsResult {
  environments: EnvironmentStats[];
  totalExecutions: number;
  uniqueEnvironments: number;
}

interface EnvironmentConfig {
  testRunId?: string;
  viewMode?: 'chart' | 'table';
}

interface EnvironmentStatsWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

const STATUS_COLORS = {
  passed: '#22c55e',
  failed: '#ef4444',
  blocked: '#f59e0b',
  skipped: '#6b7280',
};

export function EnvironmentStatsWidget({ widget, projectId }: EnvironmentStatsWidgetProps) {
  const config = (widget.config as EnvironmentConfig) || {};
  const [stats, setStats] = useState<EnvironmentStatsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>(config.viewMode || 'chart');

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const url = config.testRunId
          ? `/api/projects/${projectId}/test-runs/${config.testRunId}/stats?type=environment`
          : `/api/projects/${projectId}/stats?type=environment`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const result = await response.json();
        if (isMounted) {
          setStats(result.environment);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [projectId, config.testRunId]);

  // チャート用データを整形
  const environments = stats?.environments;
  const chartData = useMemo(() => {
    if (!environments) return [];
    return environments.map((env) => ({
      name: env.environment.length > 10 ? env.environment.slice(0, 10) + '...' : env.environment,
      fullName: env.environment,
      passed: env.passedCount,
      failed: env.failedCount,
      blocked: env.blockedCount,
      skipped: env.skippedCount,
      passRate: env.passRate,
      total: env.totalExecutions,
    }));
  }, [environments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive text-sm">
        {error}
      </div>
    );
  }

  if (!stats || stats.environments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <Monitor className="h-8 w-8" />
        <span className="text-sm">環境別データがありません</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          <span>
            {stats.uniqueEnvironments} 環境 / {stats.totalExecutions} 実行
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('chart')}
            className={cn('p-1 rounded hover:bg-muted', viewMode === 'chart' && 'bg-muted')}
            title="グラフ表示"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn('p-1 rounded hover:bg-muted', viewMode === 'table' && 'bg-muted')}
            title="テーブル表示"
          >
            <Table2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 min-h-0">
        {viewMode === 'chart' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={10} />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={10}
                width={80}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    passed: '合格',
                    failed: '失敗',
                    blocked: 'ブロック',
                    skipped: 'スキップ',
                  };
                  return [value, labels[name] || name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return `${data.fullName} (合格率: ${data.passRate}%)`;
                  }
                  return label;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    passed: '合格',
                    failed: '失敗',
                    blocked: 'ブロック',
                    skipped: 'スキップ',
                  };
                  return labels[value] || value;
                }}
              />
              <Bar dataKey="passed" name="passed" stackId="a" fill={STATUS_COLORS.passed} />
              <Bar dataKey="failed" name="failed" stackId="a" fill={STATUS_COLORS.failed} />
              <Bar dataKey="blocked" name="blocked" stackId="a" fill={STATUS_COLORS.blocked} />
              <Bar dataKey="skipped" name="skipped" stackId="a" fill={STATUS_COLORS.skipped} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="overflow-auto h-full">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="text-left p-2">環境</th>
                  <th className="text-right p-2">実行数</th>
                  <th className="text-right p-2">合格</th>
                  <th className="text-right p-2">失敗</th>
                  <th className="text-right p-2">合格率</th>
                </tr>
              </thead>
              <tbody>
                {stats.environments.map((env, index) => (
                  <tr key={env.environment} className={cn(index % 2 === 0 && 'bg-muted/30')}>
                    <td className="p-2 max-w-[150px] truncate" title={env.environment}>
                      {env.environment}
                    </td>
                    <td className="text-right p-2">{env.totalExecutions}</td>
                    <td className="text-right p-2 text-green-600">{env.passedCount}</td>
                    <td className="text-right p-2 text-red-600">{env.failedCount}</td>
                    <td className="text-right p-2">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-white',
                          env.passRate >= 80
                            ? 'bg-green-500'
                            : env.passRate >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        )}
                      >
                        {env.passRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
