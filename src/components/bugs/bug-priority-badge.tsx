'use client';

import { Badge } from '@/components/ui/badge';
import { type BugPriority, BugPriorityLabels, getBugPriorityColor } from '@/types/bug';

interface BugPriorityBadgeProps {
  priority: BugPriority;
  className?: string;
}

export function BugPriorityBadge({ priority, className }: BugPriorityBadgeProps) {
  return (
    <Badge className={`${getBugPriorityColor(priority)} ${className || ''}`}>
      {BugPriorityLabels[priority]}
    </Badge>
  );
}
