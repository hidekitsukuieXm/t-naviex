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
import { TestSetCreateDialog } from '@/components/test-sets/test-set-create-dialog';
import { TestSetEditDialog } from '@/components/test-sets/test-set-edit-dialog';
import { TestSetViewDialog } from '@/components/test-sets/test-set-view-dialog';
import { TestSetCard } from '@/components/test-sets/test-set-card';
import {
  type TestSetWithTags,
  type TestSetStatus,
  TEST_SET_STATUS_INFO,
  TEST_SET_STATUSES,
} from '@/types/test-set';
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
type SortField = 'name' | 'createdAt' | 'updatedAt' | 'executionCount' | 'sortOrder';
type SortOrder = 'asc' | 'desc';

interface TestSetsPageProps {
  params: Promise<{ id: string }>;
}

export default function TestSetsPage({ params }: TestSetsPageProps) {
  const { id: projectId } = use(params);
  const [testSets, setTestSets] = useState<(TestSetWithTags & { testCaseCount?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Edit dialog state
  const [editingTestSet, setEditingTestSet] = useState<TestSetWithTags | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // View dialog state
  const [viewingTestSetId, setViewingTestSetId] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Delete confirmation state
  const [deleteConfirmTestSet, setDeleteConfirmTestSet] = useState<TestSetWithTags | null>(null);

  // Duplicate state
  const [duplicatingTestSet, setDuplicatingTestSet] = useState<TestSetWithTags | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestSetStatus | 'all'>('all');
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

  // Fetch test sets
  const fetchTestSets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('search', debouncedQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const response = await fetch(`/api/projects/${projectId}/test-sets?${params}`);
      if (!response.ok) throw new Error('Failed to fetch test sets');

      const data = await response.json();
      setTestSets(data.items);
    } catch (error) {
      console.error('Failed to fetch test sets:', error);
      toast({
        title: 'エラー',
        description: 'テストセットの取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, debouncedQuery, statusFilter, sortBy, sortOrder, toast]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (isMounted) await fetchTestSets();
    };
    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, debouncedQuery, statusFilter, sortBy, sortOrder]);

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirmTestSet) return;

    setDeletingId(deleteConfirmTestSet.id);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-sets/${deleteConfirmTestSet.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete test set');

      toast({
        title: '削除完了',
        description: 'テストセットを削除しました',
      });

      setDeleteConfirmTestSet(null);
      fetchTestSets();
    } catch (_error) {
      toast({
        title: 'エラー',
        description: 'テストセットの削除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Handle duplicate
  const handleDuplicate = async () => {
    if (!duplicatingTestSet || !duplicateName.trim()) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-sets/${duplicatingTestSet.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'duplicate', name: duplicateName.trim() }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to duplicate test set');
      }

      toast({
        title: '複製完了',
        description: 'テストセットを複製しました',
      });

      setDuplicatingTestSet(null);
      setDuplicateName('');
      fetchTestSets();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'テストセットの複製に失敗しました',
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
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all';

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
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
          <h1 className="text-2xl font-bold">テストセット管理</h1>
          <p className="text-muted-foreground">テストケースのグルーピングを管理します</p>
        </div>
        <TestSetCreateDialog projectId={projectId} onSuccess={() => fetchTestSets()} />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">フィルター</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as TestSetStatus | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                {TEST_SET_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {TEST_SET_STATUS_INFO[status].label}
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
            <p className="text-sm text-muted-foreground">{testSets.length} 件のテストセット</p>
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
      ) : testSets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-4 size-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">テストセットがありません</h3>
            <p className="mb-4 text-muted-foreground">
              {hasActiveFilters
                ? '条件に一致するテストセットが見つかりません'
                : '新規作成ボタンからテストセットを追加してください'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {testSets.map((testSet) => (
            <TestSetCard
              key={testSet.id}
              testSet={testSet}
              onEdit={(testSet) => {
                setEditingTestSet(testSet);
                setIsEditDialogOpen(true);
              }}
              onDelete={(testSet) => setDeleteConfirmTestSet(testSet)}
              onDuplicate={(testSet) => {
                setDuplicatingTestSet(testSet);
                setDuplicateName(`${testSet.name} (コピー)`);
              }}
              onView={(testSet) => {
                setViewingTestSetId(testSet.id);
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
                <TableHead>ステータス</TableHead>
                <TableHead>バージョン</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('executionCount')}>
                  <div className="flex items-center gap-1">
                    実行回数
                    {sortBy === 'executionCount' && <ArrowUpDown className="size-4" />}
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
              {testSets.map((testSet) => (
                <TableRow key={testSet.id}>
                  <TableCell className="font-medium">{testSet.name}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[testSet.status]}>
                      {TEST_SET_STATUS_INFO[testSet.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>v{testSet.version}</TableCell>
                  <TableCell>{testSet.executionCount}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(testSet.updatedAt), {
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
                          setViewingTestSetId(testSet.id);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTestSet(testSet);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDuplicatingTestSet(testSet);
                          setDuplicateName(`${testSet.name} (コピー)`);
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmTestSet(testSet)}
                        disabled={deletingId === testSet.id}
                      >
                        {deletingId === testSet.id ? (
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
      <TestSetEditDialog
        projectId={projectId}
        testSet={editingTestSet}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => fetchTestSets()}
      />

      {/* View Dialog */}
      <TestSetViewDialog
        projectId={projectId}
        testSetId={viewingTestSetId}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onTestCasesChange={() => fetchTestSets()}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmTestSet} onOpenChange={() => setDeleteConfirmTestSet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テストセットを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteConfirmTestSet?.name}」を削除します。この操作は取り消せません。
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
      <AlertDialog open={!!duplicatingTestSet} onOpenChange={() => setDuplicatingTestSet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テストセットを複製</AlertDialogTitle>
            <AlertDialogDescription>
              「{duplicatingTestSet?.name}」を複製します。新しい名前を入力してください。
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
