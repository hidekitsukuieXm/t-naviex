'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnResizeMode,
  type VisibilityState,
} from '@tanstack/react-table';
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
  type TestCase,
  type TestCasePriority,
  type TestType,
  PRIORITY_LABELS,
  TEST_TYPE_LABELS,
  VALID_PRIORITIES,
  VALID_TEST_TYPES,
} from '@/types/test-case';
import { type TestSectionWithChildren } from '@/types/test-section';
import {
  Search,
  X,
  Loader2,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Plus,
  Copy,
  ClipboardPaste,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TestCaseCreateDialog } from './test-case-create-dialog';
import {
  ColumnVisibilityDialog,
  type ColumnConfig,
  GRID_COLUMN_LABELS,
  loadColumnVisibility,
  saveColumnVisibility,
  DEFAULT_COLUMN_VISIBILITY,
} from './column-visibility-dialog';

// ============================================
// Types
// ============================================

interface TestCaseGridProps {
  testSpecId: string;
  selectedSectionId: string | null;
  sections?: TestSectionWithChildren[];
  isLocked?: boolean;
  className?: string;
}

interface EditingCell {
  rowId: string;
  columnId: string;
  value: string;
}

// ============================================
// Constants
// ============================================

const PRIORITY_COLORS: Record<TestCasePriority, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
};

const PRIORITY_ICONS: Record<TestCasePriority, React.ReactNode> = {
  CRITICAL: <AlertCircle className="size-3" />,
  HIGH: <AlertTriangle className="size-3" />,
  MEDIUM: <CheckCircle2 className="size-3" />,
  LOW: <Info className="size-3" />,
};

// ============================================
// Helper Components
// ============================================

function PriorityBadge({ priority }: { priority: TestCasePriority }) {
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

// ============================================
// Editable Cell Input Component (for editing mode only)
// ============================================

interface EditableCellInputProps {
  initialValue: string;
  onChange: (value: string) => void;
  onEndEdit: () => void;
  onCancel: () => void;
}

function EditableCellInput({
  initialValue,
  onChange,
  onEndEdit,
  onCancel,
}: EditableCellInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(initialValue);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onChange(localValue);
      onEndEdit();
    } else if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Tab') {
      onChange(localValue);
      onEndEdit();
    }
  };

  return (
    <Input
      ref={inputRef}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        onChange(localValue);
        onEndEdit();
      }}
      className="h-8 w-full"
    />
  );
}

// ============================================
// Editable Cell Component
// ============================================

