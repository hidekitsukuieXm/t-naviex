'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  TEST_RUN_STATUS_LABELS,
  TEST_RUN_NAME_MAX_LENGTH,
  type TestRun,
  type TestRunStatus,
} from '@/types/test-run';
import type { Milestone } from '@/types/milestone';
import type { Configuration } from '@/types/configuration';

interface TestRunEditFormProps {
  projectId: string;
  testRun: TestRun;
  milestones: Milestone[];
  configurations: Configuration[];
  onCancel: () => void;
  onSuccess: () => void;
}

function TestRunEditForm({
  projectId,
  testRun,
  milestones,
  configurations,
  onCancel,
  onSuccess,
}: TestRunEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Initialize form state from testRun
  const [name, setName] = useState(testRun.name);
  const [description, setDescription] = useState(testRun.description || '');
  const [milestoneId, setMilestoneId] = useState(testRun.milestoneId || 'none');
  const [configurationId, setConfigurationId] = useState(testRun.configurationId || 'none');
  const [status, setStatus] = useState<TestRunStatus>(testRun.status);
  const [plannedStartDate, setPlannedStartDate] = useState(testRun.plannedStartDate || '');
  const [plannedEndDate, setPlannedEndDate] = useState(testRun.plannedEndDate || '');
  const [actualStartDate, setActualStartDate] = useState(testRun.actualStartDate || '');
  const [actualEndDate, setActualEndDate] = useState(testRun.actualEndDate || '');
  const [notes, setNotes] = useState(testRun.notes || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'エラー',
        description: 'テストラン名を入力してください。',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/test-runs/${testRun.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          milestoneId: milestoneId === 'none' ? null : milestoneId || null,
          configurationId: configurationId === 'none' ? null : configurationId || null,
          status,
          plannedStartDate: plannedStartDate || null,
          plannedEndDate: plannedEndDate || null,
          actualStartDate: actualStartDate || null,
          actualEndDate: actualEndDate || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テストランの更新に失敗しました。');
      }

      toast({
        title: '更新完了',
        description: 'テストランを更新しました。',
      });

      onSuccess();
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="edit-name">テストラン名 *</Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={TEST_RUN_NAME_MAX_LENGTH}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-description">説明</Label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-milestone">マイルストーン</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger id="edit-milestone">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし</SelectItem>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-configuration">コンフィギュレーション</Label>
            <Select value={configurationId} onValueChange={setConfigurationId}>
              <SelectTrigger id="edit-configuration">
                <SelectValue placeholder="選択してください" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">なし</SelectItem>
                {configurations.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-status">ステータス</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TestRunStatus)}>
            <SelectTrigger id="edit-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(TEST_RUN_STATUS_LABELS) as [TestRunStatus, string][]).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-plannedStartDate">開始予定日</Label>
            <Input
              id="edit-plannedStartDate"
              type="date"
              value={plannedStartDate}
              onChange={(e) => setPlannedStartDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-plannedEndDate">終了予定日</Label>
            <Input
              id="edit-plannedEndDate"
              type="date"
              value={plannedEndDate}
              onChange={(e) => setPlannedEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-actualStartDate">実行開始日</Label>
            <Input
              id="edit-actualStartDate"
              type="date"
              value={actualStartDate}
              onChange={(e) => setActualStartDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-actualEndDate">実行終了日</Label>
            <Input
              id="edit-actualEndDate"
              type="date"
              value={actualEndDate}
              onChange={(e) => setActualEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="edit-notes">備考</Label>
          <Textarea
            id="edit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          更新
        </Button>
      </DialogFooter>
    </form>
  );
}

interface TestRunEditDialogProps {
  projectId: string;
  testRun: TestRun | null;
  milestones?: Milestone[];
  configurations?: Configuration[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TestRunEditDialog({
  projectId,
  testRun,
  milestones = [],
  configurations = [],
  open,
  onOpenChange,
  onSuccess,
}: TestRunEditDialogProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>テストラン編集</DialogTitle>
          <DialogDescription>テストランの情報を編集します。</DialogDescription>
        </DialogHeader>
        {testRun && (
          <TestRunEditForm
            key={testRun.id}
            projectId={projectId}
            testRun={testRun}
            milestones={milestones}
            configurations={configurations}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
