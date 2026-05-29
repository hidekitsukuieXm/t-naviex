/**
 * MFA Setup Form Component
 *
 * MFAセットアップフォームコンポーネント
 */

'use client';

import React, { useState } from 'react';
import { useMfa } from './useMfa';
import { MfaBackupCodes } from './MfaBackupCodes';
import { getMfaTypeLabel, getMfaTypeDescription, MfaType } from '@/types/mfa';

interface MfaSetupFormProps {
  userId: string;
  accountName?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

type SetupStep = 'select' | 'qrcode' | 'verify' | 'backup' | 'complete';

export function MfaSetupForm({
  userId,
  accountName,
  onComplete,
  onCancel,
}: MfaSetupFormProps): React.ReactElement {
  const [step, setStep] = useState<SetupStep>('select');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setSelectedType] = useState<MfaType>(MfaType.TOTP);
  const [verifyCode, setVerifyCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const { setupData, isLoading, error, startSetup, verifyAndEnable } = useMfa({
    userId,
    onSetupComplete: () => {
      setStep('complete');
      onComplete?.();
    },
  });

  const handleTypeSelect = async (type: MfaType) => {
    setSelectedType(type);
    await startSetup(type, accountName);
    setStep('qrcode');
  };

  const handleVerify = async () => {
    const success = await verifyAndEnable(verifyCode);
    if (success) {
      setStep('backup');
      setShowBackupCodes(true);
    }
  };

  const handleComplete = () => {
    setStep('complete');
    onComplete?.();
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* ステップインジケーター */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['認証方式', 'QRコード', '検証', '完了'].map((label, index) => {
            const steps: SetupStep[] = ['select', 'qrcode', 'verify', 'complete'];
            const currentIndex = steps.indexOf(step);
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={label} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  } ${isCurrent ? 'ring-2 ring-blue-300' : ''}`}
                >
                  {index + 1}
                </div>
                {index < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ステップ1: 認証方式選択 */}
      {step === 'select' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">認証方式を選択</h3>
          <div className="space-y-3">
            {Object.values(MfaType).map((type) => (
              <button
                key={type}
                onClick={() => handleTypeSelect(type)}
                disabled={isLoading || type !== MfaType.TOTP} // 現在はTOTPのみサポート
                className={`w-full p-4 border rounded-lg text-left transition-colors ${
                  type === MfaType.TOTP
                    ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                    : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="font-medium">{getMfaTypeLabel(type)}</div>
                <div className="text-sm text-gray-600 mt-1">{getMfaTypeDescription(type)}</div>
                {type !== MfaType.TOTP && (
                  <div className="text-xs text-gray-400 mt-1">（近日対応予定）</div>
                )}
              </button>
            ))}
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 w-full py-2 text-gray-600 hover:text-gray-800"
            >
              キャンセル
            </button>
          )}
        </div>
      )}

      {/* ステップ2: QRコード表示 */}
      {step === 'qrcode' && setupData && (
        <div>
          <h3 className="text-lg font-semibold mb-4">認証アプリを設定</h3>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Google Authenticator、Microsoft Authenticator、またはその他のTOTP対応アプリで
              下記のQRコードをスキャンしてください。
            </p>

            {/* QRコード表示（実際にはQRコードライブラリを使用） */}
            <div className="bg-white border rounded-lg p-4 flex flex-col items-center">
              <div className="w-48 h-48 bg-gray-100 border flex items-center justify-center mb-4">
                <div className="text-center text-sm text-gray-500">
                  <div>QRコード</div>
                  <div className="text-xs mt-1">(要QRコードライブラリ)</div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">手動入力用シークレット:</div>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                  {setupData.secret}
                </code>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('select')}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              戻る
            </button>
            <button
              onClick={() => setStep('verify')}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* ステップ3: 検証 */}
      {step === 'verify' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">認証コードを入力</h3>

          <p className="text-sm text-gray-600 mb-4">
            認証アプリに表示されている6桁のコードを入力してください。
          </p>

          <div className="mb-6">
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 text-2xl text-center font-mono border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={6}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('qrcode')}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              戻る
            </button>
            <button
              onClick={handleVerify}
              disabled={isLoading || verifyCode.length !== 6}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '検証中...' : '有効化'}
            </button>
          </div>
        </div>
      )}

      {/* ステップ4: バックアップコード表示 */}
      {step === 'backup' && setupData && (
        <div>
          <h3 className="text-lg font-semibold mb-4">バックアップコードを保存</h3>

          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              これらのコードは認証アプリが使用できない場合に必要です。
              安全な場所に保管してください。各コードは1回のみ使用できます。
            </p>
          </div>

          <MfaBackupCodes
            codes={setupData.backupCodes}
            showCodes={showBackupCodes}
            onToggleShow={() => setShowBackupCodes(!showBackupCodes)}
          />

          <button
            onClick={handleComplete}
            className="mt-6 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            完了
          </button>
        </div>
      )}

      {/* 完了 */}
      {step === 'complete' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
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
          <h3 className="text-lg font-semibold mb-2">MFAが有効化されました</h3>
          <p className="text-sm text-gray-600">次回のログインから2段階認証が必要になります。</p>
        </div>
      )}
    </div>
  );
}
