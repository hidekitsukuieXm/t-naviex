'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { BugStatusBadge } from '@/components/bugs/bug-status-badge';
import {
  type BugStatus,
  type BugType,
  type BugPriority,
  type BugSeverity,
  BugTypeLabels,
  BugPriorityLabels,
  BugSeverityLabels,
} from '@/types/bug';
import { Loader2, Plus, ArrowUp, ListTree, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubtaskBug {
  id: string;
  title: string;
  status: BugStatus;
}

interface ParentBug {
  id: string;
  title: string;
}

interface BugSubtaskSectionProps {
  projectId: string;
  bugId: string;
  parentBug?: ParentBug | null;
  childBugs?: SubtaskBug[];
  onSubtaskCreated?: () => void;
}

export function BugSubtaskSection({
  projectId,
  bugId,
  parentBug,
  childBugs = [],
  onSubtaskCreated,
}: BugSubtaskSectionProps) {
  const { toast } = useToast();
  const [subtasks, setSubtasks] = useState<SubtaskBug[]>(childBugs);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'TASK' as BugType,
    priority: 'MEDIUM' as BugPriority,
    severity: 'MINOR' as BugSeverity,
  });

  const loadSubtasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/bugs?parentBugId=${bugId}`);
      if (response.ok) {
        const data = await response.json();
        setSubtasks(
          data.bugs.map((bug: { id: string; title: string; status: BugStatus }) => ({
            id: bug.id,
            title: bug.title,
            status: bug.status,
          }))
        );
      }
    } catch {
      // Silent fail - initial data already shown
    } finally {
      setIsLoading(false);
    }
  }, [projectId, bugId]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (childBugs.length === 0) {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/projects/${projectId}/bugs?parentBugId=${bugId}`);
          if (!isMounted) return;
          if (response.ok) {
            const data = await response.json();
            if (!isMounted) return;
            setSubtasks(
              data.bugs.map((bug: { id: string; title: string; status: BugStatus }) => ({
                id: bug.id,
                title: bug.title,
                status: bug.status,
              }))
            );
          }
        } catch {
          // Silent fail - initial data already shown
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [childBugs.length, projectId, bugId]);

  const handleCreateSubtask = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'エラー',
        description: 'タイトルは必須です。',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/bugs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          type: formData.type,
          priority: formData.priority,
          severity: formData.severity,
          parentBugId: bugId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サブタスクの作成に失敗しました。');
      }

      toast({
        title: '作成完了',
        description: 'サブタスクを作成しました。',
      });

      // Reset form and close dialog
      setFormData({
        title: '',
        description: '',
        type: 'TASK',
        priority: 'MEDIUM',
        severity: 'MINOR',
      });
      setIsCreateDialogOpen(false);

      // Reload subtasks
      loadSubtasks();
      onSubtaskCreated?.();
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

  const getCompletedCount = () => {
    return subtasks.filter((s) => ['CLOSED', 'RESOLVED', 'VERIFIED'].includes(s.status)).length;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListTree className="size-4" />
          サブタスク
          {subtasks.length > 0 && (
            <span className="text-muted-foreground font-normal">
              ({getCompletedCount()}/{subtasks.length})
            </span>
          )}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-1 size-3" />
          追加
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Parent Bug Link */}
        {parentBug && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <ArrowUp className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">親課題:</span>
            <Link
              href={`/projects/${projectId}/bugs/${parentBug.id}`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              #{parentBug.id} {parentBug.title}
              <ExternalLink className="size-3" />
            </Link>
          </div>
        )}

        {/* Subtasks List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : subtasks.length > 0 ? (
          <div className="space-y-2">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/30 transition-colors"
              >
                <Link
                  href={`/projects/${projectId}/bugs/${subtask.id}`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <span className="font-mono text-xs text-muted-foreground">#{subtask.id}</span>
                  <span className="text-sm truncate">{subtask.title}</span>
                </Link>
                <BugStatusBadge status={subtask.status} size="sm" />
              </div>
            ))}
          </div>
        ) : !parentBug ? (
          <p className="text-sm text-muted-foreground text-center py-2">サブタスクはありません</p>
        ) : null}
      </CardContent>

      {/* Create Subtask Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>サブタスクの作成</DialogTitle>
            <DialogDescription>
              新しいサブタスクを作成します。作成後、詳細を編集できます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subtask-title">タイトル *</Label>
              <Input
                id="subtask-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="サブタスクのタイトル"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtask-description">説明</Label>
              <Textarea
                id="subtask-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="サブタスクの説明"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="subtask-type">種別</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as BugType })}
                >
                  <SelectTrigger id="subtask-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BugTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtask-priority">優先度</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as BugPriority })
                  }
                >
                  <SelectTrigger id="subtask-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BugPriorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtask-severity">深刻度</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) =>
                    setFormData({ ...formData, severity: value as BugSeverity })
                  }
                >
                  <SelectTrigger id="subtask-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BugSeverityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button onClick={handleCreateSubtask} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
