'use client';

import { useState } from 'react';
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
import {
  TEST_SET_STATUSES,
  TEST_SET_STATUS_INFO,
  type TestSetStatus,
  validateTestSetName,
  validateTestSetDescription,
  validateTestSetVersion,
} from '@/types/test-set';
import { Loader2 } from 'lucide-react';

export interface TestSetFormData {
  name: string;
  description: string;
  status: TestSetStatus;
  version: string;
}

interface TestSetFormProps {
  initialData?: Partial<TestSetFormData>;
  onSubmit: (data: TestSetFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function TestSetForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = '保存',
}: TestSetFormProps) {
  const [formData, setFormData] = useState<TestSetFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'DRAFT',
    version: initialData?.version || '1.0.0',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameResult = validateTestSetName(formData.name);
    if (!nameResult.valid && nameResult.error) {
      newErrors.name = nameResult.error;
    }

    const descResult = validateTestSetDescription(formData.description);
    if (!descResult.valid && descResult.error) {
      newErrors.description = descResult.error;
    }

    const versionResult = validateTestSetVersion(formData.version);
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
          テストセット名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="テストセット名を入力"
          disabled={isLoading}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="テストセットの説明を入力"
          rows={3}
          disabled={isLoading}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">ステータス</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as TestSetStatus })}
            disabled={isLoading}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="ステータスを選択" />
            </SelectTrigger>
            <SelectContent>
              {TEST_SET_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {TEST_SET_STATUS_INFO[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>
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
