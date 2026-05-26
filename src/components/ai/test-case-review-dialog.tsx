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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  MessageSquareText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Lightbulb,
  ArrowRight,
  Copy,
} from 'lucide-react';
import {
  TestCaseReviewResult,
  ReviewCheckItem,
  ReviewImprovement,
  TestCaseForReview,
} from '@/services/ai/test-case-reviewer';

interface TestCaseReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testCase: TestCaseForReview;
  onApplyImprovement?: (improvement: ReviewImprovement) => void;
  onApplyAllImprovements?: (improvements: ReviewImprovement[]) => void;
}

type ReviewFocus = 'preconditions' | 'steps' | 'expectedResult' | 'coverage' | 'clarity';

export function TestCaseReviewDialog({
  open,
  onOpenChange,
  testCase,
  onApplyImprovement,
  onApplyAllImprovements,
}: TestCaseReviewDialogProps) {
  const { toast } = useToast();

  // Form state
  const [context, setContext] = useState('');
  const [reviewFocus, setReviewFocus] = useState<ReviewFocus[]>([]);

  // Review state
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<TestCaseReviewResult | null>(null);
  const [step, setStep] = useState<'input' | 'result'>('input');

  const focusOptions: { value: ReviewFocus; label: string }[] = [
    { value: 'preconditions', label: '前提条件の網羅性' },
    { value: 'steps', label: 'テスト手順の明確性' },
    { value: 'expectedResult', label: '期待結果の検証可能性' },
    { value: 'coverage', label: '境界値・異常系の考慮' },
    { value: 'clarity', label: '記述の明確性' },
  ];

  const handleReview = async () => {
    try {
      setIsReviewing(true);

      const response = await fetch('/api/ai/review-test-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCase,
          context,
          reviewFocus: reviewFocus.length > 0 ? reviewFocus : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Review failed');
      }

      const data = await response.json();
      setReviewResult(data.review);
      setStep('result');

      toast({
        title: 'レビュー完了',
        description: `スコア: ${data.review.overallScore}点`,
      });
    } catch (error) {
      console.error('Failed to review test case:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'レビューに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApplyImprovement = (improvement: ReviewImprovement) => {
    if (onApplyImprovement) {
      onApplyImprovement(improvement);
      toast({
        title: '改善を適用しました',
        description: `${getFieldLabel(improvement.field)}を更新しました`,
      });
    }
  };

  const handleApplyAll = () => {
    if (onApplyAllImprovements && reviewResult) {
      onApplyAllImprovements(reviewResult.improvements);
      toast({
        title: '全ての改善を適用しました',
        description: `${reviewResult.improvements.length}件の改善を適用しました`,
      });
    }
  };

  const handleClose = () => {
    setContext('');
    setReviewFocus([]);
    setReviewResult(null);
    setStep('input');
    onOpenChange(false);
  };

  const toggleFocus = (focus: ReviewFocus) => {
    setReviewFocus((prev) =>
      prev.includes(focus) ? prev.filter((f) => f !== focus) : [...prev, focus]
    );
  };

  const getStatusIcon = (status: ReviewCheckItem['status']) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'WARNING':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'FAIL':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: ReviewCheckItem['status']) => {
    const variants: Record<ReviewCheckItem['status'], 'default' | 'secondary' | 'destructive'> = {
      PASS: 'default',
      WARNING: 'secondary',
      FAIL: 'destructive',
    };
    const labels: Record<ReviewCheckItem['status'], string> = {
      PASS: '合格',
      WARNING: '注意',
      FAIL: '要改善',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getCategoryLabel = (category: ReviewCheckItem['category']) => {
    const labels: Record<ReviewCheckItem['category'], string> = {
      preconditions: '前提条件',
      steps: 'テスト手順',
      expectedResult: '期待結果',
      coverage: '網羅性',
      clarity: '明確性',
    };
    return labels[category];
  };

  const getFieldLabel = (field: ReviewImprovement['field']) => {
    const labels: Record<ReviewImprovement['field'], string> = {
      title: 'タイトル',
      description: '説明',
      preconditions: '前提条件',
      steps: 'テスト手順',
      expectedResult: '期待結果',
    };
    return labels[field];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5" />
            AIテストケースレビュー
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? 'テストケースの品質をAIがレビューします'
              : 'レビュー結果と改善提案を確認してください'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Test case summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">レビュー対象</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">タイトル:</span>{' '}
                  <span className="text-muted-foreground">{testCase.title}</span>
                </div>
                {testCase.description && (
                  <div>
                    <span className="font-medium">説明:</span>{' '}
                    <span className="text-muted-foreground">{testCase.description}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium">テスト手順:</span>{' '}
                  <span className="text-muted-foreground">{testCase.steps.length}ステップ</span>
                </div>
              </CardContent>
            </Card>

            {/* Review focus */}
            <div className="space-y-2">
              <Label>重点レビュー項目（任意）</Label>
              <div className="grid grid-cols-2 gap-2">
                {focusOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={reviewFocus.includes(option.value)}
                      onCheckedChange={() => toggleFocus(option.value)}
                    />
                    <Label htmlFor={option.value} className="text-sm font-normal cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional context */}
            <div className="space-y-2">
              <Label htmlFor="context">追加コンテキスト（任意）</Label>
              <Textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="関連する要件や機能についての追加情報があれば入力してください"
                className="min-h-[80px]"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {reviewResult && (
              <>
                {/* Score summary */}
                <Card className="mb-4">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">総合スコア</span>
                      <span
                        className={`text-2xl font-bold ${getScoreColor(reviewResult.overallScore)}`}
                      >
                        {reviewResult.overallScore}点
                      </span>
                    </div>
                    <Progress value={reviewResult.overallScore} className="h-2" />
                    <p className="mt-2 text-sm text-muted-foreground">{reviewResult.summary}</p>
                  </CardContent>
                </Card>

                <Tabs defaultValue="checks" className="flex-1 overflow-hidden flex flex-col">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="checks">
                      チェック結果 ({reviewResult.checkItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="improvements">
                      改善提案 ({reviewResult.improvements.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="checks" className="flex-1 overflow-hidden">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2 pr-4">
                        {reviewResult.checkItems.map((item, index) => (
                          <Card key={index}>
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-2">
                                {getStatusIcon(item.status)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">
                                      {getCategoryLabel(item.category)}
                                    </Badge>
                                    {getStatusBadge(item.status)}
                                  </div>
                                  <p className="text-sm">{item.message}</p>
                                  {item.suggestion && (
                                    <div className="mt-2 p-2 bg-muted rounded-md">
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                        <Lightbulb className="h-3 w-3" />
                                        提案
                                      </div>
                                      <p className="text-sm">{item.suggestion}</p>
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

                  <TabsContent value="improvements" className="flex-1 overflow-hidden">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2 pr-4">
                        {reviewResult.improvements.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                            <p>改善提案はありません</p>
                          </div>
                        ) : (
                          <>
                            {onApplyAllImprovements && reviewResult.improvements.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleApplyAll}
                                className="w-full mb-2"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                全ての改善を適用
                              </Button>
                            )}
                            {reviewResult.improvements.map((improvement, index) => (
                              <Card key={index}>
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline">
                                      {getFieldLabel(improvement.field)}
                                    </Badge>
                                    {onApplyImprovement && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleApplyImprovement(improvement)}
                                      >
                                        適用
                                        <ArrowRight className="ml-1 h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">現在:</span>
                                      <p className="mt-1 p-2 bg-muted rounded-md">
                                        {improvement.current || '（なし）'}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">改善後:</span>
                                      <p className="mt-1 p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
                                        {improvement.suggested}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">理由:</span>
                                      <p className="mt-1 text-muted-foreground">
                                        {improvement.reason}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </>
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
            <Button onClick={handleReview} disabled={isReviewing}>
              {isReviewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  レビュー中...
                </>
              ) : (
                <>
                  <MessageSquareText className="mr-2 h-4 w-4" />
                  レビュー実行
                </>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStep('input')}>
              再レビュー
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
