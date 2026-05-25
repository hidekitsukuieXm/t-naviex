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
import { MilestoneForm, type MilestoneFormData } from './milestone-form';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MilestoneCreateDialogProps {
  projectId: string;
  onSuccess: () => void;
}

export function MilestoneCreateDialog({ projectId, onSuccess }: MilestoneCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: MilestoneFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
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
        throw new Error(errorData.error || 'マイルストーンの作成に失敗しました。');
      }

      toast({
        title: '作成完了',
        description: 'マイルストーンを作成しました。',
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
          新規マイルストーン
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>マイルストーン作成</DialogTitle>
          <DialogDescription>
            新しいマイルストーンを作成します。必要な情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <MilestoneForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
