'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DashboardGrid,
  DashboardSelector,
  DashboardCreateDialog,
  WidgetSelectorDialog,
  ShareDialog,
} from '@/components/dashboard';
import {
  ProgressSummaryWidget,
  ProgressChartWidget,
  SummaryPieChartWidget,
  BugSummaryWidget,
  BugChartWidget,
  BurndownChartWidget,
  TeamInfoWidget,
  MilestoneWidget,
  EnvironmentStatsWidget,
} from '@/components/dashboard/widgets';
import type { DashboardSafe, DashboardWidgetSafe } from '@/types/dashboard';
import type { WidgetType } from '@/generated/prisma';
import { ArrowLeft, Edit, Eye, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DashboardPageProps {
  params: Promise<{ id: string }>;
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const { id: projectId } = use(params);
  const [dashboards, setDashboards] = useState<DashboardSafe[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardSafe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const selectedDashboardRef = useRef<DashboardSafe | null>(null);

  // selectedDashboardの変更をrefに同期
  useEffect(() => {
    selectedDashboardRef.current = selectedDashboard;
  }, [selectedDashboard]);

  // ダッシュボード一覧取得
  useEffect(() => {
    let isMounted = true;

    const fetchDashboards = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/dashboards`);
        if (!response.ok) {
          throw new Error('ダッシュボードの取得に失敗しました');
        }
        const data = await response.json();

        if (!isMounted) return;

        setDashboards(data.dashboards || []);

        // 選択中のダッシュボードを更新
        const currentSelected = selectedDashboardRef.current;
        if (currentSelected) {
          const updated = data.dashboards.find((d: DashboardSafe) => d.id === currentSelected.id);
          setSelectedDashboard(updated || null);
        } else if (data.dashboards.length > 0) {
          // デフォルトまたは最初のダッシュボードを選択
          const defaultDashboard = data.dashboards.find((d: DashboardSafe) => d.isDefault);
          setSelectedDashboard(defaultDashboard || data.dashboards[0]);
        }
      } catch (error) {
        if (!isMounted) return;
        toast({
          title: 'エラー',
          description:
            error instanceof Error ? error.message : 'ダッシュボードの取得に失敗しました',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboards();

    return () => {
      isMounted = false;
    };
  }, [projectId, toast]);

  // 手動リフレッシュ用関数
  const refreshDashboards = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/dashboards`);
      if (!response.ok) {
        throw new Error('ダッシュボードの取得に失敗しました');
      }
      const data = await response.json();
      setDashboards(data.dashboards || []);

      const currentSelected = selectedDashboardRef.current;
      if (currentSelected) {
        const updated = data.dashboards.find((d: DashboardSafe) => d.id === currentSelected.id);
        setSelectedDashboard(updated || null);
      } else if (data.dashboards.length > 0) {
        const defaultDashboard = data.dashboards.find((d: DashboardSafe) => d.isDefault);
        setSelectedDashboard(defaultDashboard || data.dashboards[0]);
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ダッシュボードの取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ダッシュボード選択
  const handleSelectDashboard = (id: string) => {
    const dashboard = dashboards.find((d) => d.id === id);
    setSelectedDashboard(dashboard || null);
    setIsEditing(false);
  };

  // ウィジェット追加
  const handleAddWidget = async (widgetType: WidgetType, title?: string) => {
    if (!selectedDashboard) return;

    try {
      const response = await fetch(`/api/dashboards/${selectedDashboard.id}/widgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetType,
          title,
          x: 0,
          y: 0,
          width: 4,
          height: 3,
        }),
      });

      if (!response.ok) {
        throw new Error('ウィジェットの追加に失敗しました');
      }

      const data = await response.json();
      setSelectedDashboard(data.dashboard);
      setDashboards((prev) => prev.map((d) => (d.id === data.dashboard.id ? data.dashboard : d)));

      toast({
        title: '成功',
        description: 'ウィジェットを追加しました',
      });
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ウィジェットの追加に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // ウィジェット削除
  const handleRemoveWidget = async (widgetId: string) => {
    if (!selectedDashboard) return;

    try {
      const response = await fetch(`/api/dashboards/${selectedDashboard.id}/widgets/${widgetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('ウィジェットの削除に失敗しました');
      }

      const data = await response.json();
      setSelectedDashboard(data.dashboard);
      setDashboards((prev) => prev.map((d) => (d.id === data.dashboard.id ? data.dashboard : d)));

      toast({
        title: '成功',
        description: 'ウィジェットを削除しました',
      });
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ウィジェットの削除に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // ダッシュボード削除
  const handleDeleteDashboard = async () => {
    if (!selectedDashboard) return;

    try {
      const response = await fetch(`/api/dashboards/${selectedDashboard.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('ダッシュボードの削除に失敗しました');
      }

      toast({
        title: '成功',
        description: 'ダッシュボードを削除しました',
      });

      setSelectedDashboard(null);
      setDeleteDialogOpen(false);
      refreshDashboards();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ダッシュボードの削除に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // ウィジェット設定（将来実装）
  const handleWidgetSettings = (_widget: DashboardWidgetSafe) => {
    toast({
      title: '準備中',
      description: 'ウィジェット設定機能は準備中です',
    });
  };

  // レイアウト変更
  const handleLayoutChange = async (
    widgets: Array<{ id: string; x: number; y: number; width: number; height: number }>
  ) => {
    if (!selectedDashboard) return;

    try {
      const response = await fetch(`/api/dashboards/${selectedDashboard.id}/widgets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets }),
      });

      if (!response.ok) {
        throw new Error('レイアウトの保存に失敗しました');
      }

      const data = await response.json();
      setSelectedDashboard(data.dashboard);
      setDashboards((prev) => prev.map((d) => (d.id === data.dashboard.id ? data.dashboard : d)));
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'レイアウトの保存に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // 共有URL生成
  const handleShare = async () => {
    if (!selectedDashboard) return;

    const response = await fetch(`/api/dashboards/${selectedDashboard.id}/share`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('共有URLの生成に失敗しました');
    }

    const data = await response.json();
    setSelectedDashboard(data.dashboard);
    setDashboards((prev) => prev.map((d) => (d.id === data.dashboard.id ? data.dashboard : d)));
  };

  // 共有解除
  const handleRevoke = async () => {
    if (!selectedDashboard) return;

    const response = await fetch(`/api/dashboards/${selectedDashboard.id}/share`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('共有の解除に失敗しました');
    }

    const data = await response.json();
    setSelectedDashboard(data.dashboard);
    setDashboards((prev) => prev.map((d) => (d.id === data.dashboard.id ? data.dashboard : d)));
  };

  // ウィジェットレンダラー
  const renderWidget = (widget: DashboardWidgetSafe) => {
    switch (widget.widgetType) {
      case 'PROGRESS_SUMMARY':
        return <ProgressSummaryWidget widget={widget} projectId={projectId} />;
      case 'PROGRESS_CHART':
        return <ProgressChartWidget widget={widget} projectId={projectId} />;
      case 'BUG_SUMMARY':
        return <BugSummaryWidget widget={widget} projectId={projectId} />;
      case 'BUG_CHART':
        return <BugChartWidget widget={widget} projectId={projectId} />;
      case 'TEAM_INFO':
        return <TeamInfoWidget widget={widget} projectId={projectId} />;
      case 'MILESTONE':
        return <MilestoneWidget widget={widget} projectId={projectId} />;
      case 'COVERAGE_STATS':
        return <SummaryPieChartWidget widget={widget} projectId={projectId} />;
      case 'BURNDOWN_CHART':
        return <BurndownChartWidget widget={widget} projectId={projectId} />;
      case 'ENVIRONMENT_STATS':
        return <EnvironmentStatsWidget widget={widget} projectId={projectId} />;
      default:
        return null; // デフォルトのプレースホルダーを使用
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}>
          <ArrowLeft className="mr-2 size-4" />
          プロジェクト一覧に戻る
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
            <p className="text-muted-foreground">プロジェクトの状況を可視化します</p>
          </div>
          <DashboardCreateDialog projectId={projectId} onSuccess={refreshDashboards} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DashboardSelector
                dashboards={dashboards}
                selectedId={selectedDashboard?.id}
                onSelect={handleSelectDashboard}
                disabled={isLoading}
              />
              {selectedDashboard && (
                <CardDescription>
                  {selectedDashboard.description || 'ダッシュボードを選択してください'}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refreshDashboards} disabled={isLoading}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
              {selectedDashboard && (
                <>
                  <Button
                    variant={isEditing ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        プレビュー
                      </>
                    ) : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        編集
                      </>
                    )}
                  </Button>
                  {isEditing && (
                    <>
                      <WidgetSelectorDialog onSelect={handleAddWidget} />
                      <ShareDialog
                        dashboard={selectedDashboard}
                        onShare={handleShare}
                        onRevoke={handleRevoke}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dashboards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-lg">ダッシュボードがありません</p>
              <p className="text-sm">「新規ダッシュボード」から作成してください</p>
            </div>
          ) : selectedDashboard ? (
            <DashboardGrid
              dashboard={selectedDashboard}
              isEditing={isEditing}
              onRemoveWidget={handleRemoveWidget}
              onWidgetSettings={handleWidgetSettings}
              onLayoutChange={handleLayoutChange}
              renderWidget={renderWidget}
            />
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>ダッシュボードを選択してください</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ダッシュボードを削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{selectedDashboard?.name}」を削除しますか？ この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDashboard}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
