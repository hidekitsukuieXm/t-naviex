'use client';

import { useState, useEffect } from 'react';
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
import {
  type BugType,
  type BugPriority,
  type BugSeverity,
  type BugWithRelations,
  BugTypeLabels,
  BugPriorityLabels,
  BugSeverityLabels,
  validateBugTitle,
} from '@/types/bug';

export interface BugFormData {
  title: string;
  description: string | null;
  type: BugType;
  priority: BugPriority;
  severity: BugSeverity;
  assigneeId: string | null;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  version: string | null;
  dueDate: string | null;
  testResultId?: string | null;
}

interface BugFormProps {
  bug?: BugWithRelations;
  projectId: string;
  testResultId?: string;
  onSubmit: (data: BugFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BugForm({
  bug,
  projectId,
  testResultId,
  onSubmit,
  onCancel,
  isLoading = false,
}: BugFormProps) {
  const [formData, setFormData] = useState<BugFormData>({
    title: bug?.title ?? '',
    description: bug?.description ?? '',
    type: (bug?.type as BugType) ?? 'BUG',
    priority: (bug?.priority as BugPriority) ?? 'MEDIUM',
    severity: (bug?.severity as BugSeverity) ?? 'MAJOR',
    assigneeId: bug?.assigneeId?.toString() ?? null,
    stepsToReproduce: bug?.stepsToReproduce ?? '',
    expectedResult: bug?.expectedResult ?? '',
    actualResult: bug?.actualResult ?? '',
    environment: bug?.environment ?? '',
    version: bug?.version ?? '',
    dueDate: bug?.dueDate ? new Date(bug.dueDate).toISOString().split('T')[0] : '',
    testResultId: testResultId ?? bug?.testResultId?.toString() ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);

  // Fetch project members for assignee selection
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/members`);
        if (response.ok) {
          const data = await response.json();
          setAssignees(
            data.map((m: { user: { id: string; name: string } }) => ({
              id: m.user.id,
              name: m.user.name,
            }))
          );
        }
      } catch {
        // Silently ignore errors
      }
    };
    fetchMembers();
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const titleValidation = validateBugTitle(formData.title);
    if (!titleValidation.valid) {
      setError(titleValidation.error || 'タイトルが無効です。');
      return;
    }

    try {
      await onSubmit({
        ...formData,
        description: formData.description || null,
        stepsToReproduce: formData.stepsToReproduce || null,
        expectedResult: formData.expectedResult || null,
        actualResult: formData.actualResult || null,
        environment: formData.environment || null,
        version: formData.version || null,
        dueDate: formData.dueDate || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">
          タイトル <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="バグのタイトルを入力"
          disabled={isLoading}
          maxLength={500}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="type">種別</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as BugType })}
            disabled={isLoading}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="種別を選択" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(BugTypeLabels) as [BugType, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">優先度</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value as BugPriority })}
            disabled={isLoading}
          >
            <SelectTrigger id="priority">
              <SelectValue placeholder="優先度を選択" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(BugPriorityLabels) as [BugPriority, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="severity">重大度</Label>
          <Select
            value={formData.severity}
            onValueChange={(value) => setFormData({ ...formData, severity: value as BugSeverity })}
            disabled={isLoading}
          >
            <SelectTrigger id="severity">
              <SelectValue placeholder="重大度を選択" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(BugSeverityLabels) as [BugSeverity, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assignee">担当者</Label>
          <Select
            value={formData.assigneeId ?? 'unassigned'}
            onValueChange={(value) =>
              setFormData({ ...formData, assigneeId: value === 'unassigned' ? null : value })
            }
            disabled={isLoading}
          >
            <SelectTrigger id="assignee">
              <SelectValue placeholder="担当者を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">未割当</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">期限</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate ?? ''}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={formData.description ?? ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="バグの詳細な説明"
          disabled={isLoading}
          rows={3}
          maxLength={10000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="stepsToReproduce">再現手順</Label>
        <Textarea
          id="stepsToReproduce"
          value={formData.stepsToReproduce ?? ''}
          onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
          placeholder="1. ○○を実行する&#10;2. △△をクリックする&#10;3. ..."
          disabled={isLoading}
          rows={4}
          maxLength={10000}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expectedResult">期待結果</Label>
          <Textarea
            id="expectedResult"
            value={formData.expectedResult ?? ''}
            onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
            placeholder="期待される動作"
            disabled={isLoading}
            rows={3}
            maxLength={10000}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="actualResult">実際の結果</Label>
          <Textarea
            id="actualResult"
            value={formData.actualResult ?? ''}
            onChange={(e) => setFormData({ ...formData, actualResult: e.target.value })}
            placeholder="実際に起きた動作"
            disabled={isLoading}
            rows={3}
            maxLength={10000}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="environment">環境</Label>
          <Input
            id="environment"
            value={formData.environment ?? ''}
            onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
            placeholder="OS, ブラウザ, etc."
            disabled={isLoading}
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">バージョン</Label>
          <Input
            id="version"
            value={formData.version ?? ''}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            placeholder="1.0.0"
            disabled={isLoading}
            maxLength={100}
          />
        </div>
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
          ) : bug ? (
            '更新'
          ) : (
            '作成'
          )}
        </Button>
      </div>
    </form>
  );
}
