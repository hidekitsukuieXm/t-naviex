/**
 * MFA Verify Form Component
 *
 * MFA検証フォームコンポーネント
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMfa } from './useMfa';

interface MfaVerifyFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

export function MfaVerifyForm({
  userId,
  onSuccess,
  onCancel,
  title = '2段階認証',
  description = '認証アプリに表示されている6桁のコードを入力してください。',
}: MfaVerifyFormProps): React.ReactElement {
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { verify, isLoading, error } = useMfa({
    userId,
    onVerifySuccess: onSuccess,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [useBackupCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verify(code);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (useBackupCode) {
      // バックアップコードの場合: 英数字とハイフンを許可
      value = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (value.length === 4 && !value.includes('-')) {
        value = value + '-';
      }
      value = value.slice(0, 9);
    } else {
      // TOTPコードの場合: 数字のみ
      value = value.replace(/\D/g, '').slice(0, 6);
    }

    setCode(value);
  };

  const isValidCode = useBackupCode ? /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(code) : code.length === 6;

  return (
    <div className="max-w-sm mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {useBackupCode ? 'バックアップコード' : '認証コード'}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={handleCodeChange}
            placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
            className="w-full px-4 py-3 text-xl text-center font-mono border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoComplete="one-time-code"
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !isValidCode}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '確認中...' : '確認'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setCode('');
          }}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {useBackupCode ? '認証アプリを使用' : 'バックアップコードを使用'}
        </button>
      </div>

      {onCancel && (
        <div className="mt-4 text-center">
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}
