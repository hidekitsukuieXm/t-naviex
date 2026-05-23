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
import { UserForm, type UserFormData } from './user-form';

interface UserCreateDialogProps {
  onSuccess?: () => void;
}

export function UserCreateDialog({ onSuccess }: UserCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Omit<UserFormData, 'confirmPassword'>) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ユーザーの作成に失敗しました。');
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
            新規ユーザー
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新規ユーザー作成</DialogTitle>
          <DialogDescription>新しいユーザーの情報を入力してください。</DialogDescription>
        </DialogHeader>
        <UserForm onSubmit={handleSubmit} onCancel={() => setOpen(false)} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
}
