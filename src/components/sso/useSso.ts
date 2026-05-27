/**
 * useSso Custom Hook
 *
 * SSO操作を管理するカスタムフック
 */

'use client';

import { useState, useCallback } from 'react';
import type {
  SsoConfiguration,
  SsoRoleMapping,
  SsoLoginLog,
  CreateSsoConfigRequest,
  UpdateSsoConfigRequest,
  CreateRoleMappingRequest,
  SsoProviderInfo,
  SsoConnectionTestResult,
} from '@/types/sso';

interface UseSsoResult {
  configurations: SsoConfiguration[];
  providers: SsoProviderInfo[];
  isLoading: boolean;
  error: string | null;
  fetchConfigurations: (activeOnly?: boolean) => Promise<void>;
  fetchProviders: () => Promise<void>;
  createConfiguration: (data: CreateSsoConfigRequest) => Promise<SsoConfiguration | null>;
  updateConfiguration: (
    id: string,
    data: UpdateSsoConfigRequest
  ) => Promise<SsoConfiguration | null>;
  deleteConfiguration: (id: string) => Promise<boolean>;
  testConnection: (id: string) => Promise<SsoConnectionTestResult | null>;
  setConfigStatus: (id: string, status: string) => Promise<boolean>;
  startAuth: (
    id: string,
    redirectUri: string
  ) => Promise<{ authUrl: string; state: string } | null>;
}

export function useSso(): UseSsoResult {
  const [configurations, setConfigurations] = useState<SsoConfiguration[]>([]);
  const [providers, setProviders] = useState<SsoProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SSO設定一覧を取得
  const fetchConfigurations = useCallback(async (activeOnly = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sso?activeOnly=${activeOnly}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'SSO設定の取得に失敗しました');
      }

      setConfigurations(data.configurations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSO設定の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // プロバイダー情報を取得
  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sso?providers=true');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'プロバイダー情報の取得に失敗しました');
      }

      setProviders(data.providers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プロバイダー情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // SSO設定を作成
  const createConfiguration = useCallback(
    async (data: CreateSsoConfigRequest): Promise<SsoConfiguration | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/sso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || result.details?.join(', ') || '作成に失敗しました');
        }

        setConfigurations((prev) => [...prev, result]);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : '作成に失敗しました');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // SSO設定を更新
  const updateConfiguration = useCallback(
    async (id: string, data: UpdateSsoConfigRequest): Promise<SsoConfiguration | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sso/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || '更新に失敗しました');
        }

        setConfigurations((prev) => prev.map((c) => (c.id === id ? result : c)));
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新に失敗しました');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // SSO設定を削除
  const deleteConfiguration = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sso/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '削除に失敗しました');
      }

      setConfigurations((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 接続テスト
  const testConnection = useCallback(
    async (id: string): Promise<SsoConnectionTestResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sso/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test-connection' }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'テストに失敗しました');
        }

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'テストに失敗しました');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ステータスを更新
  const setConfigStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sso/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-status', status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ステータス更新に失敗しました');
      }

      setConfigurations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: status as SsoConfiguration['status'] } : c))
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ステータス更新に失敗しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // SSO認証開始
  const startAuth = useCallback(
    async (id: string, redirectUri: string): Promise<{ authUrl: string; state: string } | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/sso/${id}?action=start-auth&redirectUri=${encodeURIComponent(redirectUri)}`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || '認証開始に失敗しました');
        }

        return { authUrl: result.authUrl, state: result.state };
      } catch (err) {
        setError(err instanceof Error ? err.message : '認証開始に失敗しました');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
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
    startAuth,
  };
}

// ====================================
// Role Mappings Hook
// ====================================

interface UseSsoRoleMappingsResult {
  mappings: SsoRoleMapping[];
  isLoading: boolean;
  error: string | null;
  fetchMappings: (configId: string) => Promise<void>;
  createMapping: (
    configId: string,
    data: CreateRoleMappingRequest
  ) => Promise<SsoRoleMapping | null>;
  updateMapping: (
    configId: string,
    mappingId: string,
    data: Partial<CreateRoleMappingRequest>
  ) => Promise<boolean>;
  deleteMapping: (configId: string, mappingId: string) => Promise<boolean>;
}

export function useSsoRoleMappings(): UseSsoRoleMappingsResult {
  const [mappings, setMappings] = useState<SsoRoleMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async (configId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sso/${configId}/mappings`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'マッピングの取得に失敗しました');
      }

      setMappings(data.mappings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'マッピングの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createMapping = useCallback(
    async (configId: string, data: CreateRoleMappingRequest): Promise<SsoRoleMapping | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sso/${configId}/mappings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || '作成に失敗しました');
        }

        setMappings((prev) => [...prev, result]);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : '作成に失敗しました');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateMapping = useCallback(
    async (
      configId: string,
      mappingId: string,
      data: Partial<CreateRoleMappingRequest>
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sso/${configId}/mappings?mappingId=${mappingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || '更新に失敗しました');
        }

        setMappings((prev) => prev.map((m) => (m.id === mappingId ? result : m)));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新に失敗しました');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteMapping = useCallback(
    async (configId: string, mappingId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sso/${configId}/mappings?mappingId=${mappingId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || '削除に失敗しました');
        }

        setMappings((prev) => prev.filter((m) => m.id !== mappingId));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : '削除に失敗しました');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    mappings,
    isLoading,
    error,
    fetchMappings,
    createMapping,
    updateMapping,
    deleteMapping,
  };
}

// ====================================
// Login Logs Hook
// ====================================

interface UseSsoLoginLogsResult {
  logs: SsoLoginLog[];
  isLoading: boolean;
  error: string | null;
  fetchLogs: (configId: string, limit?: number) => Promise<void>;
}

export function useSsoLoginLogs(): UseSsoLoginLogsResult {
  const [logs, setLogs] = useState<SsoLoginLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (configId: string, limit = 100) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sso/${configId}?action=logs&limit=${limit}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ログの取得に失敗しました');
      }

      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    logs,
    isLoading,
    error,
    fetchLogs,
  };
}
