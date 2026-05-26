'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Loader2, Calendar, TrendingDown } from 'lucide-react';
import type { DashboardWidgetSafe, BurndownConfig } from '@/types/dashboard';

interface BurndownChartData {
  date: string;
  remaining: number;
  ideal: number;
  actualVelocity: number;
}

interface BurndownStats {
  data: BurndownChartData[];
  totalCases: number;
  completedCases: number;
  remainingCases: number;
  startDate: string;
  endDate: string | null;
  predictedEndDate: string | null;
  daysRemaining: number | null;
}

interface BurndownChartWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

export function BurndownChartWidget({ widget, projectId }: BurndownChartWidgetProps) {
  const config = (widget.config as BurndownConfig) || {};
  const [stats, setStats] = useState<BurndownStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const url = config.testRunId
          ? `/api/projects/${projectId}/test-runs/${config.testRunId}/stats?type=burndown`
          : `/api/projects/${projectId}/stats?type=burndown`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const result = await response.json();
        if (isMounted) {
          setStats(result.burndown);
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

  // 日付表示をフォーマット
  const statsData = stats?.data;
  const formattedData = useMemo(() => {
    if (!statsData) return [];
    return statsData.map((item) => ({
      ...item,
      displayDate: item.date.slice(5), // MM-DD形式で表示
    }));
  }, [statsData]);

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

  // 今日の日付（チャートに垂直線を引く用）
  const todayStr = new Date().toISOString().split('T')[0].slice(5);

  return (
    <div className="h-full w-full flex flex-col">
      {/* サマリー情報 */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1 text-xs">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-muted-foreground">残件:</span>{' '}
            <span className="font-medium">{stats.remainingCases}</span>/{stats.totalCases}件
          </div>
          {stats.predictedEndDate && (
            <div className="flex items-center gap-1 text-amber-600">
              <Calendar className="h-3 w-3" />
              <span>予測完了: {stats.predictedEndDate}</span>
            </div>
          )}
        </div>
        {stats.daysRemaining !== null && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            <span>あと{stats.daysRemaining}日</span>
          </div>
        )}
      </div>

      {/* チャート */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="displayDate" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  remaining: '残件数',
                  ideal: '理想線',
                };
                return [value, labels[name] || name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  remaining: '実績',
                  ideal: '理想線',
                };
                return labels[value] || value;
              }}
            />
            {/* 今日の位置に垂直線 */}
            <ReferenceLine
              x={todayStr}
              stroke="#6b7280"
              strokeDasharray="3 3"
              label={{ value: '今日', fontSize: 10, fill: '#6b7280' }}
            />
            {/* 理想線（点線） */}
            <Line
              type="monotone"
              dataKey="ideal"
              name="ideal"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            {/* 実績線 */}
            <Line
              type="monotone"
              dataKey="remaining"
              name="remaining"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
