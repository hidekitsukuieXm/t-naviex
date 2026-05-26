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
import { BugStatusBadge } from '@/components/bugs/bug-status-badge';
import { BugPriorityBadge } from '@/components/bugs/bug-priority-badge';
import { BugSeverityBadge } from '@/components/bugs/bug-severity-badge';
import { BugTypeBadge } from '@/components/bugs/bug-type-badge';
import { BugCreateDialog } from '@/components/bugs/bug-create-dialog';
import {
  type BugWithRelations,
  type BugStatus,
  type BugPriority,
  type BugType,
  BugStatusLabels,
  BugPriorityLabels,
  BugTypeLabels,
  isOpenStatus,
  type BugStatistics,
} from '@/types/bug';
import {
  Bug,
  Search,
  X,
  Loader2,
  ArrowLeft,
  ArrowUpDown,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type SortField =
  | 'title'
  | 'createdAt'
  | 'updatedAt'
  | 'status'
  | 'priority'
  | 'severity'
  | 'dueDate';
type SortOrder = 'asc' | 'desc';

// Cache for bugs fetch
const bugsCache = new Map<string, { data: BugWithRelations[]; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

function getCacheKey(
  projectId: string,
  query: string,
  status: string,
  priority: string,
  type: string,
  assigneeId: string,
  sortBy: string,
  sortOrder: string
): string {
  return `${projectId}-${query}-${status}-${priority}-${type}-${assigneeId}-${sortBy}-${sortOrder}`;
}

interface BugsPageProps {
  params: Promise<{ id: string }>;
}

export default function BugsPage({ params }: BugsPageProps) {
  const { id: projectId } = use(params);
  const [bugs, setBugs] = useState<BugWithRelations[]>([]);
  const [statistics, setStatistics] = useState<BugStatistics | null>(null);
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BugStatus | 'all' | 'open'>('all');
  const [priorityFilter, setPriorityFilter] = useState<BugPriority | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<BugType | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
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

  // Fetch project members for assignee filter
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`);
        if (response.ok) {
          const data = await response.json();
          setAssignees(
            data.map((m: { user: { id: string; name: string } }) => ({
              id: m.user.id,
              name: m.user.name,
            }))
          );
        }
      } catch {
        // Silently ignore errors
      }
    };
    fetchMembers();
  }, [projectId]);

  const fetchBugs = useCallback(async () => {
    const cacheKey = getCacheKey(
      projectId,
      debouncedQuery,
      statusFilter,
      priorityFilter,
      typeFilter,
      assigneeFilter,
      sortBy,
      sortOrder
    );
    const cached = bugsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      startTransition(() => {
        setBugs(cached.data);
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

      if (statusFilter === 'open') {
        params.set('status', 'NEW,OPEN,IN_PROGRESS');
      } else if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (priorityFilter !== 'all') {
        params.set('priority', priorityFilter);
      }

      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }

      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned') {
          params.set('assigneeId', 'null');
        } else {
          params.set('assigneeId', assigneeFilter);
        }
      }

      params.set('orderBy', sortBy);
      params.set('order', sortOrder);
      params.set('includeStats', 'true');

      const url = `/api/projects/${projectId}/bugs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('バグ一覧の取得に失敗しました。');
      }

      const data = await response.json();
      const bugsList = data.bugs || [];

      bugsCache.set(cacheKey, { data: bugsList, timestamp: Date.now() });

      startTransition(() => {
        setBugs(bugsList);
        setStatistics(data.statistics || null);
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
    priorityFilter,
    typeFilter,
    assigneeFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchBugs();
  }, [fetchBugs]);

  const handleRefresh = () => {
    bugsCache.clear();
    fetchBugs();
  };

  const formatDate = (dateString: string | Date | null) => {
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
    setPriorityFilter('all');
    setTypeFilter('all');
    setAssigneeFilter('all');
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
    priorityFilter !== 'all' ||
    typeFilter !== 'all' ||
    assigneeFilter !== 'all';

  const isOverdue = (bug: BugWithRelations) => {
    if (!bug.dueDate) return false;
    if (!isOpenStatus(bug.status as BugStatus)) return false;
    return new Date(bug.dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}>
          <ArrowLeft className="mr-2 size-4" />
          プロジェクト一覧に戻る
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">バグ一覧</h1>
            <p className="text-muted-foreground">バグ・課題の管理ができます。</p>
          </div>
          <BugCreateDialog projectId={projectId} onSuccess={handleRefresh} />
        </div>
      </div>

      {/* Summary Cards */}
      {statistics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">オープン</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statistics.openCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">解決済み</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.resolvedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">クローズ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{statistics.closedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">合計</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>バグ・課題</CardTitle>
              <CardDescription>
                登録されているバグ・課題の一覧です。
                {bugs.length > 0 && `（全${bugs.length}件）`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search, Filter, and Sort */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="タイトルで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as BugStatus | 'all' | 'open')}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="open">オープン中</SelectItem>
                  {(Object.entries(BugStatusLabels) as [BugStatus, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value as BugPriority | 'all')}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="優先度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {(Object.entries(BugPriorityLabels) as [BugPriority, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as BugType | 'all')}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="種別" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {(Object.entries(BugTypeLabels) as [BugType, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="担当者" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="unassigned">未割当</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
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
                  <SelectItem value="priority-asc">優先度（高い順）</SelectItem>
                  <SelectItem value="priority-desc">優先度（低い順）</SelectItem>
                  <SelectItem value="severity-asc">重大度（高い順）</SelectItem>
                  <SelectItem value="dueDate-asc">期限（近い順）</SelectItem>
                  <SelectItem value="title-asc">タイトル（A-Z）</SelectItem>
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
          ) : bugs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bug className="mb-4 size-16" />
              {hasFilters ? (
                <>
                  <p className="text-lg">検索条件に一致するバグがありません。</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    フィルターをクリア
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg">バグがありません。</p>
                  <p className="text-sm">「新規バグ登録」ボタンから登録してください。</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('title')}
                  >
                    <div className="flex items-center gap-1">
                      タイトル
                      {sortBy === 'title' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead>種別</TableHead>
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
                    onClick={() => handleSortChange('priority')}
                  >
                    <div className="flex items-center gap-1">
                      優先度
                      {sortBy === 'priority' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('severity')}
                  >
                    <div className="flex items-center gap-1">
                      重大度
                      {sortBy === 'severity' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('dueDate')}
                  >
                    <div className="flex items-center gap-1">
                      期限
                      {sortBy === 'dueDate' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bugs.map((bug) => {
                  const overdue = isOverdue(bug);

                  return (
                    <TableRow
                      key={bug.id.toString()}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/projects/${projectId}/bugs/${bug.id}`)}
                    >
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        #{bug.id.toString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="max-w-md truncate">{bug.title}</span>
                          {overdue && (
                            <AlertTriangle className="size-4 text-destructive" title="期限超過" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <BugTypeBadge type={bug.type as BugType} />
                      </TableCell>
                      <TableCell>
                        <BugStatusBadge status={bug.status as BugStatus} />
                      </TableCell>
                      <TableCell>
                        <BugPriorityBadge priority={bug.priority as BugPriority} />
                      </TableCell>
                      <TableCell>
                        <BugSeverityBadge severity={bug.severity as BugSeverity} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          {bug.assignee ? (
                            <>
                              <User className="size-3 text-muted-foreground" />
                              <span>{bug.assignee.name}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={cn(
                            'flex items-center gap-1 text-sm',
                            overdue && 'text-destructive'
                          )}
                        >
                          {bug.dueDate ? (
                            <>
                              <Calendar className="size-3" />
                              {formatDate(bug.dueDate)}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
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
    </div>
  );
}
