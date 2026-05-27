/**
 * Lock Warning Toast Component
 *
 * ロック期限切れ警告トーストコンポーネント
 */

'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { formatRemainingTime } from '@/types/edit-lock';

interface LockWarningToastProps {
  remainingTime: number;
  onExtend?: () => void;
  onDismiss?: () => void;
}

export function LockWarningToast({
  remainingTime,
  onExtend,
  onDismiss,
}: LockWarningToastProps): React.ReactElement | null {
  const [visible, setVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(remainingTime);
  const initializedRef = useRef(false);

  const updateTime = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    updateTime(remainingTime);
  }, [remainingTime, updateTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!visible || currentTime <= 0) {
    return null;
  }

  const isCritical = currentTime <= 60;

  return (
    <div
      className={`fixed bottom-4 right-4 max-w-sm p-4 rounded-lg shadow-lg border ${
        isCritical ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isCritical ? 'bg-red-100' : 'bg-yellow-100'
          }`}
        >
          <svg
            className={`w-5 h-5 ${isCritical ? 'text-red-600' : 'text-yellow-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h4 className={`font-medium ${isCritical ? 'text-red-800' : 'text-yellow-800'}`}>
            {isCritical ? 'ロックがまもなく解除されます' : '編集ロックの期限が近づいています'}
          </h4>
          <p className={`text-sm mt-1 ${isCritical ? 'text-red-600' : 'text-yellow-600'}`}>
            残り時間: {formatRemainingTime(currentTime)}
          </p>

          <div className="mt-3 flex gap-2">
            {onExtend && (
              <button
                onClick={onExtend}
                className={`px-3 py-1 text-sm font-medium rounded ${
                  isCritical
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                延長する
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => {
                  setVisible(false);
                  onDismiss();
                }}
                className={`px-3 py-1 text-sm font-medium rounded ${
                  isCritical
                    ? 'text-red-600 hover:bg-red-100'
                    : 'text-yellow-600 hover:bg-yellow-100'
                }`}
              >
                閉じる
              </button>
            )}
          </div>
        </div>

        <button onClick={() => setVisible(false)} className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