interface EditableCellProps {
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

function EditableCell({
  value,
  isEditing,
  onChange,
  onStartEdit,
  onEndEdit,
  onCancel,
  disabled,
}: EditableCellProps) {
  // When editing, render EditableCellInput which manages its own state
  if (isEditing && !disabled) {
    return (
      <EditableCellInput
        initialValue={value}
        onChange={onChange}
        onEndEdit={onEndEdit}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div
      className={cn(
        'cursor-pointer truncate px-1 py-0.5 hover:bg-muted/50 rounded',
        disabled && 'cursor-default'
      )}
      onDoubleClick={() => !disabled && onStartEdit()}
      title={value}
    >
      {value || <span className="text-muted-foreground italic">-</span>}
    </div>
  );
}

// ============================================
// Priority Cell Component
// ============================================

interface PriorityCellProps {
  value: TestCasePriority;
  isEditing: boolean;
  onChange: (value: TestCasePriority) => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  disabled?: boolean;
}

function PriorityCell({
  value,
  isEditing,
  onChange,
  onStartEdit,
  onEndEdit,
  disabled,
}: PriorityCellProps) {
  if (isEditing && !disabled) {
    return (
      <Select
        value={value}
        onValueChange={(v) => {
          onChange(v as TestCasePriority);
          onEndEdit();
        }}
        open
        onOpenChange={(open) => !open && onEndEdit()}
      >
        <SelectTrigger className="h-8 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VALID_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      className={cn('cursor-pointer', disabled && 'cursor-default')}
      onDoubleClick={() => !disabled && onStartEdit()}
    >
      <PriorityBadge priority={value} />
    </div>
  );
}

// ============================================
// TestType Cell Component
// ============================================

interface TestTypeCellProps {
  value: TestType;
  isEditing: boolean;
  onChange: (value: TestType) => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  disabled?: boolean;
}

function TestTypeCell({
  value,
  isEditing,
  onChange,
  onStartEdit,
  onEndEdit,
  disabled,
}: TestTypeCellProps) {
  if (isEditing && !disabled) {
    return (
      <Select
        value={value}
        onValueChange={(v) => {
          onChange(v as TestType);
          onEndEdit();
        }}
        open
        onOpenChange={(open) => !open && onEndEdit()}
      >
        <SelectTrigger className="h-8 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VALID_TEST_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {TEST_TYPE_LABELS[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      className={cn('cursor-pointer text-sm', disabled && 'cursor-default')}
      onDoubleClick={() => !disabled && onStartEdit()}
    >
      {TEST_TYPE_LABELS[value]}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function TestCaseGrid({
  testSpecId,
  selectedSectionId,
  sections = [],
  isLocked = false,
  className,
}: TestCaseGridProps) {
  // Data state
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TestCasePriority | 'all'>('all');
  const [testTypeFilter, setTestTypeFilter] = useState<TestType | 'all'>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    loadColumnVisibility()
  );
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(
    null
  );
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch test cases
  const fetchTestCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());

      if (sorting.length > 0) {
        params.set('sortBy', sorting[0].id);
        params.set('sortOrder', sorting[0].desc ? 'desc' : 'asc');
      }

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

      const data = await response.json();
      setTestCases(data.testCases);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [
    testSpecId,
    selectedSectionId,
    debouncedQuery,
    priorityFilter,
    testTypeFilter,
    sorting,
    currentPage,
  ]);

  useEffect(() => {
    void fetchTestCases();
  }, [fetchTestCases]);

  // Update cell value
  const updateCell = useCallback(
    async (rowId: string, columnId: string, value: string | TestCasePriority | TestType) => {
      try {
        const response = await fetch(`/api/test-specs/${testSpecId}/cases/${rowId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [columnId]: value }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '更新に失敗しました。');
        }

        // Update local state
        setTestCases((prev) =>
          prev.map((tc) => (tc.id === rowId ? { ...tc, [columnId]: value } : tc))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
      }
    },
    [testSpecId]
  );

  // Keyboard navigation and copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;

      // Copy (Ctrl+C)
      if (e.ctrlKey && e.key === 'c') {
        const testCase = testCases.find((tc) => tc.id === selectedCell.rowId);
        if (testCase) {
          const value = testCase[selectedCell.columnId as keyof TestCase];
          setCopiedValue(String(value ?? ''));
          navigator.clipboard.writeText(String(value ?? ''));
        }
      }

      // Paste (Ctrl+V)
      if (e.ctrlKey && e.key === 'v' && !isLocked) {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          if (selectedCell && text) {
            // Only allow paste for text fields
            if (['title', 'description'].includes(selectedCell.columnId)) {
              void updateCell(selectedCell.rowId, selectedCell.columnId, text);
            }
          }
        });
      }

      // Start editing on Enter or F2
      if ((e.key === 'Enter' || e.key === 'F2') && !editingCell && !isLocked) {
        const testCase = testCases.find((tc) => tc.id === selectedCell.rowId);
        if (testCase) {
          setEditingCell({
            rowId: selectedCell.rowId,
            columnId: selectedCell.columnId,
            value: String(testCase[selectedCell.columnId as keyof TestCase] ?? ''),
          });
        }
      }

      // Arrow key navigation - use only visible columns
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !editingCell) {
        e.preventDefault();
        const currentRowIndex = testCases.findIndex((tc) => tc.id === selectedCell.rowId);
        // Get visible column IDs dynamically
        const visibleColumns = ['title', 'priority', 'testType', 'description', 'updatedAt'].filter(
          (colId) => columnVisibility[colId] !== false
        );
        const currentColIndex = visibleColumns.indexOf(selectedCell.columnId);

        let newRowIndex = currentRowIndex;
        let newColIndex = currentColIndex;

        switch (e.key) {
          case 'ArrowUp':
            newRowIndex = Math.max(0, currentRowIndex - 1);
            break;
          case 'ArrowDown':
            newRowIndex = Math.min(testCases.length - 1, currentRowIndex + 1);
            break;
          case 'ArrowLeft':
            newColIndex = Math.max(0, currentColIndex - 1);
            break;
          case 'ArrowRight':
            newColIndex = Math.min(visibleColumns.length - 1, currentColIndex + 1);
            break;
        }

        if (testCases[newRowIndex] && visibleColumns[newColIndex]) {
          setSelectedCell({
            rowId: testCases[newRowIndex].id,
            columnId: visibleColumns[newColIndex],
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, editingCell, testCases, isLocked, copiedValue, updateCell, columnVisibility]);

  // Column definitions
  const columns = useMemo<ColumnDef<TestCase>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        enableHiding: false, // Title is required
        header: ({ column }) => (
          <div
            className="flex cursor-pointer items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            タイトル
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="size-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="size-3" />
            ) : (
              <ArrowUpDown className="size-3 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row, column }) => {
          const isEditing =
            editingCell?.rowId === row.original.id && editingCell?.columnId === column.id;
          const isSelected =
            selectedCell?.rowId === row.original.id && selectedCell?.columnId === column.id;

          return (
            <div
              className={cn('min-w-0', isSelected && 'ring-2 ring-primary ring-offset-1 rounded')}
              onClick={() => setSelectedCell({ rowId: row.original.id, columnId: column.id })}
            >
              <EditableCell
                value={row.original.title}
                isEditing={isEditing}
                onChange={(value) => {
                  void updateCell(row.original.id, 'title', value);
                }}
                onStartEdit={() =>
                  setEditingCell({
                    rowId: row.original.id,
                    columnId: column.id,
                    value: row.original.title,
                  })
                }
                onEndEdit={() => setEditingCell(null)}
                onCancel={() => setEditingCell(null)}
                disabled={isLocked}
              />
            </div>
          );
        },
        size: 300,
        minSize: 150,
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: ({ column }) => (
          <div
            className="flex cursor-pointer items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            優先度
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="size-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="size-3" />
            ) : (
              <ArrowUpDown className="size-3 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row, column }) => {
          const isEditing =
            editingCell?.rowId === row.original.id && editingCell?.columnId === column.id;
          const isSelected =
            selectedCell?.rowId === row.original.id && selectedCell?.columnId === column.id;

          return (
            <div
              className={cn(isSelected && 'ring-2 ring-primary ring-offset-1 rounded')}
              onClick={() => setSelectedCell({ rowId: row.original.id, columnId: column.id })}
            >
              <PriorityCell
                value={row.original.priority}
                isEditing={isEditing}
                onChange={(value) => {
                  void updateCell(row.original.id, 'priority', value);
                }}
                onStartEdit={() =>
                  setEditingCell({
                    rowId: row.original.id,
                    columnId: column.id,
                    value: row.original.priority,
                  })
                }
                onEndEdit={() => setEditingCell(null)}
                disabled={isLocked}
              />
            </div>
          );
        },
        size: 120,
        minSize: 100,
      },
      {
        id: 'testType',
        accessorKey: 'testType',
        header: 'テストタイプ',
        cell: ({ row, column }) => {
          const isEditing =
            editingCell?.rowId === row.original.id && editingCell?.columnId === column.id;
          const isSelected =
            selectedCell?.rowId === row.original.id && selectedCell?.columnId === column.id;

          return (
            <div
              className={cn(isSelected && 'ring-2 ring-primary ring-offset-1 rounded')}
              onClick={() => setSelectedCell({ rowId: row.original.id, columnId: column.id })}
            >
              <TestTypeCell
                value={row.original.testType}
                isEditing={isEditing}
                onChange={(value) => {
                  void updateCell(row.original.id, 'testType', value);
                }}
                onStartEdit={() =>
                  setEditingCell({
                    rowId: row.original.id,
                    columnId: column.id,
                    value: row.original.testType,
                  })
                }
                onEndEdit={() => setEditingCell(null)}
                disabled={isLocked}
              />
            </div>
          );
        },
        size: 140,
        minSize: 100,
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: '説明',
        cell: ({ row, column }) => {
          const isEditing =
            editingCell?.rowId === row.original.id && editingCell?.columnId === column.id;
          const isSelected =
            selectedCell?.rowId === row.original.id && selectedCell?.columnId === column.id;

          return (
            <div
              className={cn('min-w-0', isSelected && 'ring-2 ring-primary ring-offset-1 rounded')}
              onClick={() => setSelectedCell({ rowId: row.original.id, columnId: column.id })}
            >
              <EditableCell
                value={row.original.description ?? ''}
                isEditing={isEditing}
                onChange={(value) => {
                  void updateCell(row.original.id, 'description', value || null);
                }}
                onStartEdit={() =>
                  setEditingCell({
                    rowId: row.original.id,
                    columnId: column.id,
                    value: row.original.description ?? '',
                  })
                }
                onEndEdit={() => setEditingCell(null)}
                onCancel={() => setEditingCell(null)}
                disabled={isLocked}
              />
            </div>
          );
        },
        size: 250,
        minSize: 100,
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        header: ({ column }) => (
          <div
            className="flex cursor-pointer items-center gap-1"
            onClick={() => column.toggleSorting()}
          >
            更新日
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="size-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="size-3" />
            ) : (
              <ArrowUpDown className="size-3 text-muted-foreground" />
            )}
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {new Date(row.original.updatedAt).toLocaleDateString('ja-JP')}
          </span>
        ),
        size: 100,
        minSize: 80,
        enableResizing: false,
      },
    ],
    [editingCell, selectedCell, isLocked, updateCell]
  );

  // Handle column visibility change with persistence
  const handleColumnVisibilityChange = useCallback(
    (updaterOrValue: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
      setColumnVisibility((prev) => {
        const newValue =
          typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue;
        saveColumnVisibility(newValue);
        return newValue;
      });
    },
    []
  );

  // Column configs for the visibility dialog
  const columnConfigs = useMemo<ColumnConfig[]>(
    () =>
      columns.map((col) => ({
        id: col.id!,
        label: GRID_COLUMN_LABELS[col.id!] || col.id!,
        canHide: col.enableHiding !== false,
      })),
    [columns]
  );

  // Table instance
  const table = useReactTable({
    data: testCases,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode,
    enableColumnResizing: true,
    defaultColumn: {
      minSize: 50,
      maxSize: 500,
    },
  });

  const clearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setTestTypeFilter('all');
    setCurrentPage(1);
  };

  const hasFilters = searchQuery || priorityFilter !== 'all' || testTypeFilter !== 'all';

  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              テストケース一覧（グリッド）
              {copiedValue !== null && (
                <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <Copy className="size-3" />
                  コピー済み
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {total > 0 ? `${total}件のテストケース` : 'テストケースがありません'}
              {!isLocked && ' - ダブルクリックで編集、Ctrl+C/Vでコピー＆ペースト'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ColumnVisibilityDialog
              columns={columnConfigs}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={handleColumnVisibilityChange}
              onReset={() => handleColumnVisibilityChange(DEFAULT_COLUMN_VISIBILITY)}
            />
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
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {/* Filters */}
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
                {VALID_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
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
                {VALID_TEST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TEST_TYPE_LABELS[t]}
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

        {/* Grid */}
        <div ref={tableContainerRef} className="flex-1 overflow-auto rounded-md border">
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
            <table className="w-full border-collapse" style={{ width: table.getCenterTotalSize() }}>
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="relative select-none border-b px-3 py-2 text-left text-sm font-medium"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-transparent hover:bg-primary/50',
                              header.column.getIsResizing() && 'bg-primary'
                            )}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/50',
                      selectedCell?.rowId === row.original.id && 'bg-muted/30'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-3 py-1.5"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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

        {/* Keyboard shortcuts hint */}
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Copy className="size-3" /> Ctrl+C コピー
          </span>
          <span className="flex items-center gap-1">
            <ClipboardPaste className="size-3" /> Ctrl+V ペースト
          </span>
          <span>ダブルクリック/Enter/F2: 編集</span>
          <span>矢印キー: セル移動</span>
        </div>
      </CardContent>
    </Card>
  );
}

export { PriorityBadge };
