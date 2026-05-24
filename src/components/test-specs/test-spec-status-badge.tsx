'use client';

import { type TestSpecStatus, TEST_SPEC_STATUS_LABELS } from '@/types/test-spec';

const STATUS_COLORS: Record<TestSpecStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
  REVIEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  ARCHIVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
};

interface TestSpecStatusBadgeProps {
  status: TestSpecStatus;
  className?: string;
}

export function TestSpecStatusBadge({ status, className = '' }: TestSpecStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[status]} ${className}`}
    >
      {TEST_SPEC_STATUS_LABELS[status]}
    </span>
  );
}
