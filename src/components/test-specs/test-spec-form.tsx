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
import { AlertCircle, Loader2 } from 'lucide-react';
import { type TestSpec, type TestSpecStatus, TEST_SPEC_STATUS_LABELS } from '@/types/test-spec';

export interface TestSpecFormData {
  name: string;
  description: string;
  status: TestSpecStatus;
}

interface TestSpecFormProps {
  testSpec?: TestSpec;
  onSubmit: (data: TestSpecFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TestSpecForm({
  testSpec,
  onSubmit,
  onCancel,
  isLoading = false,
}: TestSpecFormProps) {
  const [formData, setFormData] = useState<TestSpecFormData>({
    name: testSpec?.name ?? '',
    description: testSpec?.description ?? '',
    status: testSpec?.status ?? 'DRAFT',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('テスト仕様書名は必須です。');
      return;
    }

    if (formData.name.length > 255) {
      setError('テスト仕様書名は255文字以内で入力してください。');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">
          テスト仕様書名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="テスト仕様書名を入力"
          disabled={isLoading}
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="テスト仕様書の説明を入力"
          disabled={isLoading}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">ステータス</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value as TestSpecStatus })}
          disabled={isLoading}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder="ステータスを選択" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(TEST_SPEC_STATUS_LABELS) as [TestSpecStatus, string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              保存中...
            </>
          ) : testSpec ? (
            '更新'
          ) : (
            '作成'
          )}
        </Button>
      </div>
    </form>
  );
}
