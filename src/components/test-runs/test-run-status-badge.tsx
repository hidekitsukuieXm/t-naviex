'use client';

import { Badge } from '@/components/ui/badge';
import { type TestRunStatus, getTestRunStatusLabel, getTestRunStatusColor } from '@/types/test-run';

interface TestRunStatusBadgeProps {
  status: TestRunStatus;
  className?: string;
}

export function TestRunStatusBadge({ status, className }: TestRunStatusBadgeProps) {
  return (
    <Badge className={`${getTestRunStatusColor(status)} ${className || ''}`}>
      {getTestRunStatusLabel(status)}
    </Badge>
  );
}
