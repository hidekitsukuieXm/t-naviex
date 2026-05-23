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
import { Plus } from 'lucide-react';
import { RoleForm, type RoleFormData } from './role-form';

interface RoleCreateDialogProps {
  onSuccess?: () => void;
}

export function RoleCreateDialog({ onSuccess }: RoleCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: RoleFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ロールの作成に失敗しました。');
      }

      setOpen(false);
      onSuccess?.();
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
            新規ロール
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>新規ロール作成</DialogTitle>
          <DialogDescription>新しいロールの情報と権限を設定してください。</DialogDescription>
        </DialogHeader>
        <RoleForm onSubmit={handleSubmit} onCancel={() => setOpen(false)} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
}
