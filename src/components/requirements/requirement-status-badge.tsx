'use client';

import { Badge } from '@/components/ui/badge';
import type { RequirementStatus } from '@/types/requirement';
import { RequirementStatusLabels, RequirementStatusColors } from '@/types/requirement';

interface RequirementStatusBadgeProps {
  status: RequirementStatus;
  className?: string;
}

export function RequirementStatusBadge({ status, className }: RequirementStatusBadgeProps) {
  return (
    <Badge variant="outline" className={`${RequirementStatusColors[status]} ${className || ''}`}>
      {RequirementStatusLabels[status]}
    </Badge>
  );
}
