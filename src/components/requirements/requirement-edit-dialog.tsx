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
import { Pencil } from 'lucide-react';
import type { RequirementSafe } from '@/types/requirement';

interface RequirementEditDialogProps {
  projectId: string;
  requirement: RequirementSafe;
  onSuccess?: (requirement: RequirementSafe) => void;
  trigger?: React.ReactNode;
}

export function RequirementEditDialog({
  projectId,
  requirement,
  onSuccess,
  trigger,
}: RequirementEditDialogProps) {
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
      const response = await fetch(`/api/projects/${projectId}/requirements/${requirement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          parentId: data.parentId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '要求仕様の更新に失敗しました。');
      }

      const updatedRequirement = await response.json();

      toast({
        title: '更新完了',
        description: '要求仕様を更新しました。',
      });

      setOpen(false);
      onSuccess?.(updatedRequirement);
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '要求仕様の更新に失敗しました。',
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
          trigger || (
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 size-4" />
              編集
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>要求仕様の編集</DialogTitle>
          <DialogDescription>
            [{requirement.code}] {requirement.title}
          </DialogDescription>
        </DialogHeader>
        <RequirementForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
          parentOptions={parentOptions}
          requirement={requirement}
          defaultValues={{
            code: requirement.code,
            title: requirement.title,
            description: requirement.description,
            content: requirement.content,
            type: requirement.type,
            status: requirement.status,
            priority: requirement.priority,
            version: requirement.version,
            source: requirement.source,
            rationale: requirement.rationale,
            acceptance: requirement.acceptance,
            parentId: requirement.parentId,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
