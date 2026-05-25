'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TestRunStatusBadge } from './test-run-status-badge';
import {
  type TestRunWithRelations,
  getTestRunProgress,
  getTestRunPassRate,
  isTestRunOverdue,
} from '@/types/test-run';
import {
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestRunCardProps {
  testRun: TestRunWithRelations;
  onEdit: (testRun: TestRunWithRelations) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function TestRunCard({ testRun, onEdit, onDelete, isDeleting }: TestRunCardProps) {
  const progress = getTestRunProgress(testRun);
  const passRate = getTestRunPassRate(testRun);
  const overdue = isTestRunOverdue(testRun);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <Card className={cn('transition-all hover:shadow-md', overdue && 'border-destructive/50')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="truncate">{testRun.name}</span>
              {overdue && <AlertTriangle className="size-4 shrink-0 text-destructive" />}
            </CardTitle>
            {testRun.description && (
              <CardDescription className="mt-1 line-clamp-2">{testRun.description}</CardDescription>
            )}
          </div>
          <TestRunStatusBadge status={testRun.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">進捗</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded bg-green-50 p-1.5 dark:bg-green-950">
            <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="size-3" />
              <span>{testRun.passedCases}</span>
            </div>
            <div className="text-muted-foreground">合格</div>
          </div>
          <div className="rounded bg-red-50 p-1.5 dark:bg-red-950">
            <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
              <XCircle className="size-3" />
              <span>{testRun.failedCases}</span>
            </div>
            <div className="text-muted-foreground">不合格</div>
          </div>
          <div className="rounded bg-yellow-50 p-1.5 dark:bg-yellow-950">
            <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400">
              <MinusCircle className="size-3" />
              <span>{testRun.blockedCases}</span>
            </div>
            <div className="text-muted-foreground">ブロック</div>
          </div>
          <div className="rounded bg-gray-50 p-1.5 dark:bg-gray-800">
            <div className="font-medium">{testRun.totalCases}</div>
            <div className="text-muted-foreground">合計</div>
          </div>
        </div>

        {/* Pass Rate */}
        {testRun.totalCases > 0 && (
          <div className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">合格率</span>
            <span
              className={cn(
                'font-medium',
                passRate >= 80
                  ? 'text-green-600'
                  : passRate >= 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
              )}
            >
              {passRate}%
            </span>
          </div>
        )}

        {/* Dates */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {testRun.plannedStartDate && (
            <div className="flex items-center gap-1">
              <Calendar className="size-3" />
              <span>開始予定: {formatDate(testRun.plannedStartDate)}</span>
            </div>
          )}
          {testRun.plannedEndDate && (
            <div className={cn('flex items-center gap-1', overdue && 'text-destructive')}>
              <Calendar className="size-3" />
              <span>終了予定: {formatDate(testRun.plannedEndDate)}</span>
            </div>
          )}
        </div>

        {/* Related Info */}
        {(testRun.milestone || testRun.configuration) && (
          <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
            {testRun.milestone && <div>マイルストーン: {testRun.milestone.name}</div>}
            {testRun.configuration && (
              <div>コンフィギュレーション: {testRun.configuration.name}</div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 border-t pt-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(testRun)}>
            <Pencil className="mr-1 size-3" />
            編集
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={() => onDelete(testRun.id)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="mr-1 size-3 animate-spin" />
            ) : (
              <Trash2 className="mr-1 size-3" />
            )}
            削除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
