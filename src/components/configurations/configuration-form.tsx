'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  type Configuration,
  type ConfigParams,
  CONFIGURATION_NAME_MAX_LENGTH,
  CONFIGURATION_DESCRIPTION_MAX_LENGTH,
  validateConfigurationName,
  validateConfigurationDescription,
} from '@/types/configuration';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export interface ConfigurationFormData {
  name: string;
  description: string;
  configParams: ConfigParams;
  isActive: boolean;
}

interface ConfigurationFormProps {
  initialData?: Configuration;
  onSubmit: (data: ConfigurationFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ConfigurationForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ConfigurationFormProps) {
  const [formData, setFormData] = useState<ConfigurationFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    configParams: initialData?.configParams || {},
    isActive: initialData?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameResult = validateConfigurationName(formData.name);
    if (!nameResult.valid) {
      newErrors.name = nameResult.error!;
    }

    const descResult = validateConfigurationDescription(formData.description || null);
    if (!descResult.valid) {
      newErrors.description = descResult.error!;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  const handleChange = (field: keyof ConfigurationFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleConfigParamChange = (key: keyof ConfigParams, value: string) => {
    setFormData((prev) => ({
      ...prev,
      configParams: {
        ...prev.configParams,
        [key]: value || undefined, // Remove empty values
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          コンフィギュレーション名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="例: Windows 11 + Chrome 120"
          maxLength={CONFIGURATION_NAME_MAX_LENGTH}
          disabled={isSubmitting}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {errors.name ? <span className="text-destructive">{errors.name}</span> : <span />}
          <span>
            {formData.name.length}/{CONFIGURATION_NAME_MAX_LENGTH}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="テスト環境の説明を入力..."
          rows={2}
          maxLength={CONFIGURATION_DESCRIPTION_MAX_LENGTH}
          disabled={isSubmitting}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          {errors.description ? (
            <span className="text-destructive">{errors.description}</span>
          ) : (
            <span />
          )}
          <span>
            {formData.description.length}/{CONFIGURATION_DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
      </div>

      {/* Config Params */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">環境設定</Label>

        {/* OS Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="os" className="text-xs">
              OS
            </Label>
            <Input
              id="os"
              value={formData.configParams.os || ''}
              onChange={(e) => handleConfigParamChange('os', e.target.value)}
              placeholder="例: Windows"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="osVersion" className="text-xs">
              OSバージョン
            </Label>
            <Input
              id="osVersion"
              value={formData.configParams.osVersion || ''}
              onChange={(e) => handleConfigParamChange('osVersion', e.target.value)}
              placeholder="例: 11"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Browser Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="browser" className="text-xs">
              ブラウザ
            </Label>
            <Input
              id="browser"
              value={formData.configParams.browser || ''}
              onChange={(e) => handleConfigParamChange('browser', e.target.value)}
              placeholder="例: Chrome"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="browserVersion" className="text-xs">
              ブラウザバージョン
            </Label>
            <Input
              id="browserVersion"
              value={formData.configParams.browserVersion || ''}
              onChange={(e) => handleConfigParamChange('browserVersion', e.target.value)}
              placeholder="例: 120"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Advanced Settings */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between" type="button">
              詳細設定
              {isAdvancedOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Device Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="device" className="text-xs">
                  デバイス
                </Label>
                <Input
                  id="device"
                  value={formData.configParams.device || ''}
                  onChange={(e) => handleConfigParamChange('device', e.target.value)}
                  placeholder="例: iPhone 15"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceType" className="text-xs">
                  デバイスタイプ
                </Label>
                <Input
                  id="deviceType"
                  value={formData.configParams.deviceType || ''}
                  onChange={(e) => handleConfigParamChange('deviceType', e.target.value)}
                  placeholder="例: mobile, tablet, desktop"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Resolution and Locale */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resolution" className="text-xs">
                  解像度
                </Label>
                <Input
                  id="resolution"
                  value={formData.configParams.resolution || ''}
                  onChange={(e) => handleConfigParamChange('resolution', e.target.value)}
                  placeholder="例: 1920x1080"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locale" className="text-xs">
                  ロケール
                </Label>
                <Input
                  id="locale"
                  value={formData.configParams.locale || ''}
                  onChange={(e) => handleConfigParamChange('locale', e.target.value)}
                  placeholder="例: ja-JP"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-xs">
                タイムゾーン
              </Label>
              <Input
                id="timezone"
                value={formData.configParams.timezone || ''}
                onChange={(e) => handleConfigParamChange('timezone', e.target.value)}
                placeholder="例: Asia/Tokyo"
                disabled={isSubmitting}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Is Active */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">有効</Label>
          <p className="text-sm text-muted-foreground">
            無効にするとテストラン作成時に選択できなくなります。
          </p>
        </div>
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => handleChange('isActive', checked)}
          disabled={isSubmitting}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {initialData ? '更新' : '作成'}
        </Button>
      </div>
    </form>
  );
}
