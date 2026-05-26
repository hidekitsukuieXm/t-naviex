'use client';

import { Badge } from '@/components/ui/badge';
import { type BugStatus, BugStatusLabels, getBugStatusColor } from '@/types/bug';

interface BugStatusBadgeProps {
  status: BugStatus;
  className?: string;
}

export function BugStatusBadge({ status, className }: BugStatusBadgeProps) {
  return (
    <Badge className={`${getBugStatusColor(status)} ${className || ''}`}>
      {BugStatusLabels[status]}
    </Badge>
  );
}
