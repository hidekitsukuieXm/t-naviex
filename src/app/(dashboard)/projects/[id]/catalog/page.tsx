'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { CatalogCreateDialog } from '@/components/catalog/catalog-create-dialog';
import { CatalogEditDialog } from '@/components/catalog/catalog-edit-dialog';
import { CatalogViewDialog } from '@/components/catalog/catalog-view-dialog';
import { CatalogCard } from '@/components/catalog/catalog-card';
import {
  type CatalogItemWithTags,
  type CatalogItemType,
  type CatalogItemStatus,
  CATALOG_ITEM_TYPE_INFO,
  CATALOG_ITEM_STATUS_INFO,
  CATALOG_ITEM_TYPES,
  CATALOG_ITEM_STATUSES,
} from '@/types/catalog-item';
import {
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowLeft,
  FolderOpen,
  Copy,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

type ViewMode = 'card' | 'table';
type SortField = 'name' | 'createdAt' | 'updatedAt' | 'usageCount' | 'sortOrder';
type SortOrder = 'asc' | 'desc';

interface CatalogPageProps {
  params: Promise<{ id: string }>;
}

export default function CatalogPage({ params }: CatalogPageProps) {
  const { id: projectId } = use(params);
  const [items, setItems] = useState<CatalogItemWithTags[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Edit dialog state
  const [editingItem, setEditingItem] = useState<CatalogItemWithTags | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // View dialog state
  const [viewingItemId, setViewingItemId] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Delete confirmation state
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<CatalogItemWithTags | null>(null);

  // Duplicate state
  const [duplicatingItem, setDuplicatingItem] = useState<CatalogItemWithTags | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CatalogItemType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CatalogItemStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortField>('sortOrder');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('search', debouncedQuery);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/projects/${projectId}/catalog-items?${params}`);
      if (!response.ok) throw new Error('Failed to fetch catalog items');

      const data = await response.json();
      setItems(data.items);
    } catch (error) {
      console.error('Failed to fetch catalog items:', error);
      toast({
        title: 'エラー',
        description: 'カタログアイテムの取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    projectId,
    debouncedQuery,
    typeFilter,
    statusFilter,
    categoryFilter,
    sortBy,
    sortOrder,
    toast,
  ]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/catalog-items?categories=true`);
      if (!response.ok) throw new Error('Failed to fetch categories');

      const data = await response.json();
      setCategories(data.categories.map((c: { name: string }) => c.name));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, [projectId]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await fetchItems();
    };
    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, debouncedQuery, typeFilter, statusFilter, categoryFilter, sortBy, sortOrder]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await fetchCategories();
    };
    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirmItem) return;

    setDeletingId(deleteConfirmItem.id);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/catalog-items/${deleteConfirmItem.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete catalog item');

      toast({
        title: '削除完了',
        description: 'カタログアイテムを削除しました',
      });

      setDeleteConfirmItem(null);
      fetchItems();
      fetchCategories();
    } catch (_error) {
      toast({
        title: 'エラー',
        description: 'カタログアイテムの削除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Handle duplicate
  const handleDuplicate = async () => {
    if (!duplicatingItem || !duplicateName.trim()) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/catalog-items/${duplicatingItem.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'duplicate', name: duplicateName.trim() }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to duplicate catalog item');
      }

      toast({
        title: '複製完了',
        description: 'カタログアイテムを複製しました',
      });

      setDuplicatingItem(null);
      setDuplicateName('');
      fetchItems();
    } catch (error) {
      toast({
        title: 'エラー',
        description:
          error instanceof Error ? error.message : 'カタログアイテムの複製に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const hasActiveFilters =
    searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || categoryFilter !== 'all';

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    DEPRECATED: 'bg-yellow-100 text-yellow-800',
    ARCHIVED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1')}
            >
              <ArrowLeft className="size-4" />
              プロジェクト
            </Link>
          </div>
          <h1 className="text-2xl font-bold">テスト資産カタログ</h1>
          <p className="text-muted-foreground">再利用可能なテスト資産を管理します</p>
        </div>
        <CatalogCreateDialog
          projectId={projectId}
          categories={categories}
          onSuccess={() => {
            fetchItems();
            fetchCategories();
          }}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">フィルター</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as CatalogItemType | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="タイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのタイプ</SelectItem>
                {CATALOG_ITEM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {CATALOG_ITEM_TYPE_INFO[type].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as CatalogItemStatus | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                {CATALOG_ITEM_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {CATALOG_ITEM_STATUS_INFO[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="カテゴリ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのカテゴリ</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 size-4" />
                クリア
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{items.length} 件のアイテム</p>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-4 size-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">カタログアイテムがありません</h3>
            <p className="mb-4 text-muted-foreground">
              {hasActiveFilters
                ? '条件に一致するアイテムが見つかりません'
                : '新規作成ボタンからアイテムを追加してください'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <CatalogCard
              key={item.id}
              item={item}
              onEdit={(item) => {
                setEditingItem(item);
                setIsEditDialogOpen(true);
              }}
              onDelete={(item) => setDeleteConfirmItem(item)}
              onDuplicate={(item) => {
                setDuplicatingItem(item);
                setDuplicateName(`${item.name} (コピー)`);
              }}
              onView={(item) => {
                setViewingItemId(item.id);
                setIsViewDialogOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1">
                    名前
                    {sortBy === 'name' && <ArrowUpDown className="size-4" />}
                  </div>
                </TableHead>
                <TableHead>タイプ</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('usageCount')}>
                  <div className="flex items-center gap-1">
                    使用回数
                    {sortBy === 'usageCount' && <ArrowUpDown className="size-4" />}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('updatedAt')}>
                  <div className="flex items-center gap-1">
                    更新日時
                    {sortBy === 'updatedAt' && <ArrowUpDown className="size-4" />}
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{CATALOG_ITEM_TYPE_INFO[item.type].label}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[item.status]}>
                      {CATALOG_ITEM_STATUS_INFO[item.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.category || '-'}</TableCell>
                  <TableCell>{item.usageCount}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(item.updatedAt), {
                      addSuffix: true,
                      locale: ja,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewingItemId(item.id);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDuplicatingItem(item);
                          setDuplicateName(`${item.name} (コピー)`);
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmItem(item)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Edit Dialog */}
      <CatalogEditDialog
        projectId={projectId}
        item={editingItem}
        categories={categories}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          fetchItems();
          fetchCategories();
        }}
      />

      {/* View Dialog */}
      <CatalogViewDialog
        projectId={projectId}
        itemId={viewingItemId}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmItem} onOpenChange={() => setDeleteConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>カタログアイテムを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteConfirmItem?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Dialog */}
      <AlertDialog open={!!duplicatingItem} onOpenChange={() => setDuplicatingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>カタログアイテムを複製</AlertDialogTitle>
            <AlertDialogDescription>
              「{duplicatingItem?.name}」を複製します。新しい名前を入力してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            placeholder="新しい名前"
            className="mt-4"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicate} disabled={!duplicateName.trim()}>
              複製
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
