'use client';

import { useState, use, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Loader2,
  Search,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  SkipForward,
  RotateCcw,
  Play,
  Pause,
  Square,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Users2,
  UserCheck,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { type TestRunWithRelations, TEST_RUN_STATUS_LABELS } from '@/types/test-run';
import {
  type TestRunCaseWithRelations,
  type TestRunCaseStatus,
  TEST_RUN_CASE_STATUS,
  getTestRunCaseStatusLabel,
  getTestRunCaseStatusColor,
  formatExecutionTime,
  REPRODUCIBILITY_OPTIONS,
  REPRODUCIBILITY_LABELS,
} from '@/types/test-run-case';

interface ProjectMember {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const STATUS_ICONS: Record<TestRunCaseStatus, React.ReactNode> = {
  NOT_RUN: <Clock className="size-4" />,
  PASSED: <CheckCircle2 className="size-4 text-green-600" />,
  FAILED: <XCircle className="size-4 text-red-600" />,
  BLOCKED: <AlertTriangle className="size-4 text-yellow-600" />,
  SKIPPED: <SkipForward className="size-4 text-purple-600" />,
  RETEST: <RotateCcw className="size-4 text-blue-600" />,
};

const TEST_RUN_CASE_STATUS_LABELS_JP: Record<TestRunCaseStatus, string> = {
  NOT_RUN: '未実行',
  PASSED: '合格',
  FAILED: '不合格',
  BLOCKED: 'ブロック',
  SKIPPED: 'スキップ',
  RETEST: '再テスト',
};

// Separate form component to properly handle state reset on case change
interface ResultInputFormProps {
  testRunCase: TestRunCaseWithRelations;
  projectId: string;
  testRunId: string;
  onSave: (updatedCase: TestRunCaseWithRelations) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  canNavigate: boolean;
}

function ResultInputForm({
  testRunCase,
  projectId,
  testRunId,
  onSave,
  onNavigate,
  canNavigate,
}: ResultInputFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Form state initialized from props
  const [formStatus, setFormStatus] = useState<TestRunCaseStatus>(testRunCase.status);
  const [formActualResult, setFormActualResult] = useState(testRunCase.actualResult || '');
  const [formDefects, setFormDefects] = useState(testRunCase.defects || '');
  const [formComment, setFormComment] = useState(testRunCase.comment || '');
  const [formReproducibility, setFormReproducibility] = useState(testRunCase.reproducibility || '');

  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(testRunCase.executionTime || 0);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - timerStartTime) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerStartTime]);

  const startTimer = () => {
    if (!isTimerRunning) {
      const now = Date.now();
      setTimerStartTime(now - elapsedSeconds * 1000);
      setIsTimerRunning(true);
    }
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setElapsedSeconds(0);
    setTimerStartTime(null);
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-runs/${testRunId}/cases/${testRunCase.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: formStatus,
            actualResult: formActualResult.trim() || null,
            defects: formDefects.trim() || null,
            comment: formComment.trim() || null,
            reproducibility: formReproducibility || null,
            executionTime: elapsedSeconds,
            executedAt:
              formStatus !== TEST_RUN_CASE_STATUS.NOT_RUN ? new Date().toISOString() : null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '保存に失敗しました。');
      }

      const updatedCase = await response.json();
      onSave(updatedCase);

      toast({
        title: '保存完了',
        description: '結果を保存しました。',
      });

      pauseTimer();
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    projectId,
    testRunId,
    testRunCase.id,
    formStatus,
    formActualResult,
    formDefects,
    formComment,
    formReproducibility,
    elapsedSeconds,
    onSave,
    toast,
  ]);

  const handleSaveAndNext = async () => {
    await handleSave();
    onNavigate('next');
  };

  return (
    <>
      <CardHeader className="shrink-0 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">{testRunCase.testCase.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 pt-1">
              <Badge variant="secondary">{testRunCase.testCase.priority}</Badge>
              <Badge className={cn(getTestRunCaseStatusColor(testRunCase.status))}>
                {getTestRunCaseStatusLabel(testRunCase.status)}
              </Badge>
              {testRunCase.assignedTo && (
                <span className="text-xs">担当: {testRunCase.assignedTo.name}</span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onNavigate('prev')}
              disabled={!canNavigate}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onNavigate('next')}
              disabled={!canNavigate}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Quick status buttons */}
          <div className="space-y-2">
            <Label>結果を選択</Label>
            <div className="flex flex-wrap gap-2">
              {[
                {
                  status: TEST_RUN_CASE_STATUS.PASSED,
                  color: 'bg-green-100 hover:bg-green-200 text-green-800',
                  icon: CheckCircle2,
                },
                {
                  status: TEST_RUN_CASE_STATUS.FAILED,
                  color: 'bg-red-100 hover:bg-red-200 text-red-800',
                  icon: XCircle,
                },
                {
                  status: TEST_RUN_CASE_STATUS.BLOCKED,
                  color: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800',
                  icon: AlertTriangle,
                },
                {
                  status: TEST_RUN_CASE_STATUS.SKIPPED,
                  color: 'bg-purple-100 hover:bg-purple-200 text-purple-800',
                  icon: SkipForward,
                },
                {
                  status: TEST_RUN_CASE_STATUS.RETEST,
                  color: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
                  icon: RotateCcw,
                },
              ].map(({ status, color, icon: Icon }) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  className={cn(
                    'flex-1',
                    formStatus === status && color,
                    formStatus === status && 'border-2'
                  )}
                  onClick={() => setFormStatus(status)}
                >
                  <Icon className="mr-1 size-4" />
                  {TEST_RUN_CASE_STATUS_LABELS_JP[status]}
                </Button>
              ))}
            </div>
          </div>

          {/* Timer */}
          <div className="space-y-2">
            <Label>実行時間</Label>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <div className="font-mono text-2xl tabular-nums">
                {formatExecutionTime(elapsedSeconds) === '-'
                  ? '0:00'
                  : formatExecutionTime(elapsedSeconds)}
              </div>
              <div className="flex gap-1">
                {!isTimerRunning ? (
                  <Button variant="outline" size="icon" onClick={startTimer}>
                    <Play className="size-4" />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" onClick={pauseTimer}>
                    <Pause className="size-4" />
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={resetTimer}>
                  <Square className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Actual result */}
          <div className="space-y-2">
            <Label htmlFor="actualResult">実行結果</Label>
            <Textarea
              id="actualResult"
              value={formActualResult}
              onChange={(e) => setFormActualResult(e.target.value)}
              placeholder="実行結果を入力..."
              rows={4}
            />
          </div>

          {/* Defects */}
          <div className="space-y-2">
            <Label htmlFor="defects">不具合情報</Label>
            <Textarea
              id="defects"
              value={formDefects}
              onChange={(e) => setFormDefects(e.target.value)}
              placeholder="発見した不具合やバグチケットへのリンクなど..."
              rows={2}
            />
          </div>

          {/* Reproducibility */}
          {(formStatus === TEST_RUN_CASE_STATUS.FAILED ||
            formStatus === TEST_RUN_CASE_STATUS.BLOCKED) && (
            <div className="space-y-2">
              <Label>再現性</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(REPRODUCIBILITY_OPTIONS).map(([key, value]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className={
                      formReproducibility === value ? 'border-2 border-primary bg-primary/10' : ''
                    }
                    onClick={() => setFormReproducibility(value)}
                  >
                    {REPRODUCIBILITY_LABELS[value]}
                  </Button>
                ))}
                {formReproducibility && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormReproducibility('')}
                    className="text-muted-foreground"
                  >
                    <X className="mr-1 size-3" />
                    クリア
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">コメント</Label>
            <Textarea
              id="comment"
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              placeholder="メモやコメント..."
              rows={2}
            />
          </div>

          {/* Test case info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <FileText className="size-4" />
              テストケース情報
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">優先度</dt>
                <dd className="mt-1">{testRunCase.testCase.priority}</dd>
              </div>
              {testRunCase.testCase.description && (
                <div>
                  <dt className="font-medium text-muted-foreground">説明</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{testRunCase.testCase.description}</dd>
                </div>
              )}
              {testRunCase.testCase.preconditions && (
                <div>
                  <dt className="font-medium text-muted-foreground">前提条件</dt>
                  <dd className="mt-1 whitespace-pre-wrap">{testRunCase.testCase.preconditions}</dd>
                </div>
              )}
              {testRunCase.testCase.expectedResult && (
                <div>
                  <dt className="font-medium text-muted-foreground">期待結果</dt>
                  <dd className="mt-1 whitespace-pre-wrap">
                    {testRunCase.testCase.expectedResult}
                  </dd>
                </div>
              )}
              {testRunCase.executedAt && (
                <div>
                  <dt className="font-medium text-muted-foreground">実施日時</dt>
                  <dd className="mt-1">
                    {new Date(testRunCase.executedAt).toLocaleString('ja-JP')}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </ScrollArea>
      <Separator />
      <div className="flex items-center justify-between p-4">
        <Button variant="outline" onClick={handleSaveAndNext} disabled={isSaving || !canNavigate}>
          保存して次へ
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
          保存
        </Button>
      </div>
    </>
  );
}

interface ExecuteTestRunPageProps {
  params: Promise<{ id: string; testRunId: string }>;
}

export default function ExecuteTestRunPage({ params }: ExecuteTestRunPageProps) {
  const { id: projectId, testRunId } = use(params);
  const { toast } = useToast();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // Data state
  const [testRun, setTestRun] = useState<TestRunWithRelations | null>(null);
  const [testRunCases, setTestRunCases] = useState<TestRunCaseWithRelations[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestRunCaseStatus | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Multi-select state for bulk operations
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState<string>('none');

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [testRunRes, casesRes, membersRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/test-runs/${testRunId}`),
          fetch(`/api/projects/${projectId}/test-runs/${testRunId}/cases`),
          fetch(`/api/projects/${projectId}/members`),
        ]);

        if (testRunRes.ok) {
          const data = await testRunRes.json();
          setTestRun(data);
        }

        if (casesRes.ok) {
          const data = await casesRes.json();
          setTestRunCases(data || []);
          if (data && data.length > 0) {
            setSelectedCaseId(data[0].id);
          }
        }

        if (membersRes.ok) {
          const data = await membersRes.json();
          setProjectMembers(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        toast({
          title: 'エラー',
          description: 'データの取得に失敗しました。',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, testRunId, toast]);

  // Filter cases
  const filteredCases = testRunCases.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned' && c.assignedToId) return false;
      if (assigneeFilter === 'my-cases' && c.assignedToId !== currentUserId) return false;
      if (
        assigneeFilter !== 'unassigned' &&
        assigneeFilter !== 'my-cases' &&
        c.assignedToId !== assigneeFilter
      )
        return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        c.testCase.title.toLowerCase().includes(query) ||
        c.testCase.priority.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Selection handlers for bulk operations
  const toggleCaseSelection = (caseId: string) => {
    setSelectedCaseIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  };

  const toggleAllCases = () => {
    if (selectedCaseIds.size === filteredCases.length) {
      setSelectedCaseIds(new Set());
    } else {
      setSelectedCaseIds(new Set(filteredCases.map((c) => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedCaseIds(new Set());
  };

  // Bulk assignee update handler
  const handleBulkAssigneeUpdate = async () => {
    if (selectedCaseIds.size === 0 || bulkAssignee === 'none') return;

    setIsBulkUpdating(true);
    try {
      const assignedToId = bulkAssignee === 'unassigned' ? null : bulkAssignee;
      const response = await fetch(`/api/projects/${projectId}/test-runs/${testRunId}/cases/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedCaseIds),
          assignedToId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '一括更新に失敗しました。');
      }

      const result = await response.json();

      // Update local state
      setTestRunCases((prev) =>
        prev.map((c) => {
          const updatedCase = result.cases.find((uc: TestRunCaseWithRelations) => uc.id === c.id);
          return updatedCase ? { ...c, ...updatedCase } : c;
        })
      );

      toast({
        title: '更新完了',
        description: `${result.updatedCount}件のケースの担当者を更新しました。`,
      });

      clearSelection();
      setBulkAssignee('none');
    } catch (err) {
      toast({
        title: 'エラー',
        description: err instanceof Error ? err.message : 'エラーが発生しました。',
        variant: 'destructive',
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Calculate progress
  const totalCases = testRunCases.length;
  const executedCases = testRunCases.filter(
    (c) => c.status !== TEST_RUN_CASE_STATUS.NOT_RUN
  ).length;
  const passedCases = testRunCases.filter((c) => c.status === TEST_RUN_CASE_STATUS.PASSED).length;
  const failedCases = testRunCases.filter((c) => c.status === TEST_RUN_CASE_STATUS.FAILED).length;
  const blockedCases = testRunCases.filter((c) => c.status === TEST_RUN_CASE_STATUS.BLOCKED).length;
  const progressPercent = totalCases > 0 ? Math.round((executedCases / totalCases) * 100) : 0;
  const passRate = executedCases > 0 ? Math.round((passedCases / executedCases) * 100) : 0;

  // Get selected case
  const selectedCase = selectedCaseId ? testRunCases.find((c) => c.id === selectedCaseId) : null;

  // Navigate to prev/next case
  const navigateCase = (direction: 'prev' | 'next') => {
    const currentIndex = filteredCases.findIndex((c) => c.id === selectedCaseId);
    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredCases.length - 1;
    } else {
      newIndex = currentIndex < filteredCases.length - 1 ? currentIndex + 1 : 0;
    }

    setSelectedCaseId(filteredCases[newIndex].id);
  };

  // Handle case update from form
  const handleCaseUpdate = (updatedCase: TestRunCaseWithRelations) => {
    setTestRunCases((prev) =>
      prev.map((c) => (c.id === updatedCase.id ? { ...c, ...updatedCase } : c))
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!testRun) {
    return (
      <div className="space-y-4">
        <Link
          href={`/projects/${projectId}/test-runs`}
          className={cn(buttonVariants({ variant: 'ghost' }))}
        >
          <ArrowLeft className="mr-2 size-4" />
          テストラン一覧に戻る
        </Link>
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">テストランが見つかりません。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${projectId}/test-runs`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'shrink-0')}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{testRun.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{TEST_RUN_STATUS_LABELS[testRun.status]}</Badge>
            {testRun.milestone && <span>マイルストーン: {testRun.milestone.name}</span>}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">進捗: {progressPercent}%</span>
                <span className="text-sm text-muted-foreground">
                  ({executedCases}/{totalCases} 件実行済み)
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="size-4" /> {passedCases}
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="size-4" /> {failedCases}
                </span>
                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="size-4" /> {blockedCases}
                </span>
                {executedCases > 0 && (
                  <span className="text-muted-foreground">合格率: {passRate}%</span>
                )}
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* 2-pane layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left pane: Case list */}
        <Card className="flex w-96 flex-col overflow-hidden">
          <CardHeader className="shrink-0 space-y-3 pb-3">
            <CardTitle className="text-base">テストケース一覧</CardTitle>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as TestRunCaseStatus | 'all')}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="ステータス" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全て</SelectItem>
                    {Object.entries(TEST_RUN_CASE_STATUS_LABELS_JP).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="担当者" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全て</SelectItem>
                    {currentUserId && (
                      <SelectItem value="my-cases">
                        <span className="flex items-center gap-1">
                          <UserCheck className="size-3" />
                          自分の担当
                        </span>
                      </SelectItem>
                    )}
                    <SelectItem value="unassigned">未割当</SelectItem>
                    {projectMembers.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          {/* Bulk action bar */}
          {selectedCaseIds.size > 0 && (
            <>
              <div className="shrink-0 bg-muted/50 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{selectedCaseIds.size}件選択中</span>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    <X className="mr-1 size-3" />
                    選択解除
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="担当者を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">選択してください</SelectItem>
                      <SelectItem value="unassigned">担当者を解除</SelectItem>
                      {projectMembers.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleBulkAssigneeUpdate}
                    disabled={isBulkUpdating || bulkAssignee === 'none'}
                  >
                    {isBulkUpdating ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <Users2 className="mr-1 size-3" />
                    )}
                    適用
                  </Button>
                </div>
              </div>
              <Separator />
            </>
          )}
          {/* Select all checkbox */}
          {filteredCases.length > 0 && (
            <>
              <div className="flex shrink-0 items-center gap-2 px-4 py-2">
                <Checkbox
                  id="select-all"
                  checked={
                    selectedCaseIds.size === filteredCases.length && filteredCases.length > 0
                  }
                  onCheckedChange={toggleAllCases}
                />
                <Label
                  htmlFor="select-all"
                  className="cursor-pointer text-xs text-muted-foreground"
                >
                  すべて選択 ({filteredCases.length}件)
                </Label>
              </div>
              <Separator />
            </>
          )}
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {filteredCases.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  テストケースがありません
                </div>
              ) : (
                filteredCases.map((tc) => (
                  <div
                    key={tc.id}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md p-2 transition-colors',
                      selectedCaseId === tc.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <Checkbox
                      checked={selectedCaseIds.has(tc.id)}
                      onCheckedChange={() => toggleCaseSelection(tc.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={() => setSelectedCaseId(tc.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      {STATUS_ICONS[tc.status]}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{tc.testCase.title}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                            {tc.testCase.priority}
                          </Badge>
                          {tc.assignedTo && (
                            <span className="flex items-center gap-1">
                              <User className="size-3" />
                              {tc.assignedTo.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right pane: Result input */}
        <Card className="flex flex-1 flex-col overflow-hidden">
          {selectedCase ? (
            <ResultInputForm
              key={selectedCase.id}
              testRunCase={selectedCase}
              projectId={projectId}
              testRunId={testRunId}
              onSave={handleCaseUpdate}
              onNavigate={navigateCase}
              canNavigate={filteredCases.length > 1}
            />
          ) : (
            <CardContent className="flex flex-1 items-center justify-center">
              <p className="text-muted-foreground">
                左側のリストからテストケースを選択してください
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
