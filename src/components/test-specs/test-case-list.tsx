'use client';

import { useState, useCallback, useEffect, useRef, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  type TestCase,
  type TestCasePriority,
  type TestType,
  type TestCaseListResponse,
  PRIORITY_LABELS,
  TEST_TYPE_LABELS,
} from '@/types/test-case';
import { type TestSectionWithChildren } from '@/types/test-section';
import {
  Search,
  X,
  Loader2,
  FileText,
  ArrowUpDown,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TestCaseCreateDialog } from './test-case-create-dialog';

// Priority badge colors
const PRIORITY_COLORS: Record<TestCasePriority, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
};

// Priority icons
const PRIORITY_ICONS: Record<TestCasePriority, React.ReactNode> = {
  CRITICAL: <AlertCircle className="size-3" />,
  HIGH: <AlertTriangle className="size-3" />,
  MEDIUM: <CheckCircle2 className="size-3" />,
  LOW: <Info className="size-3" />,
};

interface TestCasePriorityBadgeProps {
  priority: TestCasePriority;
}

function TestCasePriorityBadge({ priority }: TestCasePriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        PRIORITY_COLORS[priority]
      )}
    >
      {PRIORITY_ICONS[priority]}
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

type SortField = 'title' | 'priority' | 'sortOrder' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

interface TestCaseListProps {
  testSpecId: string;
  selectedSectionId: string | null;
  sections?: TestSectionWithChildren[];
  isLocked?: boolean;
  className?: string;
}

export function TestCaseList({
  testSpecId,
  selectedSectionId,
  sections = [],
  isLocked = false,
  className,
}: TestCaseListProps) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TestCasePriority | 'all'>('all');
  const [testTypeFilter, setTestTypeFilter] = useState<TestType | 'all'>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Sort state
  const [sortBy, setSortBy] = useState<SortField>('sortOrder');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Track previous sectionId to reset page
  const prevSectionIdRef = useRef<string | null>(selectedSectionId);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedQuery(searchQuery);
        setCurrentPage(1);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTestCases = useCallback(async () => {
    // Reset page if sectionId changed
    const sectionChanged = prevSectionIdRef.current !== selectedSectionId;
    if (sectionChanged) {
      prevSectionIdRef.current = selectedSectionId;
    }
    const pageToUse = sectionChanged ? 1 : currentPage;

    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('page', pageToUse.toString());
      params.set('limit', limit.toString());
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      if (selectedSectionId !== null) {
        params.set('sectionId', selectedSectionId);
      }

      if (debouncedQuery) {
        params.set('query', debouncedQuery);
      }

      if (priorityFilter !== 'all') {
        params.set('priority', priorityFilter);
      }

      if (testTypeFilter !== 'all') {
        params.set('testType', testTypeFilter);
      }

      const response = await fetch(`/api/test-specs/${testSpecId}/cases?${params.toString()}`);
      if (!response.ok) {
        throw new Error('テストケース一覧の取得に失敗しました。');
      }

      const data: TestCaseListResponse = await response.json();
      startTransition(() => {
        setTestCases(data.testCases);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setError(null);
        if (sectionChanged) {
          setCurrentPage(1);
        }
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
      });
    }
  }, [
    testSpecId,
    selectedSectionId,
    debouncedQuery,
    priorityFilter,
    testTypeFilter,
    sortBy,
    sortOrder,
    currentPage,
  ]);

  useEffect(() => {
    void fetchTestCases();
  }, [fetchTestCases]);

  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setTestTypeFilter('all');
    setCurrentPage(1);
  };

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const hasFilters = searchQuery || priorityFilter !== 'all' || testTypeFilter !== 'all';

  const getSectionTitle = () => {
    if (selectedSectionId === null) {
      return '全てのテストケース';
    }
    return 'テストケース';
  };

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{getSectionTitle()}</CardTitle>
            <CardDescription>
              {total > 0 ? `${total}件のテストケース` : 'テストケースがありません'}
            </CardDescription>
          </div>
          {!isLocked && (
            <TestCaseCreateDialog
              testSpecId={testSpecId}
              sections={sections}
              defaultSectionId={selectedSectionId}
              onSuccess={() => void fetchTestCases()}
              trigger={
                <Button size="sm">
                  <Plus className="mr-2 size-4" />
                  新規テストケース
                </Button>
              }
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Search and Filter */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
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
              value={priorityFilter}
              onValueChange={(value) => {
                setPriorityFilter(value as TestCasePriority | 'all');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="優先度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {(Object.entries(PRIORITY_LABELS) as [TestCasePriority, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select
              value={testTypeFilter}
              onValueChange={(value) => {
                setTestTypeFilter(value as TestType | 'all');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="テストタイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                {(Object.entries(TEST_TYPE_LABELS) as [TestType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
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
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">{error}</div>
          ) : testCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="mb-4 size-12" />
              {hasFilters ? (
                <>
                  <p>検索条件に一致するテストケースがありません。</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    フィルターをクリア
                  </Button>
                </>
              ) : (
                <p>テストケースがありません。</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 w-[50%]"
                    onClick={() => handleSortChange('title')}
                  >
                    <div className="flex items-center gap-1">
                      タイトル
                      {sortBy === 'title' && <ArrowUpDown className="size-3" />}
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
                  <TableHead>テストタイプ</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSortChange('updatedAt')}
                  >
                    <div className="flex items-center gap-1">
                      更新日
                      {sortBy === 'updatedAt' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testCases.map((testCase) => (
                  <TableRow key={testCase.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{testCase.title}</div>
                        {testCase.description && (
                          <div className="line-clamp-1 text-sm text-muted-foreground">
                            {testCase.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TestCasePriorityBadge priority={testCase.priority} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{TEST_TYPE_LABELS[testCase.testType]}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(testCase.updatedAt).toLocaleDateString('ja-JP')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t pt-4">
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
  );
}

export { TestCasePriorityBadge };
