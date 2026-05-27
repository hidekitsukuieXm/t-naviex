'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  type CatalogItemDetail,
  CATALOG_ITEM_TYPE_INFO,
  CATALOG_ITEM_STATUS_INFO,
} from '@/types/catalog-item';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Calendar, Hash, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface CatalogViewDialogProps {
  projectId: string;
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CatalogViewDialog({
  projectId,
  itemId,
  open,
  onOpenChange,
}: CatalogViewDialogProps) {
  const [item, setItem] = useState<CatalogItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const fetchItemDetails = async () => {
      if (!open || !itemId) {
        if (isMounted) setItem(null);
        return;
      }

      if (isMounted) setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/catalog-items/${itemId}`);
        const data = await res.json();
        if (isMounted) setItem(data);
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
        if (isMounted) setIsLoading(false);
      }
    };

    fetchItemDetails();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId, projectId]);

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    DEPRECATED: 'bg-yellow-100 text-yellow-800',
    ARCHIVED: 'bg-red-100 text-red-800',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : item ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{item.name}</DialogTitle>
                <Badge className={statusColors[item.status]}>
                  {CATALOG_ITEM_STATUS_INFO[item.status].label}
                </Badge>
              </div>
              <DialogDescription>
                {CATALOG_ITEM_TYPE_INFO[item.type].label}
                {item.category && ` / ${item.category}`}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="content" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">内容</TabsTrigger>
                <TabsTrigger value="details">詳細情報</TabsTrigger>
                <TabsTrigger value="usage">使用状況</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                {item.description && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">説明</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                )}
                <div>
                  <h4 className="mb-2 text-sm font-medium">内容</h4>
                  <div className="rounded-md border bg-muted/50 p-4">
                    <pre className="whitespace-pre-wrap text-sm">{item.content}</pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="size-4" />
                      <span>バージョン</span>
                    </div>
                    <p className="font-medium">{item.version}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="size-4" />
                      <span>カテゴリ</span>
                    </div>
                    <p className="font-medium">{item.category || '-'}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="size-4" />
                      <span>作成者</span>
                    </div>
                    <p className="font-medium">{item.createdBy?.name || '-'}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="size-4" />
                      <span>更新者</span>
                    </div>
                    <p className="font-medium">{item.updatedBy?.name || '-'}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>作成日時</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(item.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>更新日時</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(item.updatedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </p>
                  </div>
                </div>

                {item.tags.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">タグ</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="usage" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">使用回数</p>
                    <p className="text-2xl font-bold">{item.usageCount}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">最終使用日時</p>
                    <p className="text-lg font-medium">
                      {item.lastUsedAt
                        ? format(new Date(item.lastUsedAt), 'yyyy/MM/dd HH:mm', { locale: ja })
                        : '-'}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            カタログアイテムが見つかりません
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
