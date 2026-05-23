'use client';

import { cn } from '@/lib/utils';
import { Shield, ShieldCheck } from 'lucide-react';

interface RoleBadgeProps {
  displayName: string;
  isSystemRole: boolean;
  className?: string;
}

export function RoleBadge({ displayName, isSystemRole, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        isSystemRole
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        className
      )}
    >
      {isSystemRole ? <ShieldCheck className="size-3" /> : <Shield className="size-3" />}
      {displayName}
    </span>
  );
}
