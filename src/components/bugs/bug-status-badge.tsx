'use client';

import { Badge } from '@/components/ui/badge';
import { type BugStatus, BugStatusLabels, getBugStatusColor } from '@/types/bug';
import { cn } from '@/lib/utils';

interface BugStatusBadgeProps {
  status: BugStatus;
  className?: string;
  size?: 'default' | 'sm';
}

export function BugStatusBadge({ status, className, size = 'default' }: BugStatusBadgeProps) {
  return (
    <Badge
      className={cn(getBugStatusColor(status), size === 'sm' && 'text-xs px-1.5 py-0', className)}
    >
      {BugStatusLabels[status]}
    </Badge>
  );
}
