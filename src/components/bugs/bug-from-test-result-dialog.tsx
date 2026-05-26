'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Loader2, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  type BugType,
  type BugPriority,
  type BugSeverity,
  BugTypeLabels,
  BugPriorityLabels,
  BugSeverityLabels,
} from '@/types/bug';
import { REPRODUCIBILITY_LABELS } from '@/types/test-run-case';

interface TestRunCaseInfo {
  id: string;
  testCase: {
    id: string;
    title: string;
    description?: string | null;
    preconditions?: string | null;
    expectedResult?: string | null;
  };
  actualResult?: string | null;
  defects?: string | null;
  comment?: string | null;
  reproducibility?: string | null;
}

interface BugFromTestResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  testRunId: string;
  testRunCase: TestRunCaseInfo;
  onSuccess?: (bugId: string) => void;
}

export function BugFromTestResultDialog({
  open,
  onOpenChange,
  projectId,
  testRunId,
  testRunCase,
  onSuccess,
}: BugFromTestResultDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResultId, setTestResultId] = useState<string | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);

  // Pre-filled form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'BUG' as BugType,
    priority: 'MEDIUM' as BugPriority,
    severity: 'MAJOR' as BugSeverity,
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
  });

  // Initialize form with test case data
  useEffect(() => {
    let isMounted = true;

    const initializeForm = async () => {
      if (!open || !testRunCase) return;

      const reproLabel = testRunCase.reproducibility
        ? REPRODUCIBILITY_LABELS[testRunCase.reproducibility] || ''
        : '';

      const stepsToReproduce = [
        testRunCase.testCase.preconditions
          ? `【前提条件】\n${testRunCase.testCase.preconditions}`
          : '',
        testRunCase.testCase.description
          ? `【テスト内容】\n${testRunCase.testCase.description}`
          : '',
        reproLabel ? `【再現性】\n${reproLabel}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      if (!isMounted) return;

      setFormData({
        title: `[テスト不合格] ${testRunCase.testCase.title}`,
        description: testRunCase.defects || testRunCase.comment || '',
        type: 'BUG',
        priority: 'MEDIUM',
        severity: 'MAJOR',
        stepsToReproduce,
        expectedResult: testRunCase.testCase.expectedResult || '',
        actualResult: testRunCase.actualResult || '',
      });

      // Load test result
      setIsLoadingResult(true);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/test-runs/${testRunId}/cases/${testRunCase.id}/results?limit=1`
        );

        if (!isMounted) return;

        if (response.ok) {
          const results = await response.json();
          if (results && results.length > 0) {
            setTestResultId(results[0].id);
          }
        }
      } catch {
        // Silently fail - we'll create without testResultId if needed
      } finally {
        if (isMounted) {
          setIsLoadingResult(false);
        }
      }
    };

    initializeForm();

    return () => {
      isMounted = false;
    };
  }, [open, testRunCase, projectId, testRunId]);

  const handleSubmit = async () => {
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
          stepsToReproduce: formData.stepsToReproduce || null,
          expectedResult: formData.expectedResult || null,
          actualResult: formData.actualResult || null,
          testResultId: testResultId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'バグの登録に失敗しました。');
      }

      const bug = await response.json();

      toast({
        title: 'バグを登録しました',
        description: `#${bug.id} ${bug.title}`,
      });

      onSuccess?.(bug.id);
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="size-5" />
            テスト結果からバグを登録
          </DialogTitle>
          <DialogDescription>
            テスト不合格の情報を元にバグを登録します。内容を確認・編集して登録してください。
          </DialogDescription>
        </DialogHeader>

        {isLoadingResult ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bug-title">タイトル *</Label>
              <Input
                id="bug-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="バグのタイトル"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bug-type">種別</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as BugType })}
                >
                  <SelectTrigger id="bug-type">
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
                <Label htmlFor="bug-priority">優先度</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as BugPriority })
                  }
                >
                  <SelectTrigger id="bug-priority">
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
                <Label htmlFor="bug-severity">深刻度</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) =>
                    setFormData({ ...formData, severity: value as BugSeverity })
                  }
                >
                  <SelectTrigger id="bug-severity">
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

            <div className="space-y-2">
              <Label htmlFor="bug-description">説明</Label>
              <Textarea
                id="bug-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="バグの説明"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bug-steps">再現手順</Label>
              <Textarea
                id="bug-steps"
                value={formData.stepsToReproduce}
                onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                placeholder="再現手順を入力"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bug-expected">期待結果</Label>
                <Textarea
                  id="bug-expected"
                  value={formData.expectedResult}
                  onChange={(e) => setFormData({ ...formData, expectedResult: e.target.value })}
                  placeholder="期待結果"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bug-actual">実際の結果</Label>
                <Textarea
                  id="bug-actual"
                  value={formData.actualResult}
                  onChange={(e) => setFormData({ ...formData, actualResult: e.target.value })}
                  placeholder="実際の結果"
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isLoadingResult}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            バグを登録
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
