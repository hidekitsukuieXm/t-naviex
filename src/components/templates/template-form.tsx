'use client';

import { useState, useCallback } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type {
  TestCaseTemplateDetail,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateStepInput,
} from '@/types/template';
import type { TestCasePriority, TestType, TestTechnique } from '@/types/test-case';

// ============================================
// Types
// ============================================

interface TemplateFormProps {
  template?: TestCaseTemplateDetail;
  onSubmit: (data: CreateTemplateInput | UpdateTemplateInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// ============================================
// Constants
// ============================================

const PRIORITIES: { value: TestCasePriority; label: string }[] = [
  { value: 'CRITICAL', label: '最重要' },
  { value: 'HIGH', label: '高' },
  { value: 'MEDIUM', label: '中' },
  { value: 'LOW', label: '低' },
];

const TEST_TYPES: { value: TestType; label: string }[] = [
  { value: 'FUNCTIONAL', label: '機能テスト' },
  { value: 'INTEGRATION', label: '結合テスト' },
  { value: 'E2E', label: 'E2Eテスト' },
  { value: 'PERFORMANCE', label: '性能テスト' },
  { value: 'SECURITY', label: 'セキュリティテスト' },
  { value: 'USABILITY', label: 'ユーザビリティテスト' },
  { value: 'OTHER', label: 'その他' },
];

const TEST_TECHNIQUES: { value: TestTechnique; label: string }[] = [
  { value: 'EQUIVALENCE_PARTITIONING', label: '同値分割' },
  { value: 'BOUNDARY_VALUE_ANALYSIS', label: '境界値分析' },
  { value: 'DECISION_TABLE', label: 'デシジョンテーブル' },
  { value: 'STATE_TRANSITION', label: '状態遷移' },
  { value: 'EXPLORATORY', label: '探索的テスト' },
  { value: 'REGRESSION', label: '回帰テスト' },
  { value: 'OTHER', label: 'その他' },
];

// ============================================
// Component
// ============================================

export function TemplateForm({ template, onSubmit, onCancel, isLoading }: TemplateFormProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [title, setTitle] = useState(template?.title ?? '');
  const [templateDescription, setTemplateDescription] = useState(
    template?.templateDescription ?? ''
  );
  const [preconditions, setPreconditions] = useState(template?.preconditions ?? '');
  const [expectedResult, setExpectedResult] = useState(template?.expectedResult ?? '');
  const [checkpoint, setCheckpoint] = useState(template?.checkpoint ?? '');
  const [scenario, setScenario] = useState(template?.scenario ?? '');
  const [testEnvironment, setTestEnvironment] = useState(template?.testEnvironment ?? '');
  const [notes, setNotes] = useState(template?.notes ?? '');
  const [classification, setClassification] = useState(template?.classification ?? '');
  const [priority, setPriority] = useState<TestCasePriority>(template?.priority ?? 'MEDIUM');
  const [testType, setTestType] = useState<TestType>(template?.testType ?? 'FUNCTIONAL');
  const [testTechnique, setTestTechnique] = useState<TestTechnique>(
    template?.testTechnique ?? 'OTHER'
  );
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [sortOrder, setSortOrder] = useState(template?.sortOrder ?? 0);
  const [steps, setSteps] = useState<TemplateStepInput[]>(
    template?.templateSteps?.map((s) => ({
      stepNo: s.stepNo,
      actionMd: s.actionMd,
      expectedMd: s.expectedMd,
    })) ?? []
  );

  const handleAddStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      {
        stepNo: prev.length + 1,
        actionMd: '',
        expectedMd: '',
      },
    ]);
  }, []);

  const handleRemoveStep = useCallback((index: number) => {
    setSteps((prev) => {
      const newSteps = prev.filter((_, i) => i !== index);
      return newSteps.map((step, i) => ({
        ...step,
        stepNo: i + 1,
      }));
    });
  }, []);

  const handleStepChange = useCallback(
    (index: number, field: 'actionMd' | 'expectedMd', value: string) => {
      setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, [field]: value } : step)));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const data: CreateTemplateInput | UpdateTemplateInput = {
        name: name.trim(),
        description: description.trim() || null,
        title: title.trim() || null,
        templateDescription: templateDescription.trim() || null,
        preconditions: preconditions.trim() || null,
        expectedResult: expectedResult.trim() || null,
        checkpoint: checkpoint.trim() || null,
        scenario: scenario.trim() || null,
        testEnvironment: testEnvironment.trim() || null,
        notes: notes.trim() || null,
        classification: classification.trim() || null,
        priority,
        testType,
        testTechnique,
        isDefault,
        sortOrder,
        templateSteps: steps.filter((s) => s.actionMd.trim()),
      };

      await onSubmit(data);
    },
    [
      name,
      description,
      title,
      templateDescription,
      preconditions,
      expectedResult,
      checkpoint,
      scenario,
      testEnvironment,
      notes,
      classification,
      priority,
      testType,
      testTechnique,
      isDefault,
      sortOrder,
      steps,
      onSubmit,
    ]
  );

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {/* 基本情報 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">テンプレート名 *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="テンプレート名"
            required
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortOrder">並び順</Label>
          <Input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            min={0}
            max={9999}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">テンプレート説明</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="このテンプレートの説明"
          rows={2}
          disabled={isLoading}
        />
      </div>

      {/* テストケース初期値 */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">テストケース初期値</h4>

        <div className="space-y-2">
          <Label htmlFor="title">タイトルテンプレート</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="テストケースタイトルのテンプレート"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="templateDescription">説明テンプレート</Label>
          <Textarea
            id="templateDescription"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="テストケース説明のテンプレート"
            rows={2}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority">優先度</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TestCasePriority)}>
              <SelectTrigger id="priority" disabled={isLoading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="testType">テストタイプ</Label>
            <Select value={testType} onValueChange={(v) => setTestType(v as TestType)}>
              <SelectTrigger id="testType" disabled={isLoading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="testTechnique">テスト技法</Label>
            <Select
              value={testTechnique}
              onValueChange={(v) => setTestTechnique(v as TestTechnique)}
            >
              <SelectTrigger id="testTechnique" disabled={isLoading}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_TECHNIQUES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="preconditions">前提条件</Label>
            <Textarea
              id="preconditions"
              value={preconditions}
              onChange={(e) => setPreconditions(e.target.value)}
              placeholder="前提条件のテンプレート"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expectedResult">期待結果</Label>
            <Textarea
              id="expectedResult"
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="期待結果のテンプレート"
              rows={2}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="checkpoint">確認ポイント</Label>
            <Textarea
              id="checkpoint"
              value={checkpoint}
              onChange={(e) => setCheckpoint(e.target.value)}
              placeholder="確認ポイントのテンプレート"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scenario">シナリオ</Label>
            <Textarea
              id="scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="シナリオのテンプレート"
              rows={2}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="testEnvironment">テスト環境</Label>
            <Textarea
              id="testEnvironment"
              value={testEnvironment}
              onChange={(e) => setTestEnvironment(e.target.value)}
              placeholder="テスト環境のテンプレート"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">備考</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="備考のテンプレート"
              rows={2}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="classification">分類</Label>
          <Input
            id="classification"
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            placeholder="分類"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* テスト手順テンプレート */}
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">テスト手順テンプレート</h4>
          <Button type="button" size="sm" variant="outline" onClick={handleAddStep}>
            <Plus className="mr-2 size-4" />
            手順追加
          </Button>
        </div>

        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            テスト手順がありません。「手順追加」から追加してください。
          </p>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="w-8 pt-2 text-sm text-muted-foreground font-mono">
                  {step.stepNo}.
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      value={step.actionMd}
                      onChange={(e) => handleStepChange(index, 'actionMd', e.target.value)}
                      placeholder="操作内容"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Input
                      value={step.expectedMd ?? ''}
                      onChange={(e) => handleStepChange(index, 'expectedMd', e.target.value)}
                      placeholder="期待結果（オプション）"
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveStep(index)}
                  disabled={isLoading}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* オプション */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="isDefault"
            checked={isDefault}
            onCheckedChange={setIsDefault}
            disabled={isLoading}
          />
          <Label htmlFor="isDefault">デフォルトテンプレートにする</Label>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {template ? '更新' : '作成'}
        </Button>
      </div>
    </form>
  );
}
