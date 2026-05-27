/**
 * useMfa Custom Hook
 *
 * MFA操作を管理するカスタムフック
 */

'use client';

import { useState, useCallback } from 'react';
import type { MfaType, MfaStatusResponse, SetupMfaResponse, VerifyMfaResponse } from '@/types/mfa';

interface UseMfaOptions {
  userId: string;
  onSetupComplete?: () => void;
  onVerifySuccess?: () => void;
  onVerifyError?: (message: string) => void;
}

interface UseMfaResult {
  status: MfaStatusResponse | null;
  setupData: SetupMfaResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchStatus: () => Promise<void>;
  startSetup: (mfaType?: MfaType, accountName?: string) => Promise<void>;
  verifyAndEnable: (code: string) => Promise<boolean>;
  verify: (code: string) => Promise<boolean>;
  disable: (code: string) => Promise<boolean>;
  regenerateBackupCodes: (code: string) => Promise<string[] | null>;
}

export function useMfa({
  userId,
  onSetupComplete,
  onVerifySuccess,
  onVerifyError,
}: UseMfaOptions): UseMfaResult {
  const [status, setStatus] = useState<MfaStatusResponse | null>(null);
  const [setupData, setSetupData] = useState<SetupMfaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MFAステータスを取得
  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/mfa?userId=${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ステータスの取得に失敗しました');
      }

      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ステータスの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // MFAセットアップを開始
  const startSetup = useCallback(
    async (mfaType: MfaType = 'TOTP' as MfaType, accountName?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            action: 'setup',
            mfaType,
            accountName,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'セットアップの開始に失敗しました');
        }

        setSetupData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'セットアップの開始に失敗しました');
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  // TOTPコードを検証してMFAを有効化
  const verifyAndEnable = useCallback(
    async (code: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            action: 'enable',
            code,
          }),
        });

        const data: VerifyMfaResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || '有効化に失敗しました');
        }

        setSetupData(null);
        onSetupComplete?.();
        await fetchStatus();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : '有効化に失敗しました';
        setError(message);
        onVerifyError?.(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, fetchStatus, onSetupComplete, onVerifyError]
  );

  // MFAコードを検証
  const verify = useCallback(
    async (code: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            action: 'verify',
            code,
          }),
        });

        const data: VerifyMfaResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || '認証に失敗しました');
        }

        onVerifySuccess?.();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : '認証に失敗しました';
        setError(message);
        onVerifyError?.(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, onVerifySuccess, onVerifyError]
  );

  // MFAを無効化
  const disable = useCallback(
    async (code: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            action: 'disable',
            code,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.message || '無効化に失敗しました');
        }

        await fetchStatus();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '無効化に失敗しました');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, fetchStatus]
  );

  // バックアップコードを再生成
  const regenerateBackupCodes = useCallback(
    async (code: string): Promise<string[] | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/mfa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            action: 'regenerate-backup-codes',
            code,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.message || '再生成に失敗しました');
        }

        await fetchStatus();
        return data.backupCodes;
      } catch (err) {
        setError(err instanceof Error ? err.message : '再生成に失敗しました');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [userId, fetchStatus]
  );

  return {
    status,
    setupData,
    isLoading,
    error,
    fetchStatus,
    startSetup,
    verifyAndEnable,
    verify,
    disable,
    regenerateBackupCodes,
  };
}
