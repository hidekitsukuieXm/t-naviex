'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Loader2, Activity } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DashboardWidgetSafe, MTBFODCConfig } from '@/types/dashboard';

interface MTBFStats {
  mtbf: number | null;
  mttf: number | null;
  totalFailures: number;
  totalExecutions: number;
  failureRate: number;
  reliability: number;
}

interface MTBFDataPoint {
  date: string;
  failures: number;
  mtbf: number | null;
  cumulativeFailures: number;
}

interface MTBFResult {
  stats: MTBFStats;
  data: MTBFDataPoint[];
  startDate: string;
  endDate: string;
}

interface ODCTypeStats {
  type: string;
  label: string;
  count: number;
  percentage: number;
}

interface ODCSeverityStats {
  severity: string;
  label: string;
  count: number;
  percentage: number;
}

interface ODCPriorityStats {
  priority: string;
  label: string;
  count: number;
  percentage: number;
}

interface ODCPhaseStats {
  phase: string;
  label: string;
  count: number;
  percentage: number;
}

interface ODCTrendDataPoint {
  date: string;
  bug: number;
  feature: number;
  inquiry: number;
  task: number;
  improvement: number;
  total: number;
}

interface ODCAnalysisResult {
  byType: ODCTypeStats[];
  bySeverity: ODCSeverityStats[];
  byPriority: ODCPriorityStats[];
  byPhase: ODCPhaseStats[];
  trend: ODCTrendDataPoint[];
  totalDefects: number;
  defectsWithTestResult: number;
  startDate: string;
  endDate: string;
}

interface MTBFODCResult {
  mtbf: MTBFResult;
  odc: ODCAnalysisResult;
}

interface MTBFODCWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

