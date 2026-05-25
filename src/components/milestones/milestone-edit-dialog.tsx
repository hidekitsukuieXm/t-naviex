'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MilestoneForm, type MilestoneFormData } from './milestone-form';
import { type Milestone } from '@/types/milestone';
import { useToast } from '@/hooks/use-toast';

interface MilestoneEditDialogProps {
  projectId: string;
  milestone: Milestone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MilestoneEditDialog({
  projectId,
  milestone,
  open,
  onOpenChange,
  onSuccess,
}: MilestoneEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: MilestoneFormData) => {
    if (!milestone) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/milestones/${milestone.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          status: data.status,
          startDate: data.startDate || null,
          dueDate: data.dueDate || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'マイルストーンの更新に失敗しました。');
      }

      toast({
        title: '更新完了',
        description: 'マイルストーンを更新しました。',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>マイルストーン編集</DialogTitle>
          <DialogDescription>マイルストーンの情報を編集します。</DialogDescription>
        </DialogHeader>
        {milestone && (
          <MilestoneForm
            key={milestone.id}
            initialData={milestone}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
