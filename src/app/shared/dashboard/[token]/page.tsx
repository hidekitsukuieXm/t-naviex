'use client';

import { useEffect, useState, use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { DashboardSafe, DashboardWidgetSafe } from '@/types/dashboard';
import { DashboardGrid } from '@/components/dashboard';
import {
  ProgressSummaryWidget,
  ProgressChartWidget,
  SummaryPieChartWidget,
  BugSummaryWidget,
  TeamInfoWidget,
  MilestoneWidget,
} from '@/components/dashboard/widgets';

interface SharedDashboardPageProps {
  params: Promise<{ token: string }>;
}

export default function SharedDashboardPage({ params }: SharedDashboardPageProps) {
  const { token } = use(params);
  const [dashboard, setDashboard] = useState<DashboardSafe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboard = async () => {
      try {
        const response = await fetch(`/api/dashboards/shared/${token}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'ダッシュボードの取得に失敗しました');
        }

        const data = await response.json();
        if (isMounted) {
          setDashboard(data.dashboard);
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

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // ウィジェットレンダラー（認証不要のため projectId は null を渡す）
  const renderWidget = (widget: DashboardWidgetSafe) => {
    const projectId = dashboard?.projectId || '';
    switch (widget.widgetType) {
      case 'PROGRESS_SUMMARY':
        return <ProgressSummaryWidget widget={widget} projectId={projectId} />;
      case 'PROGRESS_CHART':
        return <ProgressChartWidget widget={widget} projectId={projectId} />;
      case 'BUG_SUMMARY':
        return <BugSummaryWidget widget={widget} projectId={projectId} />;
      case 'TEAM_INFO':
        return <TeamInfoWidget widget={widget} projectId={projectId} />;
      case 'MILESTONE':
        return <MilestoneWidget widget={widget} projectId={projectId} />;
      case 'COVERAGE_STATS':
        return <SummaryPieChartWidget widget={widget} projectId={projectId} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">エラー</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>ダッシュボードが見つかりません</CardTitle>
            <CardDescription>共有リンクが無効か、期限切れの可能性があります。</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{dashboard.name}</CardTitle>
                {dashboard.description && (
                  <CardDescription>{dashboard.description}</CardDescription>
                )}
              </div>
              <div className="text-xs text-muted-foreground">共有ダッシュボード</div>
            </div>
          </CardHeader>
          <CardContent>
            <DashboardGrid dashboard={dashboard} isEditing={false} renderWidget={renderWidget} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
