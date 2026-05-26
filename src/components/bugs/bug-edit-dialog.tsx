'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BugForm, type BugFormData } from './bug-form';
import { type BugWithRelations } from '@/types/bug';
import { useToast } from '@/hooks/use-toast';

interface BugEditDialogProps {
  projectId: string;
  bug: BugWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BugEditDialog({
  projectId,
  bug,
  open,
  onOpenChange,
  onSuccess,
}: BugEditDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: BugFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/bugs/${bug.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          assigneeId: data.assigneeId ? parseInt(data.assigneeId, 10) : null,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'バグの更新に失敗しました。');
      }

      toast({
        title: 'バグを更新しました',
        description: data.title,
      });

      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>バグを編集</DialogTitle>
          <DialogDescription>バグ・課題の情報を編集してください。</DialogDescription>
        </DialogHeader>
        <BugForm
          projectId={projectId}
          bug={bug}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
