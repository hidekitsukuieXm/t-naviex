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
import { MasterItemForm } from './master-item-form';
import type {
  MasterItem,
  MasterType,
  CreateMasterItemInput,
  UpdateMasterItemInput,
} from '@/types/master';
import { MASTER_TYPE_LABELS } from '@/types/master';
import {
  Plus,
  Pencil,
  Trash2,
  Settings,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// Types
// ============================================

interface MasterManagementDialogProps {
  projectId: string;
  masterType: MasterType;
  trigger?: React.ReactNode;
}

// ============================================
// Component
// ============================================

export function MasterManagementDialog({
  projectId,
  masterType,
  trigger,
}: MasterManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | undefined>(undefined);
  const [deletingItem, setDeletingItem] = useState<MasterItem | null>(null);

  const label = MASTER_TYPE_LABELS[masterType];

  const prevOpenRef = useRef(open);

  // データ取得
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/masters/${masterType}?initialize=true`
      );
      if (!response.ok) {
        throw new Error('データの取得に失敗しました。');
      }
      const data = await response.json();
      setItems(data.items);
    } catch (error) {
      console.error('マスタ取得エラー:', error);
      toast.error('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, masterType]);

  // ダイアログ開閉の処理
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen && !prevOpenRef.current) {
        // ダイアログが開かれた時にデータを取得
        void fetchItems();
      }
      prevOpenRef.current = newOpen;
      setOpen(newOpen);
    },
    [fetchItems]
  );

  // 作成・更新
  const handleSubmit = useCallback(
    async (data: CreateMasterItemInput | UpdateMasterItemInput) => {
      setIsSubmitting(true);
      try {
        const url = editingItem
          ? `/api/projects/${projectId}/masters/${masterType}/${editingItem.id}`
          : `/api/projects/${projectId}/masters/${masterType}`;

        const response = await fetch(url, {
          method: editingItem ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '保存に失敗しました。');
        }

        toast.success(editingItem ? `${label}を更新しました。` : `${label}を作成しました。`);
        setShowForm(false);
        setEditingItem(undefined);
        await fetchItems();
      } catch (error) {
        console.error('マスタ保存エラー:', error);
        toast.error(error instanceof Error ? error.message : '保存に失敗しました。');
      } finally {
        setIsSubmitting(false);
      }
    },
    [projectId, masterType, editingItem, label, fetchItems]
  );

  // 削除
  const handleDelete = useCallback(async () => {
    if (!deletingItem) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/masters/${masterType}/${deletingItem.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました。');
      }

      toast.success(`${label}を削除しました。`);
      setDeletingItem(null);
      await fetchItems();
    } catch (error) {
      console.error('マスタ削除エラー:', error);
      toast.error(error instanceof Error ? error.message : '削除に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, masterType, deletingItem, label, fetchItems]);

  // 編集開始
  const handleEdit = useCallback((item: MasterItem) => {
    setEditingItem(item);
    setShowForm(true);
  }, []);

  // フォームキャンセル
  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingItem(undefined);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            trigger || (
              <Button variant="outline" size="sm">
                <Settings className="mr-2 size-4" />
                {label}設定
              </Button>
            )
          }
        />
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{label}マスタ管理</DialogTitle>
            <DialogDescription>プロジェクトで使用する{label}を管理します。</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {showForm ? (
              // フォーム表示
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {editingItem ? `${label}を編集` : `新規${label}を作成`}
                  </h3>
                </div>
                <MasterItemForm
                  item={editingItem}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isLoading={isSubmitting}
                />
              </div>
            ) : (
              // 一覧表示
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchItems()}
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
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Settings className="mb-4 size-12" />
                    <p>{label}が登録されていません。</p>
                    <p className="text-sm mt-1">「新規作成」ボタンから追加してください。</p>
                  </div>
                ) : (
                  <div className="h-[400px] overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">コード</TableHead>
                          <TableHead>名前</TableHead>
                          <TableHead className="w-[80px]">並び順</TableHead>
                          <TableHead className="w-[80px]">状態</TableHead>
                          <TableHead className="w-[100px]">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">{item.code}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {item.name}
                                {item.isDefault && (
                                  <Badge variant="secondary" className="text-xs">
                                    デフォルト
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{item.sortOrder}</TableCell>
                            <TableCell>
                              {item.isActive ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircle2 className="size-3" />
                                  有効
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <XCircle className="size-3" />
                                  無効
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingItem(item)}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
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
      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{label}を削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingItem?.name}」を削除しますか？この操作は取り消せません。
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
    </>
  );
}
