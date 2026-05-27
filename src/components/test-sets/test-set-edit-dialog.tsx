'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TestSetForm, type TestSetFormData } from './test-set-form';
import { type TestSetWithTags } from '@/types/test-set';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface TestSetEditDialogProps {
  projectId: string;
  testSet: TestSetWithTags | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TestSetEditDialog({
  projectId,
  testSet,
  open,
  onOpenChange,
  onSuccess,
}: TestSetEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [detailTestSet, setDetailTestSet] = useState<TestSetWithTags | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  // Fetch full test set details when dialog opens
  useEffect(() => {
    let isMounted = true;

    const fetchTestSetDetails = async () => {
      if (!open || !testSet) {
        if (isMounted) setDetailTestSet(null);
        return;
      }

      if (isMounted) setIsFetching(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/test-sets/${testSet.id}`);
        const data = await res.json();
        if (isMounted) setDetailTestSet(data);
      } catch (err) {
        console.error('Failed to fetch test set:', err);
        if (isMounted) {
          toast({
            title: 'エラー',
            description: 'テストセットの取得に失敗しました',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    fetchTestSetDetails();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, testSet?.id, projectId]);

  const handleSubmit = async (data: TestSetFormData) => {
    if (!testSet) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/test-sets/${testSet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テストセットの更新に失敗しました');
      }

      toast({
        title: '更新完了',
        description: 'テストセットを更新しました',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'テストセットの更新に失敗しました',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>テストセットの編集</DialogTitle>
          <DialogDescription>{testSet?.name}</DialogDescription>
        </DialogHeader>
        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : detailTestSet ? (
          <TestSetForm
            initialData={{
              name: detailTestSet.name,
              description: detailTestSet.description || '',
              status: detailTestSet.status,
              version: detailTestSet.version,
            }}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
            submitLabel="更新"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
