'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  type BrandingSettings,
  type UpdateBrandingData,
  THEME_COLOR_PRESETS,
  FONT_FAMILY_OPTIONS,
} from '@/types/branding';

interface BrandingSettingsEditorProps {
  onSave?: () => void;
}

export function BrandingSettingsEditor({ onSave }: BrandingSettingsEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [formData, setFormData] = useState<UpdateBrandingData>({
    logoUrl: null,
    logoLightUrl: null,
    logoDarkUrl: null,
    faviconUrl: null,
    primaryColor: '#3b82f6',
    secondaryColor: null,
    accentColor: null,
    fontFamily: null,
    customCss: null,
  });

  // Load settings
  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/settings/branding');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          setFormData({
            logoUrl: data.logoUrl,
            logoLightUrl: data.logoLightUrl,
            logoDarkUrl: data.logoDarkUrl,
            faviconUrl: data.faviconUrl,
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            accentColor: data.accentColor,
            fontFamily: data.fontFamily,
            customCss: data.customCss,
          });
        }
      } catch (err) {
        console.error('Failed to load branding settings:', err);
        setError('設定の読み込みに失敗しました。');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存に失敗しました。');
      }

      const data = await response.json();
      setSettings(data);
      setSuccess('ブランディング設定を保存しました。');
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave]);

  const handleReset = useCallback(async () => {
    if (!confirm('ブランディング設定をデフォルトに戻しますか？')) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings/branding', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'リセットに失敗しました。');
      }

      const data = await response.json();
      setSettings(data);
      setFormData({
        logoUrl: data.logoUrl,
        logoLightUrl: data.logoLightUrl,
        logoDarkUrl: data.logoDarkUrl,
        faviconUrl: data.faviconUrl,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        fontFamily: data.fontFamily,
        customCss: data.customCss,
      });
      setSuccess('ブランディング設定をリセットしました。');
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リセットに失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const handleApplyPreset = useCallback((preset: (typeof THEME_COLOR_PRESETS)[0]) => {
    setFormData((prev) => ({
      ...prev,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
    }));
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ブランディング設定</CardTitle>
        <CardDescription>ロゴ、テーマカラー、フォントなどをカスタマイズできます。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md">{error}</div>
        )}
        {success && (
          <div className="bg-green-500/10 text-green-600 px-4 py-2 rounded-md">{success}</div>
        )}

        <Tabs defaultValue="logo">
          <TabsList>
            <TabsTrigger value="logo">ロゴ</TabsTrigger>
            <TabsTrigger value="colors">カラー</TabsTrigger>
            <TabsTrigger value="typography">タイポグラフィ</TabsTrigger>
            <TabsTrigger value="advanced">詳細設定</TabsTrigger>
          </TabsList>

          <TabsContent value="logo" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">ロゴURL</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl ?? ''}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value || null })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-sm text-muted-foreground">ヘッダーに表示されるメインロゴのURL</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logoLightUrl">ライトモード用ロゴURL</Label>
                <Input
                  id="logoLightUrl"
                  value={formData.logoLightUrl ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, logoLightUrl: e.target.value || null })
                  }
                  placeholder="https://example.com/logo-light.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoDarkUrl">ダークモード用ロゴURL</Label>
                <Input
                  id="logoDarkUrl"
                  value={formData.logoDarkUrl ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, logoDarkUrl: e.target.value || null })
                  }
                  placeholder="https://example.com/logo-dark.png"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faviconUrl">ファビコンURL</Label>
              <Input
                id="faviconUrl"
                value={formData.faviconUrl ?? ''}
                onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value || null })}
                placeholder="https://example.com/favicon.ico"
              />
            </div>

            {formData.logoUrl && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">プレビュー</p>
                <img
                  src={formData.logoUrl}
                  alt="Logo preview"
                  className="max-h-16 max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="colors" className="space-y-4 mt-4">
            <div>
              <p className="text-sm font-medium mb-2">カラープリセット</p>
              <div className="flex flex-wrap gap-2">
                {THEME_COLOR_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyPreset(preset)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: preset.primaryColor }}
                    />
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">プライマリカラー</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primaryColorPicker"
                    value={formData.primaryColor ?? '#3b82f6'}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    id="primaryColor"
                    value={formData.primaryColor ?? ''}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">セカンダリカラー</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="secondaryColorPicker"
                    value={formData.secondaryColor ?? '#64748b'}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    id="secondaryColor"
                    value={formData.secondaryColor ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, secondaryColor: e.target.value || null })
                    }
                    placeholder="#64748b"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor">アクセントカラー</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="accentColorPicker"
                    value={formData.accentColor ?? '#f59e0b'}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    id="accentColor"
                    value={formData.accentColor ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, accentColor: e.target.value || null })
                    }
                    placeholder="#f59e0b"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">カラープレビュー</p>
              <div className="flex gap-4">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: formData.primaryColor ?? '#3b82f6' }}
                >
                  Primary
                </div>
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: formData.secondaryColor ?? '#64748b' }}
                >
                  Secondary
                </div>
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: formData.accentColor ?? '#f59e0b' }}
                >
                  Accent
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="fontFamily">フォントファミリー</Label>
              <Select
                value={formData.fontFamily ?? 'system-ui'}
                onValueChange={(value) =>
                  setFormData({ ...formData, fontFamily: value === 'system-ui' ? null : value })
                }
              >
                <SelectTrigger id="fontFamily">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">フォントプレビュー</p>
              <p className="text-lg" style={{ fontFamily: formData.fontFamily ?? 'system-ui' }}>
                T-NaviEx テスト管理システム
              </p>
              <p
                className="text-sm text-muted-foreground"
                style={{ fontFamily: formData.fontFamily ?? 'system-ui' }}
              >
                The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="customCss">カスタムCSS</Label>
              <Textarea
                id="customCss"
                value={formData.customCss ?? ''}
                onChange={(e) => setFormData({ ...formData, customCss: e.target.value || null })}
                placeholder="/* カスタムCSSを入力... */"
                className="font-mono h-48"
              />
              <p className="text-sm text-muted-foreground">
                高度なカスタマイズのためのCSSを直接入力できます。
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            デフォルトに戻す
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