const DAYS_OPTIONS = [7, 14, 30, 60, 90];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function MTBFODCWidget({ widget, projectId }: MTBFODCWidgetProps) {
  const config = (widget.config as MTBFODCConfig) || {};
  const [result, setResult] = useState<MTBFODCResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(config.days || 30);
  const [viewMode, setViewMode] = useState<'mtbf' | 'odc'>(config.viewMode || 'mtbf');
  const [odcView, setOdcView] = useState<'type' | 'severity' | 'priority' | 'phase' | 'trend'>(
    'type'
  );

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const url = `/api/projects/${projectId}/stats?type=mtbf-odc&days=${days}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }
        const data = await response.json();
        if (isMounted) {
          setResult(data.mtbfOdc);
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
  const mtbfData = result?.mtbf.data;
  const formattedMTBFData = useMemo(() => {
    if (!mtbfData) return [];
    return mtbfData.map((item) => ({
      ...item,
      displayDate: item.date.slice(5),
    }));
  }, [mtbfData]);

  const odcTrendData = result?.odc.trend;
  const formattedODCTrendData = useMemo(() => {
    if (!odcTrendData) return [];
    return odcTrendData.map((item) => ({
      ...item,
      displayDate: item.date.slice(5),
    }));
  }, [odcTrendData]);

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

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <Activity className="h-8 w-8" />
        <span className="text-sm">データがありません</span>
      </div>
    );
  }

  const { mtbf, odc } = result;

  return (
    <div className="h-full w-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <TabsList className="h-7">
            <TabsTrigger value="mtbf" className="text-xs px-2 h-6">
              MTBF/MTTF
            </TabsTrigger>
            <TabsTrigger value="odc" className="text-xs px-2 h-6">
              ODC分析
            </TabsTrigger>
          </TabsList>
        </Tabs>
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

      {/* コンテンツ */}
      <div className="flex-1 min-h-0">
        {viewMode === 'mtbf' ? (
          <MTBFView mtbf={mtbf} formattedData={formattedMTBFData} />
        ) : (
          <ODCView
            odc={odc}
            odcView={odcView}
            setOdcView={setOdcView}
            formattedTrendData={formattedODCTrendData}
          />
        )}
      </div>
    </div>
  );
}

// MTBFビューコンポーネント
function MTBFView({
  mtbf,
  formattedData,
}: {
  mtbf: MTBFResult;
  formattedData: Array<MTBFDataPoint & { displayDate: string }>;
}) {
  const { stats } = mtbf;

  return (
    <div className="h-full flex flex-col gap-2">
      {/* MTBF/MTTF指標 */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-muted/50 rounded p-2 text-center">
          <div className="text-muted-foreground">MTBF</div>
          <div className="text-lg font-semibold text-blue-600">
            {stats.mtbf !== null ? `${stats.mtbf}h` : '-'}
          </div>
        </div>
        <div className="bg-muted/50 rounded p-2 text-center">
          <div className="text-muted-foreground">MTTF</div>
          <div className="text-lg font-semibold text-green-600">
            {stats.mttf !== null ? `${stats.mttf}h` : '-'}
          </div>
        </div>
        <div className="bg-muted/50 rounded p-2 text-center">
          <div className="text-muted-foreground">信頼度</div>
          <div className="text-lg font-semibold text-amber-600">{stats.reliability}%</div>
        </div>
      </div>

      {/* 実行統計 */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        <span>総実行: {stats.totalExecutions}</span>
        <span>故障数: {stats.totalFailures}</span>
        <span>故障率: {stats.failureRate}%</span>
      </div>

      {/* 故障推移グラフ */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="displayDate" fontSize={10} />
            <YAxis yAxisId="left" fontSize={10} />
            <YAxis yAxisId="right" orientation="right" fontSize={10} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  failures: '故障数',
                  cumulativeFailures: '累積故障',
                };
                return [value, labels[name] || name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  failures: '日別故障',
                  cumulativeFailures: '累積',
                };
                return labels[value] || value;
              }}
            />
            <Line
              type="monotone"
              yAxisId="left"
              dataKey="failures"
              name="failures"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              yAxisId="right"
              dataKey="cumulativeFailures"
              name="cumulativeFailures"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ODCビューコンポーネント
function ODCView({
  odc,
  odcView,
  setOdcView,
  formattedTrendData,
}: {
  odc: ODCAnalysisResult;
  odcView: 'type' | 'severity' | 'priority' | 'phase' | 'trend';
  setOdcView: (v: 'type' | 'severity' | 'priority' | 'phase' | 'trend') => void;
  formattedTrendData: Array<ODCTrendDataPoint & { displayDate: string }>;
}) {
  return (
    <div className="h-full flex flex-col gap-2">
      {/* ODCサブビュー選択 */}
      <div className="flex items-center gap-1 px-1">
        <Select value={odcView} onValueChange={(v) => setOdcView(v as typeof odcView)}>
          <SelectTrigger className="w-[100px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="type">タイプ別</SelectItem>
            <SelectItem value="severity">重大度別</SelectItem>
            <SelectItem value="priority">優先度別</SelectItem>
            <SelectItem value="phase">フェーズ別</SelectItem>
            <SelectItem value="trend">トレンド</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 text-right text-xs text-muted-foreground">
          合計: {odc.totalDefects}件
        </div>
      </div>

      {/* ODCチャート */}
      <div className="flex-1 min-h-0">
        {odcView === 'type' && <ODCPieChart data={odc.byType} />}
        {odcView === 'severity' && <ODCBarChart data={odc.bySeverity} />}
        {odcView === 'priority' && <ODCBarChart data={odc.byPriority} />}
        {odcView === 'phase' && <ODCBarChart data={odc.byPhase} />}
        {odcView === 'trend' && <ODCTrendChart data={formattedTrendData} />}
      </div>
    </div>
  );
}

// ODC円グラフコンポーネント
function ODCPieChart({
  data,
}: {
  data: Array<{ label: string; count: number; percentage: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius="70%"
          label={({ label, percentage }) => `${label}: ${percentage}%`}
          labelLine={{ strokeWidth: 1 }}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string) => [`${value}件`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ODC棒グラフコンポーネント
function ODCBarChart({
  data,
}: {
  data: Array<{ label: string; count: number; percentage: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" fontSize={10} />
        <YAxis dataKey="label" type="category" fontSize={10} width={80} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${value}件`, '件数']}
        />
        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ODCトレンドグラフコンポーネント
function ODCTrendChart({ data }: { data: Array<ODCTrendDataPoint & { displayDate: string }> }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        データがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
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
              bug: '不具合',
              feature: '機能要望',
              inquiry: '問い合わせ',
              task: 'タスク',
              improvement: '改善',
            };
            return [value, labels[name] || name];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10 }}
          formatter={(value) => {
            const labels: Record<string, string> = {
              bug: '不具合',
              feature: '機能要望',
              inquiry: '問い合わせ',
              task: 'タスク',
              improvement: '改善',
            };
            return labels[value] || value;
          }}
        />
        <Bar dataKey="bug" name="bug" stackId="a" fill="#ef4444" />
        <Bar dataKey="feature" name="feature" stackId="a" fill="#3b82f6" />
        <Bar dataKey="inquiry" name="inquiry" stackId="a" fill="#10b981" />
        <Bar dataKey="task" name="task" stackId="a" fill="#f59e0b" />
        <Bar dataKey="improvement" name="improvement" stackId="a" fill="#8b5cf6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
