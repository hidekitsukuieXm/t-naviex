'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TestTube2, Save, Key, Bot, BarChart3 } from 'lucide-react';
import { AiSettings, AVAILABLE_MODELS, AiTestConnectionResponse } from '@/types/ai-settings';
import { ClaudeModel } from '@/types/claude';

export default function AiSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const fetchedRef = useRef(false);

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<ClaudeModel>('claude-sonnet-4-20250514');
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(0.7);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/ai');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data.settings);
      setIsEnabled(data.settings.isEnabled);
      setModel(data.settings.model);
      setMaxTokens(data.settings.maxTokens);
      setTemperature(data.settings.temperature);
    } catch (error) {
      console.error('Failed to fetch AI settings:', error);
      toast({
        title: 'エラー',
        description: 'AI設定の取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchSettings();
    }
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const updateData: Record<string, unknown> = {
        isEnabled,
        model,
        maxTokens,
        temperature,
      };

      // Only include API key if it's been changed
      if (apiKey) {
        updateData['apiKey'] = apiKey;
      }

      const response = await fetch('/api/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      setApiKey(''); // Clear API key input
      setHasChanges(false);

      toast({
        title: '保存完了',
        description: 'AI設定を保存しました',
      });
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'AI設定の保存に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);

      const response = await fetch('/api/settings/ai/test-connection', {
        method: 'POST',
      });

      const data: AiTestConnectionResponse = await response.json();

      if (data.success) {
        toast({
          title: '接続成功',
          description: `${data.message} (${data.responseTime}ms)`,
        });
        // Refresh settings to update lastTestedAt
        fetchSettings();
      } else {
        toast({
          title: '接続失敗',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to test AI connection:', error);
      toast({
        title: 'エラー',
        description: '接続テストの実行に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleValueChange = (setter: (value: unknown) => void, value: unknown) => {
    setter(value);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI設定</h2>
        <p className="text-muted-foreground">Claude AIの設定とAPIキーを管理します</p>
      </div>

      <div className="grid gap-6">
        {/* AI有効/無効 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI機能
            </CardTitle>
            <CardDescription>AI機能の有効/無効を切り替えます</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="ai-enabled">AI機能を有効にする</Label>
                <p className="text-sm text-muted-foreground">
                  有効にすると、テストケース自動生成などのAI機能が利用可能になります
                </p>
              </div>
              <Switch
                id="ai-enabled"
                checked={isEnabled}
                onCheckedChange={(value) =>
                  handleValueChange((v) => setIsEnabled(v as boolean), value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* APIキー設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              APIキー
            </CardTitle>
            <CardDescription>
              Anthropic APIキーを設定します。キーは暗号化して保存されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">APIキー</Label>
              <Input
                id="api-key"
                type="password"
                placeholder={settings?.hasApiKey ? '••••••••（設定済み）' : 'sk-ant-...'}
                value={apiKey}
                onChange={(e) => handleValueChange((v) => setApiKey(v as string), e.target.value)}
              />
              {settings?.maskedApiKey && (
                <p className="text-sm text-muted-foreground">現在のキー: {settings.maskedApiKey}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !settings?.hasApiKey}
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube2 className="mr-2 h-4 w-4" />
                )}
                接続テスト
              </Button>
              {settings?.lastTestedAt && (
                <span className="text-sm text-muted-foreground">
                  最終テスト: {new Date(settings.lastTestedAt).toLocaleString('ja-JP')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* モデル設定 */}
        <Card>
          <CardHeader>
            <CardTitle>モデル設定</CardTitle>
            <CardDescription>使用するAIモデルと生成パラメータを設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="model">モデル</Label>
              <Select
                value={model}
                onValueChange={(value) =>
                  value && handleValueChange((v) => setModel(v as ClaudeModel), value)
                }
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="モデルを選択" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div>
                        <div>{m.label}</div>
                        <div className="text-xs text-muted-foreground">{m.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens">最大トークン数: {maxTokens}</Label>
              <Slider
                id="max-tokens"
                min={256}
                max={8192}
                step={256}
                value={[maxTokens]}
                onValueChange={(value) => {
                  const v = Array.isArray(value) ? value[0] : value;
                  if (v !== undefined) handleValueChange((val) => setMaxTokens(val as number), v);
                }}
              />
              <p className="text-sm text-muted-foreground">AIが生成する応答の最大長を指定します</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">温度: {temperature.toFixed(1)}</Label>
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                value={[temperature]}
                onValueChange={(value) => {
                  const v = Array.isArray(value) ? value[0] : value;
                  if (v !== undefined) handleValueChange((val) => setTemperature(val as number), v);
                }}
              />
              <p className="text-sm text-muted-foreground">
                値が高いほどランダムな応答、低いほど決定的な応答になります
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 使用量統計 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              使用量統計
            </CardTitle>
            <CardDescription>AIの使用量（トークン数）を表示します</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{settings?.usageToday?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">今日</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{settings?.usageMonth?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">今月</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{settings?.usageTotal?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">累計</p>
              </div>
            </div>
            {settings?.lastUsedAt && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                最終使用: {new Date(settings.lastUsedAt).toLocaleString('ja-JP')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          設定を保存
        </Button>
      </div>
    </div>
  );
}
