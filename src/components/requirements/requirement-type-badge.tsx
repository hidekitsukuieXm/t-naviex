'use client';

import { Badge } from '@/components/ui/badge';
import type { RequirementType } from '@/types/requirement';
import { RequirementTypeLabels } from '@/types/requirement';

const typeColors: Record<RequirementType, string> = {
  FUNCTIONAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  NON_FUNCTIONAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  CONSTRAINT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  INTERFACE: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  DESIGN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  USER_STORY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

interface RequirementTypeBadgeProps {
  type: RequirementType;
  className?: string;
}

export function RequirementTypeBadge({ type, className }: RequirementTypeBadgeProps) {
  return (
    <Badge variant="outline" className={`${typeColors[type]} ${className || ''}`}>
      {RequirementTypeLabels[type]}
    </Badge>
  );
}
