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
import { TemplateForm } from './template-form';
import type {
  TestCaseTemplate,
  TestCaseTemplateDetail,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@/types/template';
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  Copy,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// Types
// ============================================

interface TemplateManagementDialogProps {
  projectId: string;
  trigger?: React.ReactNode;
}

// ============================================
// Component
// ============================================

export function TemplateManagementDialog({ projectId, trigger }: TemplateManagementDialogProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<TestCaseTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TestCaseTemplateDetail | undefined>(
    undefined
  );
  const [deletingTemplate, setDeletingTemplate] = useState<TestCaseTemplate | null>(null);
  const [duplicatingTemplate, setDuplicatingTemplate] = useState<TestCaseTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  const prevOpenRef = useRef(open);

  // データ取得
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/templates`);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました。');
      }
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('テンプレート取得エラー:', error);
      toast.error('データの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // テンプレート詳細取得
  const fetchTemplateDetail = useCallback(
    async (templateId: string): Promise<TestCaseTemplateDetail | null> => {
      try {
        const response = await fetch(`/api/projects/${projectId}/templates/${templateId}`);
        if (!response.ok) {
          throw new Error('データの取得に失敗しました。');
        }
        return await response.json();
      } catch (error) {
        console.error('テンプレート詳細取得エラー:', error);
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
        void fetchTemplates();
      }
      prevOpenRef.current = newOpen;
      setOpen(newOpen);
    },
    [fetchTemplates]
  );

  // 作成・更新
  const handleSubmit = useCallback(
    async (data: CreateTemplateInput | UpdateTemplateInput) => {
      setIsSubmitting(true);
      try {
        const url = editingTemplate
          ? `/api/projects/${projectId}/templates/${editingTemplate.id}`
          : `/api/projects/${projectId}/templates`;

        const response = await fetch(url, {
          method: editingTemplate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '保存に失敗しました。');
        }

        toast.success(
          editingTemplate ? 'テンプレートを更新しました。' : 'テンプレートを作成しました。'
        );
        setShowForm(false);
        setEditingTemplate(undefined);
        await fetchTemplates();
      } catch (error) {
        console.error('テンプレート保存エラー:', error);
        toast.error(error instanceof Error ? error.message : '保存に失敗しました。');
      } finally {
        setIsSubmitting(false);
      }
    },
    [projectId, editingTemplate, fetchTemplates]
  );

  // 削除
  const handleDelete = useCallback(async () => {
    if (!deletingTemplate) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/templates/${deletingTemplate.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました。');
      }

      toast.success('テンプレートを削除しました。');
      setDeletingTemplate(null);
      await fetchTemplates();
    } catch (error) {
      console.error('テンプレート削除エラー:', error);
      toast.error(error instanceof Error ? error.message : '削除に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, deletingTemplate, fetchTemplates]);

  // 複製
  const handleDuplicate = useCallback(async () => {
    if (!duplicatingTemplate || !duplicateName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/templates/${duplicatingTemplate.id}/duplicate`,
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

      toast.success('テンプレートを複製しました。');
      setDuplicatingTemplate(null);
      setDuplicateName('');
      await fetchTemplates();
    } catch (error) {
      console.error('テンプレート複製エラー:', error);
      toast.error(error instanceof Error ? error.message : '複製に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, duplicatingTemplate, duplicateName, fetchTemplates]);

  // デフォルト設定
  const handleSetDefault = useCallback(
    async (templateId: string) => {
      setIsSubmitting(true);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/templates/${templateId}/set-default`,
          { method: 'POST' }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'デフォルト設定に失敗しました。');
        }

        toast.success('デフォルトテンプレートを設定しました。');
        await fetchTemplates();
      } catch (error) {
        console.error('デフォルト設定エラー:', error);
        toast.error(error instanceof Error ? error.message : 'デフォルト設定に失敗しました。');
      } finally {
        setIsSubmitting(false);
      }
    },
    [projectId, fetchTemplates]
  );

  // 編集開始
  const handleEdit = useCallback(
    async (template: TestCaseTemplate) => {
      const detail = await fetchTemplateDetail(template.id);
      if (detail) {
        setEditingTemplate(detail);
        setShowForm(true);
      }
    },
    [fetchTemplateDetail]
  );

  // 複製開始
  const handleStartDuplicate = useCallback((template: TestCaseTemplate) => {
    setDuplicatingTemplate(template);
    setDuplicateName(`${template.name} (コピー)`);
  }, []);

  // フォームキャンセル
  const handleCancel = useCallback(() => {
    setShowForm(false);
    setEditingTemplate(undefined);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            trigger || (
              <Button variant="outline" size="sm">
                <FileText className="mr-2 size-4" />
                テンプレート管理
              </Button>
            )
          }
        />
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>テストケーステンプレート管理</DialogTitle>
            <DialogDescription>
              テストケース作成時に適用するテンプレートを管理します。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {showForm ? (
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      {editingTemplate ? 'テンプレートを編集' : '新規テンプレートを作成'}
                    </h3>
                  </div>
                  <TemplateForm
                    template={editingTemplate}
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
                    onClick={() => void fetchTemplates()}
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
                ) : templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="mb-4 size-12" />
                    <p>テンプレートが登録されていません。</p>
                    <p className="text-sm mt-1">「新規作成」ボタンから追加してください。</p>
                  </div>
                ) : (
                  <div className="h-[400px] overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>テンプレート名</TableHead>
                          <TableHead className="w-[100px]">優先度</TableHead>
                          <TableHead className="w-[120px]">テストタイプ</TableHead>
                          <TableHead className="w-[80px]">並び順</TableHead>
                          <TableHead className="w-[100px]">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {template.name}
                                {template.isDefault && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Star className="mr-1 size-3" />
                                    デフォルト
                                  </Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {template.description}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {template.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{template.testType}</TableCell>
                            <TableCell className="text-center">{template.sortOrder}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => void handleEdit(template)}>
                                    <Pencil className="mr-2 size-4" />
                                    編集
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStartDuplicate(template)}>
                                    <Copy className="mr-2 size-4" />
                                    複製
                                  </DropdownMenuItem>
                                  {!template.isDefault && (
                                    <DropdownMenuItem
                                      onClick={() => void handleSetDefault(template.id)}
                                    >
                                      <Star className="mr-2 size-4" />
                                      デフォルトに設定
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeletingTemplate(template)}
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
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テンプレートを削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingTemplate?.name}」を削除しますか？この操作は取り消せません。
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
        open={!!duplicatingTemplate}
        onOpenChange={() => {
          setDuplicatingTemplate(null);
          setDuplicateName('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テンプレートを複製</AlertDialogTitle>
            <AlertDialogDescription>
              「{duplicatingTemplate?.name}」を複製します。新しいテンプレート名を入力してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicateName">テンプレート名</Label>
            <Input
              id="duplicateName"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="新しいテンプレート名"
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
    </>
  );
}
