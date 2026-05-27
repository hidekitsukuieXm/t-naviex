/**
 * useLock Custom Hook
 *
 * 編集ロックを管理するカスタムフック
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { EditLock, LockTargetType, LockStatusResponse } from '@/types/edit-lock';
import {
  LOCK_HEARTBEAT_INTERVAL,
  LOCK_WARNING_THRESHOLD,
  getRemainingLockTime,
} from '@/types/edit-lock';

interface UseLockOptions {
  targetType: LockTargetType;
  targetId: string;
  autoAcquire?: boolean;
  autoRelease?: boolean;
  duration?: number;
  onLockAcquired?: (lock: EditLock) => void;
  onLockLost?: () => void;
  onLockWarning?: (remainingTime: number) => void;
}

interface UseLockResult {
  lock: EditLock | null;
  isLocked: boolean;
  isOwnLock: boolean;
  remainingTime: number;
  isLoading: boolean;
  error: string | null;
  acquire: () => Promise<boolean>;
  release: () => Promise<boolean>;
  refresh: () => Promise<boolean>;
}

export function useLock({
  targetType,
  targetId,
  autoAcquire = false,
  autoRelease = true,
  duration,
  onLockAcquired,
  onLockLost,
  onLockWarning,
}: UseLockOptions): UseLockResult {
  const [lock, setLock] = useState<EditLock | null>(null);
  const [isOwnLock, setIsOwnLock] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const warningTriggeredRef = useRef(false);
  const initializedRef = useRef(false);

  // ロック状態を確認
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/locks?targetType=${targetType}&targetId=${targetId}`);
      const data: LockStatusResponse = await response.json();

      if (data.isLocked && data.lock) {
        setLock(data.lock);
        setIsOwnLock(data.isOwnLock || false);
        setRemainingTime(data.remainingTime || 0);
      } else {
        setLock(null);
        setIsOwnLock(false);
        setRemainingTime(0);
      }
    } catch (err) {
      console.error('Failed to check lock status:', err);
    }
  }, [targetType, targetId]);

  // ロックを取得
  const acquire = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, duration }),
      });

      const data = await response.json();

      if (data.acquired) {
        setLock(data.lock);
        setIsOwnLock(true);
        setRemainingTime(getRemainingLockTime(data.lock));
        warningTriggeredRef.current = false;
        onLockAcquired?.(data.lock);
        return true;
      } else {
        setLock(data.lock);
        setIsOwnLock(false);
        setError(data.message || 'ロックの取得に失敗しました');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ロックの取得に失敗しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [targetType, targetId, duration, onLockAcquired]);

  // ロックを解放
  const release = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/locks?targetType=${targetType}&targetId=${targetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLock(null);
        setIsOwnLock(false);
        setRemainingTime(0);
        return true;
      } else {
        const data = await response.json();
        setError(data.error || 'ロックの解放に失敗しました');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ロックの解放に失敗しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [targetType, targetId]);

  // ロックを更新（ハートビート）
  const refresh = useCallback(async (): Promise<boolean> => {
    if (!isOwnLock) return false;

    try {
      const response = await fetch('/api/locks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, duration }),
      });

      if (response.ok) {
        const data = await response.json();
        setLock(data.lock);
        setRemainingTime(getRemainingLockTime(data.lock));
        warningTriggeredRef.current = false;
        return true;
      } else {
        // ロックが失われた
        setLock(null);
        setIsOwnLock(false);
        onLockLost?.();
        return false;
      }
    } catch (err) {
      console.error('Failed to refresh lock:', err);
      return false;
    }
  }, [targetType, targetId, duration, isOwnLock, onLockLost]);

  // ハートビート（定期的なロック更新）
  useEffect(() => {
    if (isOwnLock && lock) {
      heartbeatRef.current = setInterval(() => {
        refresh();
      }, LOCK_HEARTBEAT_INTERVAL * 1000);

      return () => {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }
      };
    }
  }, [isOwnLock, lock, refresh]);

  // 残り時間カウントダウン
  useEffect(() => {
    if (isOwnLock && remainingTime > 0) {
      countdownRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          const newTime = Math.max(0, prev - 1);

          // 警告閾値に達したら通知
          if (newTime <= LOCK_WARNING_THRESHOLD && !warningTriggeredRef.current) {
            warningTriggeredRef.current = true;
            onLockWarning?.(newTime);
          }

          // 期限切れ
          if (newTime === 0) {
            onLockLost?.();
          }

          return newTime;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [isOwnLock, remainingTime, onLockWarning, onLockLost]);

  // 自動取得
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Use queueMicrotask to defer state updates
    queueMicrotask(() => {
      if (autoAcquire && targetId) {
        acquire();
      } else {
        checkStatus();
      }
    });
  }, [autoAcquire, targetId, acquire, checkStatus]);

  // 自動解放（アンマウント時）
  useEffect(() => {
    return () => {
      if (autoRelease && isOwnLock) {
        fetch(`/api/locks?targetType=${targetType}&targetId=${targetId}`, {
          method: 'DELETE',
        }).catch(console.error);
      }
    };
  }, [autoRelease, isOwnLock, targetType, targetId]);

  return {
    lock,
    isLocked: !!lock,
    isOwnLock,
    remainingTime,
    isLoading,
    error,
    acquire,
    release,
    refresh,
  };
}
