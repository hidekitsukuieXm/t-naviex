'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  type TestCase,
  type TestCasePriority,
  type TestType,
  type TestTechnique,
  PRIORITY_LABELS,
  TEST_TYPE_LABELS,
  TEST_TECHNIQUE_LABELS,
  VALID_PRIORITIES,
  VALID_TEST_TYPES,
  VALID_TEST_TECHNIQUES,
  validateTestCaseTitle,
  validateDescription,
  validatePreconditions,
} from '@/types/test-case';
import { type TestSectionWithChildren } from '@/types/test-section';

// ============================================
// Types
// ============================================

export interface TestCaseFormData {
  title: string;
  description: string;
  preconditions: string;
  priority: TestCasePriority;
  testType: TestType;
  testTechnique: TestTechnique;
  sectionId: string | null;
  isMatrix: boolean;
}

interface TestCaseFormProps {
  testCase?: TestCase;
  sections?: TestSectionWithChildren[];
  onSubmit: (data: TestCaseFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  defaultSectionId?: string | null;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Flatten sections for select dropdown
 */
function flattenSections(
  sections: TestSectionWithChildren[],
  level: number = 0
): Array<{ id: string; name: string; level: number }> {
  const result: Array<{ id: string; name: string; level: number }> = [];
  for (const section of sections) {
    result.push({ id: section.id, name: section.name, level });
    if (section.children.length > 0) {
      result.push(...flattenSections(section.children, level + 1));
    }
  }
  return result;
}

// ============================================
// Component
// ============================================

export function TestCaseForm({
  testCase,
  sections = [],
  onSubmit,
  onCancel,
  isLoading = false,
  defaultSectionId = null,
}: TestCaseFormProps) {
  const [formData, setFormData] = useState<TestCaseFormData>({
    title: testCase?.title ?? '',
    description: testCase?.description ?? '',
    preconditions: testCase?.preconditions ?? '',
    priority: testCase?.priority ?? 'MEDIUM',
    testType: testCase?.testType ?? 'FUNCTIONAL',
    testTechnique: testCase?.testTechnique ?? 'OTHER',
    sectionId: testCase?.sectionId ?? defaultSectionId,
    isMatrix: testCase?.isMatrix ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const flatSections = flattenSections(sections);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // タイトル
    const titleValidation = validateTestCaseTitle(formData.title);
    if (!titleValidation.valid && titleValidation.error) {
      newErrors.title = titleValidation.error;
    }

    // 説明
    const descriptionValidation = validateDescription(formData.description || null);
    if (!descriptionValidation.valid && descriptionValidation.error) {
      newErrors.description = descriptionValidation.error;
    }

    // 事前条件
    const preconditionsValidation = validatePreconditions(formData.preconditions || null);
    if (!preconditionsValidation.valid && preconditionsValidation.error) {
      newErrors.preconditions = preconditionsValidation.error;
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

  const handleSectionChange = (value: string) => {
    setFormData({
      ...formData,
      sectionId: value === '__none__' ? null : value,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4" />
          <span>{errors.form}</span>
        </div>
      )}

      {/* タイトル */}
      <div className="space-y-2">
        <Label htmlFor="title">
          テストケース名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="テストケース名を入力"
          disabled={isLoading}
          maxLength={500}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <p id="title-error" className="text-sm text-destructive">
            {errors.title}
          </p>
        )}
      </div>

      {/* セクション */}
      {sections.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="section">セクション</Label>
          <Select
            value={formData.sectionId ?? '__none__'}
            onValueChange={handleSectionChange}
            disabled={isLoading}
          >
            <SelectTrigger id="section">
              <SelectValue placeholder="セクションを選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">未分類</SelectItem>
              {flatSections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  <span style={{ paddingLeft: `${section.level * 12}px` }}>{section.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 優先度・テストタイプ・テスト技法（3列レイアウト） */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 優先度 */}
        <div className="space-y-2">
          <Label htmlFor="priority">優先度</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) =>
              setFormData({ ...formData, priority: value as TestCasePriority })
            }
            disabled={isLoading}
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="優先度を選択" />
            </SelectTrigger>
            <SelectContent>
              {VALID_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* テストタイプ */}
        <div className="space-y-2">
          <Label htmlFor="testType">テストタイプ</Label>
          <Select
            value={formData.testType}
            onValueChange={(value) => setFormData({ ...formData, testType: value as TestType })}
            disabled={isLoading}
          >
            <SelectTrigger id="testType">
              <SelectValue placeholder="テストタイプを選択" />
            </SelectTrigger>
            <SelectContent>
              {VALID_TEST_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {TEST_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* テスト技法 */}
        <div className="space-y-2">
          <Label htmlFor="testTechnique">テスト技法</Label>
          <Select
            value={formData.testTechnique}
            onValueChange={(value) =>
              setFormData({ ...formData, testTechnique: value as TestTechnique })
            }
            disabled={isLoading}
          >
            <SelectTrigger id="testTechnique">
              <SelectValue placeholder="テスト技法を選択" />
            </SelectTrigger>
            <SelectContent>
              {VALID_TEST_TECHNIQUES.map((technique) => (
                <SelectItem key={technique} value={technique}>
                  {TEST_TECHNIQUE_LABELS[technique]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 説明 */}
      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="テストケースの説明を入力"
          disabled={isLoading}
          rows={3}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && (
          <p id="description-error" className="text-sm text-destructive">
            {errors.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.description.length.toLocaleString()} / 10,000文字
        </p>
      </div>

      {/* 事前条件 */}
      <div className="space-y-2">
        <Label htmlFor="preconditions">事前条件</Label>
        <Textarea
          id="preconditions"
          value={formData.preconditions}
          onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
          placeholder="テスト実行前に必要な条件を入力"
          disabled={isLoading}
          rows={2}
          aria-invalid={!!errors.preconditions}
          aria-describedby={errors.preconditions ? 'preconditions-error' : undefined}
        />
        {errors.preconditions && (
          <p id="preconditions-error" className="text-sm text-destructive">
            {errors.preconditions}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.preconditions.length.toLocaleString()} / 5,000文字
        </p>
      </div>

      {/* マトリクステスト */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isMatrix"
          checked={formData.isMatrix}
          onCheckedChange={(checked) => setFormData({ ...formData, isMatrix: checked === true })}
          disabled={isLoading}
        />
        <Label htmlFor="isMatrix" className="text-sm font-normal cursor-pointer">
          マトリクステストとして作成
        </Label>
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
          ) : testCase ? (
            '更新'
          ) : (
            '作成'
          )}
        </Button>
      </div>
    </form>
  );
}
