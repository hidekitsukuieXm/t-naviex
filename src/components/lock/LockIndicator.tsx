/**
 * Lock Indicator Component
 *
 * ロック状態表示コンポーネント
 */

'use client';

import React from 'react';
import type { EditLock } from '@/types/edit-lock';
import { formatRemainingTime, LOCK_WARNING_THRESHOLD } from '@/types/edit-lock';

interface LockIndicatorProps {
  lock?: EditLock;
  isOwnLock?: boolean;
  remainingTime?: number;
  onRelease?: () => void;
  className?: string;
}

export function LockIndicator({
  lock,
  isOwnLock,
  remainingTime,
  onRelease,
  className = '',
}: LockIndicatorProps): React.ReactElement | null {
  if (!lock) {
    return null;
  }

  const isWarning = remainingTime !== undefined && remainingTime <= LOCK_WARNING_THRESHOLD;
  const isCritical = remainingTime !== undefined && remainingTime <= 60;

  const bgColor = isCritical
    ? 'bg-red-100 border-red-200'
    : isWarning
      ? 'bg-yellow-100 border-yellow-200'
      : isOwnLock
        ? 'bg-blue-100 border-blue-200'
        : 'bg-gray-100 border-gray-200';

  const textColor = isCritical
    ? 'text-red-700'
    : isWarning
      ? 'text-yellow-700'
      : isOwnLock
        ? 'text-blue-700'
        : 'text-gray-700';

  const iconColor = isCritical
    ? 'text-red-500'
    : isWarning
      ? 'text-yellow-500'
      : isOwnLock
        ? 'text-blue-500'
        : 'text-gray-500';

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bgColor} ${className}`}>
      <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isOwnLock ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        )}
      </svg>

      <div className="flex-1">
        {isOwnLock ? (
          <span className={`text-sm ${textColor}`}>
            編集中
            {remainingTime !== undefined && (
              <span className="ml-2 font-medium">(残り {formatRemainingTime(remainingTime)})</span>
            )}
          </span>
        ) : (
          <span className={`text-sm ${textColor}`}>
            {lock.userName || `ユーザー${lock.userId}`} が編集中です
          </span>
        )}
      </div>

      {isOwnLock && onRelease && (
        <button
          onClick={onRelease}
          className="text-sm text-gray-500 hover:text-gray-700"
          title="ロックを解除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
