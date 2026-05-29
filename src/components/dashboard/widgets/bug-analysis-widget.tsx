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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Loader2, Bug, Users, UserCheck, Tag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DashboardWidgetSafe } from '@/types/dashboard';

interface AssigneeBugStats {
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  totalBugs: number;
  openBugs: number;
  resolvedBugs: number;
  closedBugs: number;
  resolveRate: number;
  avgResolutionDays: number | null;
}

interface ReporterBugStats {
  reporterId: string;
  reporterName: string | null;
  reporterEmail: string | null;
  totalBugs: number;
  byPriority: Record<string, number>;
  bySeverity: Record<string, number>;
}

interface TypeBugStats {
  type: string;
  totalBugs: number;
  openBugs: number;
  resolvedBugs: number;
  closedBugs: number;
}

interface BugAnalysisResult {
  byAssignee: AssigneeBugStats[];
  byReporter: ReporterBugStats[];
  byType: TypeBugStats[];
  totalBugs: number;
  unassignedBugs: number;
}

interface BugAnalysisConfig {
  viewMode?: 'assignee' | 'reporter' | 'type';
}

interface BugAnalysisWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

const STATUS_COLORS = {
  open: '#3b82f6',
  resolved: '#22c55e',
  closed: '#6b7280',
};

const TYPE_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

const TYPE_LABELS: Record<string, string> = {
  BUG: 'バグ',
  ENHANCEMENT: '機能改善',
  TASK: 'タスク',
  IMPROVEMENT: '改善',
  NEW_FEATURE: '新機能',
  DOCUMENTATION: 'ドキュメント',
};

export function BugAnalysisWidget({ widget, projectId }: BugAnalysisWidgetProps) {
  const config = (widget.config as BugAnalysisConfig) || {};
  const [stats, setStats] = useState<BugAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'assignee' | 'reporter' | 'type'>(
    config.viewMode || 'assignee'
  );

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const url = `/api/projects/${projectId}/stats?type=bug-analysis`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const result = await response.json();
        if (isMounted) {
          setStats(result.bugAnalysis);
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
  }, [projectId]);

  // 担当者別チャートデータ
  const assigneeData = stats?.byAssignee;
  const assigneeChartData = useMemo(() => {
    if (!assigneeData) return [];
    return assigneeData.slice(0, 10).map((a) => ({
      name: a.assigneeName
        ? a.assigneeName.length > 8
          ? a.assigneeName.slice(0, 8) + '...'
          : a.assigneeName
        : '未割当',
      fullName: a.assigneeName || '未割当',
      open: a.openBugs,
      resolved: a.resolvedBugs,
      closed: a.closedBugs,
      total: a.totalBugs,
      resolveRate: a.resolveRate,
      avgDays: a.avgResolutionDays,
    }));
  }, [assigneeData]);

  // 報告者別チャートデータ
  const reporterData = stats?.byReporter;
  const reporterChartData = useMemo(() => {
    if (!reporterData) return [];
    return reporterData.slice(0, 10).map((r) => ({
      name: r.reporterName
        ? r.reporterName.length > 8
          ? r.reporterName.slice(0, 8) + '...'
          : r.reporterName
        : '不明',
      fullName: r.reporterName || '不明',
      value: r.totalBugs,
    }));
  }, [reporterData]);

  // タイプ別チャートデータ
  const typeData = stats?.byType;
  const typeChartData = useMemo(() => {
    if (!typeData) return [];
    return typeData.map((t) => ({
      name: TYPE_LABELS[t.type] || t.type,
      open: t.openBugs,
      resolved: t.resolvedBugs,
      closed: t.closedBugs,
      total: t.totalBugs,
    }));
  }, [typeData]);

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

  if (!stats || stats.totalBugs === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <Bug className="h-8 w-8" />
        <span className="text-sm">不具合データがありません</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bug className="h-3.5 w-3.5" />
          <span>
            {stats.totalBugs} 件 (未割当: {stats.unassignedBugs})
          </span>
        </div>
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <SelectTrigger className="w-[120px] h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assignee">
              <span className="flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                担当者別
              </span>
            </SelectItem>
            <SelectItem value="reporter">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                報告者別
              </span>
            </SelectItem>
            <SelectItem value="type">
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                タイプ別
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 min-h-0">
        {viewMode === 'assignee' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assigneeChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={10} />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={10}
                width={70}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    open: 'オープン',
                    resolved: '解決済',
                    closed: 'クローズ',
                  };
                  const nameStr = String(name ?? '');
                  return [value, labels[nameStr] || nameStr];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return `${data.fullName} (解決率: ${data.resolveRate}%${data.avgDays ? `, 平均${data.avgDays}日` : ''})`;
                  }
                  return label;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    open: 'オープン',
                    resolved: '解決済',
                    closed: 'クローズ',
                  };
                  return labels[value] || value;
                }}
              />
              <Bar dataKey="open" name="open" stackId="a" fill={STATUS_COLORS.open} />
              <Bar dataKey="resolved" name="resolved" stackId="a" fill={STATUS_COLORS.resolved} />
              <Bar dataKey="closed" name="closed" stackId="a" fill={STATUS_COLORS.closed} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'reporter' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={reporterChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="70%"
                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                labelLine={false}
                fontSize={10}
              >
                {reporterChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value) => [`${value} 件`, '報告数']}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'type' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    open: 'オープン',
                    resolved: '解決済',
                    closed: 'クローズ',
                  };
                  const nameStr = String(name ?? '');
                  return [value, labels[nameStr] || nameStr];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    open: 'オープン',
                    resolved: '解決済',
                    closed: 'クローズ',
                  };
                  return labels[value] || value;
                }}
              />
              <Bar dataKey="open" name="open" stackId="a" fill={STATUS_COLORS.open} />
              <Bar dataKey="resolved" name="resolved" stackId="a" fill={STATUS_COLORS.resolved} />
              <Bar dataKey="closed" name="closed" stackId="a" fill={STATUS_COLORS.closed} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
