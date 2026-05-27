'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  validateBaselineName,
  validateBaselineDescription,
  validateBaselineVersion,
} from '@/types/baseline';
import { Loader2 } from 'lucide-react';

export interface BaselineFormData {
  name: string;
  description: string;
  version: string;
}

interface BaselineFormProps {
  initialData?: Partial<BaselineFormData>;
  onSubmit: (data: BaselineFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function BaselineForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = '作成',
}: BaselineFormProps) {
  const [formData, setFormData] = useState<BaselineFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    version: initialData?.version || '1.0.0',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameResult = validateBaselineName(formData.name);
    if (!nameResult.valid && nameResult.error) {
      newErrors.name = nameResult.error;
    }

    const descResult = validateBaselineDescription(formData.description);
    if (!descResult.valid && descResult.error) {
      newErrors.description = descResult.error;
    }

    const versionResult = validateBaselineVersion(formData.version);
    if (!versionResult.valid && versionResult.error) {
      newErrors.version = versionResult.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch {
      // Error handling is done in the parent component
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          ベースライン名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="例: v1.0.0 リリース候補"
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="version">
          バージョン <span className="text-destructive">*</span>
        </Label>
        <Input
          id="version"
          value={formData.version}
          onChange={(e) => setFormData({ ...formData, version: e.target.value })}
          placeholder="1.0.0"
          disabled={isLoading}
        />
        {errors.version && <p className="text-sm text-destructive">{errors.version}</p>}
        <p className="text-xs text-muted-foreground">
          セマンティックバージョニング形式（例: 1.0.0, 2.1.0-beta.1）
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="このベースラインの説明を入力"
          rows={3}
          disabled={isLoading}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
