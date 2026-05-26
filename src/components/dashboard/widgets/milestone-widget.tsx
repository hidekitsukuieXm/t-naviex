'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Flag, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidgetSafe, MilestoneConfig } from '@/types/dashboard';

interface MilestoneData {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  dueDate: string | null;
  status: string;
  progress: number;
}

interface MilestoneWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

const statusLabels: Record<string, string> = {
  NOT_STARTED: '未開始',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
  DELAYED: '遅延',
};

const statusColors: Record<string, string> = {
  NOT_STARTED: 'text-gray-500 bg-gray-100',
  IN_PROGRESS: 'text-blue-600 bg-blue-100',
  COMPLETED: 'text-green-600 bg-green-100',
  DELAYED: 'text-red-600 bg-red-100',
};

function getDaysRemaining(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function MilestoneWidget({ widget, projectId }: MilestoneWidgetProps) {
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = (widget.config as MilestoneConfig) || {};
  const showCompleted = config.showCompleted !== false;
  const limit = config.limit || 5;

  useEffect(() => {
    let isMounted = true;

    const fetchMilestones = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/milestones`);
        if (!response.ok) {
          throw new Error('マイルストーンの取得に失敗しました');
        }

        const data = await response.json();
        if (isMounted) {
          setMilestones(data.milestones || data || []);
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

    fetchMilestones();

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

  if (!milestones || milestones.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        マイルストーンがありません
      </div>
    );
  }

  // フィルタリングとソート
  const filteredMilestones = milestones
    .filter((m) => showCompleted || m.status !== 'COMPLETED')
    .sort((a, b) => {
      // 進行中を優先、次に期限日でソート
      if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
      if (b.status === 'IN_PROGRESS' && a.status !== 'IN_PROGRESS') return 1;
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    })
    .slice(0, limit);

  return (
    <div className="space-y-3">
      {filteredMilestones.map((milestone) => {
        const daysRemaining = getDaysRemaining(milestone.dueDate);
        const isOverdue = daysRemaining !== null && daysRemaining < 0;
        const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7;

        return (
          <div key={milestone.id} className="space-y-2 pb-3 border-b last:border-b-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Flag
                  className={cn(
                    'h-4 w-4 mt-0.5 flex-shrink-0',
                    milestone.status === 'COMPLETED'
                      ? 'text-green-600'
                      : isOverdue
                        ? 'text-red-600'
                        : 'text-blue-600'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{milestone.name}</p>
                  {milestone.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {milestone.description}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full flex-shrink-0',
                  statusColors[milestone.status] || 'text-gray-500 bg-gray-100'
                )}
              >
                {statusLabels[milestone.status] || milestone.status}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {milestone.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(milestone.dueDate).toLocaleDateString('ja-JP')}</span>
                </div>
              )}
              {daysRemaining !== null && milestone.status !== 'COMPLETED' && (
                <span
                  className={cn(
                    'font-medium',
                    isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : ''
                  )}
                >
                  {isOverdue
                    ? `${Math.abs(daysRemaining)}日超過`
                    : daysRemaining === 0
                      ? '本日'
                      : `残り${daysRemaining}日`}
                </span>
              )}
              {milestone.status === 'COMPLETED' && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  完了
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">達成率</span>
                <span className="font-medium">{milestone.progress || 0}%</span>
              </div>
              <Progress
                value={milestone.progress || 0}
                className={cn(
                  'h-1.5',
                  milestone.progress === 100
                    ? '[&>div]:bg-green-500'
                    : isOverdue
                      ? '[&>div]:bg-red-500'
                      : '[&>div]:bg-blue-500'
                )}
              />
            </div>
          </div>
        );
      })}

      {/* もっと見る */}
      {milestones.length > limit && (
        <div className="text-center pt-1">
          <span className="text-xs text-muted-foreground">他 {milestones.length - limit} 件</span>
        </div>
      )}
    </div>
  );
}
