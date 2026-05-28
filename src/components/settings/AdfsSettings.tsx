'use client';

/**
 * ADFS Settings Component
 *
 * ADFS SSO設定画面コンポーネント
 */

import { useState, useEffect, useCallback } from 'react';

interface AdfsConfig {
  id?: string;
  adfsServer: string;
  entityId: string;
  relyingPartyIdentifier: string;
  certificate?: string;
  allowedDomains: string[];
  autoProvision: boolean;
  defaultRoleId?: string;
  status?: string;
}

interface RoleMapping {
  id: string;
  ssoGroupName: string;
  localRoleId: string;
  localRoleName: string;
  priority: number;
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    authorizationUrl?: boolean;
    tokenUrl?: boolean;
    userInfoUrl?: boolean;
  };
}

export function AdfsSettings() {
  const [config, setConfig] = useState<AdfsConfig>({
    adfsServer: '',
    entityId: '',
    relyingPartyIdentifier: '',
    certificate: '',
    allowedDomains: [],
    autoProvision: true,
  });
  const [mappings, setMappings] = useState<RoleMapping[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newMapping, setNewMapping] = useState({
    ssoGroupName: '',
    localRoleId: '',
    priority: 0,
  });

  const loadMappings = useCallback(async () => {
    try {
      const response = await fetch('/api/sso/adfs/mappings');
      if (response.ok) {
        const data = await response.json();
        setMappings(data);
      }
    } catch {
      // エラーは無視
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sso/adfs');
      if (response.ok) {
        const data = await response.json();
        setConfig({
          id: data.id,
          adfsServer: (data.metadata?.adfsServer as string) || '',
          entityId: data.entityId || '',
          relyingPartyIdentifier: (data.metadata?.relyingPartyIdentifier as string) || '',
          certificate: '', // セキュリティのため空
          allowedDomains: data.allowedDomains || [],
          autoProvision: data.autoProvision ?? true,
          defaultRoleId: data.defaultRoleId?.toString(),
          status: data.status,
        });
        loadMappings();
      }
    } catch {
      // 設定が存在しない場合は無視
    } finally {
      setLoading(false);
    }
  }, [loadMappings]);

  const loadRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch {
      // エラーは無視
    }
  }, []);

  // 設定を読み込み
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([loadConfig(), loadRoles()]);
    };
    void fetchData();
  }, [loadConfig, loadRoles]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/sso/adfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adfsServer: config.adfsServer,
          entityId: config.entityId,
          relyingPartyIdentifier: config.relyingPartyIdentifier,
          certificate: config.certificate || undefined,
          allowedDomains: config.allowedDomains,
          autoProvision: config.autoProvision,
          defaultRoleId: config.defaultRoleId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      setSuccess('ADFS設定を保存しました');
      loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const response = await fetch('/api/sso/adfs/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adfsServer: config.adfsServer,
          entityId: config.entityId,
          relyingPartyIdentifier: config.relyingPartyIdentifier,
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'テストに失敗しました',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleAddMapping = async () => {
    if (!newMapping.ssoGroupName || !newMapping.localRoleId) {
      setError('ADFSグループ/ロール名とロールを入力してください');
      return;
    }

    try {
      const response = await fetch('/api/sso/adfs/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapping),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'マッピングの追加に失敗しました');
      }

      setNewMapping({ ssoGroupName: '', localRoleId: '', priority: 0 });
      loadMappings();
      setSuccess('グループマッピングを追加しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'マッピングの追加に失敗しました');
    }
  };

  const handleDeleteMapping = async (id: string) => {
    if (!confirm('このマッピングを削除しますか?')) return;

    try {
      const response = await fetch(`/api/sso/adfs/mappings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      loadMappings();
      setSuccess('マッピングを削除しました');
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const handleToggleMapping = async (mapping: RoleMapping) => {
    try {
      const response = await fetch(`/api/sso/adfs/mappings/${mapping.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !mapping.isActive }),
      });

      if (!response.ok) {
        throw new Error('更新に失敗しました');
      }

      loadMappings();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    }
  };

  if (loading) {
    return <div className="p-6">読み込み中...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">ADFS (Active Directory Federation Services) 設定</h2>
        {config.status && (
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              config.status === 'ACTIVE'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {config.status === 'ACTIVE' ? '有効' : '無効'}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* 基本設定 */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-medium">SAML / WS-Federation 設定</h3>
        <p className="text-sm text-gray-600">
          ADFSサーバーの情報を入力してください。証明書利用者信頼（Relying Party
          Trust）の設定が必要です。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">ADFSサーバー</label>
            <input
              type="text"
              value={config.adfsServer}
              onChange={(e) => setConfig({ ...config, adfsServer: e.target.value })}
              placeholder="adfs.example.com"
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              ADFSサーバーのホスト名を入力してください（https:// は不要）
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              エンティティID (SP識別子)
            </label>
            <input
              type="text"
              value={config.entityId}
              onChange={(e) => setConfig({ ...config, entityId: e.target.value })}
              placeholder="https://your-app.example.com/"
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">このアプリケーションを識別するURI</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              証明書利用者識別子
            </label>
            <input
              type="text"
              value={config.relyingPartyIdentifier}
              onChange={(e) => setConfig({ ...config, relyingPartyIdentifier: e.target.value })}
              placeholder="urn:app:example または https://your-app.example.com/"
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">ADFSで設定した証明書利用者信頼の識別子</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IdP署名証明書（オプション）
            </label>
            <textarea
              value={config.certificate || ''}
              onChange={(e) => setConfig({ ...config, certificate: e.target.value })}
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              rows={4}
              className="w-full px-3 py-2 border rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">ADFS署名証明書（SAML応答の署名検証に使用）</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={
              testing || !config.adfsServer || !config.entityId || !config.relyingPartyIdentifier
            }
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
          >
            {testing ? 'テスト中...' : '接続テスト'}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-md ${
              testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            <p className="font-medium">{testResult.message}</p>
            {testResult.details && (
              <ul className="mt-2 text-sm">
                <li>
                  フェデレーションメタデータ: {testResult.details.authorizationUrl ? '✓' : '✗'}
                </li>
                <li>サインインエンドポイント: {testResult.details.tokenUrl ? '✓' : '✗'}</li>
                <li>OpenID設定: {testResult.details.userInfoUrl ? '✓' : '✗'}</li>
              </ul>
            )}
          </div>
        )}
      </div>

      {/* プロビジョニング設定 */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-medium">ユーザープロビジョニング設定</h3>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoProvision"
              checked={config.autoProvision}
              onChange={(e) => setConfig({ ...config, autoProvision: e.target.checked })}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="autoProvision" className="text-sm text-gray-700">
              新規ユーザーを自動作成する
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              許可するドメイン（カンマ区切り）
            </label>
            <input
              type="text"
              value={config.allowedDomains.join(', ')}
              onChange={(e) =>
                setConfig({
                  ...config,
                  allowedDomains: e.target.value
                    .split(',')
                    .map((d) => d.trim())
                    .filter(Boolean),
                })
              }
              placeholder="example.com, example.co.jp"
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">空の場合はすべてのドメインを許可します</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">デフォルトロール</label>
            <select
              value={config.defaultRoleId || ''}
              onChange={(e) => setConfig({ ...config, defaultRoleId: e.target.value || undefined })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">なし</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.displayName || role.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* グループマッピング */}
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-medium">Claimマッピング</h3>
        <p className="text-sm text-gray-600">
          ADFSのグループClaim（またはロールClaim）をローカルロールにマッピングします
        </p>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ADFSグループ/ロール名
            </label>
            <input
              type="text"
              value={newMapping.ssoGroupName}
              onChange={(e) => setNewMapping({ ...newMapping, ssoGroupName: e.target.value })}
              placeholder="例: Domain Admins"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">ローカルロール</label>
            <select
              value={newMapping.localRoleId}
              onChange={(e) => setNewMapping({ ...newMapping, localRoleId: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">選択...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.displayName || role.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
            <input
              type="number"
              value={newMapping.priority}
              onChange={(e) =>
                setNewMapping({ ...newMapping, priority: parseInt(e.target.value) || 0 })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <button
            onClick={handleAddMapping}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            追加
          </button>
        </div>

        {mappings.length > 0 && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">ADFSグループ/ロール</th>
                <th className="text-left py-2">ローカルロール</th>
                <th className="text-center py-2">優先度</th>
                <th className="text-center py-2">有効</th>
                <th className="text-right py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping) => (
                <tr key={mapping.id} className="border-b">
                  <td className="py-2">{mapping.ssoGroupName}</td>
                  <td className="py-2">{mapping.localRoleName}</td>
                  <td className="text-center py-2">{mapping.priority}</td>
                  <td className="text-center py-2">
                    <button
                      onClick={() => handleToggleMapping(mapping)}
                      className={`px-2 py-1 rounded text-xs ${
                        mapping.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {mapping.isActive ? '有効' : '無効'}
                    </button>
                  </td>
                  <td className="text-right py-2">
                    <button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </div>
  );
}
