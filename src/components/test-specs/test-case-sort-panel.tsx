'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUp, ArrowDown, SortAsc } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export type SortField =
  | 'title'
  | 'priority'
  | 'sortOrder'
  | 'createdAt'
  | 'updatedAt'
  | 'testType'
  | 'testTechnique';

export type SortOrder = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  order: SortOrder;
}

interface TestCaseSortPanelProps {
  sortState: SortState;
  onSortChange: (sortState: SortState) => void;
  className?: string;
}

// ============================================
// Constants
// ============================================

export const SORT_FIELD_LABELS: Record<SortField, string> = {
  title: 'タイトル',
  priority: '優先度',
  sortOrder: '並び順',
  createdAt: '作成日',
  updatedAt: '更新日',
  testType: 'テストタイプ',
  testTechnique: 'テスト技法',
};

export const DEFAULT_SORT_STATE: SortState = {
  field: 'sortOrder',
  order: 'asc',
};

// ============================================
// Component
// ============================================

export function TestCaseSortPanel({ sortState, onSortChange, className }: TestCaseSortPanelProps) {
  const handleFieldChange = useCallback(
    (field: string) => {
      onSortChange({
        field: field as SortField,
        order: sortState.order,
      });
    },
    [sortState.order, onSortChange]
  );

  const toggleOrder = useCallback(() => {
    onSortChange({
      field: sortState.field,
      order: sortState.order === 'asc' ? 'desc' : 'asc',
    });
  }, [sortState, onSortChange]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">並び替え:</span>

      <Select value={sortState.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="並び替え" />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(SORT_FIELD_LABELS) as [SortField, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={toggleOrder}
        title={sortState.order === 'asc' ? '昇順' : '降順'}
      >
        {sortState.order === 'asc' ? (
          <ArrowUp className="size-4" />
        ) : (
          <ArrowDown className="size-4" />
        )}
      </Button>
    </div>
  );
}

// ============================================
// Alternative Compact Component
// ============================================

interface TestCaseSortDropdownProps {
  sortState: SortState;
  onSortChange: (sortState: SortState) => void;
  className?: string;
}

export function TestCaseSortDropdown({
  sortState,
  onSortChange,
  className,
}: TestCaseSortDropdownProps) {
  const handleSortSelect = useCallback(
    (field: SortField) => {
      if (sortState.field === field) {
        // 同じフィールドをクリックしたら順序を反転
        onSortChange({
          field,
          order: sortState.order === 'asc' ? 'desc' : 'asc',
        });
      } else {
        // 新しいフィールドを選択したら昇順に
        onSortChange({
          field,
          order: 'asc',
        });
      }
    },
    [sortState, onSortChange]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
      >
        <SortAsc className="mr-2 size-4" />
        {SORT_FIELD_LABELS[sortState.field]}
        {sortState.order === 'asc' ? (
          <ArrowUp className="ml-1 size-3" />
        ) : (
          <ArrowDown className="ml-1 size-3" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.entries(SORT_FIELD_LABELS) as [SortField, string][]).map(([field, label]) => (
          <DropdownMenuItem
            key={field}
            onClick={() => handleSortSelect(field)}
            className={cn(sortState.field === field && 'bg-accent')}
          >
            <span className="flex-1">{label}</span>
            {sortState.field === field &&
              (sortState.order === 'asc' ? (
                <ArrowUp className="ml-2 size-4" />
              ) : (
                <ArrowDown className="ml-2 size-4" />
              ))}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
