'use client';

import { Badge } from '@/components/ui/badge';
import type { RequirementPriority } from '@/types/requirement';
import { RequirementPriorityLabels, RequirementPriorityColors } from '@/types/requirement';

interface RequirementPriorityBadgeProps {
  priority: RequirementPriority;
  className?: string;
}

export function RequirementPriorityBadge({ priority, className }: RequirementPriorityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`${RequirementPriorityColors[priority]} ${className || ''}`}
    >
      {RequirementPriorityLabels[priority]}
    </Badge>
  );
}
