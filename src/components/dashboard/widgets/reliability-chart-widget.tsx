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
} from 'recharts';
import { Loader2, TrendingUp, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DashboardWidgetSafe, ReliabilityChartConfig } from '@/types/dashboard';

interface ReliabilityDataPoint {
  date: string;
  day: number;
  actual: number;
  gompertz: number | null;
  logistic: number | null;
}

interface ReliabilityCurveParams {
  a: number;
  b: number;
  c: number;
  r2: number;
}

interface ReliabilityGrowthResult {
  data: ReliabilityDataPoint[];
  totalDefects: number;
  gompertzParams: ReliabilityCurveParams | null;
  logisticParams: ReliabilityCurveParams | null;
  predictedTotalGompertz: number | null;
  predictedTotalLogistic: number | null;
  startDate: string;
  endDate: string;
}

interface ReliabilityChartWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

const DAYS_OPTIONS = [30, 60, 90, 120];

export function ReliabilityChartWidget({ widget, projectId }: ReliabilityChartWidgetProps) {
  const config = (widget.config as ReliabilityChartConfig) || {};
  const [stats, setStats] = useState<ReliabilityGrowthResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(60);
  const [showModel, setShowModel] = useState<'both' | 'gompertz' | 'logistic'>(
    config.model ? (config.model === 'gompertz' ? 'gompertz' : 'logistic') : 'both'
  );

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const url = `/api/projects/${projectId}/stats?type=reliability-growth&days=${days}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const result = await response.json();
        if (isMounted) {
          setStats(result.reliabilityGrowth);
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

  if (!stats || stats.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <TrendingUp className="h-8 w-8" />
        <span className="text-sm">データがありません</span>
      </div>
    );
  }

  const gompertzR2 = stats.gompertzParams?.r2;
  const logisticR2 = stats.logisticParams?.r2;

  return (
    <div className="h-full w-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>欠陥数: {stats.totalDefects}</span>
          {stats.predictedTotalGompertz && showModel !== 'logistic' && (
            <span className="text-blue-600">
              予測(G): {stats.predictedTotalGompertz}
              {gompertzR2 !== undefined && (
                <span className="ml-1 text-muted-foreground">(R²={gompertzR2})</span>
              )}
            </span>
          )}
          {stats.predictedTotalLogistic && showModel !== 'gompertz' && (
            <span className="text-amber-600">
              予測(L): {stats.predictedTotalLogistic}
              {logisticR2 !== undefined && (
                <span className="ml-1 text-muted-foreground">(R²={logisticR2})</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={showModel} onValueChange={(v) => setShowModel(v as typeof showModel)}>
            <SelectTrigger className="w-[90px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">両方</SelectItem>
              <SelectItem value="gompertz">Gompertz</SelectItem>
              <SelectItem value="logistic">Logistic</SelectItem>
            </SelectContent>
          </Select>
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v, 10))}>
            <SelectTrigger className="w-[70px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((d) => (
                <SelectItem key={d} value={d.toString()}>
                  {d}日
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  actual: '実績',
                  gompertz: 'Gompertz予測',
                  logistic: 'Logistic予測',
                };
                return [value, labels[name] || name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  actual: '実績',
                  gompertz: 'Gompertz',
                  logistic: 'Logistic',
                };
                return labels[value] || value;
              }}
            />
            {/* 実績線 */}
            <Line
              type="monotone"
              dataKey="actual"
              name="actual"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            {/* ゴンペルツ予測線 */}
            {(showModel === 'both' || showModel === 'gompertz') && stats.gompertzParams && (
              <Line
                type="monotone"
                dataKey="gompertz"
                name="gompertz"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
              />
            )}
            {/* ロジスティック予測線 */}
            {(showModel === 'both' || showModel === 'logistic') && stats.logisticParams && (
              <Line
                type="monotone"
                dataKey="logistic"
                name="logistic"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* モデル情報 */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1 px-1">
        <Info className="h-3 w-3" />
        <span>Gompertz: N(t)=a·e^(-b·e^(-ct)) / Logistic: N(t)=a/(1+b·e^(-ct))</span>
      </div>
    </div>
  );
}
