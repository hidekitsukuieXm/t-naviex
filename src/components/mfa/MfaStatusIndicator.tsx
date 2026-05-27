/**
 * MFA Status Indicator Component
 *
 * MFAステータス表示コンポーネント
 */

'use client';

import React, { useEffect } from 'react';
import { useMfa } from './useMfa';
import { getMfaTypeLabel } from '@/types/mfa';

interface MfaStatusIndicatorProps {
  userId: string;
  onSetup?: () => void;
  onManage?: () => void;
}

export function MfaStatusIndicator({
  userId,
  onSetup,
  onManage,
}: MfaStatusIndicatorProps): React.ReactElement {
  const { status, isLoading, fetchStatus } = useMfa({ userId });

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  const isEnabled = status?.isEnabled;

  return (
    <div
      className={`p-4 rounded-lg border ${
        isEnabled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isEnabled ? 'bg-green-100' : 'bg-yellow-100'
            }`}
          >
            {isEnabled ? (
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-yellow-600"
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
            )}
          </div>

          <div>
            <div className={`font-medium ${isEnabled ? 'text-green-800' : 'text-yellow-800'}`}>
              {isEnabled ? '2段階認証が有効です' : '2段階認証が無効です'}
            </div>
            {isEnabled && status?.mfaType && (
              <div className="text-sm text-green-600">
                {getMfaTypeLabel(status.mfaType)}
                {status.backupCodesRemaining !== undefined && (
                  <span className="ml-2">
                    (バックアップコード残り: {status.backupCodesRemaining}個)
                  </span>
                )}
              </div>
            )}
            {!isEnabled && (
              <div className="text-sm text-yellow-600">
                アカウントのセキュリティを強化するために有効化することをお勧めします
              </div>
            )}
          </div>
        </div>

        <div>
          {isEnabled
            ? onManage && (
                <button
                  onClick={onManage}
                  className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
                >
                  管理
                </button>
              )
            : onSetup && (
                <button
                  onClick={onSetup}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  設定する
                </button>
              )}
        </div>
      </div>

      {/* バックアップコード残り警告 */}
      {isEnabled &&
        status?.backupCodesRemaining !== undefined &&
        status.backupCodesRemaining <= 3 && (
          <div className="mt-3 p-2 bg-yellow-100 rounded text-sm text-yellow-800">
            バックアップコードの残りが少なくなっています。新しいコードを生成することをお勧めします。
          </div>
        )}
    </div>
  );
}
