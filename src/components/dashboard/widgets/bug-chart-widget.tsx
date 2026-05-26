'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
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
import type { DashboardWidgetSafe } from '@/types/dashboard';

interface CumulativeBugData {
  date: string;
  newBugs: number;
  resolvedBugs: number;
  cumulativeOpen: number;
  cumulativeResolved: number;
  cumulativeTotal: number;
}

interface BugChartWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

const PERIOD_OPTIONS = [
  { value: '7', label: '7日間' },
  { value: '14', label: '14日間' },
  { value: '30', label: '30日間' },
  { value: '60', label: '60日間' },
];

const VIEW_OPTIONS = [
  { value: 'cumulative', label: '累積推移' },
  { value: 'daily', label: '日別発生' },
];

export function BugChartWidget({ projectId }: BugChartWidgetProps) {
  const [days, setDays] = useState('30');
  const [viewMode, setViewMode] = useState<'cumulative' | 'daily'>('cumulative');
  const [data, setData] = useState<CumulativeBugData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showLegend = true;

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const url = `/api/projects/${projectId}/stats?type=bugs-cumulative&days=${days}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const result = await response.json();
        if (isMounted) {
          setData(result.bugsCumulative || []);
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
  }, [projectId, days]);

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

  const renderCumulativeChart = () => (
    <AreaChart data={formattedData}>
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
        dataKey="cumulativeOpen"
        name="未解決累積"
        stroke="#ef4444"
        fill="#ef4444"
        fillOpacity={0.4}
        stackId="1"
      />
      <Area
        type="monotone"
        dataKey="cumulativeResolved"
        name="解決累積"
        stroke="#22c55e"
        fill="#22c55e"
        fillOpacity={0.4}
        stackId="1"
      />
    </AreaChart>
  );

  const renderDailyChart = () => (
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
      />
      {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
      <Line
        type="monotone"
        dataKey="newBugs"
        name="新規発生"
        stroke="#ef4444"
        strokeWidth={2}
        dot={false}
      />
      <Line
        type="monotone"
        dataKey="resolvedBugs"
        name="解決"
        stroke="#22c55e"
        strokeWidth={2}
        dot={false}
      />
    </LineChart>
  );

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'cumulative' | 'daily')}>
          <SelectTrigger className="h-7 w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIEW_OPTIONS.map((opt) => (
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
          {viewMode === 'cumulative' ? renderCumulativeChart() : renderDailyChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
