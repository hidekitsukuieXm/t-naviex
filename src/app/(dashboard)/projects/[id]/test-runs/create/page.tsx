'use client';

import { useState, use, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  FileText,
  Users,
  ListChecks,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TEST_RUN_STATUS,
  TEST_RUN_STATUS_LABELS,
  TEST_RUN_NAME_MAX_LENGTH,
  type TestRunStatus,
} from '@/types/test-run';
import type { Milestone } from '@/types/milestone';
import type { Configuration } from '@/types/configuration';

interface TestSpec {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface TestCase {
  id: string;
  title: string;
  priority: string;
  testType: string;
  section?: {
    id: string;
    name: string;
  } | null;
}

interface ProjectMember {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: {
    id: string;
    name: string;
  };
}

type WizardStep = 'basic' | 'cases' | 'assign' | 'review';

const WIZARD_STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'basic', label: '基本情報', icon: <FileText className="size-4" /> },
  { key: 'cases', label: 'テストケース選択', icon: <ListChecks className="size-4" /> },
  { key: 'assign', label: '担当者割当', icon: <Users className="size-4" /> },
  { key: 'review', label: '確認', icon: <Check className="size-4" /> },
];

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: '重大',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  LOW: 'bg-gray-100 text-gray-800',
};

interface CreateTestRunPageProps {
  params: Promise<{ id: string }>;
}

