'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/mdx-editor';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  type TestStep,
  validateActionMd,
  validateExpectedMd,
  MAX_ACTION_LENGTH,
  MAX_EXPECTED_LENGTH,
} from '@/types/test-step';

// ============================================
// Types
// ============================================

export interface TestStepFormData {
  actionMd: string;
  expectedMd: string;
}

interface TestStepFormProps {
  step?: TestStep;
  onSubmit: (data: TestStepFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// ============================================
// Component
// ============================================

export function TestStepForm({ step, onSubmit, onCancel, isLoading = false }: TestStepFormProps) {
  const [formData, setFormData] = useState<TestStepFormData>({
    actionMd: step?.actionMd ?? '',
    expectedMd: step?.expectedMd ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 操作手順
    const actionValidation = validateActionMd(formData.actionMd);
    if (!actionValidation.valid && actionValidation.error) {
      newErrors.actionMd = actionValidation.error;
    }

    // 期待結果
    const expectedValidation = validateExpectedMd(formData.expectedMd || null);
    if (!expectedValidation.valid && expectedValidation.error) {
      newErrors.expectedMd = expectedValidation.error;
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
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'エラーが発生しました。',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4" />
          <span>{errors.form}</span>
        </div>
      )}

      {/* 操作手順 */}
      <div className="space-y-2">
        <Label htmlFor="actionMd">
          操作手順 <span className="text-destructive">*</span>
        </Label>
        <RichTextEditor
          value={formData.actionMd}
          onChange={(value) => setFormData({ ...formData, actionMd: value })}
          placeholder="テストの操作手順を入力（Markdownで記述可能）"
          disabled={isLoading}
          maxLength={MAX_ACTION_LENGTH}
          error={!!errors.actionMd}
        />
        {errors.actionMd && (
          <p id="actionMd-error" className="text-sm text-destructive">
            {errors.actionMd}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.actionMd.length.toLocaleString()} / {MAX_ACTION_LENGTH.toLocaleString()}文字
        </p>
      </div>

      {/* 期待結果 */}
      <div className="space-y-2">
        <Label htmlFor="expectedMd">期待結果</Label>
        <RichTextEditor
          value={formData.expectedMd}
          onChange={(value) => setFormData({ ...formData, expectedMd: value })}
          placeholder="期待される結果を入力（Markdownで記述可能）"
          disabled={isLoading}
          maxLength={MAX_EXPECTED_LENGTH}
          error={!!errors.expectedMd}
        />
        {errors.expectedMd && (
          <p id="expectedMd-error" className="text-sm text-destructive">
            {errors.expectedMd}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.expectedMd.length.toLocaleString()} / {MAX_EXPECTED_LENGTH.toLocaleString()}文字
        </p>
      </div>

      {/* ボタン */}
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
          ) : step ? (
            '更新'
          ) : (
            '追加'
          )}
        </Button>
      </div>
    </form>
  );
}
