'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface StatusCounts {
  FAILED: number;
  BLOCKED: number;
  SKIPPED: number;
  RETEST: number;
}

interface TestRunReRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  testRunId: string;
  testRunName: string;
}

const STATUS_CONFIG = [
  { key: 'FAILED', label: '不合格', color: 'destructive' as const },
  { key: 'BLOCKED', label: 'ブロック', color: 'secondary' as const },
  { key: 'SKIPPED', label: 'スキップ', color: 'outline' as const },
  { key: 'RETEST', label: '再テスト', color: 'default' as const },
];

export function TestRunReRunDialog({
  open,
  onOpenChange,
  projectId,
  testRunId,
  testRunName,
}: TestRunReRunDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['FAILED', 'BLOCKED']);
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const fetchCounts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/test-runs/${testRunId}/rerun`);

        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const data = await response.json();
        if (!cancelled) {
          setStatusCounts(data.statusCounts);
          setName(`${testRunName} - Re-Run`);
          setDescription(`Re-run of failed and blocked test cases from ${testRunName}`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCounts();

    return () => {
      cancelled = true;
    };
  }, [open, projectId, testRunId, testRunName]);

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const getTotalSelected = () => {
    if (!statusCounts) return 0;
    return selectedStatuses.reduce((sum, status) => {
      return sum + (statusCounts[status as keyof StatusCounts] || 0);
    }, 0);
  };

  const handleSubmit = async () => {
    if (selectedStatuses.length === 0) {
      setError('少なくとも1つのステータスを選択してください');
      return;
    }

    if (getTotalSelected() === 0) {
      setError('対象のテストケースがありません');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/test-runs/${testRunId}/rerun`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          includeStatuses: selectedStatuses,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Re-Runの作成に失敗しました');
      }

      const newTestRun = await response.json();
      onOpenChange(false);
      router.push(`/projects/${projectId}/test-runs/${newTestRun.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-Runの作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Re-Run（再テスト）
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="text-muted-foreground">読み込み中...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>対象ステータス</Label>
              <div className="space-y-2">
                {STATUS_CONFIG.map((config) => {
                  const count = statusCounts?.[config.key as keyof StatusCounts] || 0;
                  return (
                    <div key={config.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={config.key}
                        checked={selectedStatuses.includes(config.key)}
                        onCheckedChange={() => handleStatusToggle(config.key)}
                        disabled={count === 0}
                      />
                      <label
                        htmlFor={config.key}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Badge variant={config.color}>{config.label}</Badge>
                        <span className="text-muted-foreground">({count}件)</span>
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                選択されたケース数: <strong>{getTotalSelected()}</strong>件
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">テストラン名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Re-Run名を入力"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="説明を入力"
                rows={3}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || submitting || getTotalSelected() === 0}
          >
            {submitting ? '作成中...' : 'Re-Runを作成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
