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
import { MilestoneCreateDialog } from '@/components/milestones/milestone-create-dialog';
import { MilestoneEditDialog } from '@/components/milestones/milestone-edit-dialog';
import { MilestoneCard } from '@/components/milestones/milestone-card';
import { MilestoneStatusBadge } from '@/components/milestones/milestone-status-badge';
import {
  type Milestone,
  type MilestoneStatus,
  MILESTONE_STATUS_LABELS,
  isMilestoneOverdue,
  getMilestoneProgress,
} from '@/types/milestone';
import {
  Pencil,
  Trash2,
  Loader2,
  Flag,
  Search,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowLeft,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'card' | 'table';
type SortField = 'name' | 'createdAt' | 'updatedAt' | 'status' | 'dueDate' | 'sortOrder';
type SortOrder = 'asc' | 'desc';

// Cache for milestones fetch
const milestonesCache = new Map<string, { data: Milestone[]; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

// Export for testing purposes
export function clearMilestonesCache() {
  milestonesCache.clear();
}

function getCacheKey(
  projectId: string,
  query: string,
  status: string,
  sortBy: string,
  sortOrder: string
): string {
  return `${projectId}-${query}-${status}-${sortBy}-${sortOrder}`;
}

interface MilestonesPageProps {
  params: Promise<{ id: string }>;
}

export default function MilestonesPage({ params }: MilestonesPageProps) {
  const { id: projectId } = use(params);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  // Edit dialog state
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MilestoneStatus | 'all'>('all');
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

  const fetchMilestones = useCallback(async () => {
    const cacheKey = getCacheKey(projectId, debouncedQuery, statusFilter, sortBy, sortOrder);
    const cached = milestonesCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      startTransition(() => {
        setMilestones(cached.data);
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

      const url = `/api/projects/${projectId}/milestones${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('マイルストーン一覧の取得に失敗しました。');
      }

      let data: Milestone[] = await response.json();

      // Client-side sorting
      data = sortMilestones(data, sortBy, sortOrder);

      milestonesCache.set(cacheKey, { data, timestamp: Date.now() });

      startTransition(() => {
        setMilestones(data);
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
      });
    }
  }, [projectId, debouncedQuery, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const sortMilestones = (data: Milestone[], field: SortField, order: SortOrder): Milestone[] => {
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
        case 'dueDate':
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = aDate - bDate;
          break;
        case 'sortOrder':
          comparison = a.sortOrder - b.sortOrder;
          break;
        default:
          comparison = 0;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  };

  const handleRefresh = () => {
    // Clear cache and refetch
    milestonesCache.clear();
    fetchMilestones();
  };

  const handleEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このマイルストーンを削除してもよろしいですか？')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'マイルストーンの削除に失敗しました。');
      }

      toast({
        title: '削除完了',
        description: 'マイルストーンを削除しました。',
      });

      // Clear cache and refetch
      milestonesCache.clear();
      fetchMilestones();
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
  };

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
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
            <h1 className="text-2xl font-bold tracking-tight">マイルストーン一覧</h1>
            <p className="text-muted-foreground">マイルストーンの管理・作成ができます。</p>
          </div>
          <MilestoneCreateDialog projectId={projectId} onSuccess={handleRefresh} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>マイルストーン</CardTitle>
              <CardDescription>
                登録されているマイルストーンの一覧です。
                {milestones.length > 0 && `（全${milestones.length}件）`}
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
                placeholder="マイルストーン名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as MilestoneStatus | 'all');
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {(Object.entries(MILESTONE_STATUS_LABELS) as [MilestoneStatus, string][]).map(
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
                  <SelectItem value="dueDate-asc">期限日（近い順）</SelectItem>
                  <SelectItem value="dueDate-desc">期限日（遠い順）</SelectItem>
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
          ) : milestones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Flag className="mb-4 size-16" />
              {hasFilters ? (
                <>
                  <p className="text-lg">検索条件に一致するマイルストーンがありません。</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    フィルターをクリア
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg">マイルストーンがありません。</p>
                  <p className="text-sm">「新規マイルストーン」ボタンから作成してください。</p>
                </>
              )}
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {milestones.map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeleting={deletingId === milestone.id}
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
                      マイルストーン名
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
                  <TableHead>期間</TableHead>
                  <TableHead>進捗</TableHead>
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
                {milestones.map((milestone) => {
                  const isOverdue = isMilestoneOverdue(milestone);
                  const progress = getMilestoneProgress(milestone);

                  return (
                    <TableRow key={milestone.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{milestone.name}</span>
                          {isOverdue && (
                            <span title="期限超過">
                              <AlertTriangle className="size-4 text-destructive" />
                            </span>
                          )}
                        </div>
                        {milestone.description && (
                          <div className="max-w-xs truncate text-sm text-muted-foreground">
                            {milestone.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <MilestoneStatusBadge status={milestone.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          {milestone.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              開始: {formatDate(milestone.startDate)}
                            </span>
                          )}
                          {milestone.dueDate && (
                            <span
                              className={cn(
                                'flex items-center gap-1',
                                isOverdue && 'text-destructive'
                              )}
                            >
                              <Calendar className="size-3" />
                              期限: {formatDate(milestone.dueDate)}
                            </span>
                          )}
                          {!milestone.startDate && !milestone.dueDate && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 w-20" />
                          <span className="text-sm text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(milestone.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(milestone)}>
                            <Pencil className="mr-1 size-3" />
                            編集
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(milestone.id)}
                            disabled={deletingId === milestone.id}
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingId === milestone.id ? (
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
      <MilestoneEditDialog
        projectId={projectId}
        milestone={editingMilestone}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
