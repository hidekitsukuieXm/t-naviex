'use client';

import { useCallback, useEffect, useState, useTransition, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ConfigurationCreateDialog } from '@/components/configurations/configuration-create-dialog';
import { ConfigurationEditDialog } from '@/components/configurations/configuration-edit-dialog';
import { ConfigurationCard } from '@/components/configurations/configuration-card';
import { GeneratePatternsDialog } from '@/components/configurations/generate-patterns-dialog';
import { type Configuration } from '@/types/configuration';
import {
  Pencil,
  Trash2,
  Loader2,
  Settings,
  Search,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowLeft,
  Monitor,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'card' | 'table';
type SortField = 'name' | 'createdAt' | 'updatedAt' | 'sortOrder';
type SortOrder = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';

// Cache for configurations fetch
const configurationsCache = new Map<string, { data: Configuration[]; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

// Export for testing purposes
export function clearConfigurationsCache() {
  configurationsCache.clear();
}

function getCacheKey(
  projectId: string,
  query: string,
  isActive: string,
  sortBy: string,
  sortOrder: string
): string {
  return `${projectId}-${query}-${isActive}-${sortBy}-${sortOrder}`;
}

interface ConfigurationsPageProps {
  params: Promise<{ id: string }>;
}

export default function ConfigurationsPage({ params }: ConfigurationsPageProps) {
  const { id: projectId } = use(params);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  // Edit dialog state
  const [editingConfiguration, setEditingConfiguration] = useState<Configuration | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
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

  const fetchConfigurations = useCallback(async () => {
    const cacheKey = getCacheKey(projectId, debouncedQuery, activeFilter, sortBy, sortOrder);
    const cached = configurationsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      startTransition(() => {
        setConfigurations(cached.data);
        setIsLoading(false);
      });
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      if (debouncedQuery) {
        params.set('search', debouncedQuery);
      }

      if (activeFilter !== 'all') {
        params.set('isActive', activeFilter === 'active' ? 'true' : 'false');
      }

      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const url = `/api/projects/${projectId}/configurations${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('コンフィギュレーション一覧の取得に失敗しました。');
      }

      const data: Configuration[] = await response.json();

      configurationsCache.set(cacheKey, { data, timestamp: Date.now() });

      startTransition(() => {
        setConfigurations(data);
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
      });
    }
  }, [projectId, debouncedQuery, activeFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  const handleRefresh = () => {
    // Clear cache and refetch
    configurationsCache.clear();
    fetchConfigurations();
  };

  const handleEdit = (configuration: Configuration) => {
    setEditingConfiguration(configuration);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このコンフィギュレーションを削除してもよろしいですか？')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/projects/${projectId}/configurations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'コンフィギュレーションの削除に失敗しました。');
      }

      toast({
        title: '削除完了',
        description: 'コンフィギュレーションを削除しました。',
      });

      // Clear cache and refetch
      configurationsCache.clear();
      fetchConfigurations();
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
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
    setActiveFilter('all');
  };

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const hasFilters = searchQuery || activeFilter !== 'all';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}>
          <ArrowLeft className="mr-2 size-4" />
          プロジェクト一覧に戻る
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">テスト環境設定</h1>
            <p className="text-muted-foreground">
              テスト環境のコンフィギュレーションを管理します。
            </p>
          </div>
          <div className="flex gap-2">
            <GeneratePatternsDialog projectId={projectId} onSuccess={handleRefresh} />
            <ConfigurationCreateDialog projectId={projectId} onSuccess={handleRefresh} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>コンフィギュレーション</CardTitle>
              <CardDescription>
                登録されているテスト環境設定の一覧です。
                {configurations.length > 0 && `（全${configurations.length}件）`}
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
                placeholder="コンフィギュレーション名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={activeFilter}
                onValueChange={(value) => {
                  setActiveFilter(value as ActiveFilter);
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="状態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="active">有効</SelectItem>
                  <SelectItem value="inactive">無効</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  if (!value) return;
                  const [field, order] = value.split('-') as [SortField, SortOrder];
                  setSortBy(field);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger className="w-40">
                  <ArrowUpDown className="mr-2 size-4" />
                  <SelectValue placeholder="並び順" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sortOrder-asc">表示順（昇順）</SelectItem>
                  <SelectItem value="sortOrder-desc">表示順（降順）</SelectItem>
                  <SelectItem value="updatedAt-desc">更新日（新しい順）</SelectItem>
                  <SelectItem value="updatedAt-asc">更新日（古い順）</SelectItem>
                  <SelectItem value="createdAt-desc">作成日（新しい順）</SelectItem>
                  <SelectItem value="createdAt-asc">作成日（古い順）</SelectItem>
                  <SelectItem value="name-asc">名前（A-Z）</SelectItem>
                  <SelectItem value="name-desc">名前（Z-A）</SelectItem>
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
          ) : configurations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Settings className="mb-4 size-16" />
              {hasFilters ? (
                <>
                  <p className="text-lg">検索条件に一致するコンフィギュレーションがありません。</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    フィルターをクリア
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg">コンフィギュレーションがありません。</p>
                  <p className="text-sm">
                    「新規コンフィギュレーション」または「パターン生成」から作成してください。
                  </p>
                </>
              )}
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {configurations.map((configuration) => (
                <ConfigurationCard
                  key={configuration.id}
                  configuration={configuration}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeleting={deletingId === configuration.id}
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
                      コンフィギュレーション名
                      {sortBy === 'name' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead>環境情報</TableHead>
                  <TableHead>状態</TableHead>
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
                {configurations.map((configuration) => {
                  const { configParams } = configuration;

                  return (
                    <TableRow
                      key={configuration.id}
                      className={!configuration.isActive ? 'opacity-60' : undefined}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Settings className="size-4 text-muted-foreground" />
                          <span>{configuration.name}</span>
                        </div>
                        {configuration.description && (
                          <div className="max-w-xs truncate text-sm text-muted-foreground">
                            {configuration.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {(configParams.os || configParams.osVersion) && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Monitor className="size-3" />
                              {configParams.os}
                              {configParams.osVersion && ` ${configParams.osVersion}`}
                            </span>
                          )}
                          {(configParams.browser || configParams.browserVersion) && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Globe className="size-3" />
                              {configParams.browser}
                              {configParams.browserVersion && ` ${configParams.browserVersion}`}
                            </span>
                          )}
                          {!configParams.os && !configParams.browser && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={configuration.isActive ? 'default' : 'secondary'}>
                          {configuration.isActive ? '有効' : '無効'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(configuration.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(configuration)}
                          >
                            <Pencil className="mr-1 size-3" />
                            編集
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(configuration.id)}
                            disabled={deletingId === configuration.id}
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingId === configuration.id ? (
                              <Loader2 className="mr-1 size-3 animate-spin" />
                            ) : (
                              <Trash2 className="mr-1 size-3" />
                            )}
                            削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <ConfigurationEditDialog
        projectId={projectId}
        configuration={editingConfiguration}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
