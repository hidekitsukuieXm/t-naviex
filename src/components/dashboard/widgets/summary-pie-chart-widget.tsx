'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';
import type { DashboardWidgetSafe } from '@/types/dashboard';

interface TestProgressStats {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  skippedCases: number;
  notRunCases: number;
}

interface SummaryPieChartWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

interface CoverageConfig {
  testRunId?: string;
  chartType?: 'pie' | 'doughnut';
  showLegend?: boolean;
}

// カラーパレット
const COLORS = {
  passed: '#22c55e', // green-500
  failed: '#ef4444', // red-500
  blocked: '#f97316', // orange-500
  skipped: '#6b7280', // gray-500
  notRun: '#d1d5db', // gray-300
};

export function SummaryPieChartWidget({ widget, projectId }: SummaryPieChartWidgetProps) {
  const [stats, setStats] = useState<TestProgressStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = (widget.config as CoverageConfig) || {};
  const chartType = config.chartType || 'doughnut';
  const showLegend = config.showLegend !== false;

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const url = config.testRunId
          ? `/api/projects/${projectId}/test-runs/${config.testRunId}/stats?type=progress`
          : `/api/projects/${projectId}/stats?type=progress`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const data = await response.json();
        if (isMounted) {
          setStats(data.progress);
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

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [projectId, config.testRunId]);

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

  if (!stats || stats.totalCases === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        データがありません
      </div>
    );
  }

  // 円グラフ用データ
  const chartData = [
    { name: '合格', value: stats.passedCases, color: COLORS.passed },
    { name: '失敗', value: stats.failedCases, color: COLORS.failed },
    { name: 'ブロック', value: stats.blockedCases, color: COLORS.blocked },
    { name: 'スキップ', value: stats.skippedCases, color: COLORS.skipped },
    { name: '未実施', value: stats.notRunCases, color: COLORS.notRun },
  ].filter((item) => item.value > 0);

  const innerRadius = chartType === 'doughnut' ? '50%' : 0;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value}件`, '']}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {showLegend && (
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-xs">{value}</span>}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center text-xs text-muted-foreground mt-1">
        合計: {stats.totalCases}件
      </div>
    </div>
  );
}
