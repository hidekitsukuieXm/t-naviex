'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SessionSettingsForm } from '@/components/session';
import {
  type SessionSettings,
  type UpdateSessionSettingsData,
  DEFAULT_SESSION_SETTINGS,
} from '@/types/session-settings';
import { Loader2, Timer } from 'lucide-react';

export default function SessionSettingsPage() {
  const [settings, setSettings] = useState<SessionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/session-settings');
      if (!response.ok) {
        throw new Error('セッション設定の取得に失敗しました。');
      }

      const data: SessionSettings = await response.json();

      startTransition(() => {
        setSettings(data);
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
        // エラー時はデフォルト値を使用
        setSettings({
          id: '0',
          ...DEFAULT_SESSION_SETTINGS,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (data: UpdateSessionSettingsData) => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/session-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'セッション設定の更新に失敗しました。');
      }

      const updatedSettings: SessionSettings = await response.json();
      setSettings(updatedSettings);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">セッション管理設定</h1>
        <p className="text-muted-foreground">
          セッションタイムアウトと自動ログアウトに関する設定を管理します。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="size-5" />
            セッション設定
          </CardTitle>
          <CardDescription>
            セッションタイムアウト、警告表示、自動ログアウトの設定を行います。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error && !settings ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : settings ? (
            <SessionSettingsForm settings={settings} onSubmit={handleSubmit} isLoading={isSaving} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
