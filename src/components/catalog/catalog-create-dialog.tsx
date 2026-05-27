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
import { CatalogForm, type CatalogFormData } from './catalog-form';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CatalogCreateDialogProps {
  projectId: string;
  categories: string[];
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function CatalogCreateDialog({
  projectId,
  categories,
  onSuccess,
  trigger,
}: CatalogCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: CatalogFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/catalog-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'カタログアイテムの作成に失敗しました');
      }

      toast({
        title: '作成完了',
        description: 'カタログアイテムを作成しました',
      });

      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({
        title: 'エラー',
        description:
          error instanceof Error ? error.message : 'カタログアイテムの作成に失敗しました',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            新規作成
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>カタログアイテムの作成</DialogTitle>
          <DialogDescription>再利用可能なテスト資産をカタログに登録します</DialogDescription>
        </DialogHeader>
        <CatalogForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
          submitLabel="作成"
          categories={categories}
        />
      </DialogContent>
    </Dialog>
  );
}
