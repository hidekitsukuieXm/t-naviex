'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Save, Clock, Users, RefreshCw } from 'lucide-react';
import {
  type SessionSettings,
  type UpdateSessionSettingsData,
  validateSessionSettings,
  SESSION_SETTINGS_LABELS,
  SESSION_SETTINGS_DESCRIPTIONS,
} from '@/types/session-settings';

interface SessionSettingsFormProps {
  settings: SessionSettings;
  onSubmit: (data: UpdateSessionSettingsData) => Promise<void>;
  isLoading?: boolean;
}

export function SessionSettingsForm({
  settings,
  onSubmit,
  isLoading = false,
}: SessionSettingsFormProps) {
  const [formData, setFormData] = useState<UpdateSessionSettingsData>({
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    warningBeforeMinutes: settings.warningBeforeMinutes,
    extendOnActivity: settings.extendOnActivity,
    maxConcurrentSessions: settings.maxConcurrentSessions,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = validateSessionSettings(formData);
    if (!validation.valid) {
      setError(validation.errors.join(' '));
      return;
    }

    try {
      await onSubmit(formData);
      setSuccess('セッション設定を更新しました。');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    }
  };

  const handleNumberChange = (field: keyof UpdateSessionSettingsData, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setFormData({ ...formData, [field]: numValue });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600">
          <Save className="size-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* タイムアウト設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="size-5" />
            タイムアウト設定
          </CardTitle>
          <CardDescription>セッションタイムアウトと警告に関する設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeoutMinutes">
                {SESSION_SETTINGS_LABELS.sessionTimeoutMinutes}
              </Label>
              <Input
                id="sessionTimeoutMinutes"
                type="number"
                min={1}
                max={480}
                value={formData.sessionTimeoutMinutes}
                onChange={(e) => handleNumberChange('sessionTimeoutMinutes', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {SESSION_SETTINGS_DESCRIPTIONS.sessionTimeoutMinutes}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warningBeforeMinutes">
                {SESSION_SETTINGS_LABELS.warningBeforeMinutes}
              </Label>
              <Input
                id="warningBeforeMinutes"
                type="number"
                min={1}
                max={30}
                value={formData.warningBeforeMinutes}
                onChange={(e) => handleNumberChange('warningBeforeMinutes', e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {SESSION_SETTINGS_DESCRIPTIONS.warningBeforeMinutes}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* セッション延長設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="size-5" />
            セッション延長設定
          </CardTitle>
          <CardDescription>ユーザーアクティビティによるセッション延長の設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{SESSION_SETTINGS_LABELS.extendOnActivity}</Label>
              <p className="text-xs text-muted-foreground">
                {SESSION_SETTINGS_DESCRIPTIONS.extendOnActivity}
              </p>
            </div>
            <Switch
              checked={formData.extendOnActivity}
              onCheckedChange={(checked) => setFormData({ ...formData, extendOnActivity: checked })}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* 同時セッション設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5" />
            同時セッション設定
          </CardTitle>
          <CardDescription>同一ユーザーの同時ログインに関する設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxConcurrentSessions">
              {SESSION_SETTINGS_LABELS.maxConcurrentSessions}
            </Label>
            <Input
              id="maxConcurrentSessions"
              type="number"
              min={0}
              max={10}
              value={formData.maxConcurrentSessions}
              onChange={(e) => handleNumberChange('maxConcurrentSessions', e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {SESSION_SETTINGS_DESCRIPTIONS.maxConcurrentSessions}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              設定を保存
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
