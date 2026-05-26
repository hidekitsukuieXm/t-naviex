'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BugStatusBadge } from '@/components/bugs/bug-status-badge';
import { BugPriorityBadge } from '@/components/bugs/bug-priority-badge';
import { BugSeverityBadge } from '@/components/bugs/bug-severity-badge';
import { BugTypeBadge } from '@/components/bugs/bug-type-badge';
import { BugEditDialog } from '@/components/bugs/bug-edit-dialog';
import { BugCommentSection } from '@/components/bugs/bug-comment-section';
import { BugAttachmentSection } from '@/components/bugs/bug-attachment-section';
import { BugHistorySection } from '@/components/bugs/bug-history-section';
import {
  type BugWithRelations,
  type BugStatus,
  type BugPriority,
  type BugSeverity,
  type BugType,
  BugStatusLabels,
  getNextStatuses,
} from '@/types/bug';
import {
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  Clock,
  Edit,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BugDetailPageProps {
  params: Promise<{ id: string; bugId: string }>;
}

export default function BugDetailPage({ params }: BugDetailPageProps) {
  const { id: projectId, bugId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [bug, setBug] = useState<BugWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadBug = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/bugs/${bugId}`);
        if (!isMounted) return;
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('バグが見つかりません。');
          }
          throw new Error('バグの取得に失敗しました。');
        }
        const data = await response.json();
        if (!isMounted) return;
        setBug(data);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBug();
    return () => {
      isMounted = false;
    };
  }, [projectId, bugId]);

  const fetchBug = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/bugs/${bugId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('バグが見つかりません。');
        }
        throw new Error('バグの取得に失敗しました。');
      }
      const data = await response.json();
      setBug(data);
    } catch {
      // エラーは無視（再読み込み時のエラーは静かに失敗）
    }
  }, [projectId, bugId]);

  const handleStatusChange = async (newStatus: BugStatus) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/bugs/${bugId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ステータスの更新に失敗しました。');
      }

      toast({
        title: 'ステータスを更新しました',
        description: `${BugStatusLabels[newStatus]}に変更しました。`,
      });

      fetchBug();
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('このバグを削除してもよろしいですか？')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/bugs/${bugId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'バグの削除に失敗しました。');
      }

      toast({
        title: '削除完了',
        description: 'バグを削除しました。',
      });

      router.push(`/projects/${projectId}/bugs`);
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateString: string | Date | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const isOverdue = () => {
    if (!bug?.dueDate) return false;
    if (['CLOSED', 'REJECTED', 'RESOLVED', 'VERIFIED'].includes(bug.status)) return false;
    return new Date(bug.dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="space-y-4">
        <Link
          href={`/projects/${projectId}/bugs`}
          className={cn(buttonVariants({ variant: 'ghost' }))}
        >
          <ArrowLeft className="mr-2 size-4" />
          バグ一覧に戻る
        </Link>
        <div className="py-12 text-center text-destructive">
          {error || 'バグが見つかりません。'}
        </div>
      </div>
    );
  }

  const nextStatuses = getNextStatuses(bug.status as BugStatus);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}/bugs`}
          className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}
        >
          <ArrowLeft className="mr-2 size-4" />
          バグ一覧に戻る
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-muted-foreground">#{bug.id.toString()}</span>
              <BugTypeBadge type={bug.type as BugType} />
              <BugStatusBadge status={bug.status as BugStatus} />
              <BugPriorityBadge priority={bug.priority as BugPriority} />
              <BugSeverityBadge severity={bug.severity as BugSeverity} />
              {isOverdue() && (
                <AlertTriangle className="size-5 text-destructive" title="期限超過" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{bug.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="mr-2 size-4" />
              編集
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              削除
            </Button>
          </div>
        </div>
      </div>

      {/* Status Change Buttons */}
      {nextStatuses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">ステータス変更</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(status)}
                >
                  {BugStatusLabels[status]}に変更
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>詳細情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bug.description && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">説明</h4>
                  <p className="whitespace-pre-wrap">{bug.description}</p>
                </div>
              )}

              {bug.stepsToReproduce && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">再現手順</h4>
                  <p className="whitespace-pre-wrap">{bug.stepsToReproduce}</p>
                </div>
              )}

              {(bug.expectedResult || bug.actualResult) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {bug.expectedResult && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">期待結果</h4>
                      <p className="whitespace-pre-wrap">{bug.expectedResult}</p>
                    </div>
                  )}
                  {bug.actualResult && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">実際の結果</h4>
                      <p className="whitespace-pre-wrap">{bug.actualResult}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="comments">
            <TabsList>
              <TabsTrigger value="comments">コメント</TabsTrigger>
              <TabsTrigger value="attachments">添付ファイル</TabsTrigger>
              <TabsTrigger value="history">変更履歴</TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="mt-4">
              <BugCommentSection projectId={projectId} bugId={bugId} />
            </TabsContent>
            <TabsContent value="attachments" className="mt-4">
              <BugAttachmentSection projectId={projectId} bugId={bugId} />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <BugHistorySection projectId={projectId} bugId={bugId} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">担当者・報告者</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">担当者</span>
                  <p className="font-medium">{bug.assignee?.name || '未割当'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">報告者</span>
                  <p className="font-medium">{bug.reporter?.name || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">日付</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">期限</span>
                  <p className={cn('font-medium', isOverdue() && 'text-destructive')}>
                    {formatDateOnly(bug.dueDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">作成日時</span>
                  <p className="font-medium">{formatDate(bug.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">更新日時</span>
                  <p className="font-medium">{formatDate(bug.updatedAt)}</p>
                </div>
              </div>
              {bug.resolvedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">解決日時</span>
                    <p className="font-medium">{formatDate(bug.resolvedAt)}</p>
                  </div>
                </div>
              )}
              {bug.closedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">クローズ日時</span>
                    <p className="font-medium">{formatDate(bug.closedAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {(bug.environment || bug.version || bug.fixedVersion) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">環境・バージョン</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {bug.environment && (
                  <div>
                    <span className="text-muted-foreground">環境: </span>
                    <span>{bug.environment}</span>
                  </div>
                )}
                {bug.version && (
                  <div>
                    <span className="text-muted-foreground">バージョン: </span>
                    <span>{bug.version}</span>
                  </div>
                )}
                {bug.fixedVersion && (
                  <div>
                    <span className="text-muted-foreground">修正バージョン: </span>
                    <span>{bug.fixedVersion}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {bug.testResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">関連テスト結果</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`#`} className="text-sm text-primary hover:underline">
                  テスト結果 #{bug.testResult.id}
                </Link>
              </CardContent>
            </Card>
          )}

          {bug.externalUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">外部連携</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={bug.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {bug.externalId || '外部システムで表示'}
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <BugEditDialog
        projectId={projectId}
        bug={bug}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={fetchBug}
      />
    </div>
  );
}
