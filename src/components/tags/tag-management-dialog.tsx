'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { TagBadge } from './tag-badge';
import { TAG_PRESET_COLORS, TAG_VALIDATION } from '@/types/tag';
import type { TagWithCount } from '@/types/tag';
import { cn } from '@/lib/utils';

interface TagManagementDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TagFormData {
  name: string;
  color: string;
  description: string;
}

const DEFAULT_FORM_DATA: TagFormData = {
  name: '',
  color: TAG_PRESET_COLORS[0].value,
  description: '',
};

export function TagManagementDialog({ projectId, open, onOpenChange }: TagManagementDialogProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTag, setEditingTag] = useState<TagWithCount | null>(null);
  const [formData, setFormData] = useState<TagFormData>(DEFAULT_FORM_DATA);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<TagWithCount | null>(null);
  const hasFetchedRef = useRef(false);
  const prevOpenRef = useRef(false);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tags`);
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags);
      hasFetchedRef.current = true;
    } catch (error) {
      toast.error('タグの取得に失敗しました。');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Fetch tags when dialog opens (detect prop change from false to true)
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (open && !wasOpen && !hasFetchedRef.current) {
      void fetchTags();
    }
  }, [open, fetchTags]);

  // Handle open state change
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen);
      if (newOpen && !hasFetchedRef.current) {
        void fetchTags();
      } else if (!newOpen) {
        // Reset for next open (with a small delay to avoid UI issues)
        setTimeout(() => {
          hasFetchedRef.current = false;
          setShowForm(false);
          setEditingTag(null);
          setFormData(DEFAULT_FORM_DATA);
        }, 0);
      }
    },
    [onOpenChange, fetchTags]
  );

  // Handle form submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        if (editingTag) {
          // Update existing tag
          const response = await fetch(`/api/projects/${projectId}/tags/${editingTag.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '更新に失敗しました。');
          }

          toast.success('タグを更新しました。');
        } else {
          // Create new tag
          const response = await fetch(`/api/projects/${projectId}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || '作成に失敗しました。');
          }

          toast.success('タグを作成しました。');
        }

        setFormData(DEFAULT_FORM_DATA);
        setEditingTag(null);
        setShowForm(false);
        await fetchTags();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'エラーが発生しました。');
      } finally {
        setIsSubmitting(false);
      }
    },
    [projectId, editingTag, formData, fetchTags]
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deleteConfirmTag) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tags/${deleteConfirmTag.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '削除に失敗しました。');
      }

      toast.success('タグを削除しました。');
      setDeleteConfirmTag(null);
      await fetchTags();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'エラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [projectId, deleteConfirmTag, fetchTags]);

  // Start editing
  const startEdit = useCallback((tag: TagWithCount) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      description: tag.description || '',
    });
    setShowForm(true);
  }, []);

  // Cancel form
  const cancelForm = useCallback(() => {
    setShowForm(false);
    setEditingTag(null);
    setFormData(DEFAULT_FORM_DATA);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>タグ管理</DialogTitle>
            <DialogDescription>
              プロジェクトのタグを管理します。タグはテストケースの分類に使用できます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tag list */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {!showForm && (
                  <Button onClick={() => setShowForm(true)} className="w-full">
                    <Plus className="mr-2 size-4" />
                    新しいタグを作成
                  </Button>
                )}

                {showForm && (
                  <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">タグ名</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="タグ名"
                        maxLength={TAG_VALIDATION.NAME_MAX_LENGTH}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">カラー</label>
                      <div className="flex flex-wrap gap-2">
                        {TAG_PRESET_COLORS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            className={cn(
                              'size-8 rounded-full border-2 transition-all',
                              formData.color === preset.value
                                ? 'border-foreground scale-110'
                                : 'border-transparent hover:border-muted-foreground'
                            )}
                            style={{ backgroundColor: preset.value }}
                            onClick={() => setFormData({ ...formData, color: preset.value })}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">説明（任意）</label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="タグの説明"
                        maxLength={TAG_VALIDATION.DESCRIPTION_MAX_LENGTH}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">プレビュー</label>
                      <div>
                        <TagBadge name={formData.name || 'タグ名'} color={formData.color} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelForm}
                        disabled={isSubmitting}
                      >
                        キャンセル
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                        {editingTag ? '更新' : '作成'}
                      </Button>
                    </div>
                  </form>
                )}

                {(tags?.length ?? 0) === 0 && !showForm ? (
                  <div className="py-8 text-center text-muted-foreground">タグがありません。</div>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {tags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <TagBadge name={tag.name} color={tag.color} />
                          <span className="text-xs text-muted-foreground">
                            {tag.usageCount}件のテストケースで使用
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEdit(tag)}
                            className="size-8"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmTag(tag)}
                            className="size-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmTag} onOpenChange={(open) => !open && setDeleteConfirmTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タグの削除</DialogTitle>
            <DialogDescription>
              「{deleteConfirmTag?.name}
              」を削除しますか？このタグが付いているすべてのテストケースからタグが削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmTag(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
