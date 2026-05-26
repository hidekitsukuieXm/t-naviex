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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RequirementTypeBadge } from '@/components/requirements/requirement-type-badge';
import { RequirementStatusBadge } from '@/components/requirements/requirement-status-badge';
import { RequirementPriorityBadge } from '@/components/requirements/requirement-priority-badge';
import { RequirementCreateDialog } from '@/components/requirements/requirement-create-dialog';
import { RequirementTree } from '@/components/requirements/requirement-tree';
import {
  type RequirementSafe,
  type RequirementType,
  type RequirementStatus,
  type RequirementPriority,
  RequirementTypeLabels,
  RequirementStatusLabels,
  RequirementPriorityLabels,
} from '@/types/requirement';
import { FileText, Search, X, Loader2, ArrowLeft, List, GitBranch, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// Cache for requirements fetch
const requirementsCache = new Map<string, { data: RequirementSafe[]; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

function getCacheKey(
  projectId: string,
  query: string,
  type: string,
  status: string,
  priority: string,
  view: string
): string {
  return `${projectId}-${query}-${type}-${status}-${priority}-${view}`;
}

interface RequirementsPageProps {
  params: Promise<{ id: string }>;
}

export default function RequirementsPage({ params }: RequirementsPageProps) {
  const { id: projectId } = use(params);
  const [requirements, setRequirements] = useState<RequirementSafe[]>([]);
  const [treeRequirements, setTreeRequirements] = useState<RequirementSafe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RequirementType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RequirementStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<RequirementPriority | 'all'>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');

  // Tree state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedRequirement, setSelectedRequirement] = useState<RequirementSafe | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchRequirements = useCallback(async () => {
    const cacheKey = getCacheKey(
      projectId,
      debouncedQuery,
      typeFilter,
      statusFilter,
      priorityFilter,
      viewMode
    );
    const cached = requirementsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      startTransition(() => {
        if (viewMode === 'tree') {
          setTreeRequirements(cached.data);
        } else {
          setRequirements(cached.data);
        }
        setIsLoading(false);
      });
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      if (viewMode === 'tree') {
        params.set('tree', 'true');
      } else {
        if (debouncedQuery) {
          params.set('search', debouncedQuery);
        }
        if (typeFilter !== 'all') {
          params.set('type', typeFilter);
        }
        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        if (priorityFilter !== 'all') {
          params.set('priority', priorityFilter);
        }
      }

      const url = `/api/projects/${projectId}/requirements${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('要求仕様の取得に失敗しました。');
      }

      const data = await response.json();
      const requirementsList = data.requirements || [];

      requirementsCache.set(cacheKey, { data: requirementsList, timestamp: Date.now() });

      startTransition(() => {
        if (viewMode === 'tree') {
          setTreeRequirements(requirementsList);
        } else {
          setRequirements(requirementsList);
        }
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
      });
    }
  }, [projectId, debouncedQuery, typeFilter, statusFilter, priorityFilter, viewMode]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  const handleRefresh = () => {
    requirementsCache.clear();
    fetchRequirements();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  const hasFilters =
    searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all';

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectRequirement = (requirement: RequirementSafe) => {
    setSelectedRequirement(requirement);
    router.push(`/projects/${projectId}/requirements/${requirement.id}`);
  };

  const countAllRequirements = (reqs: RequirementSafe[]): number => {
    return reqs.reduce((acc, req) => {
      return acc + 1 + (req.children ? countAllRequirements(req.children) : 0);
    }, 0);
  };

  const totalCount =
    viewMode === 'tree' ? countAllRequirements(treeRequirements) : requirements.length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}>
          <ArrowLeft className="mr-2 size-4" />
          プロジェクト一覧に戻る
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">要求仕様</h1>
            <p className="text-muted-foreground">プロジェクトの要求仕様を管理します。</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}/requirements/traceability`}
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              <BarChart3 className="mr-2 size-4" />
              トレーサビリティ
            </Link>
            <RequirementCreateDialog projectId={projectId} onSuccess={handleRefresh} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>要求仕様一覧</CardTitle>
              <CardDescription>
                登録されている要求仕様の一覧です。
                {totalCount > 0 && `（全${totalCount}件）`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'tree')}>
                <TabsList>
                  <TabsTrigger value="tree">
                    <GitBranch className="mr-1 size-4" />
                    ツリー
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List className="mr-1 size-4" />
                    リスト
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                更新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter (only for list view) */}
          {viewMode === 'list' && (
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="コード・タイトルで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as RequirementType | 'all')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="種別" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {(Object.entries(RequirementTypeLabels) as [RequirementType, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as RequirementStatus | 'all')}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="ステータス" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {(Object.entries(RequirementStatusLabels) as [RequirementStatus, string][]).map(
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
                  onValueChange={(value) => setPriorityFilter(value as RequirementPriority | 'all')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="優先度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    {(
                      Object.entries(RequirementPriorityLabels) as [RequirementPriority, string][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
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
          )}

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">{error}</div>
          ) : viewMode === 'tree' ? (
            <RequirementTree
              requirements={treeRequirements}
              selectedId={selectedRequirement?.id}
              onSelect={handleSelectRequirement}
              expandedIds={expandedIds}
              onToggle={handleToggleExpand}
            />
          ) : requirements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="mb-4 size-16" />
              {hasFilters ? (
                <>
                  <p className="text-lg">検索条件に一致する要求仕様がありません。</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    フィルターをクリア
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg">要求仕様がありません。</p>
                  <p className="text-sm">「新規要求仕様」ボタンから登録してください。</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">コード</TableHead>
                  <TableHead>タイトル</TableHead>
                  <TableHead className="w-32">種別</TableHead>
                  <TableHead className="w-28">ステータス</TableHead>
                  <TableHead className="w-32">優先度</TableHead>
                  <TableHead className="w-20">子要求</TableHead>
                  <TableHead className="w-24">テストケース</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.map((req) => (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSelectRequirement(req)}
                  >
                    <TableCell className="font-mono text-sm">{req.code}</TableCell>
                    <TableCell className="font-medium">
                      <div className="max-w-md truncate">{req.title}</div>
                    </TableCell>
                    <TableCell>
                      <RequirementTypeBadge type={req.type as RequirementType} />
                    </TableCell>
                    <TableCell>
                      <RequirementStatusBadge status={req.status as RequirementStatus} />
                    </TableCell>
                    <TableCell>
                      <RequirementPriorityBadge priority={req.priority as RequirementPriority} />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {req._count?.children ?? 0}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {req._count?.testCases ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
