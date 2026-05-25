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
import { Progress } from '@/components/ui/progress';
import { TestRunCreateDialog } from '@/components/test-runs/test-run-create-dialog';
import { TestRunEditDialog } from '@/components/test-runs/test-run-edit-dialog';
import { TestRunCard } from '@/components/test-runs/test-run-card';
import { TestRunStatusBadge } from '@/components/test-runs/test-run-status-badge';
import {
  type TestRunWithRelations,
  type TestRunStatus,
  TEST_RUN_STATUS_LABELS,
  isTestRunOverdue,
  getTestRunProgress,
  getTestRunPassRate,
} from '@/types/test-run';
import type { Milestone } from '@/types/milestone';
import type { Configuration } from '@/types/configuration';
import {
  Pencil,
  Trash2,
  Loader2,
  PlayCircle,
  Search,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowLeft,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'card' | 'table';
type SortField = 'name' | 'createdAt' | 'updatedAt' | 'status' | 'plannedEndDate' | 'progress';
type SortOrder = 'asc' | 'desc';

// Cache for test runs fetch
const testRunsCache = new Map<string, { data: TestRunWithRelations[]; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export function clearTestRunsCache() {
  testRunsCache.clear();
}

function getCacheKey(
  projectId: string,
  query: string,
  status: string,
  milestoneId: string,
  configurationId: string,
  sortBy: string,
  sortOrder: string
): string {
  return `${projectId}-${query}-${status}-${milestoneId}-${configurationId}-${sortBy}-${sortOrder}`;
}

interface TestRunsPageProps {
  params: Promise<{ id: string }>;
}

export default function TestRunsPage({ params }: TestRunsPageProps) {
  const { id: projectId } = use(params);
  const [testRuns, setTestRuns] = useState<TestRunWithRelations[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  // Edit dialog state
  const [editingTestRun, setEditingTestRun] = useState<TestRunWithRelations | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestRunStatus | 'all'>('all');
  const [milestoneFilter, setMilestoneFilter] = useState<string>('all');
  const [configurationFilter, setConfigurationFilter] = useState<string>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch milestones and configurations
  useEffect(() => {
    const fetchRelatedData = async () => {
      try {
        const [milestonesRes, configurationsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/milestones`),
          fetch(`/api/projects/${projectId}/configurations`),
        ]);

        if (milestonesRes.ok) {
          const milestonesData = await milestonesRes.json();
          setMilestones(milestonesData);
        }

        if (configurationsRes.ok) {
          const configurationsData = await configurationsRes.json();
          setConfigurations(configurationsData);
        }
      } catch {
        // Silently ignore errors for related data
      }
    };

    fetchRelatedData();
  }, [projectId]);

  const fetchTestRuns = useCallback(async () => {
    const cacheKey = getCacheKey(
      projectId,
      debouncedQuery,
      statusFilter,
      milestoneFilter,
      configurationFilter,
      sortBy,
      sortOrder
    );
    const cached = testRunsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      startTransition(() => {
        setTestRuns(cached.data);
        setIsLoading(false);
      });
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      if (debouncedQuery) {
        params.set('query', debouncedQuery);
      }

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (milestoneFilter !== 'all') {
        params.set('milestoneId', milestoneFilter);
      }

      if (configurationFilter !== 'all') {
        params.set('configurationId', configurationFilter);
      }

      const url = `/api/projects/${projectId}/test-runs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('テストラン一覧の取得に失敗しました。');
      }

      let data: TestRunWithRelations[] = await response.json();

      // Client-side sorting
      data = sortTestRuns(data, sortBy, sortOrder);

      testRunsCache.set(cacheKey, { data, timestamp: Date.now() });

      startTransition(() => {
        setTestRuns(data);
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
      });
    }
  }, [
    projectId,
    debouncedQuery,
    statusFilter,
    milestoneFilter,
    configurationFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchTestRuns();
  }, [fetchTestRuns]);

  const sortTestRuns = (
    data: TestRunWithRelations[],
    field: SortField,
    order: SortOrder
  ): TestRunWithRelations[] => {
    return [...data].sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ja');
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'plannedEndDate':
          const aDate = a.plannedEndDate ? new Date(a.plannedEndDate).getTime() : Infinity;
          const bDate = b.plannedEndDate ? new Date(b.plannedEndDate).getTime() : Infinity;
          comparison = aDate - bDate;
          break;
        case 'progress':
          comparison = getTestRunProgress(a) - getTestRunProgress(b);
          break;
        default:
          comparison = 0;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  };

  const handleRefresh = () => {
    testRunsCache.clear();
    fetchTestRuns();
  };

  const handleEdit = (testRun: TestRunWithRelations) => {
    setEditingTestRun(testRun);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このテストランを削除してもよろしいですか？')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/projects/${projectId}/test-runs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テストランの削除に失敗しました。');
      }

      toast({
        title: '削除完了',
        description: 'テストランを削除しました。',
      });

      testRunsCache.clear();
      fetchTestRuns();
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setMilestoneFilter('all');
    setConfigurationFilter('all');
  };

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const hasFilters =
    searchQuery ||
    statusFilter !== 'all' ||
    milestoneFilter !== 'all' ||
    configurationFilter !== 'all';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}>
          <ArrowLeft className="mr-2 size-4" />
          プロジェクト一覧に戻る
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">テストラン一覧</h1>
            <p className="text-muted-foreground">テストランの管理・作成ができます。</p>
          </div>
          <div className="flex items-center gap-2">
            <TestRunCreateDialog
              projectId={projectId}
              milestones={milestones}
              configurations={configurations}
              onSuccess={handleRefresh}
            />
            <Link
              href={`/projects/${projectId}/test-runs/create`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <PlayCircle className="mr-2 size-4" />
              ウィザードで作成
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>テストラン</CardTitle>
              <CardDescription>
                登録されているテストランの一覧です。
                {testRuns.length > 0 && `（全${testRuns.length}件）`}
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
                placeholder="テストラン名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as TestRunStatus | 'all')}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {(Object.entries(TEST_RUN_STATUS_LABELS) as [TestRunStatus, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Select value={milestoneFilter} onValueChange={setMilestoneFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="マイルストーン" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="null">なし</SelectItem>
                  {milestones.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={configurationFilter} onValueChange={setConfigurationFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="コンフィグ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="null">なし</SelectItem>
                  {configurations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
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
                  <SelectItem value="createdAt-desc">作成日（新しい順）</SelectItem>
                  <SelectItem value="createdAt-asc">作成日（古い順）</SelectItem>
                  <SelectItem value="updatedAt-desc">更新日（新しい順）</SelectItem>
                  <SelectItem value="plannedEndDate-asc">終了予定（近い順）</SelectItem>
                  <SelectItem value="progress-desc">進捗（高い順）</SelectItem>
                  <SelectItem value="progress-asc">進捗（低い順）</SelectItem>
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
          ) : testRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PlayCircle className="mb-4 size-16" />
              {hasFilters ? (
                <>
                  <p className="text-lg">検索条件に一致するテストランがありません。</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    フィルターをクリア
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg">テストランがありません。</p>
                  <p className="text-sm">「新規テストラン」ボタンから作成してください。</p>
                </>
              )}
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {testRuns.map((testRun) => (
                <TestRunCard
                  key={testRun.id}
                  testRun={testRun}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeleting={deletingId === testRun.id}
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
                      テストラン名
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
                    onClick={() => handleSortChange('progress')}
                  >
                    <div className="flex items-center gap-1">
                      進捗
                      {sortBy === 'progress' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead>結果</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('plannedEndDate')}
                  >
                    <div className="flex items-center gap-1">
                      終了予定
                      {sortBy === 'plannedEndDate' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testRuns.map((testRun) => {
                  const overdue = isTestRunOverdue(testRun);
                  const progress = getTestRunProgress(testRun);
                  const passRate = getTestRunPassRate(testRun);

                  return (
                    <TableRow key={testRun.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{testRun.name}</span>
                          {overdue && (
                            <AlertTriangle className="size-4 text-destructive" title="期限超過" />
                          )}
                        </div>
                        {testRun.description && (
                          <div className="max-w-xs truncate text-sm text-muted-foreground">
                            {testRun.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <TestRunStatusBadge status={testRun.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 w-20" />
                          <span className="text-sm text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="size-3" />
                            {testRun.passedCases}
                          </span>
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="size-3" />
                            {testRun.failedCases}
                          </span>
                          <span className="text-muted-foreground">/ {testRun.totalCases}</span>
                          {testRun.totalCases > 0 && (
                            <span
                              className={cn(
                                'text-xs',
                                passRate >= 80
                                  ? 'text-green-600'
                                  : passRate >= 50
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                              )}
                            >
                              ({passRate}%)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={cn('flex items-center gap-1', overdue && 'text-destructive')}
                        >
                          <Calendar className="size-3" />
                          {formatDate(testRun.plannedEndDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(testRun)}>
                            <Pencil className="mr-1 size-3" />
                            編集
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(testRun.id)}
                            disabled={deletingId === testRun.id}
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingId === testRun.id ? (
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
      <TestRunEditDialog
        projectId={projectId}
        testRun={editingTestRun}
        milestones={milestones}
        configurations={configurations}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
