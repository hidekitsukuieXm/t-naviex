'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, User, Clock } from 'lucide-react';
import type { TestResultHistoryWithEditor } from '@/types/test-result';

interface TestResultHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  testRunId: string;
  caseId: string;
  resultId: string;
}

const FIELD_LABELS: Record<string, string> = {
  status: 'ステータス',
  executionTime: '実行時間',
  actualResult: '実際の結果',
  defects: '不具合',
  comment: 'コメント',
  environment: '環境',
  browserInfo: 'ブラウザ情報',
};

const STATUS_LABELS: Record<string, string> = {
  NOT_RUN: '未実行',
  PASSED: '合格',
  FAILED: '不合格',
  BLOCKED: 'ブロック',
  SKIPPED: 'スキップ',
  RETEST: '再テスト',
};

export function TestResultHistoryDialog({
  open,
  onOpenChange,
  projectId,
  testRunId,
  caseId,
  resultId,
}: TestResultHistoryDialogProps) {
  const [histories, setHistories] = useState<TestResultHistoryWithEditor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !resultId) return;

    let cancelled = false;

    const fetchHistories = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/projects/${projectId}/test-runs/${testRunId}/cases/${caseId}/results/${resultId}/history`
        );

        if (!response.ok) {
          throw new Error('履歴の取得に失敗しました');
        }

        const data = await response.json();
        if (!cancelled) {
          setHistories(data.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '履歴の取得に失敗しました');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchHistories();

    return () => {
      cancelled = true;
    };
  }, [open, projectId, testRunId, caseId, resultId]);

  const formatValue = (fieldName: string, value: string | null): string => {
    if (value === null || value === '') return '(なし)';
    if (fieldName === 'status') {
      return STATUS_LABELS[value] || value;
    }
    if (fieldName === 'executionTime') {
      const seconds = parseInt(value, 10);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return minutes > 0 ? `${minutes}分${remainingSeconds}秒` : `${remainingSeconds}秒`;
    }
    return value;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            編集履歴
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="text-muted-foreground">読み込み中...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center py-8">
              <span className="text-destructive">{error}</span>
            </div>
          ) : histories.length === 0 ? (
            <div className="flex justify-center py-8">
              <span className="text-muted-foreground">編集履歴はありません</span>
            </div>
          ) : (
            <div className="space-y-4">
              {histories.map((history) => (
                <div key={history.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {FIELD_LABELS[history.fieldName] || history.fieldName}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {history.editedBy.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(history.editedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">変更前:</span>
                      <div className="mt-1 p-2 bg-muted rounded text-wrap break-words">
                        {formatValue(history.fieldName, history.oldValue)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">変更後:</span>
                      <div className="mt-1 p-2 bg-muted rounded text-wrap break-words">
                        {formatValue(history.fieldName, history.newValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
