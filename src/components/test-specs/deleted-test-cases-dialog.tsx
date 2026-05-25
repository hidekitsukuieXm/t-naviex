'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TestCase } from '@/types/test-case';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface DeletedTestCasesDialogProps {
  testSpecId: string;
  isLocked?: boolean;
  onRestore?: () => void;
  trigger?: React.ReactNode;
  className?: string;
}

interface DeletedTestCasesResponse {
  testCases: TestCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// Component
// ============================================

export function DeletedTestCasesDialog({
  testSpecId,
  isLocked = false,
  onRestore,
  trigger,
  className,
}: DeletedTestCasesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletedTestCases, setDeletedTestCases] = useState<TestCase[]>([]);
  const [total, setTotal] = useState(0);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Fetch deleted test cases
  const fetchDeletedTestCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/test-specs/${testSpecId}/cases/deleted`);
      if (!response.ok) {
        throw new Error('削除済みテストケースの取得に失敗しました。');
      }
      const data: DeletedTestCasesResponse = await response.json();
      setDeletedTestCases(data.testCases);
      setTotal(data.total);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [testSpecId]);

  // Restore handler
  const handleRestore = useCallback(
    async (testCaseId: string) => {
      setRestoringId(testCaseId);
      try {
        const response = await fetch(`/api/test-specs/${testSpecId}/cases/${testCaseId}/restore`, {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '復元に失敗しました。');
        }

        toast.success('テストケースを復元しました。');
        await fetchDeletedTestCases();
        onRestore?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '復元に失敗しました。');
      } finally {
        setRestoringId(null);
      }
    },
    [testSpecId, fetchDeletedTestCases, onRestore]
  );

  // Handle dialog open state change
  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        void fetchDeletedTestCases();
      }
    },
    [fetchDeletedTestCases]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className={
          trigger
            ? undefined
            : `inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground ${className || ''}`
        }
      >
        {trigger || (
          <>
            <Trash2 className="size-4" />
            削除済み ({total})
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>削除済みテストケース</DialogTitle>
          <DialogDescription>
            削除されたテストケースを復元できます。{total}件の削除済みテストケースがあります。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : deletedTestCases.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              削除済みテストケースはありません。
            </div>
          ) : (
            <ul className="space-y-2">
              {deletedTestCases.map((testCase) => (
                <li
                  key={testCase.id}
                  className={cn(
                    'flex items-center justify-between rounded-md border p-3',
                    'hover:bg-muted/50'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{testCase.title}</p>
                    <p className="text-xs text-muted-foreground">
                      削除日:{' '}
                      {testCase.deletedAt
                        ? new Date(testCase.deletedAt).toLocaleString('ja-JP')
                        : '-'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(testCase.id)}
                    disabled={isLocked || restoringId === testCase.id}
                  >
                    {restoringId === testCase.id ? (
                      <Loader2 className="mr-1 size-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1 size-4" />
                    )}
                    復元
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
