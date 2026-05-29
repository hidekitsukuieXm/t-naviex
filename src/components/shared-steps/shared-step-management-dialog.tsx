'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SharedStepForm } from './shared-step-form';
import type {
  SharedStep,
  SharedStepDetail,
  CreateSharedStepInput,
  UpdateSharedStepInput,
} from '@/types/shared-step';
import {
  Plus,
  Pencil,
  Trash2,
  Share2,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  Copy,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// Types
// ============================================

interface SharedStepManagementDialogProps {
  projectId: string;
  trigger?: React.ReactNode;
}

// ============================================
// Component
// ============================================

export function SharedStepManagementDialog({
  projectId,
  trigger,
}: SharedStepManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStep, setEditingStep] = useState<SharedStepDetail | undefined>(undefined);
  const [deletingStep, setDeletingStep] = useState<SharedStep | null>(null);
  const [duplicatingStep, setDuplicatingStep] = useState<SharedStep | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [viewingStep, setViewingStep] = useState<SharedStepDetail | null>(null);

  const prevOpenRef = useRef(open);

  // データ取得
  const fetchSharedSteps = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/shared-steps`);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました。');
      }
      const data = await response.json();
      setSharedSteps(data.sharedSteps);
    } catch (error) {
      console.error('共有手順取得エラー:', error);
      toast.error('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 共有手順詳細取得
  const fetchStepDetail = useCallback(
    async (stepId: string): Promise<SharedStepDetail | null> => {
      try {
        const response = await fetch(`/api/projects/${projectId}/shared-steps/${stepId}`);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました。');
        }
        return await response.json();
      } catch (error) {
        console.error('共有手順詳細取得エラー:', error);
        toast.error('データの取得に失敗しました。');
        return null;
      }
    },
    [projectId]
  );

  // ダイアログ開閉の処理
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen && !prevOpenRef.current) {
        void fetchSharedSteps();
      }
      prevOpenRef.current = newOpen;
      setOpen(newOpen);
    },
    [fetchSharedSteps]
  );

  // 作成・更新
  const handleSubmit = useCallback(
    async (data: CreateSharedStepInput | UpdateSharedStepInput) => {
      setIsSubmitting(true);
      try {
        const url = editingStep
          ? `/api/projects/${projectId}/shared-steps/${editingStep.id}`
          : `/api/projects/${projectId}/shared-steps`;

        const response = await fetch(url, {
          method: editingStep ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '保存に失敗しました。');
        }

        toast.success(editingStep ? '共有手順を更新しました。' : '共有手順を作成しました。');
        setShowForm(false);
        setEditingStep(undefined);
        await fetchSharedSteps();
      } catch (error) {
        console.error('共有手順保存エラー:', error);
        toast.error(error instanceof Error ? error.message : '保存に失敗しました。');
      } finally {
        setIsSubmitting(false);
      }
    },
    [projectId, editingStep, fetchSharedSteps]
  );

  // 削除
  const handleDelete = useCallback(async () => {
    if (!deletingStep) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/shared-steps/${deletingStep.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました。');
      }

      toast.success('共有手順を削除しました。');
      setDeletingStep(null);
      await fetchSharedSteps();
    } catch (error) {
      console.error('共有手順削除エラー:', error);
      toast.error(error instanceof Error ? error.message : '削除に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, deletingStep, fetchSharedSteps]);

  // 複製
  const handleDuplicate = useCallback(async () => {
    if (!duplicatingStep || !duplicateName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/shared-steps/${duplicatingStep.id}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: duplicateName.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '複製に失敗しました。');
      }

      toast.success('共有手順を複製しました。');
      setDuplicatingStep(null);
      setDuplicateName('');
      await fetchSharedSteps();
    } catch (error) {
      console.error('共有手順複製エラー:', error);
      toast.error(error instanceof Error ? error.message : '複製に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, duplicatingStep, duplicateName, fetchSharedSteps]);

  // 編集開始
  const handleEdit = useCallback(
    async (step: SharedStep) => {
      const detail = await fetchStepDetail(step.id);
      if (detail) {
        setEditingStep(detail);
        setShowForm(true);
      }
    },
    [fetchStepDetail]
  );

  // プレビュー
  const handleView = useCallback(
    async (step: SharedStep) => {
      const detail = await fetchStepDetail(step.id);
      if (detail) {
        setViewingStep(detail);
      }
    },
    [fetchStepDetail]
  );

  // 複製開始
  const handleStartDuplicate = useCallback((step: SharedStep) => {
    setDuplicatingStep(step);
    setDuplicateName(`${step.name} (コピー)`);
  }, []);

  // フォームキャンセル
  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingStep(undefined);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            trigger || (
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 size-4" />
                共有手順管理
              </Button>
            )
          }
        />
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>共有テスト手順管理</DialogTitle>
            <DialogDescription>
              テストケース間で再利用可能な共有手順を管理します。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {showForm ? (
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      {editingStep ? '共有手順を編集' : '新規共有手順を作成'}
                    </h3>
                  </div>
                  <SharedStepForm
                    sharedStep={editingStep}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isLoading={isSubmitting}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchSharedSteps()}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`mr-2 size-4 ${isLoading ? 'animate-spin' : ''}`} />
                    更新
                  </Button>
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <Plus className="mr-2 size-4" />
                    新規作成
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  </div>
                ) : sharedSteps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Share2 className="mb-4 size-12" />
                    <p>共有手順が登録されていません。</p>
                    <p className="text-sm mt-1">「新規作成」ボタンから追加してください。</p>
                  </div>
                ) : (
                  <div className="h-[400px] overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>共有手順名</TableHead>
                          <TableHead className="w-[200px]">説明</TableHead>
                          <TableHead className="w-[80px]">並び順</TableHead>
                          <TableHead className="w-[100px]">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sharedSteps.map((step) => (
                          <TableRow key={step.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Share2 className="size-4 text-muted-foreground" />
                                {step.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {step.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {step.description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{step.sortOrder}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => void handleView(step)}>
                                    <Eye className="mr-2 size-4" />
                                    プレビュー
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void handleEdit(step)}>
                                    <Pencil className="mr-2 size-4" />
                                    編集
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStartDuplicate(step)}>
                                    <Copy className="mr-2 size-4" />
                                    複製
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeletingStep(step)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    削除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deletingStep} onOpenChange={() => setDeletingStep(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>共有手順を削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingStep?.name}
              」を削除しますか？この共有手順を参照しているテストステップでは参照が解除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 複製ダイアログ */}
      <AlertDialog
        open={!!duplicatingStep}
        onOpenChange={() => {
          setDuplicatingStep(null);
          setDuplicateName('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>共有手順を複製</AlertDialogTitle>
            <AlertDialogDescription>
              「{duplicatingStep?.name}」を複製します。新しい共有手順名を入力してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicateName">共有手順名</Label>
            <Input
              id="duplicateName"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="新しい共有手順名"
              className="mt-2"
              disabled={isSubmitting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDuplicate()}
              disabled={isSubmitting || !duplicateName.trim()}
            >
              {isSubmitting ? '複製中...' : '複製'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* プレビューダイアログ */}
      <Dialog open={!!viewingStep} onOpenChange={() => setViewingStep(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingStep?.name}</DialogTitle>
            {viewingStep?.description && (
              <DialogDescription>{viewingStep.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">使用回数: {viewingStep?.usageCount ?? 0}</Badge>
            </div>
            <div className="border rounded-lg p-4 bg-muted/50">
              <pre className="whitespace-pre-wrap text-sm font-mono">{viewingStep?.contentMd}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
