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
  DialogTrigger,
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
import { Plus, Loader2 } from 'lucide-react';
import {
  TEST_RUN_STATUS,
  TEST_RUN_STATUS_LABELS,
  TEST_RUN_NAME_MAX_LENGTH,
  type TestRunStatus,
} from '@/types/test-run';
import type { Milestone } from '@/types/milestone';
import type { Configuration } from '@/types/configuration';

interface TestRunCreateDialogProps {
  projectId: string;
  milestones?: Milestone[];
  configurations?: Configuration[];
  onSuccess: () => void;
}

export function TestRunCreateDialog({
  projectId,
  milestones = [],
  configurations = [],
  onSuccess,
}: TestRunCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [configurationId, setConfigurationId] = useState<string>('');
  const [status, setStatus] = useState<TestRunStatus>(TEST_RUN_STATUS.PLANNED);
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setMilestoneId('');
    setConfigurationId('');
    setStatus(TEST_RUN_STATUS.PLANNED);
    setPlannedStartDate('');
    setPlannedEndDate('');
  };

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
      const response = await fetch(`/api/projects/${projectId}/test-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          milestoneId: milestoneId || null,
          configurationId: configurationId || null,
          status,
          plannedStartDate: plannedStartDate || null,
          plannedEndDate: plannedEndDate || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'テストランの作成に失敗しました。');
      }

      toast({
        title: '作成完了',
        description: 'テストランを作成しました。',
      });

      resetForm();
      setOpen(false);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          新規テストラン
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>テストラン作成</DialogTitle>
            <DialogDescription>新しいテストランを作成します。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">テストラン名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={TEST_RUN_NAME_MAX_LENGTH}
                placeholder="スプリント1 テストラン"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="テストランの説明..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="milestone">マイルストーン</Label>
                <Select value={milestoneId} onValueChange={setMilestoneId}>
                  <SelectTrigger id="milestone">
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
                <Label htmlFor="configuration">コンフィギュレーション</Label>
                <Select value={configurationId} onValueChange={setConfigurationId}>
                  <SelectTrigger id="configuration">
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
              <Label htmlFor="status">ステータス</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TestRunStatus)}>
                <SelectTrigger id="status">
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
                <Label htmlFor="plannedStartDate">開始予定日</Label>
                <Input
                  id="plannedStartDate"
                  type="date"
                  value={plannedStartDate}
                  onChange={(e) => setPlannedStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plannedEndDate">終了予定日</Label>
                <Input
                  id="plannedEndDate"
                  type="date"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
