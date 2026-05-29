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
import { BaselineForm, type BaselineFormData } from './baseline-form';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BaselineCreateDialogProps {
  projectId: string;
  testSpecId: string;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function BaselineCreateDialog({
  projectId,
  testSpecId,
  onSuccess,
  trigger,
}: BaselineCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: BaselineFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-specs/${testSpecId}/baselines`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ベースラインの作成に失敗しました');
      }

      const baseline = await response.json();

      toast({
        title: '作成完了',
        description: `ベースライン "${baseline.name}" を作成しました（${baseline.totalCases}ケース、${baseline.totalSteps}ステップ）`,
      });

      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ベースラインの作成に失敗しました',
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
              ベースライン作成
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ベースラインの作成</DialogTitle>
          <DialogDescription>
            現在のテスト仕様書のスナップショットをベースラインとして保存します
          </DialogDescription>
        </DialogHeader>
        <BaselineForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
          submitLabel="作成"
        />
      </DialogContent>
    </Dialog>
  );
}
