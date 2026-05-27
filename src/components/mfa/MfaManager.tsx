/**
 * MFA Manager Component
 *
 * MFA管理コンポーネント
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useMfa } from './useMfa';
import { MfaSetupForm } from './MfaSetupForm';
import { MfaBackupCodes } from './MfaBackupCodes';
import { getMfaTypeLabel } from '@/types/mfa';

interface MfaManagerProps {
  userId: string;
  accountName?: string;
}

type ManagerView = 'status' | 'setup' | 'disable' | 'regenerate';

export function MfaManager({ userId, accountName }: MfaManagerProps): React.ReactElement {
  const [view, setView] = useState<ManagerView>('status');
  const [disableCode, setDisableCode] = useState('');
  const [regenerateCode, setRegenerateCode] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  const { status, isLoading, error, fetchStatus, disable, regenerateBackupCodes } = useMfa({
    userId,
  });

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDisable = async () => {
    const success = await disable(disableCode);
    if (success) {
      setView('status');
      setDisableCode('');
    }
  };

  const handleRegenerate = async () => {
    const codes = await regenerateBackupCodes(regenerateCode);
    if (codes) {
      setNewBackupCodes(codes);
      setRegenerateCode('');
    }
  };

  // セットアップビュー
  if (view === 'setup') {
    return (
      <MfaSetupForm
        userId={userId}
        accountName={accountName}
        onComplete={() => {
          setView('status');
          fetchStatus();
        }}
        onCancel={() => setView('status')}
      />
    );
  }

  // 無効化ビュー
  if (view === 'disable') {
    return (
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-semibold mb-4">2段階認証を無効化</h3>

        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            2段階認証を無効化すると、アカウントのセキュリティが低下します。 本当に無効化しますか？
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">認証コードを入力</label>
          <input
            type="text"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            placeholder="000000 または XXXX-XXXX"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setView('status');
              setDisableCode('');
            }}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleDisable}
            disabled={isLoading || !disableCode}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? '処理中...' : '無効化'}
          </button>
        </div>
      </div>
    );
  }

  // バックアップコード再生成ビュー
  if (view === 'regenerate') {
    return (
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-semibold mb-4">バックアップコードを再生成</h3>

        {newBackupCodes ? (
          <>
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                新しいバックアップコードが生成されました。以前のコードは使用できなくなります。
              </p>
            </div>

            <MfaBackupCodes codes={newBackupCodes} showCodes={true} />

            <button
              onClick={() => {
                setView('status');
                setNewBackupCodes(null);
              }}
              className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              完了
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                新しいバックアップコードを生成すると、以前のコードは無効になります。
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                認証コードを入力
              </label>
              <input
                type="text"
                value={regenerateCode}
                onChange={(e) => setRegenerateCode(e.target.value)}
                placeholder="000000"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setView('status');
                  setRegenerateCode('');
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isLoading || !regenerateCode}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? '処理中...' : '再生成'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ステータスビュー
  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">2段階認証</h3>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded-lg"></div>
          <div className="h-10 bg-gray-200 rounded-lg"></div>
        </div>
      ) : status?.isEnabled ? (
        <>
          {/* 有効時のステータス */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <div className="font-medium text-green-800">2段階認証が有効です</div>
                <div className="text-sm text-green-600">
                  {status.mfaType && getMfaTypeLabel(status.mfaType)}
                </div>
              </div>
            </div>
          </div>

          {/* バックアップコード残り */}
          {status.backupCodesRemaining !== undefined && (
            <div
              className={`p-4 rounded-lg border mb-4 ${
                status.backupCodesRemaining <= 3
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">バックアップコード</div>
                  <div className="text-sm text-gray-600">残り {status.backupCodesRemaining} 個</div>
                </div>
                <button
                  onClick={() => setView('regenerate')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  再生成
                </button>
              </div>
            </div>
          )}

          {/* 最終使用日時 */}
          {status.lastUsedAt && (
            <div className="text-sm text-gray-500 mb-4">
              最終認証: {new Date(status.lastUsedAt).toLocaleString('ja-JP')}
            </div>
          )}

          {/* 無効化ボタン */}
          <button
            onClick={() => setView('disable')}
            className="w-full py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
          >
            2段階認証を無効化
          </button>
        </>
      ) : (
        <>
          {/* 無効時の表示 */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
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
              </div>
              <div>
                <div className="font-medium text-yellow-800">2段階認証が無効です</div>
                <div className="text-sm text-yellow-600">
                  セキュリティを強化するために有効化をお勧めします
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setView('setup')}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            2段階認証を設定
          </button>
        </>
      )}
    </div>
  );
}
