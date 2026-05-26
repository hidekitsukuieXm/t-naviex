'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';
import { RequirementTypeBadge } from '@/components/requirements/requirement-type-badge';
import { RequirementStatusBadge } from '@/components/requirements/requirement-status-badge';
import { RequirementPriorityBadge } from '@/components/requirements/requirement-priority-badge';
import { RequirementEditDialog } from '@/components/requirements/requirement-edit-dialog';
import {
  type RequirementSafe,
  type RequirementType,
  type RequirementStatus,
  type RequirementPriority,
} from '@/types/requirement';
import {
  ArrowLeft,
  Loader2,
  Trash2,
  FileText,
  Calendar,
  User,
  Link as LinkIcon,
  TestTube2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface RequirementDetailPageProps {
  params: Promise<{ id: string; requirementId: string }>;
}

export default function RequirementDetailPage({ params }: RequirementDetailPageProps) {
  const { id: projectId, requirementId } = use(params);
  const [requirement, setRequirement] = useState<RequirementSafe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const fetchRequirement = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/requirements/${requirementId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('要求仕様が見つかりません。');
          }
          throw new Error('要求仕様の取得に失敗しました。');
        }

        const data = await response.json();
        if (isMounted) {
          setRequirement(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchRequirement();

    return () => {
      isMounted = false;
    };
  }, [projectId, requirementId]);

  const refetchRequirement = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/requirements/${requirementId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('要求仕様が見つかりません。');
        }
        throw new Error('要求仕様の取得に失敗しました。');
      }

      const data = await response.json();
      setRequirement(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/requirements/${requirementId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました。');
      }

      toast({
        title: '削除完了',
        description: '要求仕様を削除しました。',
      });

      router.push(`/projects/${projectId}/requirements`);
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : '削除に失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !requirement) {
    return (
      <div className="space-y-6">
        <Link
          href={`/projects/${projectId}/requirements`}
          className={cn(buttonVariants({ variant: 'ghost' }))}
        >
          <ArrowLeft className="mr-2 size-4" />
          要求仕様一覧に戻る
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 size-16 text-muted-foreground" />
            <p className="text-lg text-destructive">{error || '要求仕様が見つかりません。'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}/requirements`}
          className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}
        >
          <ArrowLeft className="mr-2 size-4" />
          要求仕様一覧に戻る
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-lg text-muted-foreground">[{requirement.code}]</span>
              <RequirementTypeBadge type={requirement.type as RequirementType} />
              <RequirementStatusBadge status={requirement.status as RequirementStatus} />
              <RequirementPriorityBadge priority={requirement.priority as RequirementPriority} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{requirement.title}</h1>
            {requirement.description && (
              <p className="mt-2 text-muted-foreground">{requirement.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <RequirementEditDialog
              projectId={projectId}
              requirement={requirement}
              onSuccess={refetchRequirement}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="mr-2 size-4" />
              削除
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Content (Markdown) */}
          {requirement.content && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">詳細内容</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{requirement.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Acceptance Criteria */}
          {requirement.acceptance && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">受入基準</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{requirement.acceptance}</p>
              </CardContent>
            </Card>
          )}

          {/* Rationale */}
          {requirement.rationale && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">根拠・理由</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{requirement.rationale}</p>
              </CardContent>
            </Card>
          )}

          {/* Child Requirements */}
          {requirement.children && requirement.children.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">子要求仕様</CardTitle>
                <CardDescription>{requirement.children.length}件の子要求仕様</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {requirement.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/projects/${projectId}/requirements/${child.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          [{child.code}]
                        </span>
                        <span className="font-medium">{child.title}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <RequirementTypeBadge
                          type={child.type as RequirementType}
                          className="text-xs"
                        />
                        <RequirementStatusBadge
                          status={child.status as RequirementStatus}
                          className="text-xs"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Test Cases */}
          {requirement.testCases && requirement.testCases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">紐付けられたテストケース</CardTitle>
                <CardDescription>{requirement.testCases.length}件のテストケース</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {requirement.testCases.map((tc) => (
                    <div
                      key={tc.testCaseId}
                      className="flex items-center gap-2 p-3 rounded-lg border"
                    >
                      <TestTube2 className="size-4 text-muted-foreground" />
                      <span className="font-medium">{tc.title}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Parent Requirement */}
              {requirement.parent && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">親要求仕様</div>
                  <Link
                    href={`/projects/${projectId}/requirements/${requirement.parent.id}`}
                    className="flex items-center gap-1 text-sm hover:underline"
                  >
                    <LinkIcon className="size-3" />[{requirement.parent.code}]{' '}
                    {requirement.parent.title}
                  </Link>
                </div>
              )}

              {/* Version */}
              {requirement.version && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">バージョン</div>
                  <div className="text-sm">{requirement.version}</div>
                </div>
              )}

              {/* Source */}
              {requirement.source && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">出典</div>
                  <div className="text-sm">{requirement.source}</div>
                </div>
              )}

              <Separator />

              {/* Created */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">作成</div>
                <div className="flex items-center gap-1 text-sm">
                  <User className="size-3" />
                  {requirement.createdBy?.name || '不明'}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="size-3" />
                  {formatDate(requirement.createdAt)}
                </div>
              </div>

              {/* Updated */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">更新</div>
                <div className="flex items-center gap-1 text-sm">
                  <User className="size-3" />
                  {requirement.updatedBy?.name || requirement.createdBy?.name || '不明'}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="size-3" />
                  {formatDate(requirement.updatedAt)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>要求仕様を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              [{requirement.code}] {requirement.title}
              <br />
              この操作は取り消せません。子要求仕様がある場合は、先にそれらを削除してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
