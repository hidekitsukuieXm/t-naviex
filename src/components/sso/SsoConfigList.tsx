/**
 * SSO Config List Component
 *
 * SSO設定一覧コンポーネント
 */

'use client';

import React from 'react';
import type { SsoConfiguration } from '@/types/sso';
import { getProviderTypeLabel } from '@/types/sso';

interface SsoConfigListProps {
  configurations: SsoConfiguration[];
  onEdit: (config: SsoConfiguration) => void;
  onDelete: (config: SsoConfiguration) => void;
  onToggleStatus: (config: SsoConfiguration) => void;
  onTest: (config: SsoConfiguration) => void;
  isLoading?: boolean;
}

function StatusBadge({ status }: { status: SsoConfiguration['status'] }): React.ReactElement {
  const styles = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-700',
    TESTING: 'bg-yellow-100 text-yellow-700',
    ERROR: 'bg-red-100 text-red-700',
  };

  const labels = {
    ACTIVE: '有効',
    INACTIVE: '無効',
    TESTING: 'テスト中',
    ERROR: 'エラー',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function SsoConfigList({
  configurations,
  onEdit,
  onDelete,
  onToggleStatus,
  onTest,
  isLoading = false,
}: SsoConfigListProps): React.ReactElement {
  if (configurations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <p className="mt-2">SSO設定がありません</p>
        <p className="text-sm">新しいSSO設定を追加してください</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              設定名
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              プロバイダー
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ステータス
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              最終使用
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {configurations.map((config) => (
            <tr key={config.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{config.displayName}</div>
                <div className="text-sm text-gray-500">{config.name}</div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {config.providerName !== 'CUSTOM' ? config.providerName : 'カスタム'}
                </div>
                <div className="text-xs text-gray-500">
                  {getProviderTypeLabel(config.providerType)}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <StatusBadge status={config.status} />
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {config.lastUsedAt ? new Date(config.lastUsedAt).toLocaleDateString('ja-JP') : '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onTest(config)}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    title="接続テスト"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onToggleStatus(config)}
                    disabled={isLoading}
                    className={`${
                      config.status === 'ACTIVE'
                        ? 'text-yellow-600 hover:text-yellow-800'
                        : 'text-green-600 hover:text-green-800'
                    } disabled:opacity-50`}
                    title={config.status === 'ACTIVE' ? '無効化' : '有効化'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          config.status === 'ACTIVE'
                            ? 'M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z'
                            : 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                        }
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onEdit(config)}
                    disabled={isLoading}
                    className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                    title="編集"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(config)}
                    disabled={isLoading || config.status === 'ACTIVE'}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    title={config.status === 'ACTIVE' ? '有効な設定は削除できません' : '削除'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
