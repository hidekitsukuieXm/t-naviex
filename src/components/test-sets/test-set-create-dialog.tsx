'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TestSetForm, type TestSetFormData } from './test-set-form';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestSetCreateDialogProps {
  projectId: string;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function TestSetCreateDialog({ projectId, onSuccess, trigger }: TestSetCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: TestSetFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/test-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テストセットの作成に失敗しました');
      }

      toast({
        title: '作成完了',
        description: 'テストセットを作成しました',
      });

      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'テストセットの作成に失敗しました',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger || (
            <Button size="sm">
              <Plus className="mr-2 size-4" />
              新規作成
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>テストセットの作成</DialogTitle>
          <DialogDescription>
            テストケースをグルーピングするテストセットを作成します
          </DialogDescription>
        </DialogHeader>
        <TestSetForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
          submitLabel="作成"
        />
      </DialogContent>
    </Dialog>
  );
}
