'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import type { DashboardWidgetSafe, ProgressChartConfig } from '@/types/dashboard';

interface DailyTestExecution {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  total: number;
}

interface ProgressChartWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

export function ProgressChartWidget({ widget, projectId }: ProgressChartWidgetProps) {
  const [data, setData] = useState<DailyTestExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = (widget.config as ProgressChartConfig) || {};
  const chartType = config.chartType || 'area';
  const showLegend = config.showLegend !== false;

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const url = config.testRunId
          ? `/api/projects/${projectId}/test-runs/${config.testRunId}/stats?type=daily`
          : `/api/projects/${projectId}/stats?type=daily&days=30`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const result = await response.json();
        if (isMounted) {
          setData(result.daily || []);
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

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        データがありません
      </div>
    );
  }

  // 日付表示をフォーマット
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: item.date.slice(5), // MM-DD形式で表示
  }));

  const commonProps = {
    data: formattedData,
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="displayDate" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <Bar dataKey="passed" name="合格" fill="#22c55e" stackId="a" />
            <Bar dataKey="failed" name="失敗" fill="#ef4444" stackId="a" />
            <Bar dataKey="blocked" name="ブロック" fill="#f97316" stackId="a" />
            <Bar dataKey="skipped" name="スキップ" fill="#6b7280" stackId="a" />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="displayDate" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <Line
              type="monotone"
              dataKey="passed"
              name="合格"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="failed"
              name="失敗"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="blocked"
              name="ブロック"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="total"
              name="合計"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        );

      case 'area':
      default:
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="displayDate" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
            />
            {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <Area
              type="monotone"
              dataKey="passed"
              name="合格"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.6}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="failed"
              name="失敗"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.6}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="blocked"
              name="ブロック"
              stroke="#f97316"
              fill="#f97316"
              fillOpacity={0.6}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="skipped"
              name="スキップ"
              stroke="#6b7280"
              fill="#6b7280"
              fillOpacity={0.6}
              stackId="1"
            />
          </AreaChart>
        );
    }
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
