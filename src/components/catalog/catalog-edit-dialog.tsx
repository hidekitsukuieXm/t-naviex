'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CatalogForm, type CatalogFormData } from './catalog-form';
import { type CatalogItemWithTags } from '@/types/catalog-item';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CatalogEditDialogProps {
  projectId: string;
  item: CatalogItemWithTags | null;
  categories: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CatalogEditDialog({
  projectId,
  item,
  categories,
  open,
  onOpenChange,
  onSuccess,
}: CatalogEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [detailItem, setDetailItem] = useState<CatalogItemWithTags | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  // Fetch full item details when dialog opens
  useEffect(() => {
    let isMounted = true;

    const fetchItemDetails = async () => {
      if (!open || !item) {
        if (isMounted) setDetailItem(null);
        return;
      }

      if (isMounted) setIsFetching(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/catalog-items/${item.id}`);
        const data = await res.json();
        if (isMounted) setDetailItem(data);
      } catch (err) {
        console.error('Failed to fetch catalog item:', err);
        if (isMounted) {
          toast({
            title: 'エラー',
            description: 'カタログアイテムの取得に失敗しました',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    fetchItemDetails();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, projectId]);

  const handleSubmit = async (data: CatalogFormData) => {
    if (!item) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/catalog-items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'カタログアイテムの更新に失敗しました');
      }

      toast({
        title: '更新完了',
        description: 'カタログアイテムを更新しました',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: 'エラー',
        description:
          error instanceof Error ? error.message : 'カタログアイテムの更新に失敗しました',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>カタログアイテムの編集</DialogTitle>
          <DialogDescription>{item?.name}</DialogDescription>
        </DialogHeader>
        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : detailItem ? (
          <CatalogForm
            initialData={{
              name: detailItem.name,
              description: detailItem.description || '',
              type: detailItem.type,
              status: detailItem.status,
              category: detailItem.category || '',
              content: detailItem.content,
              version: detailItem.version,
            }}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
            submitLabel="更新"
            categories={categories}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
