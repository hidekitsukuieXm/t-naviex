'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertTriangle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface StatusCounts {
  NOT_RUN: number;
  PASSED: number;
  FAILED: number;
  BLOCKED: number;
  SKIPPED: number;
  RETEST: number;
}

interface Summary {
  total: number;
  executed: number;
  notExecuted: number;
  passRate: number;
}

interface TestRunCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  testRunId: string;
  testRunName: string;
  onClose?: () => void;
}

export function TestRunCloseDialog({
  open,
  onOpenChange,
  projectId,
  testRunId,
  testRunName,
  onClose,
}: TestRunCloseDialogProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const fetchCloseInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${projectId}/test-runs/${testRunId}/close`);

        if (!response.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const data = await response.json();
        if (!cancelled) {
          setStatusCounts(data.statusCounts);
          setSummary(data.summary);
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

    fetchCloseInfo();

    return () => {
      cancelled = true;
    };
  }, [open, projectId, testRunId]);

  const handleClose = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/test-runs/${testRunId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'クローズに失敗しました');
      }

      onOpenChange(false);
      onClose?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クローズに失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const hasUnexecuted = summary && summary.notExecuted > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            テストランをクローズ
          </DialogTitle>
          <DialogDescription>「{testRunName}」をクローズしますか？</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="text-muted-foreground">読み込み中...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {hasUnexecuted && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    未実行のテストケースがあります
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    {summary?.notExecuted}件のケースが未実行です。
                  </p>
                </div>
              </div>
            )}

            {summary && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">実行状況</span>
                  <span className="text-sm font-medium">
                    {summary.executed} / {summary.total} 件実行済み
                  </span>
                </div>
                <Progress value={(summary.executed / summary.total) * 100} className="h-2" />

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">合格率</span>
                  <span className="text-sm font-medium">{summary.passRate}%</span>
                </div>
              </div>
            )}

            {statusCounts && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>合格: {statusCounts.PASSED}</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>不合格: {statusCounts.FAILED}</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span>ブロック: {statusCounts.BLOCKED}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="px-1">
                    S
                  </Badge>
                  <span>スキップ: {statusCounts.SKIPPED}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="px-1">
                    R
                  </Badge>
                  <span>再テスト: {statusCounts.RETEST}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="px-1">
                    -
                  </Badge>
                  <span>未実行: {statusCounts.NOT_RUN}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">クローズ時メモ（任意）</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="クローズ時のメモを入力..."
                rows={3}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              クローズ後はテスト結果の編集ができなくなります。
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            キャンセル
          </Button>
          <Button onClick={handleClose} disabled={loading || submitting}>
            {submitting ? 'クローズ中...' : 'クローズする'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