export default function CreateTestRunPage({ params }: CreateTestRunPageProps) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state - Step 1: Basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [milestoneId, setMilestoneId] = useState<string>('none');
  const [configurationId, setConfigurationId] = useState<string>('none');
  const [status, setStatus] = useState<TestRunStatus>(TEST_RUN_STATUS.PLANNED);
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');

  // Data state
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [testSpecs, setTestSpecs] = useState<TestSpec[]>([]);
  const [testCasesBySpec, setTestCasesBySpec] = useState<Record<string, TestCase[]>>({});
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [loadingSpecId, setLoadingSpecId] = useState<string | null>(null);

  // Selection state - Step 2: Test cases
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [expandedSpecs, setExpandedSpecs] = useState<string[]>([]);

  // Assignment state - Step 3: Assignees
  const [assigneeMap, setAssigneeMap] = useState<Record<string, string>>({});
  const [bulkAssigneeId, setBulkAssigneeId] = useState<string>('none');

  // Fetch master data
  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoadingMaster(true);
      try {
        const [milestonesRes, configsRes, membersRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/milestones`),
          fetch(`/api/projects/${projectId}/configurations`),
          fetch(`/api/projects/${projectId}/members`),
        ]);

        if (milestonesRes.ok) {
          const data = await milestonesRes.json();
          setMilestones(data.milestones || data || []);
        }
        if (configsRes.ok) {
          const data = await configsRes.json();
          setConfigurations(data.configurations || data || []);
        }
        if (membersRes.ok) {
          const data = await membersRes.json();
          setProjectMembers(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch master data:', err);
      } finally {
        setIsLoadingMaster(false);
      }
    };

    fetchMasterData();
  }, [projectId]);

  // Fetch test specs when entering cases step
  useEffect(() => {
    if (currentStep === 'cases' && testSpecs.length === 0) {
      const fetchTestSpecs = async () => {
        setIsLoadingSpecs(true);
        try {
          const res = await fetch(`/api/test-specs?projectId=${projectId}&limit=100`);
          if (res.ok) {
            const data = await res.json();
            setTestSpecs(data.testSpecs || []);
          }
        } catch (err) {
          console.error('Failed to fetch test specs:', err);
        } finally {
          setIsLoadingSpecs(false);
        }
      };
      fetchTestSpecs();
    }
  }, [currentStep, projectId, testSpecs.length]);

  // Fetch test cases for a spec
  const fetchTestCasesForSpec = useCallback(
    async (specId: string) => {
      if (testCasesBySpec[specId]) return;

      setLoadingSpecId(specId);
      try {
        const res = await fetch(`/api/test-specs/${specId}/cases?limit=1000`);
        if (res.ok) {
          const data = await res.json();
          setTestCasesBySpec((prev) => ({
            ...prev,
            [specId]: data.testCases || [],
          }));
        }
      } catch (err) {
        console.error('Failed to fetch test cases:', err);
      } finally {
        setLoadingSpecId(null);
      }
    },
    [testCasesBySpec]
  );

  // Handle spec accordion expand
  const handleSpecExpand = (specId: string) => {
    if (!expandedSpecs.includes(specId)) {
      setExpandedSpecs((prev) => [...prev, specId]);
      fetchTestCasesForSpec(specId);
    } else {
      setExpandedSpecs((prev) => prev.filter((id) => id !== specId));
    }
  };

  // Toggle test case selection
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

  // Select all cases in a spec
  const selectAllInSpec = (specId: string, select: boolean) => {
    const cases = testCasesBySpec[specId] || [];
    setSelectedCaseIds((prev) => {
      const newSet = new Set(prev);
      cases.forEach((c) => {
        if (select) {
          newSet.add(c.id);
        } else {
          newSet.delete(c.id);
        }
      });
      return newSet;
    });
  };

  // Check if all cases in a spec are selected
  const isAllInSpecSelected = (specId: string) => {
    const cases = testCasesBySpec[specId] || [];
    if (cases.length === 0) return false;
    return cases.every((c) => selectedCaseIds.has(c.id));
  };

  // Apply bulk assignee
  const applyBulkAssignee = () => {
    if (bulkAssigneeId === 'none') return;
    const newMap: Record<string, string> = {};
    selectedCaseIds.forEach((caseId) => {
      newMap[caseId] = bulkAssigneeId;
    });
    setAssigneeMap(newMap);
    toast({
      title: '一括割当完了',
      description: `${selectedCaseIds.size}件のテストケースに担当者を割り当てました。`,
    });
  };

  // Clear all assignees
  const clearAllAssignees = () => {
    setAssigneeMap({});
    setBulkAssigneeId('none');
  };

  // Get selected cases with details
  const getSelectedCasesWithDetails = useCallback(() => {
    const result: (TestCase & { specName: string })[] = [];
    Object.entries(testCasesBySpec).forEach(([specId, cases]) => {
      const spec = testSpecs.find((s) => s.id === specId);
      cases.forEach((c) => {
        if (selectedCaseIds.has(c.id)) {
          result.push({ ...c, specName: spec?.name || '' });
        }
      });
    });
    return result;
  }, [testCasesBySpec, testSpecs, selectedCaseIds]);

  // Navigate steps
  const goToStep = (step: WizardStep) => {
    const stepIndex = WIZARD_STEPS.findIndex((s) => s.key === step);
    const currentIndex = WIZARD_STEPS.findIndex((s) => s.key === currentStep);

    // Validate before going forward
    if (stepIndex > currentIndex) {
      if (currentStep === 'basic' && !name.trim()) {
        toast({
          title: 'エラー',
          description: 'テストラン名を入力してください。',
          variant: 'destructive',
        });
        return;
      }
    }

    setCurrentStep(step);
  };

  const goNext = () => {
    const currentIndex = WIZARD_STEPS.findIndex((s) => s.key === currentStep);
    if (currentIndex < WIZARD_STEPS.length - 1) {
      goToStep(WIZARD_STEPS[currentIndex + 1].key);
    }
  };

  const goPrev = () => {
    const currentIndex = WIZARD_STEPS.findIndex((s) => s.key === currentStep);
    if (currentIndex > 0) {
      goToStep(WIZARD_STEPS[currentIndex - 1].key);
    }
  };

  // Submit the form
  const handleSubmit = async () => {
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
      // Step 1: Create the test run
      const testRunRes = await fetch(`/api/projects/${projectId}/test-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          milestoneId: milestoneId === 'none' ? null : milestoneId || null,
          configurationId: configurationId === 'none' ? null : configurationId || null,
          status,
          plannedStartDate: plannedStartDate || null,
          plannedEndDate: plannedEndDate || null,
        }),
      });

      if (!testRunRes.ok) {
        const errorData = await testRunRes.json();
        throw new Error(errorData.error || 'テストランの作成に失敗しました。');
      }

      const testRun = await testRunRes.json();

      // Step 2: Add test cases if any selected
      if (selectedCaseIds.size > 0) {
        // Group cases by assignee
        const casesByAssignee: Record<string, string[]> = {};
        selectedCaseIds.forEach((caseId) => {
          const assignee = assigneeMap[caseId] || '';
          if (!casesByAssignee[assignee]) {
            casesByAssignee[assignee] = [];
          }
          casesByAssignee[assignee].push(caseId);
        });

        // Create test run cases in batches by assignee
        for (const [assigneeId, caseIds] of Object.entries(casesByAssignee)) {
          const casesRes = await fetch(`/api/projects/${projectId}/test-runs/${testRun.id}/cases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              testCaseIds: caseIds,
              assignedToId: assigneeId || null,
            }),
          });

          if (!casesRes.ok) {
            console.error('Failed to add some test cases');
          }
        }
      }

      toast({
        title: '作成完了',
        description: `テストラン「${name}」を作成しました。`,
      });

      router.push(`/projects/${projectId}/test-runs`);
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

  // Filter cases by search query
  const filteredCasesBySpec = useCallback(
    (specId: string) => {
      const cases = testCasesBySpec[specId] || [];
      if (!caseSearchQuery.trim()) return cases;
      const query = caseSearchQuery.toLowerCase();
      return cases.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.priority.toLowerCase().includes(query) ||
          c.testType.toLowerCase().includes(query)
      );
    },
    [testCasesBySpec, caseSearchQuery]
  );

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.key === currentStep);
  const progressPercent = ((currentStepIndex + 1) / WIZARD_STEPS.length) * 100;

  if (isLoadingMaster) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${projectId}/test-runs`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'shrink-0')}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">テストラン作成</h1>
          <p className="text-sm text-muted-foreground">
            テストランを作成し、テストケースを選択します。
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {WIZARD_STEPS.map((step, index) => (
                <button
                  key={step.key}
                  onClick={() => goToStep(step.key)}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-2 p-2 transition-colors',
                    currentStep === step.key
                      ? 'text-primary'
                      : index < currentStepIndex
                        ? 'cursor-pointer text-primary/70 hover:text-primary'
                        : 'text-muted-foreground'
                  )}
                  disabled={index > currentStepIndex}
                >
                  <div
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full border-2',
                      currentStep === step.key
                        ? 'border-primary bg-primary text-primary-foreground'
                        : index < currentStepIndex
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted-foreground/30'
                    )}
                  >
                    {index < currentStepIndex ? <Check className="size-5" /> : step.icon}
                  </div>
                  <span className="text-xs font-medium">{step.label}</span>
                </button>
              ))}
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{WIZARD_STEPS[currentStepIndex].label}</CardTitle>
          <CardDescription>
            {currentStep === 'basic' && 'テストランの基本情報を入力してください。'}
            {currentStep === 'cases' && 'テストランに含めるテストケースを選択してください。'}
            {currentStep === 'assign' && '選択したテストケースに担当者を割り当てます。'}
            {currentStep === 'review' && '入力内容を確認してテストランを作成します。'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 'basic' && (
            <div className="grid gap-6">
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
          )}

          {/* Step 2: Test Case Selection */}
          {currentStep === 'cases' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="テストケースを検索..."
                    value={caseSearchQuery}
                    onChange={(e) => setCaseSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {caseSearchQuery && (
                    <button
                      onClick={() => setCaseSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <Badge variant="secondary">{selectedCaseIds.size} 件選択中</Badge>
              </div>

              {isLoadingSpecs ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : testSpecs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  テスト仕様書がありません。
                </div>
              ) : (
                <Accordion type="multiple" value={expandedSpecs} className="space-y-2">
                  {testSpecs.map((spec) => (
                    <AccordionItem key={spec.id} value={spec.id} className="rounded-lg border">
                      <AccordionTrigger
                        onClick={() => handleSpecExpand(spec.id)}
                        className="px-4 hover:no-underline"
                      >
                        <div className="flex flex-1 items-center justify-between pr-4">
                          <span className="font-medium">{spec.name}</span>
                          <div className="flex items-center gap-2">
                            {testCasesBySpec[spec.id] && (
                              <Badge variant="outline">{testCasesBySpec[spec.id].length} 件</Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {loadingSpecId === spec.id ? (
                          <div className="flex h-20 items-center justify-center">
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <>
                            <div className="mb-3 flex items-center gap-2">
                              <Checkbox
                                id={`select-all-${spec.id}`}
                                checked={isAllInSpecSelected(spec.id)}
                                onCheckedChange={(checked) => selectAllInSpec(spec.id, !!checked)}
                              />
                              <Label htmlFor={`select-all-${spec.id}`} className="text-sm">
                                すべて選択
                              </Label>
                            </div>
                            <div className="max-h-64 space-y-1 overflow-y-auto">
                              {filteredCasesBySpec(spec.id).map((tc) => (
                                <div
                                  key={tc.id}
                                  className={cn(
                                    'flex items-center gap-3 rounded-md border p-2 transition-colors',
                                    selectedCaseIds.has(tc.id)
                                      ? 'bg-primary/5 border-primary/30'
                                      : 'hover:bg-muted/50'
                                  )}
                                >
                                  <Checkbox
                                    id={`case-${tc.id}`}
                                    checked={selectedCaseIds.has(tc.id)}
                                    onCheckedChange={() => toggleCaseSelection(tc.id)}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <Label
                                      htmlFor={`case-${tc.id}`}
                                      className="cursor-pointer text-sm font-medium"
                                    >
                                      {tc.title}
                                    </Label>
                                    {tc.section && (
                                      <div className="text-xs text-muted-foreground">
                                        {tc.section.name}
                                      </div>
                                    )}
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className={cn('shrink-0', PRIORITY_COLORS[tc.priority])}
                                  >
                                    {PRIORITY_LABELS[tc.priority] || tc.priority}
                                  </Badge>
                                </div>
                              ))}
                              {filteredCasesBySpec(spec.id).length === 0 && (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                  テストケースが見つかりません
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          )}

          {/* Step 3: Assignee Assignment */}
          {currentStep === 'assign' && (
            <div className="space-y-4">
              {selectedCaseIds.size === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  テストケースが選択されていません。
                  <br />
                  前のステップでテストケースを選択してください。
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 p-4">
                    <Label className="text-sm font-medium">一括割当:</Label>
                    <Select value={bulkAssigneeId} onValueChange={setBulkAssigneeId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="担当者を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未割当</SelectItem>
                        {projectMembers.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={applyBulkAssignee}
                      disabled={bulkAssigneeId === 'none'}
                    >
                      全てに適用
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearAllAssignees}
                      disabled={Object.keys(assigneeMap).length === 0}
                    >
                      クリア
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>テストケース</TableHead>
                        <TableHead>優先度</TableHead>
                        <TableHead className="w-[200px]">担当者</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getSelectedCasesWithDetails().map((tc) => (
                        <TableRow key={tc.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{tc.title}</div>
                              <div className="text-xs text-muted-foreground">{tc.specName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={PRIORITY_COLORS[tc.priority]}>
                              {PRIORITY_LABELS[tc.priority] || tc.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={assigneeMap[tc.id] || 'none'}
                              onValueChange={(v) =>
                                setAssigneeMap((prev) => ({
                                  ...prev,
                                  [tc.id]: v === 'none' ? '' : v,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="未割当" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">未割当</SelectItem>
                                {projectMembers.map((m) => (
                                  <SelectItem key={m.userId} value={m.userId}>
                                    {m.user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 font-semibold">基本情報</h3>
                <dl className="grid gap-2 text-sm">
                  <div className="grid grid-cols-3">
                    <dt className="text-muted-foreground">テストラン名</dt>
                    <dd className="col-span-2">{name || '-'}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-muted-foreground">説明</dt>
                    <dd className="col-span-2">{description || '-'}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-muted-foreground">マイルストーン</dt>
                    <dd className="col-span-2">
                      {milestoneId === 'none'
                        ? 'なし'
                        : milestones.find((m) => m.id === milestoneId)?.name || '-'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-muted-foreground">コンフィギュレーション</dt>
                    <dd className="col-span-2">
                      {configurationId === 'none'
                        ? 'なし'
                        : configurations.find((c) => c.id === configurationId)?.name || '-'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-muted-foreground">ステータス</dt>
                    <dd className="col-span-2">{TEST_RUN_STATUS_LABELS[status]}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-muted-foreground">開始予定日</dt>
                    <dd className="col-span-2">{plannedStartDate || '-'}</dd>
                  </div>
                  <div className="grid grid-cols-3">
                    <dt className="text-muted-foreground">終了予定日</dt>
                    <dd className="col-span-2">{plannedEndDate || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-3 font-semibold">テストケース</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCaseIds.size > 0
                    ? `${selectedCaseIds.size} 件のテストケースが選択されています。`
                    : 'テストケースは選択されていません。'}
                </p>
                {selectedCaseIds.size > 0 && Object.keys(assigneeMap).length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {Object.values(assigneeMap).filter((v) => v).length}{' '}
                    件に担当者が割り当てられています。
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={goPrev}
              disabled={currentStepIndex === 0}
            >
              <ArrowLeft className="mr-2 size-4" />
              戻る
            </Button>

            {currentStep === 'review' ? (
              <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                作成
              </Button>
            ) : (
              <Button onClick={goNext}>
                次へ
                <ArrowRight className="ml-2 size-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
