'use client';

import { useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2, GripVertical, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VisibilityState } from '@tanstack/react-table';

// ============================================
// Types
// ============================================

export interface ColumnConfig {
  id: string;
  label: string;
  canHide: boolean;
}

interface ColumnVisibilityDialogProps {
  columns: ColumnConfig[];
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  onReset?: () => void;
  trigger?: React.ReactNode;
  className?: string;
}

// ============================================
// Constants
// ============================================

export const GRID_COLUMN_LABELS: Record<string, string> = {
  title: 'タイトル',
  priority: '優先度',
  testType: 'テストタイプ',
  description: '説明',
  updatedAt: '更新日',
  testTechnique: 'テスト技法',
  classification: '分類',
  tags: 'タグ',
  isMatrix: 'マトリクス',
  estimatedTime: '見積時間',
  createdAt: '作成日',
};

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  title: true,
  priority: true,
  testType: true,
  description: true,
  updatedAt: true,
};

// Storage key for column visibility settings
export const COLUMN_VISIBILITY_STORAGE_KEY = 'test-case-grid-column-visibility';

// ============================================
// Helper functions
// ============================================

export function loadColumnVisibility(): VisibilityState {
  if (typeof window === 'undefined') {
    return DEFAULT_COLUMN_VISIBILITY;
  }

  try {
    const stored = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as VisibilityState;
    }
  } catch {
    // Ignore parse errors
  }

  return DEFAULT_COLUMN_VISIBILITY;
}

export function saveColumnVisibility(visibility: VisibilityState): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    // Ignore storage errors
  }
}

// ============================================
// Component
// ============================================

export function ColumnVisibilityDialog({
  columns,
  columnVisibility,
  onColumnVisibilityChange,
  onReset,
  trigger,
  className,
}: ColumnVisibilityDialogProps) {
  const handleToggleColumn = useCallback(
    (columnId: string, checked: boolean) => {
      const newVisibility = {
        ...columnVisibility,
        [columnId]: checked,
      };
      onColumnVisibilityChange(newVisibility);
      saveColumnVisibility(newVisibility);
    },
    [columnVisibility, onColumnVisibilityChange]
  );

  const handleReset = useCallback(() => {
    onColumnVisibilityChange(DEFAULT_COLUMN_VISIBILITY);
    saveColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
    onReset?.();
  }, [onColumnVisibilityChange, onReset]);

  const handleShowAll = useCallback(() => {
    const allVisible: VisibilityState = {};
    columns.forEach((col) => {
      allVisible[col.id] = true;
    });
    onColumnVisibilityChange(allVisible);
    saveColumnVisibility(allVisible);
  }, [columns, onColumnVisibilityChange]);

  const handleHideOptional = useCallback(() => {
    const visibility: VisibilityState = {};
    columns.forEach((col) => {
      // Show only columns that cannot be hidden
      visibility[col.id] = !col.canHide;
    });
    onColumnVisibilityChange(visibility);
    saveColumnVisibility(visibility);
  }, [columns, onColumnVisibilityChange]);

  const visibleCount = columns.filter((col) => columnVisibility[col.id] !== false).length;

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
      >
        {trigger || (
          <>
            <Settings2 className="size-4" />
            表示列設定
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>表示列設定</DialogTitle>
          <DialogDescription>
            テーブルに表示する列を選択してください。（{visibleCount}/{columns.length}列表示中）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleShowAll}>
              全て表示
            </Button>
            <Button variant="outline" size="sm" onClick={handleHideOptional}>
              最小表示
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1 size-3" />
              デフォルトに戻す
            </Button>
          </div>

          {/* Column list */}
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
            {columns.map((column) => {
              const isVisible = columnVisibility[column.id] !== false;
              const canHide = column.canHide;

              return (
                <div
                  key={column.id}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors',
                    canHide && 'hover:bg-muted/50',
                    !canHide && 'opacity-60'
                  )}
                >
                  <GripVertical className="size-4 text-muted-foreground/50" />
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={(checked) => handleToggleColumn(column.id, checked)}
                    disabled={!canHide}
                    aria-label={`${column.label}を${isVisible ? '非表示' : '表示'}にする`}
                  />
                  <span className="flex-1 text-sm">{column.label}</span>
                  {!canHide && <span className="text-xs text-muted-foreground">必須</span>}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>閉じる</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
