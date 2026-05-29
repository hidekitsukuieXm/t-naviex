/**
 * SSO Manager Component
 *
 * SSO管理コンポーネント
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { SsoConfiguration, SsoProviderInfo, SsoConnectionTestResult } from '@/types/sso';
import { useSso } from './useSso';
import { SsoConfigList } from './SsoConfigList';
import { SsoConfigForm } from './SsoConfigForm';
import { SsoProviderCard } from './SsoProviderCard';

type ViewMode = 'list' | 'select-provider' | 'create' | 'edit';

export function SsoManager(): React.ReactElement {
  const {
    configurations,
    providers,
    isLoading,
    error,
    fetchConfigurations,
    fetchProviders,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    testConnection,
    setConfigStatus,
  } = useSso();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProvider, setSelectedProvider] = useState<SsoProviderInfo | null>(null);
  const [editingConfig, setEditingConfig] = useState<SsoConfiguration | null>(null);
  const [testResult, setTestResult] = useState<SsoConnectionTestResult | null>(null);
  const [showTestResult, setShowTestResult] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SsoConfiguration | null>(null);

  // 初期データ読み込み
  useEffect(() => {
    fetchConfigurations();
    fetchProviders();
  }, [fetchConfigurations, fetchProviders]);

  // 新規作成開始
  const handleAddNew = useCallback(() => {
    setViewMode('select-provider');
    setSelectedProvider(null);
    setEditingConfig(null);
  }, []);

  // プロバイダー選択
  const handleSelectProvider = useCallback((provider: SsoProviderInfo) => {
    setSelectedProvider(provider);
    setViewMode('create');
  }, []);

  // 編集開始
  const handleEdit = useCallback((config: SsoConfiguration) => {
    setEditingConfig(config);
    setViewMode('edit');
  }, []);

  // フォーム送信
  const handleSubmit = useCallback(
    (
      data:
        | import('@/types/sso').CreateSsoConfigRequest
        | import('@/types/sso').UpdateSsoConfigRequest
    ) => {
      if (editingConfig) {
        void updateConfiguration(
          editingConfig.id,
          data as Parameters<typeof createConfiguration>[0]
        ).then((result) => {
          if (result) {
            setViewMode('list');
            setEditingConfig(null);
          }
        });
      } else {
        void createConfiguration(data as Parameters<typeof createConfiguration>[0]).then(
          (result) => {
            if (result) {
              setViewMode('list');
              setSelectedProvider(null);
            }
          }
        );
      }
    },
    [editingConfig, createConfiguration, updateConfiguration]
  );

  // キャンセル
  const handleCancel = useCallback(() => {
    setViewMode('list');
    setSelectedProvider(null);
    setEditingConfig(null);
  }, []);

  // 削除確認
  const handleDeleteConfirm = useCallback((config: SsoConfiguration) => {
    setConfirmDelete(config);
  }, []);

  // 削除実行
  const handleDelete = useCallback(async () => {
    if (confirmDelete) {
      const success = await deleteConfiguration(confirmDelete.id);
      if (success) {
        setConfirmDelete(null);
      }
    }
  }, [confirmDelete, deleteConfiguration]);

  // ステータス切り替え
  const handleToggleStatus = useCallback(
    async (config: SsoConfiguration) => {
      const newStatus = config.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await setConfigStatus(config.id, newStatus);
    },
    [setConfigStatus]
  );

  // 接続テスト
  const handleTest = useCallback(
    async (config: SsoConfiguration) => {
      const result = await testConnection(config.id);
      if (result) {
        setTestResult(result);
        setShowTestResult(true);
      }
    },
    [testConnection]
  );

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SSO設定</h2>
          <p className="text-sm text-gray-500">
            シングルサインオン（SSO）プロバイダーの設定を管理します
          </p>
        </div>
        {viewMode === 'list' && (
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            新規SSO設定
          </button>
        )}
        {viewMode !== 'list' && (
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
          >
            戻る
          </button>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* ローディング */}
      {isLoading && viewMode === 'list' && (
        <div className="flex justify-center py-8">
          <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
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
        </div>
      )}

      {/* 設定一覧 */}
      {viewMode === 'list' && !isLoading && (
        <SsoConfigList
          configurations={configurations}
          onEdit={handleEdit}
          onDelete={handleDeleteConfirm}
          onToggleStatus={handleToggleStatus}
          onTest={handleTest}
          isLoading={isLoading}
        />
      )}

      {/* プロバイダー選択 */}
      {viewMode === 'select-provider' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">SSOプロバイダーを選択</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((provider) => (
              <SsoProviderCard
                key={provider.name}
                provider={provider}
                onSelect={handleSelectProvider}
              />
            ))}
          </div>
        </div>
      )}

      {/* 作成フォーム */}
      {viewMode === 'create' && selectedProvider && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">{selectedProvider.displayName} SSO設定を作成</h3>
          <SsoConfigForm
            provider={selectedProvider}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* 編集フォーム */}
      {viewMode === 'edit' && editingConfig && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">SSO設定を編集: {editingConfig.displayName}</h3>
          <SsoConfigForm
            config={editingConfig}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* 削除確認モーダル */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">SSO設定を削除</h3>
            <p className="text-gray-500 mb-4">
              「{confirmDelete.displayName}」を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 接続テスト結果モーダル */}
      {showTestResult && testResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              {testResult.success ? (
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
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
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              )}
              <h3 className="text-lg font-medium">
                {testResult.success ? '接続成功' : '接続失敗'}
              </h3>
            </div>

            <div className="space-y-2 mb-4">
              {testResult.checks.map((check, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {check.passed ? (
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span className={check.passed ? 'text-gray-700' : 'text-red-700'}>
                    {check.name}
                  </span>
                  {check.message && <span className="text-gray-500">- {check.message}</span>}
                </div>
              ))}
            </div>

            {testResult.responseTime && (
              <p className="text-sm text-gray-500 mb-4">応答時間: {testResult.responseTime}ms</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowTestResult(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
