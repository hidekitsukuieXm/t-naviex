'use client';

import { type UserStatus, USER_STATUS_LABELS } from '@/types/user';

const STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
  SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
};

interface UserStatusBadgeProps {
  status: UserStatus;
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[status]}`}
    >
      {USER_STATUS_LABELS[status]}
    </span>
  );
}
