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
import type { Role } from '@/types/role';
import { RoleForm, type RoleFormData } from './role-form';

interface RoleEditDialogProps {
  role: Role;
  onSuccess?: () => void;
}

export function RoleEditDialog({ role, onSuccess }: RoleEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: RoleFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: data.displayName,
          description: data.description || null,
          permissions: data.permissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ロールの更新に失敗しました。');
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>ロール編集</DialogTitle>
          <DialogDescription>
            {role.isSystemRole
              ? 'システムロールの権限を編集できます。ロール名は変更できません。'
              : 'ロールの情報と権限を編集してください。'}
          </DialogDescription>
        </DialogHeader>
        <RoleForm
          role={role}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
