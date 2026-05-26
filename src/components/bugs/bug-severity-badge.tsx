'use client';

import { Badge } from '@/components/ui/badge';
import { type BugSeverity, BugSeverityLabels, getBugSeverityColor } from '@/types/bug';

interface BugSeverityBadgeProps {
  severity: BugSeverity;
  className?: string;
}

export function BugSeverityBadge({ severity, className }: BugSeverityBadgeProps) {
  return (
    <Badge className={`${getBugSeverityColor(severity)} ${className || ''}`}>
      {BugSeverityLabels[severity]}
    </Badge>
  );
}
