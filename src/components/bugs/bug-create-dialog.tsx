'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BugForm, type BugFormData } from './bug-form';
import { useToast } from '@/hooks/use-toast';

interface BugCreateDialogProps {
  projectId: string;
  testResultId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function BugCreateDialog({
  projectId,
  testResultId,
  trigger,
  onSuccess,
}: BugCreateDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: BugFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/bugs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          assigneeId: data.assigneeId ? parseInt(data.assigneeId, 10) : null,
          testResultId: data.testResultId ? parseInt(data.testResultId, 10) : null,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'バグの作成に失敗しました。');
      }

      const createdBug = await response.json();

      toast({
        title: 'バグを登録しました',
        description: `#${createdBug.id}: ${createdBug.title}`,
      });

      setOpen(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger || (
            <Button>
              <Plus className="mr-2 size-4" />
              新規バグ登録
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>新規バグ登録</DialogTitle>
          <DialogDescription>バグ・課題の情報を入力してください。</DialogDescription>
        </DialogHeader>
        <BugForm
          projectId={projectId}
          testResultId={testResultId}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
