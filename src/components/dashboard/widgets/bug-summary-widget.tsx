'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Bug, AlertTriangle, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidgetSafe, BugSummaryConfig } from '@/types/dashboard';

interface BugStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  bySeverity: Record<string, number>;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
}

interface BugSummaryWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

const priorityColors: Record<string, string> = {
  CRITICAL: 'text-red-600',
  HIGH: 'text-orange-600',
  MEDIUM: 'text-yellow-600',
  LOW: 'text-green-600',
};

const priorityLabels: Record<string, string> = {
  CRITICAL: '緊急',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

const severityLabels: Record<string, string> = {
  BLOCKER: 'ブロッカー',
  CRITICAL: '致命的',
  MAJOR: '重大',
  MINOR: '軽微',
  TRIVIAL: '些細',
};

export function BugSummaryWidget({ widget, projectId }: BugSummaryWidgetProps) {
  const [stats, setStats] = useState<BugStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = (widget.config as BugSummaryConfig) || {};
  const groupBy = config.groupBy || 'priority';
  const showCount = config.showCount !== false;

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/stats?type=bugs`);
        if (!response.ok) {
          throw new Error('バグ統計の取得に失敗しました');
        }

        const data = await response.json();
        if (isMounted) {
          setStats(data.bugs);
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
  }, [projectId]);

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

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        データがありません
      </div>
    );
  }

  const resolveRate =
    stats.total > 0
      ? Math.round(((stats.resolvedCount + stats.closedCount) / stats.total) * 100)
      : 0;

  const getGroupData = () => {
    switch (groupBy) {
      case 'severity':
        return Object.entries(stats.bySeverity).map(([key, value]) => ({
          key,
          label: severityLabels[key] || key,
          count: value,
        }));
      case 'status':
        return Object.entries(stats.byStatus).map(([key, value]) => ({
          key,
          label: key,
          count: value,
        }));
      case 'priority':
      default:
        return Object.entries(stats.byPriority).map(([key, value]) => ({
          key,
          label: priorityLabels[key] || key,
          count: value,
          color: priorityColors[key],
        }));
    }
  };

  const groupData = getGroupData().filter((item) => item.count > 0);

  return (
    <div className="space-y-4">
      {/* 総合統計 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-muted/50">
          <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
            <Bug className="h-3 w-3" />
            <span>総数</span>
          </div>
          <span className="text-lg font-bold">{stats.total}</span>
        </div>
        <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/50">
          <div className="flex items-center justify-center gap-1 text-orange-600 text-xs mb-1">
            <AlertTriangle className="h-3 w-3" />
            <span>未解決</span>
          </div>
          <span className="text-lg font-bold text-orange-600">{stats.openCount}</span>
        </div>
        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/50">
          <div className="flex items-center justify-center gap-1 text-green-600 text-xs mb-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>解決済</span>
          </div>
          <span className="text-lg font-bold text-green-600">
            {stats.resolvedCount + stats.closedCount}
          </span>
        </div>
      </div>

      {/* 解決率 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">解決率</span>
          <span className="font-medium">{resolveRate}%</span>
        </div>
        <Progress
          value={resolveRate}
          className={cn(
            'h-2',
            resolveRate >= 80
              ? '[&>div]:bg-green-500'
              : resolveRate >= 50
                ? '[&>div]:bg-yellow-500'
                : '[&>div]:bg-red-500'
          )}
        />
      </div>

      {/* グループ別内訳 */}
      {showCount && groupData.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            {groupBy === 'priority'
              ? '優先度別'
              : groupBy === 'severity'
                ? '深刻度別'
                : 'ステータス別'}
          </p>
          <div className="space-y-1">
            {groupData.map((item) => (
              <div key={item.key} className="flex items-center justify-between text-sm">
                <span className={cn('text-muted-foreground', 'color' in item && item.color)}>
                  {item.label}
                </span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ステータス詳細 */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
        <StatusItem
          icon={Clock}
          label="進行中"
          count={stats.byStatus.IN_PROGRESS || 0}
          color="text-blue-600"
        />
        <StatusItem
          icon={XCircle}
          label="却下"
          count={stats.byStatus.REJECTED || 0}
          color="text-gray-500"
        />
      </div>
    </div>
  );
}

function StatusItem({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('h-4 w-4', color)} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium ml-auto">{count}</span>
    </div>
  );
}
