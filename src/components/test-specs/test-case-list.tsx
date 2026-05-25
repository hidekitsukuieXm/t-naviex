'use client';

import { useState, useCallback, useEffect, useRef, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  type TestCaseListResponse,
  type TestCaseFilterState,
  PRIORITY_LABELS,
  TEST_TYPE_LABELS,
} from '@/types/test-case';
import { type TestSectionWithChildren } from '@/types/test-section';
import {
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
import {
  TestCaseFilterPanel,
  DEFAULT_FILTER_STATE,
  hasActiveFilters,
} from './test-case-filter-panel';
import {
  TestCaseSortDropdown,
  type SortField,
  type SortState,
  DEFAULT_SORT_STATE,
} from './test-case-sort-panel';

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

  // Filter state
  const [filters, setFilters] = useState<TestCaseFilterState>(DEFAULT_FILTER_STATE);
  const [debouncedFilters, setDebouncedFilters] =
    useState<TestCaseFilterState>(DEFAULT_FILTER_STATE);

  // Sort state
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Available tags for filter suggestions
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Track previous sectionId to reset page
  const prevSectionIdRef = useRef<string | null>(selectedSectionId);

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedFilters(filters);
        setCurrentPage(1);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

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
      params.set('sortBy', sortState.field);
      params.set('sortOrder', sortState.order);

      if (selectedSectionId !== null) {
        params.set('sectionId', selectedSectionId);
      }

      if (debouncedFilters.query) {
        params.set('query', debouncedFilters.query);
      }

      if (debouncedFilters.priority !== 'all') {
        params.set('priority', debouncedFilters.priority);
      }

      if (debouncedFilters.testType !== 'all') {
        params.set('testType', debouncedFilters.testType);
      }

      if (debouncedFilters.testTechnique !== 'all') {
        params.set('testTechnique', debouncedFilters.testTechnique);
      }

      if (debouncedFilters.tags.length > 0) {
        params.set('tags', debouncedFilters.tags.join(','));
      }

      if (debouncedFilters.classification) {
        params.set('classification', debouncedFilters.classification);
      }

      if (debouncedFilters.isMatrix !== 'all') {
        params.set('isMatrix', debouncedFilters.isMatrix.toString());
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

        // 利用可能なタグを収集
        const tagsSet = new Set<string>();
        data.testCases.forEach((tc) => {
          if (tc.tags && Array.isArray(tc.tags)) {
            tc.tags.forEach((tag) => tagsSet.add(tag));
          }
        });
        setAvailableTags((prev) => {
          const combined = new Set([...prev, ...tagsSet]);
          return Array.from(combined).sort();
        });
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
      });
    }
  }, [testSpecId, selectedSectionId, debouncedFilters, sortState, currentPage]);

  useEffect(() => {
    void fetchTestCases();
  }, [fetchTestCases]);

  const handleFilterChange = useCallback((newFilters: TestCaseFilterState) => {
    setFilters(newFilters);
  }, []);

  const handleSortChange = useCallback((newSortState: SortState) => {
    setSortState(newSortState);
    setCurrentPage(1);
  }, []);

  const handleColumnSort = useCallback((field: SortField) => {
    setSortState((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  }, []);

  const filtersActive = hasActiveFilters(filters);

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
        {/* Filter Panel */}
        <TestCaseFilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          availableTags={availableTags}
          className="mb-4"
        />

        {/* Sort Panel */}
        <div className="mb-4 flex items-center justify-between">
          <TestCaseSortDropdown sortState={sortState} onSortChange={handleSortChange} />
          <span className="text-sm text-muted-foreground">{total}件のテストケース</span>
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
              {filtersActive ? (
                <>
                  <p>検索条件に一致するテストケースがありません。</p>
                  <Button
                    variant="link"
                    onClick={() => handleFilterChange(DEFAULT_FILTER_STATE)}
                    className="mt-2"
                  >
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
                    onClick={() => handleColumnSort('title')}
                  >
                    <div className="flex items-center gap-1">
                      タイトル
                      {sortState.field === 'title' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleColumnSort('priority')}
                  >
                    <div className="flex items-center gap-1">
                      優先度
                      {sortState.field === 'priority' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleColumnSort('testType')}
                  >
                    <div className="flex items-center gap-1">
                      テストタイプ
                      {sortState.field === 'testType' && <ArrowUpDown className="size-3" />}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleColumnSort('updatedAt')}
                  >
                    <div className="flex items-center gap-1">
                      更新日
                      {sortState.field === 'updatedAt' && <ArrowUpDown className="size-3" />}
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
