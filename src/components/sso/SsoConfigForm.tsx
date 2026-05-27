/**
 * SSO Config Form Component
 *
 * SSO設定フォームコンポーネント
 */

'use client';

import React, { useState } from 'react';
import type {
  SsoConfiguration,
  SsoProviderInfo,
  CreateSsoConfigRequest,
  UpdateSsoConfigRequest,
} from '@/types/sso';
import { SsoProviderType, getProviderTypeLabel, validateSsoConfig } from '@/types/sso';

interface SsoConfigFormProps {
  provider?: SsoProviderInfo;
  config?: SsoConfiguration;
  onSubmit: (data: CreateSsoConfigRequest | UpdateSsoConfigRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SsoConfigForm({
  provider,
  config,
  onSubmit,
  onCancel,
  isLoading = false,
}: SsoConfigFormProps): React.ReactElement {
  const isEdit = !!config;
  const defaultConfig = provider?.defaultConfig || {};

  const [formData, setFormData] = useState<CreateSsoConfigRequest>({
    name: config?.name || '',
    displayName: config?.displayName || provider?.displayName || '',
    providerType: config?.providerType || provider?.providerType || SsoProviderType.OAUTH2,
    providerName: config?.providerName || provider?.name || 'CUSTOM',
    clientId: config?.clientId || '',
    clientSecret: config?.clientSecret?.replace(/\*/g, '') || '',
    authorizationUrl: config?.authorizationUrl || defaultConfig.authorizationUrl || '',
    tokenUrl: config?.tokenUrl || defaultConfig.tokenUrl || '',
    userInfoUrl: config?.userInfoUrl || defaultConfig.userInfoUrl || '',
    scopes: config?.scopes || defaultConfig.scopes || [],
    entityId: config?.entityId || '',
    ssoUrl: config?.ssoUrl || '',
    sloUrl: config?.sloUrl || '',
    certificate: config?.certificate || '',
    privateKey: '',
    allowedDomains: config?.allowedDomains || [],
    autoProvision: config?.autoProvision ?? true,
    defaultRoleId: config?.defaultRoleId || '',
  });

  const [scopeInput, setScopeInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addScope = () => {
    if (scopeInput.trim() && !formData.scopes?.includes(scopeInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        scopes: [...(prev.scopes || []), scopeInput.trim()],
      }));
      setScopeInput('');
    }
  };

  const removeScope = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes?.filter((s) => s !== scope),
    }));
  };

  const addDomain = () => {
    if (domainInput.trim() && !formData.allowedDomains?.includes(domainInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        allowedDomains: [...(prev.allowedDomains || []), domainInput.trim()],
      }));
      setDomainInput('');
    }
  };

  const removeDomain = (domain: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedDomains: prev.allowedDomains?.filter((d) => d !== domain),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateSsoConfig(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onSubmit(formData);
  };

  const isOAuth =
    formData.providerType === SsoProviderType.OAUTH2 ||
    formData.providerType === SsoProviderType.OIDC;
  const isSaml = formData.providerType === SsoProviderType.SAML;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <ul className="list-disc list-inside text-sm text-red-700">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 基本情報 */}
      <div className="space-y-4">
        <h3 className="font-medium border-b pb-2">基本情報</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              設定名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="google-workspace"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isEdit}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              表示名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              placeholder="Google Workspace"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              プロバイダータイプ
            </label>
            <select
              name="providerType"
              value={formData.providerType}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.values(SsoProviderType).map((type) => (
                <option key={type} value={type}>
                  {getProviderTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* OAuth2/OIDC設定 */}
      {isOAuth && (
        <div className="space-y-4">
          <h3 className="font-medium border-b pb-2">OAuth2/OIDC設定</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                クライアントID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                クライアントシークレット <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="clientSecret"
                value={formData.clientSecret}
                onChange={handleChange}
                placeholder={isEdit ? '変更する場合のみ入力' : ''}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              認可URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              name="authorizationUrl"
              value={formData.authorizationUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              トークンURL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              name="tokenUrl"
              value={formData.tokenUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー情報URL</label>
            <input
              type="url"
              name="userInfoUrl"
              value={formData.userInfoUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">スコープ</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={scopeInput}
                onChange={(e) => setScopeInput(e.target.value)}
                placeholder="openid"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addScope();
                  }
                }}
              />
              <button
                type="button"
                onClick={addScope}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                追加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.scopes?.map((scope) => (
                <span
                  key={scope}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded"
                >
                  {scope}
                  <button
                    type="button"
                    onClick={() => removeScope(scope)}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SAML設定 */}
      {isSaml && (
        <div className="space-y-4">
          <h3 className="font-medium border-b pb-2">SAML設定</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              エンティティID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="entityId"
              value={formData.entityId}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SSO URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              name="ssoUrl"
              value={formData.ssoUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SLO URL</label>
            <input
              type="url"
              name="sloUrl"
              value={formData.sloUrl}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X.509証明書 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="certificate"
              value={formData.certificate}
              onChange={handleChange}
              rows={4}
              placeholder="-----BEGIN CERTIFICATE-----..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>
        </div>
      )}

      {/* ドメイン制限 */}
      <div className="space-y-4">
        <h3 className="font-medium border-b pb-2">アクセス制御</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">許可ドメイン</label>
          <p className="text-xs text-gray-500 mb-2">空の場合は全てのドメインを許可します</p>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="example.com"
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDomain();
                }
              }}
            />
            <button
              type="button"
              onClick={addDomain}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              追加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.allowedDomains?.map((domain) => (
              <span
                key={domain}
                className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-sm rounded"
              >
                {domain}
                <button
                  type="button"
                  onClick={() => removeDomain(domain)}
                  className="ml-1 text-green-500 hover:text-green-700"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoProvision"
            name="autoProvision"
            checked={formData.autoProvision}
            onChange={handleChange}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="autoProvision" className="text-sm text-gray-700">
            自動ユーザー作成を有効にする
          </label>
        </div>
      </div>

      {/* アクション */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
          disabled={isLoading}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? '保存中...' : isEdit ? '更新' : '作成'}
        </button>
      </div>
    </form>
  );
}
