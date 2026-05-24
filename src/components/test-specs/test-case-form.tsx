'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2, X, Plus } from 'lucide-react';
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
  validateExpectedResult,
  validateCheckpoint,
  validateScenario,
  validateTestEnvironment,
  validateNotes,
  validateTags,
  validateClassification,
  validateReferenceId,
  validateEstimatedTime,
} from '@/types/test-case';
import { type TestSectionWithChildren } from '@/types/test-section';

// ============================================
// Types
// ============================================

export interface TestCaseFormData {
  title: string;
  description: string;
  preconditions: string;
  expectedResult: string;
  checkpoint: string;
  scenario: string;
  testEnvironment: string;
  notes: string;
  tags: string[];
  classification: string;
  referenceId: string;
  estimatedTime: number | null;
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
    expectedResult: testCase?.expectedResult ?? '',
    checkpoint: testCase?.checkpoint ?? '',
    scenario: testCase?.scenario ?? '',
    testEnvironment: testCase?.testEnvironment ?? '',
    notes: testCase?.notes ?? '',
    tags: testCase?.tags ?? [],
    classification: testCase?.classification ?? '',
    referenceId: testCase?.referenceId ?? '',
    estimatedTime: testCase?.estimatedTime ?? null,
    priority: testCase?.priority ?? 'MEDIUM',
    testType: testCase?.testType ?? 'FUNCTIONAL',
    testTechnique: testCase?.testTechnique ?? 'OTHER',
    sectionId: testCase?.sectionId ?? defaultSectionId,
    isMatrix: testCase?.isMatrix ?? false,
  });
  const [tagInput, setTagInput] = useState('');
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

    // 期待結果
    const expectedResultValidation = validateExpectedResult(formData.expectedResult || null);
    if (!expectedResultValidation.valid && expectedResultValidation.error) {
      newErrors.expectedResult = expectedResultValidation.error;
    }

    // チェックポイント
    const checkpointValidation = validateCheckpoint(formData.checkpoint || null);
    if (!checkpointValidation.valid && checkpointValidation.error) {
      newErrors.checkpoint = checkpointValidation.error;
    }

    // シナリオ
    const scenarioValidation = validateScenario(formData.scenario || null);
    if (!scenarioValidation.valid && scenarioValidation.error) {
      newErrors.scenario = scenarioValidation.error;
    }

    // テスト環境
    const testEnvironmentValidation = validateTestEnvironment(formData.testEnvironment || null);
    if (!testEnvironmentValidation.valid && testEnvironmentValidation.error) {
      newErrors.testEnvironment = testEnvironmentValidation.error;
    }

    // 特記事項
    const notesValidation = validateNotes(formData.notes || null);
    if (!notesValidation.valid && notesValidation.error) {
      newErrors.notes = notesValidation.error;
    }

    // タグ
    const tagsValidation = validateTags(formData.tags);
    if (!tagsValidation.valid && tagsValidation.error) {
      newErrors.tags = tagsValidation.error;
    }

    // 分類
    const classificationValidation = validateClassification(formData.classification || null);
    if (!classificationValidation.valid && classificationValidation.error) {
      newErrors.classification = classificationValidation.error;
    }

    // 参照ID
    const referenceIdValidation = validateReferenceId(formData.referenceId || null);
    if (!referenceIdValidation.valid && referenceIdValidation.error) {
      newErrors.referenceId = referenceIdValidation.error;
    }

    // 推定時間
    const estimatedTimeValidation = validateEstimatedTime(formData.estimatedTime);
    if (!estimatedTimeValidation.valid && estimatedTimeValidation.error) {
      newErrors.estimatedTime = estimatedTimeValidation.error;
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

      {/* 期待結果 */}
      <div className="space-y-2">
        <Label htmlFor="expectedResult">期待結果</Label>
        <Textarea
          id="expectedResult"
          value={formData.expectedResult}
          onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
          placeholder="期待される結果を入力"
          disabled={isLoading}
          rows={3}
          aria-invalid={!!errors.expectedResult}
          aria-describedby={errors.expectedResult ? 'expectedResult-error' : undefined}
        />
        {errors.expectedResult && (
          <p id="expectedResult-error" className="text-sm text-destructive">
            {errors.expectedResult}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.expectedResult.length.toLocaleString()} / 10,000文字
        </p>
      </div>

      {/* チェックポイント */}
      <div className="space-y-2">
        <Label htmlFor="checkpoint">チェックポイント</Label>
        <Textarea
          id="checkpoint"
          value={formData.checkpoint}
          onChange={(e) => setFormData({ ...formData, checkpoint: e.target.value })}
          placeholder="確認すべきポイントを入力"
          disabled={isLoading}
          rows={2}
          aria-invalid={!!errors.checkpoint}
          aria-describedby={errors.checkpoint ? 'checkpoint-error' : undefined}
        />
        {errors.checkpoint && (
          <p id="checkpoint-error" className="text-sm text-destructive">
            {errors.checkpoint}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.checkpoint.length.toLocaleString()} / 5,000文字
        </p>
      </div>

      {/* シナリオ */}
      <div className="space-y-2">
        <Label htmlFor="scenario">シナリオ</Label>
        <Textarea
          id="scenario"
          value={formData.scenario}
          onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
          placeholder="テストシナリオを入力"
          disabled={isLoading}
          rows={3}
          aria-invalid={!!errors.scenario}
          aria-describedby={errors.scenario ? 'scenario-error' : undefined}
        />
        {errors.scenario && (
          <p id="scenario-error" className="text-sm text-destructive">
            {errors.scenario}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.scenario.length.toLocaleString()} / 10,000文字
        </p>
      </div>

      {/* テスト環境 */}
      <div className="space-y-2">
        <Label htmlFor="testEnvironment">テスト環境</Label>
        <Textarea
          id="testEnvironment"
          value={formData.testEnvironment}
          onChange={(e) => setFormData({ ...formData, testEnvironment: e.target.value })}
          placeholder="テスト実行に必要な環境を入力"
          disabled={isLoading}
          rows={2}
          aria-invalid={!!errors.testEnvironment}
          aria-describedby={errors.testEnvironment ? 'testEnvironment-error' : undefined}
        />
        {errors.testEnvironment && (
          <p id="testEnvironment-error" className="text-sm text-destructive">
            {errors.testEnvironment}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.testEnvironment.length.toLocaleString()} / 5,000文字
        </p>
      </div>

      {/* 特記事項 */}
      <div className="space-y-2">
        <Label htmlFor="notes">特記事項</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="その他の注意事項やメモを入力"
          disabled={isLoading}
          rows={2}
          aria-invalid={!!errors.notes}
          aria-describedby={errors.notes ? 'notes-error' : undefined}
        />
        {errors.notes && (
          <p id="notes-error" className="text-sm text-destructive">
            {errors.notes}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.notes.length.toLocaleString()} / 5,000文字
        </p>
      </div>

      {/* タグ */}
      <div className="space-y-2">
        <Label htmlFor="tags">タグ</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => {
                  const newTags = formData.tags.filter((_, i) => i !== index);
                  setFormData({ ...formData, tags: newTags });
                }}
                disabled={isLoading}
                className="ml-1 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="タグを入力してEnterまたは追加ボタン"
            disabled={isLoading || formData.tags.length >= 20}
            maxLength={50}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = tagInput.trim();
                if (trimmed && !formData.tags.includes(trimmed) && formData.tags.length < 20) {
                  setFormData({ ...formData, tags: [...formData.tags, trimmed] });
                  setTagInput('');
                }
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={
              isLoading ||
              !tagInput.trim() ||
              formData.tags.includes(tagInput.trim()) ||
              formData.tags.length >= 20
            }
            onClick={() => {
              const trimmed = tagInput.trim();
              if (trimmed && !formData.tags.includes(trimmed)) {
                setFormData({ ...formData, tags: [...formData.tags, trimmed] });
                setTagInput('');
              }
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        {errors.tags && (
          <p id="tags-error" className="text-sm text-destructive">
            {errors.tags}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formData.tags.length} / 20タグ（各タグ最大50文字）
        </p>
      </div>

      {/* 分類・参照ID・推定時間（3列レイアウト） */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 分類 */}
        <div className="space-y-2">
          <Label htmlFor="classification">分類</Label>
          <Input
            id="classification"
            value={formData.classification}
            onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
            placeholder="分類を入力"
            disabled={isLoading}
            maxLength={100}
            aria-invalid={!!errors.classification}
            aria-describedby={errors.classification ? 'classification-error' : undefined}
          />
          {errors.classification && (
            <p id="classification-error" className="text-sm text-destructive">
              {errors.classification}
            </p>
          )}
        </div>

        {/* 参照ID */}
        <div className="space-y-2">
          <Label htmlFor="referenceId">参照ID</Label>
          <Input
            id="referenceId"
            value={formData.referenceId}
            onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
            placeholder="関連する外部IDを入力"
            disabled={isLoading}
            maxLength={100}
            aria-invalid={!!errors.referenceId}
            aria-describedby={errors.referenceId ? 'referenceId-error' : undefined}
          />
          {errors.referenceId && (
            <p id="referenceId-error" className="text-sm text-destructive">
              {errors.referenceId}
            </p>
          )}
        </div>

        {/* 推定時間 */}
        <div className="space-y-2">
          <Label htmlFor="estimatedTime">推定時間（分）</Label>
          <Input
            id="estimatedTime"
            type="number"
            min={0}
            max={99999}
            value={formData.estimatedTime ?? ''}
            onChange={(e) => {
              const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
              setFormData({ ...formData, estimatedTime: value });
            }}
            placeholder="分単位で入力"
            disabled={isLoading}
            aria-invalid={!!errors.estimatedTime}
            aria-describedby={errors.estimatedTime ? 'estimatedTime-error' : undefined}
          />
          {errors.estimatedTime && (
            <p id="estimatedTime-error" className="text-sm text-destructive">
              {errors.estimatedTime}
            </p>
          )}
        </div>
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
