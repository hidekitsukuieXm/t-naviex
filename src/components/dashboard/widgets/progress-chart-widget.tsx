'use client';

import { useEffect, useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DashboardWidgetSafe, ProgressChartConfig } from '@/types/dashboard';

interface DailyTestExecution {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  total: number;
}

interface CumulativeTestProgress {
  date: string;
  registered: number;
  executed: number;
  passed: number;
  failed: number;
}

interface ProgressChartWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

const PERIOD_OPTIONS = [
  { value: '7', label: '7日間' },
  { value: '14', label: '14日間' },
  { value: '30', label: '30日間' },
];

const MODE_OPTIONS = [
  { value: 'daily', label: '日別実績' },
  { value: 'cumulative', label: '累積推移' },
];

export function ProgressChartWidget({ widget, projectId }: ProgressChartWidgetProps) {
  const config = (widget.config as ProgressChartConfig) || {};
  const [days, setDays] = useState(config.days?.toString() || '30');
  const [mode, setMode] = useState<'daily' | 'cumulative'>(config.mode || 'daily');
  const [data, setData] = useState<DailyTestExecution[] | CumulativeTestProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartType = config.chartType || 'area';
  const showLegend = config.showLegend !== false;

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const baseUrl = config.testRunId
          ? `/api/projects/${projectId}/test-runs/${config.testRunId}/stats`
          : `/api/projects/${projectId}/stats`;

        const url = `${baseUrl}?type=${mode}&days=${days}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const result = await response.json();
        if (isMounted) {
          setData(mode === 'daily' ? result.daily || [] : result.cumulative || []);
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
  }, [projectId, config.testRunId, days, mode]);

  // 日付表示をフォーマット
  const formattedData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      displayDate: item.date.slice(5), // MM-DD形式で表示
    }));
  }, [data]);

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

  const commonProps = {
    data: formattedData,
  };

  const renderDailyChart = () => {
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

  const renderCumulativeChart = () => {
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
          dataKey="registered"
          name="登録数"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="executed"
          name="実施数"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="passed"
          name="合格数"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="failed"
          name="失敗数"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Select value={mode} onValueChange={(v) => setMode(v as 'daily' | 'cumulative')}>
          <SelectTrigger className="h-7 w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="h-7 w-[80px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'daily' ? renderDailyChart() : renderCumulativeChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
