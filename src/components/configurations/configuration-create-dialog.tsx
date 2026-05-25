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
import { ConfigurationForm, type ConfigurationFormData } from './configuration-form';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConfigurationCreateDialogProps {
  projectId: string;
  onSuccess: () => void;
}

export function ConfigurationCreateDialog({
  projectId,
  onSuccess,
}: ConfigurationCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: ConfigurationFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/configurations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          configParams: data.configParams,
          isActive: data.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'コンフィギュレーションの作成に失敗しました。');
      }

      toast({
        title: '作成完了',
        description: 'コンフィギュレーションを作成しました。',
      });

      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          新規コンフィギュレーション
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>コンフィギュレーション作成</DialogTitle>
          <DialogDescription>
            新しいテスト環境設定を作成します。必要な情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <ConfigurationForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
