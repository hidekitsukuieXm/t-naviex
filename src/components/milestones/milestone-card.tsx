'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MilestoneStatusBadge } from './milestone-status-badge';
import { type Milestone, isMilestoneOverdue, getMilestoneProgress } from '@/types/milestone';
import { Pencil, Trash2, Loader2, Calendar, AlertTriangle } from 'lucide-react';

interface MilestoneCardProps {
  milestone: Milestone;
  onEdit: (milestone: Milestone) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function MilestoneCard({ milestone, onEdit, onDelete, isDeleting }: MilestoneCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const isOverdue = isMilestoneOverdue(milestone);
  const progress = getMilestoneProgress(milestone);

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="line-clamp-1 text-lg">{milestone.name}</CardTitle>
              {isOverdue && (
                <span title="期限超過">
                  <AlertTriangle className="size-4 text-destructive" />
                </span>
              )}
            </div>
            <CardDescription className="mt-1 line-clamp-2 min-h-[2.5rem]">
              {milestone.description || 'マイルストーンの説明がありません'}
            </CardDescription>
          </div>
          <MilestoneStatusBadge status={milestone.status} className="ml-2 shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mb-4 space-y-3">
          {/* Period */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {milestone.startDate && (
              <div className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                <span>開始: {formatDate(milestone.startDate)}</span>
              </div>
            )}
            {milestone.dueDate && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
                <Calendar className="size-3.5" />
                <span>期限: {formatDate(milestone.dueDate)}</span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>進捗</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(milestone)} className="flex-1">
            <Pencil className="mr-1.5 size-3.5" />
            編集
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(milestone.id)}
            disabled={isDeleting}
            className="flex-1 text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 size-3.5" />
            )}
            削除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
