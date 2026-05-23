'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { type UserStatus, USER_STATUS_LABELS } from '@/types/user';

interface UserStatusSelectProps {
  userId: string;
  currentStatus: UserStatus;
  onSuccess?: () => void;
}

export function UserStatusSelect({ userId, currentStatus, onSuccess }: UserStatusSelectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<UserStatus>(currentStatus);

  const handleStatusChange = async (newStatus: UserStatus) => {
    if (newStatus === status) return;

    setIsLoading(true);
    const previousStatus = status;
    setStatus(newStatus);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatus(previousStatus);
        throw new Error(errorData.error || 'ステータスの変更に失敗しました。');
      }

      onSuccess?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <Select
        value={status}
        onValueChange={(value) => handleStatusChange(value as UserStatus)}
        disabled={isLoading}
      >
        <SelectTrigger className="h-7 w-24 text-xs" size="sm">
          {isLoading ? <Loader2 className="size-3 animate-spin" /> : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(USER_STATUS_LABELS) as [UserStatus, string][]).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
