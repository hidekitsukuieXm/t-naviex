/**
 * SSO Login Button Component
 *
 * SSOログインボタンコンポーネント
 */

'use client';

import React, { useState } from 'react';
import type { SsoConfiguration } from '@/types/sso';

interface SsoLoginButtonProps {
  config: SsoConfiguration;
  onLogin: (configId: string) => Promise<{ authUrl: string; state: string } | null>;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline';
  className?: string;
}

// プロバイダーのブランドカラー
const providerStyles: Record<string, { bg: string; hover: string; icon?: React.ReactNode }> = {
  GOOGLE: {
    bg: 'bg-white border border-gray-300 text-gray-700',
    hover: 'hover:bg-gray-50',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  MICROSOFT: {
    bg: 'bg-white border border-gray-300 text-gray-700',
    hover: 'hover:bg-gray-50',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <rect x="1" y="1" width="10" height="10" fill="#F25022" />
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
        <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
      </svg>
    ),
  },
  GITHUB: {
    bg: 'bg-gray-900 text-white',
    hover: 'hover:bg-gray-800',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  GITLAB: {
    bg: 'bg-[#FC6D26] text-white',
    hover: 'hover:bg-[#E24329]',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 21.35l3.19-9.81H8.81z" />
        <path d="M12 21.35L8.81 11.54H1.51z" fill="#FC6D26" />
        <path d="M1.51 11.54l-.95 2.93c-.09.27.01.57.24.73L12 21.35z" fill="#FCA326" />
        <path d="M1.51 11.54h7.3L5.93 2.88c-.09-.28-.49-.28-.58 0z" fill="#E24329" />
        <path d="M12 21.35l3.19-9.81h7.3z" fill="#FC6D26" />
        <path d="M22.49 11.54l.95 2.93c.09.27-.01.57-.24.73L12 21.35z" fill="#FCA326" />
        <path d="M22.49 11.54h-7.3l2.88-8.66c.09-.28.49-.28.58 0z" fill="#E24329" />
      </svg>
    ),
  },
  OKTA: {
    bg: 'bg-[#007DC1] text-white',
    hover: 'hover:bg-[#006BA1]',
  },
  AUTH0: {
    bg: 'bg-[#EB5424] text-white',
    hover: 'hover:bg-[#D14418]',
  },
  KEYCLOAK: {
    bg: 'bg-[#4D4D4D] text-white',
    hover: 'hover:bg-[#3D3D3D]',
  },
  CUSTOM: {
    bg: 'bg-blue-600 text-white',
    hover: 'hover:bg-blue-700',
  },
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function SsoLoginButton({
  config,
  onLogin,
  size = 'md',
  variant = 'default',
  className = '',
}: SsoLoginButtonProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const result = await onLogin(config.id);
      if (result) {
        // 認証URLにリダイレクト
        window.location.href = result.authUrl;
      }
    } catch (error) {
      console.error('SSO login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const providerStyle = providerStyles[config.providerName] || providerStyles.CUSTOM;
  const baseStyles =
    variant === 'outline'
      ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      : `${providerStyle.bg} ${providerStyle.hover}`;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || config.status !== 'ACTIVE'}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeStyles[size]}
        ${baseStyles}
        ${className}
      `}
    >
      {isLoading ? (
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        providerStyle.icon || (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        )
      )}
      <span>{isLoading ? 'ログイン中...' : `${config.displayName}でログイン`}</span>
    </button>
  );
}

// 複数のSSOプロバイダーを表示するコンポーネント
interface SsoLoginOptionsProps {
  configurations: SsoConfiguration[];
  onLogin: (configId: string) => Promise<{ authUrl: string; state: string } | null>;
  title?: string;
}

export function SsoLoginOptions({
  configurations,
  onLogin,
  title = 'または以下でログイン',
}: SsoLoginOptionsProps): React.ReactElement | null {
  const activeConfigs = configurations.filter((c) => c.status === 'ACTIVE');

  if (activeConfigs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">{title}</span>
        </div>
      </div>

      <div className="space-y-2">
        {activeConfigs.map((config) => (
          <SsoLoginButton
            key={config.id}
            config={config}
            onLogin={onLogin}
            size="md"
            className="w-full"
          />
        ))}
      </div>
    </div>
  );
}
