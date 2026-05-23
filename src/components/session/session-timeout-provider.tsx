'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { SessionTimeoutWarningDialog } from './session-timeout-warning-dialog';
import type { SessionSettings, SessionWarningState } from '@/types/session-settings';
import { DEFAULT_SESSION_SETTINGS } from '@/types/session-settings';

interface SessionTimeoutContextValue {
  state: SessionWarningState;
  remainingSeconds: number;
  extendSession: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextValue | null>(null);

export function useSessionTimeout() {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeout must be used within a SessionTimeoutProvider');
  }
  return context;
}

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
}

export function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<SessionSettings | null>(null);
  const [state, setState] = useState<SessionWarningState>('active');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 初回マウント時にタイムスタンプを設定
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // セッション設定を取得
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/session-settings')
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setSettings(data);
          }
        })
        .catch(() => {
          // エラー時はデフォルト値を使用
          setSettings({
            id: '0',
            ...DEFAULT_SESSION_SETTINGS,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        });
    }
  }, [status]);

  // セッション延長
  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setState('active');
    setShowWarning(false);
    setRemainingSeconds(0);
  }, []);

  // ログアウト
  const handleLogout = useCallback(() => {
    signOut({ callbackUrl: '/login' });
  }, []);

  // アクティビティ検出
  useEffect(() => {
    if (!settings?.extendOnActivity || status !== 'authenticated') return;

    const handleActivity = () => {
      if (state === 'active') {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [settings?.extendOnActivity, state, status]);

  // タイムアウトチェック
  useEffect(() => {
    if (!settings || status !== 'authenticated') return;

    const checkTimeout = () => {
      const now = Date.now();
      const elapsed = (now - lastActivityRef.current) / 1000;
      const timeoutSeconds = settings.sessionTimeoutMinutes * 60;
      const warningSeconds = settings.warningBeforeMinutes * 60;
      const remaining = timeoutSeconds - elapsed;

      if (remaining <= 0) {
        setState('expired');
        setShowWarning(false);
        handleLogout();
      } else if (remaining <= warningSeconds) {
        setState('warning');
        setRemainingSeconds(Math.ceil(remaining));
        setShowWarning(true);
      } else {
        setState('active');
        setRemainingSeconds(0);
        setShowWarning(false);
      }
    };

    // 初回チェック
    checkTimeout();

    // 1秒ごとにチェック
    timerRef.current = setInterval(checkTimeout, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [settings, status, handleLogout]);

  // 認証されていない場合は何も表示しない
  if (status !== 'authenticated' || !session) {
    return <>{children}</>;
  }

  return (
    <SessionTimeoutContext.Provider value={{ state, remainingSeconds, extendSession }}>
      {children}
      <SessionTimeoutWarningDialog
        open={showWarning}
        remainingSeconds={remainingSeconds}
        onExtend={extendSession}
        onLogout={handleLogout}
      />
    </SessionTimeoutContext.Provider>
  );
}
