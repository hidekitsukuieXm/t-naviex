'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Link2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
} from 'lucide-react';
import {
  RequirementTestSuggestionResult,
  SuggestedTestCase,
  RequirementCoverage,
  CoverageGap,
  RequirementForAnalysis,
  ExistingTestCase,
} from '@/services/ai/requirement-test-suggester';

interface RequirementTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirements: RequirementForAnalysis[];
  existingTestCases?: ExistingTestCase[];
  onCreateTestCase?: (testCase: SuggestedTestCase) => void;
  onCreateMultipleTestCases?: (testCases: SuggestedTestCase[]) => void;
}

export function RequirementTestDialog({
  open,
  onOpenChange,
  requirements,
  existingTestCases,
  onCreateTestCase,
  onCreateMultipleTestCases,
}: RequirementTestDialogProps) {
  const { toast } = useToast();

  // Form state
  const [context, setContext] = useState('');
  const [maxSuggestions, setMaxSuggestions] = useState(10);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RequirementTestSuggestionResult | null>(
    null
  );
  const [selectedTestCases, setSelectedTestCases] = useState<Set<number>>(new Set());
  const [expandedTestCases, setExpandedTestCases] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<'input' | 'result'>('input');

  const handleAnalyze = async () => {
    if (requirements.length === 0) {
      toast({
        title: 'エラー',
        description: '分析対象の要件がありません',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsAnalyzing(true);

      const response = await fetch('/api/ai/suggest-requirement-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements,
          existingTestCases,
          context,
          maxSuggestions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      setAnalysisResult(data.result);
      setSelectedTestCases(
        new Set(data.result.suggestedTestCases.map((_: SuggestedTestCase, i: number) => i))
      );
      setStep('result');

      toast({
        title: '分析完了',
        description: `${data.result.suggestedTestCases.length}件のテストケースを提案しました`,
      });
    } catch (error) {
      console.error('Failed to analyze requirements:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '分析に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateSelected = () => {
    if (onCreateMultipleTestCases && analysisResult) {
      const selectedCases = analysisResult.suggestedTestCases.filter((_, i) =>
        selectedTestCases.has(i)
      );
      onCreateMultipleTestCases(selectedCases);
      toast({
        title: 'テストケースを作成しました',
        description: `${selectedCases.length}件のテストケースを作成しました`,
      });
      handleClose();
    }
  };

  const handleCreateSingle = (testCase: SuggestedTestCase) => {
    if (onCreateTestCase) {
      onCreateTestCase(testCase);
      toast({
        title: 'テストケースを作成しました',
        description: testCase.title,
      });
    }
  };

  const handleClose = () => {
    setContext('');
    setMaxSuggestions(10);
    setAnalysisResult(null);
    setSelectedTestCases(new Set());
    setExpandedTestCases(new Set());
    setStep('input');
    onOpenChange(false);
  };

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedTestCases);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTestCases(newSelected);
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedTestCases);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTestCases(newExpanded);
  };

  const selectAll = () => {
    if (analysisResult) {
      setSelectedTestCases(new Set(analysisResult.suggestedTestCases.map((_, i) => i)));
    }
  };

  const deselectAll = () => {
    setSelectedTestCases(new Set());
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      HIGH: 'destructive',
      MEDIUM: 'default',
      LOW: 'secondary',
    };
    return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>;
  };

  const getCoverageLevelIcon = (level: RequirementCoverage['coverageLevel']) => {
    switch (level) {
      case 'FULL':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'PARTIAL':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'NONE':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getCoverageLevelLabel = (level: RequirementCoverage['coverageLevel']) => {
    const labels: Record<RequirementCoverage['coverageLevel'], string> = {
      FULL: '完全カバー',
      PARTIAL: '部分カバー',
      NONE: '未カバー',
    };
    return labels[level];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            AI要件連携テスト提案
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? '要件仕様から必要なテストケースをAIが分析・提案します'
              : '分析結果と提案されたテストケースを確認してください'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Requirements summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  分析対象の要件 ({requirements.length}件)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[120px]">
                  <ul className="space-y-1">
                    {requirements.map((req) => (
                      <li key={req.id} className="text-sm">
                        <span className="font-mono text-muted-foreground">[{req.id}]</span>{' '}
                        {req.title}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>

            {existingTestCases && existingTestCases.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    既存のテストケース ({existingTestCases.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    既存テストケースとの重複を避けて提案を行います
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxSuggestions">最大提案件数</Label>
                <Input
                  id="maxSuggestions"
                  type="number"
                  min={1}
                  max={20}
                  value={maxSuggestions}
                  onChange={(e) => setMaxSuggestions(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="context">追加コンテキスト（任意）</Label>
                <Textarea
                  id="context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="システムの特性や制約など"
                  className="min-h-[38px] resize-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {analysisResult && (
              <>
                {/* Coverage summary */}
                <Card className="mb-4">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">要件カバレッジスコア</span>
                      <span
                        className={`text-2xl font-bold ${getScoreColor(analysisResult.overallCoverageScore)}`}
                      >
                        {analysisResult.overallCoverageScore}%
                      </span>
                    </div>
                    <Progress value={analysisResult.overallCoverageScore} className="h-2" />
                    <p className="mt-2 text-sm text-muted-foreground">{analysisResult.summary}</p>
                  </CardContent>
                </Card>

                <Tabs defaultValue="suggestions" className="flex-1 overflow-hidden flex flex-col">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="suggestions">
                      提案 ({analysisResult.suggestedTestCases.length})
                    </TabsTrigger>
                    <TabsTrigger value="coverage">
                      カバレッジ ({analysisResult.coverageAnalysis.length})
                    </TabsTrigger>
                    <TabsTrigger value="gaps">
                      ギャップ ({analysisResult.coverageGaps.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="suggestions" className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedTestCases.size} / {analysisResult.suggestedTestCases.length}{' '}
                        件選択中
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll}>
                          すべて選択
                        </Button>
                        <Button variant="outline" size="sm" onClick={deselectAll}>
                          選択解除
                        </Button>
                      </div>
                    </div>

                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2 pr-4">
                        {analysisResult.suggestedTestCases.map((tc, index) => (
                          <Card
                            key={index}
                            className={`transition-colors ${
                              selectedTestCases.has(index) ? 'border-primary' : ''
                            }`}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={selectedTestCases.has(index)}
                                  onCheckedChange={() => toggleSelect(index)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">{tc.title}</CardTitle>
                                    <div className="flex items-center gap-2">
                                      {getPriorityBadge(tc.priority)}
                                      <Badge variant="outline">{tc.testType}</Badge>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpand(index);
                                        }}
                                      >
                                        {expandedTestCases.has(index) ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {tc.description}
                                  </p>
                                  <div className="flex gap-1 mt-1">
                                    {tc.relatedRequirements.map((req) => (
                                      <Badge key={req} variant="secondary" className="text-xs">
                                        {req}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>

                            {expandedTestCases.has(index) && (
                              <CardContent className="pt-0">
                                <div className="space-y-3 text-sm">
                                  {tc.steps.length > 0 && (
                                    <div>
                                      <span className="font-medium">テスト手順:</span>
                                      <ol className="list-decimal list-inside mt-1 space-y-1">
                                        {tc.steps.map((step) => (
                                          <li
                                            key={step.stepNumber}
                                            className="text-muted-foreground"
                                          >
                                            {step.action}
                                            {step.expectedResult && (
                                              <span className="ml-2 text-xs">
                                                → {step.expectedResult}
                                              </span>
                                            )}
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}

                                  <div>
                                    <span className="font-medium">期待結果:</span>
                                    <p className="text-muted-foreground">{tc.expectedResult}</p>
                                  </div>

                                  <div>
                                    <span className="font-medium">提案理由:</span>
                                    <p className="text-muted-foreground">{tc.rationale}</p>
                                  </div>

                                  {onCreateTestCase && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCreateSingle(tc)}
                                    >
                                      <Plus className="mr-1 h-4 w-4" />
                                      このテストケースを作成
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="coverage" className="flex-1 overflow-hidden">
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-2 pr-4">
                        {analysisResult.coverageAnalysis.map((ca, index) => (
                          <Card key={index}>
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-2">
                                {getCoverageLevelIcon(ca.coverageLevel)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-sm">{ca.requirementId}</span>
                                    <Badge variant="outline">
                                      {getCoverageLevelLabel(ca.coverageLevel)}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {ca.requirementText}
                                  </p>

                                  {ca.existingTestCases.length > 0 && (
                                    <div className="text-sm mb-1">
                                      <span className="font-medium">既存TC:</span>{' '}
                                      <span className="text-muted-foreground">
                                        {ca.existingTestCases.join(', ')}
                                      </span>
                                    </div>
                                  )}

                                  {ca.gaps.length > 0 && (
                                    <div className="text-sm">
                                      <span className="font-medium">ギャップ:</span>
                                      <ul className="list-disc list-inside text-muted-foreground">
                                        {ca.gaps.map((gap, i) => (
                                          <li key={i}>{gap}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="gaps" className="flex-1 overflow-hidden">
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-2 pr-4">
                        {analysisResult.coverageGaps.length === 0 ? (
                          <Card>
                            <CardContent className="pt-4">
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                                <span>カバレッジギャップは検出されませんでした</span>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          analysisResult.coverageGaps.map((gap: CoverageGap, index: number) => (
                            <Card key={index}>
                              <CardContent className="pt-4">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-mono text-sm">{gap.requirementId}</span>
                                      {getPriorityBadge(gap.severity)}
                                    </div>
                                    <p className="text-sm">{gap.description}</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                      <span className="font-medium">推奨:</span> {gap.suggestion}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {step === 'result' ? '閉じる' : 'キャンセル'}
          </Button>
          {step === 'input' ? (
            <Button onClick={handleAnalyze} disabled={isAnalyzing || requirements.length === 0}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  分析・提案
                </>
              )}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
                再分析
              </Button>
              {onCreateMultipleTestCases && selectedTestCases.size > 0 && (
                <Button onClick={handleCreateSelected}>
                  <Plus className="mr-2 h-4 w-4" />
                  {selectedTestCases.size}件を作成
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
