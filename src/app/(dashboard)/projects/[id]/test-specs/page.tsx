'use client';

import { useCallback, useEffect, useState, useTransition, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { TestSpecCreateDialog } from '@/components/test-specs/test-spec-create-dialog';
import { TestSpecCard } from '@/components/test-specs/test-spec-card';
import { TestSpecStatusBadge } from '@/components/test-specs/test-spec-status-badge';
import {
  type TestSpec,
  type TestSpecStatus,
  type TestSpecListResponse,
  TEST_SPEC_STATUS_LABELS,
} from '@/types/test-spec';
import {
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Search,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'card' | 'table';
type SortField = 'name' | 'createdAt' | 'updatedAt' | 'status' | 'version';
type SortOrder = 'asc' | 'desc';

// Cache for test specs fetch
const testSpecsCache = new Map<string, { data: TestSpecListResponse; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

// Export for testing purposes
export function clearTestSpecsCache() {
  testSpecsCache.clear();
}

function getCacheKey(
  projectId: string,
  query: string,
  status: string,
  sortBy: string,
  sortOrder: string,
  page: number
): string {
  return `${projectId}-${query}-${status}-${sortBy}-${sortOrder}-${page}`;
}

interface TestSpecsPageProps {
  params: Promise<{ id: string }>;
}

export default function TestSpecsPage({ params }: TestSpecsPageProps) {
  const { id: projectId } = use(params);
  const [testSpecs, setTestSpecs] = useState<TestSpec[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestSpecStatus | 'all'>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTestSpecs = useCallback(async () => {
    const cacheKey = getCacheKey(
      projectId,
      debouncedQuery,
      statusFilter,
      sortBy,
      sortOrder,
      currentPage
    );
    const cached = testSpecsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      startTransition(() => {
        setTestSpecs(cached.data.testSpecs);
        setTotalPages(cached.data.totalPages);
        setTotal(cached.data.total);
        setIsLoading(false);
      });
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('projectId', projectId);
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      if (debouncedQuery) {
        params.set('query', debouncedQuery);
      }

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await fetch(`/api/test-specs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('テスト仕様書一覧の取得に失敗しました。');
      }

      const data: TestSpecListResponse = await response.json();
      testSpecsCache.set(cacheKey, { data, timestamp: Date.now() });

      startTransition(() => {
        setTestSpecs(data.testSpecs);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
      });
    }
  }, [projectId, debouncedQuery, statusFilter, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    fetchTestSpecs();
  }, [fetchTestSpecs]);

  const handleRefresh = () => {
    // Clear cache and refetch
    testSpecsCache.clear();
    fetchTestSpecs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このテスト仕様書を削除してもよろしいですか？')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/test-specs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テスト仕様書の削除に失敗しました。');
      }

      // Clear cache and refetch
      testSpecsCache.clear();
      fetchTestSpecs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const hasFilters = searchQuery || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}>
          <ArrowLeft className="mr-2 size-4" />
          プロジェクト一覧に戻る
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">テスト仕様書一覧</h1>
            <p className="text-muted-foreground">テスト仕様書の管理・作成ができます。</p>
          </div>
          <TestSpecCreateDialog projectId={projectId} onSuccess={handleRefresh} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>テスト仕様書</CardTitle>
              <CardDescription>
                登録されているテスト仕様書の一覧です。{total > 0 && `（全${total}件）`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('card')}
                aria-label="カード表示"
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                aria-label="テーブル表示"
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search, Filter, and Sort */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="テスト仕様書名または説明で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as TestSpecStatus | 'all');
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {(Object.entries(TEST_SPEC_STATUS_LABELS) as [TestSpecStatus, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split('-') as [SortField, SortOrder];
                  setSortBy(field);
                  setSortOrder(order);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-40">
                  <ArrowUpDown className="mr-2 size-4" />
                  <SelectValue placeholder="並び順" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt-desc">更新日（新しい順）</SelectItem>
                  <SelectItem value="updatedAt-asc">更新日（古い順）</SelectItem>
                  <SelectItem value="createdAt-desc">作成日（新しい順）</SelectItem>
                  <SelectItem value="createdAt-asc">作成日（古い順）</SelectItem>
                  <SelectItem value="name-asc">名前（A-Z）</SelectItem>
                  <SelectItem value="name-desc">名前（Z-A）</SelectItem>
                  <SelectItem value="version-desc">バージョン（降順）</SelectItem>
                  <SelectItem value="version-asc">バージョン（昇順）</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 size-4" />
                  クリア
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">{error}</div>
          ) : testSpecs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="mb-4 size-16" />
              {hasFilters ? (
                <>
                  <p className="text-lg">検索条件に一致するテスト仕様書がありません。</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    フィルターをクリア
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg">テスト仕様書がありません。</p>
                  <p className="text-sm">「新規テスト仕様書」ボタンから作成してください。</p>
                </>
              )}
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {testSpecs.map((testSpec) => (
                <TestSpecCard
                  key={testSpec.id}
                  testSpec={testSpec}
                  projectId={projectId}
                  onDelete={handleDelete}
                  isDeleting={deletingId === testSpec.id}
                />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('name')}
                  >
                    <div className="flex items-center gap-1">
                      テスト仕様書名
                      {sortBy === 'name' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('status')}
                  >
                    <div className="flex items-center gap-1">
                      ステータス
                      {sortBy === 'status' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('version')}
                  >
                    <div className="flex items-center gap-1">
                      バージョン
                      {sortBy === 'version' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead>ロック</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('createdAt')}
                  >
                    <div className="flex items-center gap-1">
                      作成日
                      {sortBy === 'createdAt' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testSpecs.map((testSpec) => (
                  <TableRow key={testSpec.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>
                          <Link
                            href={`/projects/${projectId}/test-specs/${testSpec.id}`}
                            className="hover:underline"
                          >
                            {testSpec.name}
                          </Link>
                        </div>
                        {testSpec.description && (
                          <div className="max-w-xs truncate text-sm text-muted-foreground">
                            {testSpec.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TestSpecStatusBadge status={testSpec.status} />
                    </TableCell>
                    <TableCell>v{testSpec.version}</TableCell>
                    <TableCell>
                      {testSpec.isLocked && <Lock className="size-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell>{formatDate(testSpec.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/projects/${projectId}/test-specs/${testSpec.id}/edit`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          <Pencil className="mr-1 size-3" />
                          編集
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(testSpec.id)}
                          disabled={deletingId === testSpec.id || testSpec.isLocked}
                          className="text-destructive hover:text-destructive"
                        >
                          {deletingId === testSpec.id ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          ) : (
                            <Trash2 className="mr-1 size-3" />
                          )}
                          削除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {total}件中 {(currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, total)}
                件を表示
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  前へ
                </Button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
