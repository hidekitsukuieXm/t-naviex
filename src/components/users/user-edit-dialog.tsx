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
import { Pencil } from 'lucide-react';
import { UserForm, type UserFormData } from './user-form';
import type { User } from '@/types/user';

interface UserEditDialogProps {
  user: User;
  onSuccess?: () => void;
}

export function UserEditDialog({ user, onSuccess }: UserEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Omit<UserFormData, 'confirmPassword'>) => {
    setIsLoading(true);

    try {
      const updateData: Record<string, unknown> = {
        email: data.email,
        name: data.name,
        status: data.status,
      };

      // Only include password if it was provided
      if (data.password) {
        updateData.password = data.password;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ユーザーの更新に失敗しました。');
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
          <Button variant="outline" size="sm">
            <Pencil className="mr-1 size-3" />
            編集
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>ユーザー編集</DialogTitle>
          <DialogDescription>ユーザー情報を編集してください。</DialogDescription>
        </DialogHeader>
        <UserForm
          user={user}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
