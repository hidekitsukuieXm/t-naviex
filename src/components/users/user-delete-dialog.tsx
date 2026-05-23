'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import type { User } from '@/types/user';

interface UserDeleteDialogProps {
  user: User;
  onSuccess?: () => void;
  disabled?: boolean;
}

export function UserDeleteDialog({ user, onSuccess, disabled }: UserDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ユーザーの削除に失敗しました。');
      }

      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={disabled}
          >
            <Trash2 className="mr-1 size-3" />
            削除
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[400px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            ユーザー削除の確認
          </DialogTitle>
          <DialogDescription>
            以下のユーザーを削除してもよろしいですか？この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-muted p-3">
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={isLoading} />}>
            キャンセル
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                削除中...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 size-4" />
                削除する
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
