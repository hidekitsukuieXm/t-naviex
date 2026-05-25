'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfigurationForm, type ConfigurationFormData } from './configuration-form';
import type { Configuration } from '@/types/configuration';
import { useToast } from '@/hooks/use-toast';

interface ConfigurationEditDialogProps {
  projectId: string;
  configuration: Configuration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ConfigurationEditDialog({
  projectId,
  configuration,
  open,
  onOpenChange,
  onSuccess,
}: ConfigurationEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIsSubmitting(false);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (data: ConfigurationFormData) => {
    if (!configuration) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/configurations/${configuration.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name,
            description: data.description || null,
            configParams: data.configParams,
            isActive: data.isActive,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'コンフィギュレーションの更新に失敗しました。');
      }

      toast({
        title: '更新完了',
        description: 'コンフィギュレーションを更新しました。',
      });

      onOpenChange(false);
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

  if (!configuration) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>コンフィギュレーション編集</DialogTitle>
          <DialogDescription>テスト環境設定を編集します。</DialogDescription>
        </DialogHeader>
        <ConfigurationForm
          key={configuration.id}
          initialData={configuration}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
