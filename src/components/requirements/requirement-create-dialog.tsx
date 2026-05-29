'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RequirementForm } from './requirement-form';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import type { RequirementSafe } from '@/types/requirement';

interface RequirementCreateDialogProps {
  projectId: string;
  parentId?: string | null;
  onSuccess?: (requirement: RequirementSafe) => void;
}

export function RequirementCreateDialog({
  projectId,
  parentId,
  onSuccess,
}: RequirementCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parentOptions, setParentOptions] = useState<
    Array<{ id: string; code: string; title: string }>
  >([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const fetchParentOptions = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/requirements`);
        if (response.ok && isMounted) {
          const data = await response.json();
          setParentOptions(
            data.requirements.map((r: RequirementSafe) => ({
              id: r.id,
              code: r.code,
              title: r.title,
            }))
          );
        }
      } catch {
        // Silently ignore errors
      }
    };

    fetchParentOptions();

    return () => {
      isMounted = false;
    };
  }, [open, projectId]);

  const handleSubmit = async (data: {
    code: string;
    title: string;
    description?: string | null;
    content?: string | null;
    type: string;
    status: string;
    priority: string;
    version?: string | null;
    source?: string | null;
    rationale?: string | null;
    acceptance?: string | null;
    parentId?: string | null;
  }) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          parentId: data.parentId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '要求仕様の作成に失敗しました。');
      }

      const requirement = await response.json();

      toast({
        title: '作成完了',
        description: '要求仕様を作成しました。',
      });

      setOpen(false);
      onSuccess?.(requirement);
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '要求仕様の作成に失敗しました。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 size-4" />
            新規要求仕様
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>新規要求仕様の作成</DialogTitle>
          <DialogDescription>
            プロジェクトの要求仕様を作成します。必須項目を入力してください。
          </DialogDescription>
        </DialogHeader>
        <RequirementForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
          parentOptions={parentOptions}
          defaultValues={{ parentId }}
        />
      </DialogContent>
    </Dialog>
  );
}
