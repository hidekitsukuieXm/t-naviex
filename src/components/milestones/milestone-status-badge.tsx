'use client';

import { cn } from '@/lib/utils';
import {
  type MilestoneStatus,
  getMilestoneStatusLabel,
  getMilestoneStatusColor,
} from '@/types/milestone';

interface MilestoneStatusBadgeProps {
  status: MilestoneStatus;
  className?: string;
}

export function MilestoneStatusBadge({ status, className }: MilestoneStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        getMilestoneStatusColor(status),
        className
      )}
    >
      {getMilestoneStatusLabel(status)}
    </span>
  );
}
