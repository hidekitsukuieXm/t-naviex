'use client';

import { Badge } from '@/components/ui/badge';
import { type BugType, BugTypeLabels, getBugTypeColor } from '@/types/bug';

interface BugTypeBadgeProps {
  type: BugType;
  className?: string;
}

export function BugTypeBadge({ type, className }: BugTypeBadgeProps) {
  return (
    <Badge className={`${getBugTypeColor(type)} ${className || ''}`}>{BugTypeLabels[type]}</Badge>
  );
}
