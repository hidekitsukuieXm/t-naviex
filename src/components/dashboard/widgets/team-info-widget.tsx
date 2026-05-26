'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidgetSafe, TeamInfoConfig } from '@/types/dashboard';

interface TeamMemberStats {
  userId: string;
  userName: string | null;
  email: string | null;
  executedCount: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
}

interface TeamInfoWidgetProps {
  widget: DashboardWidgetSafe;
  projectId: string;
}

export function TeamInfoWidget({ widget, projectId }: TeamInfoWidgetProps) {
  const [members, setMembers] = useState<TeamMemberStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = (widget.config as TeamInfoConfig) || {};
  const showRole = config.showRole !== false;

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/stats?type=team`);
        if (!response.ok) {
          throw new Error('チーム情報の取得に失敗しました');
        }

        const data = await response.json();
        if (isMounted) {
          setMembers(data.team || []);
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

  if (!members || members.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        チームメンバーのデータがありません
      </div>
    );
  }

  const totalExecuted = members.reduce((sum, m) => sum + m.executedCount, 0);

  return (
    <div className="space-y-3">
      {/* 総実行数 */}
      <div className="flex items-center justify-between text-sm pb-2 border-b">
        <span className="text-muted-foreground">総テスト実行数</span>
        <span className="font-bold">{totalExecuted}</span>
      </div>

      {/* メンバー一覧 */}
      <div className="space-y-3">
        {members.slice(0, 5).map((member) => (
          <div key={member.userId} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {member.userName || member.email?.split('@')[0] || '不明'}
                  </span>
                  {showRole && (
                    <span className="text-xs text-muted-foreground">
                      {member.executedCount}件実行
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    'text-sm font-medium',
                    member.passRate >= 80
                      ? 'text-green-600'
                      : member.passRate >= 60
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  )}
                >
                  {member.passRate}%
                </span>
              </div>
            </div>
            <Progress
              value={member.passRate}
              className={cn(
                'h-1.5',
                member.passRate >= 80
                  ? '[&>div]:bg-green-500'
                  : member.passRate >= 60
                    ? '[&>div]:bg-yellow-500'
                    : '[&>div]:bg-red-500'
              )}
            />
          </div>
        ))}
      </div>

      {/* もっと見る */}
      {members.length > 5 && (
        <div className="text-center pt-2 border-t">
          <span className="text-xs text-muted-foreground">他 {members.length - 5} 名</span>
        </div>
      )}
    </div>
  );
}
