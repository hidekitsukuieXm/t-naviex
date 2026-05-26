'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidgetSafe, ProgressSummaryConfig } from '@/types/dashboard';

interface TestProgressStats {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  blockedCases: number;
  skippedCases: number;
  retestCases: number;
  notRunCases: number;
  executedCases: number;
  passRate: number;
  executionRate: number;
  remainingCases: number;
}

interface ProgressSummaryWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

export function ProgressSummaryWidget({ widget, projectId }: ProgressSummaryWidgetProps) {
  const [stats, setStats] = useState<TestProgressStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = (widget.config as ProgressSummaryConfig) || {};
  const showPercentage = config.showPercentage !== false;

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const url = config.testRunId
          ? `/api/projects/${projectId}/test-runs/${config.testRunId}/stats`
          : `/api/projects/${projectId}/stats?type=progress`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('統計情報の取得に失敗しました');
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

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 実施率 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">実施率</span>
          <span className="font-medium">
            {stats.executedCases} / {stats.totalCases}
            {showPercentage && ` (${stats.executionRate}%)`}
          </span>
        </div>
        <Progress value={stats.executionRate} className="h-2" />
      </div>

      {/* 合格率 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">合格率</span>
          <span className="font-medium">
            {stats.passedCases} / {stats.executedCases}
            {showPercentage && stats.executedCases > 0 && ` (${stats.passRate}%)`}
          </span>
        </div>
        <Progress
          value={stats.passRate}
          className={cn(
            'h-2',
            stats.passRate >= 80
              ? '[&>div]:bg-green-500'
              : stats.passRate >= 60
                ? '[&>div]:bg-yellow-500'
                : '[&>div]:bg-red-500'
          )}
        />
      </div>

      {/* ステータス別カウント */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <StatusItem
          icon={CheckCircle2}
          label="合格"
          count={stats.passedCases}
          color="text-green-600"
        />
        <StatusItem icon={XCircle} label="失敗" count={stats.failedCases} color="text-red-600" />
        <StatusItem
          icon={AlertCircle}
          label="ブロック"
          count={stats.blockedCases}
          color="text-orange-600"
        />
        <StatusItem icon={Clock} label="未実施" count={stats.notRunCases} color="text-gray-500" />
      </div>

      {/* 残件数 */}
      {stats.remainingCases > 0 && (
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            残り <span className="font-semibold text-foreground">{stats.remainingCases}</span>{' '}
            ケース
          </p>
        </div>
      )}
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
