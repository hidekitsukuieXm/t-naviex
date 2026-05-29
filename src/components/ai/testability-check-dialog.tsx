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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ClipboardCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Copy,
  ArrowRight,
} from 'lucide-react';
import {
  TestabilityCheckResult,
  TestabilityIssue,
  TestabilityCategory,
  CATEGORY_INFO,
} from '@/services/ai/testability-checker';

interface TestabilityCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  onApplyImprovement?: (original: string, improved: string) => void;
}

type ContentType = 'requirement' | 'specification' | 'user_story' | 'acceptance_criteria';

export function TestabilityCheckDialog({
  open,
  onOpenChange,
  initialContent,
  onApplyImprovement,
}: TestabilityCheckDialogProps) {
  const { toast } = useToast();

  // Form state
  const [content, setContent] = useState(initialContent || '');
  const [contentType, setContentType] = useState<ContentType>('specification');
  const [context, setContext] = useState('');

  // Check state
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<TestabilityCheckResult | null>(null);
  const [step, setStep] = useState<'input' | 'result'>('input');

  const contentTypeOptions: { value: ContentType; label: string }[] = [
    { value: 'requirement', label: '要件' },
    { value: 'specification', label: '仕様書' },
    { value: 'user_story', label: 'ユーザーストーリー' },
    { value: 'acceptance_criteria', label: '受け入れ基準' },
  ];

  const handleCheck = async () => {
    if (!content.trim()) {
      toast({
        title: 'エラー',
        description: 'チェック対象のテキストを入力してください',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsChecking(true);

      const response = await fetch('/api/ai/check-testability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          contentType,
          context,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Check failed');
      }

      const data = await response.json();
      setCheckResult(data.result);
      setStep('result');

      toast({
        title: 'チェック完了',
        description: `スコア: ${data.result.overallScore}点、問題: ${data.result.issues.length}件`,
      });
    } catch (error) {
      console.error('Failed to check testability:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'チェックに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleApplyImprovement = (issue: TestabilityIssue) => {
    if (onApplyImprovement && issue.improvedText) {
      onApplyImprovement(issue.originalText, issue.improvedText);
      toast({
        title: '改善を適用しました',
        description: '元のテキストを改善版で置き換えました',
      });
    }
  };

  const handleCopyImproved = async (improvedText: string) => {
    try {
      await navigator.clipboard.writeText(improvedText);
      toast({
        title: 'コピーしました',
        description: '改善テキストをクリップボードにコピーしました',
      });
    } catch {
      toast({
        title: 'エラー',
        description: 'コピーに失敗しました',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setContent(initialContent || '');
    setContentType('specification');
    setContext('');
    setCheckResult(null);
    setStep('input');
    onOpenChange(false);
  };

  const getSeverityIcon = (severity: TestabilityIssue['severity']) => {
    switch (severity) {
      case 'HIGH':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'MEDIUM':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'LOW':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: TestabilityIssue['severity']) => {
    const variants: Record<TestabilityIssue['severity'], 'destructive' | 'default' | 'secondary'> =
      {
        HIGH: 'destructive',
        MEDIUM: 'default',
        LOW: 'secondary',
      };
    const labels: Record<TestabilityIssue['severity'], string> = {
      HIGH: '高',
      MEDIUM: '中',
      LOW: '低',
    };
    return <Badge variant={variants[severity]}>{labels[severity]}</Badge>;
  };

  const getCategoryLabel = (category: TestabilityCategory) => {
    return CATEGORY_INFO[category]?.name || category;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const groupIssuesByCategory = (issues: TestabilityIssue[]) => {
    const grouped: Record<TestabilityCategory, TestabilityIssue[]> = {
      AMBIGUITY: [],
      QUANTITATIVE: [],
      CONDITIONS: [],
      EXPECTED_RESULT: [],
      COMPLETENESS: [],
    };

    issues.forEach((issue) => {
      if (grouped[issue.category]) {
        grouped[issue.category].push(issue);
      }
    });

    return Object.entries(grouped).filter(([, items]) => items.length > 0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            AIテスタビリティチェック
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? '仕様書や要件のテスト可能性をAIがチェックします'
              : 'チェック結果と改善提案を確認してください'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="content">チェック対象のテキスト *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="仕様書、要件、ユーザーストーリーなどを入力してください"
                className="min-h-[200px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contentType">コンテンツタイプ</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                  <SelectTrigger id="contentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="context">追加コンテキスト（任意）</Label>
                <Textarea
                  id="context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="関連する背景情報など"
                  className="min-h-[38px] resize-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {checkResult && (
              <>
                {/* Score summary */}
                <Card className="mb-4">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">テスタビリティスコア</span>
                      <span
                        className={`text-2xl font-bold ${getScoreColor(checkResult.overallScore)}`}
                      >
                        {checkResult.overallScore}点
                      </span>
                    </div>
                    <Progress value={checkResult.overallScore} className="h-2" />
                    <p className="mt-2 text-sm text-muted-foreground">{checkResult.summary}</p>
                  </CardContent>
                </Card>

                <ScrollArea className="flex-1">
                  <div className="space-y-4 pr-4">
                    {/* Issues by category */}
                    {checkResult.issues.length > 0 ? (
                      <Accordion defaultValue={['issues']}>
                        <AccordionItem value="issues">
                          <AccordionTrigger>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              検出された問題 ({checkResult.issues.length}件)
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
                              {groupIssuesByCategory(checkResult.issues).map(
                                ([category, issues]) => (
                                  <div key={category}>
                                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                      <Badge variant="outline">
                                        {getCategoryLabel(category as TestabilityCategory)}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        {issues.length}件
                                      </span>
                                    </h4>
                                    <div className="space-y-2 ml-2">
                                      {issues.map((issue, index) => (
                                        <Card key={index}>
                                          <CardContent className="pt-4">
                                            <div className="flex items-start gap-2">
                                              {getSeverityIcon(issue.severity)}
                                              <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                  {getSeverityBadge(issue.severity)}
                                                  <span className="text-xs text-muted-foreground">
                                                    {issue.location}
                                                  </span>
                                                </div>

                                                <div className="text-sm">
                                                  <p className="font-medium">{issue.issue}</p>
                                                </div>

                                                <div className="text-sm p-2 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
                                                  <span className="text-xs text-muted-foreground">
                                                    問題のある記述:
                                                  </span>
                                                  <p className="mt-1">{issue.originalText}</p>
                                                </div>

                                                <div className="text-sm">
                                                  <span className="font-medium">提案: </span>
                                                  <span className="text-muted-foreground">
                                                    {issue.suggestion}
                                                  </span>
                                                </div>

                                                {issue.improvedText && (
                                                  <div className="text-sm p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                                                    <span className="text-xs text-muted-foreground">
                                                      改善後:
                                                    </span>
                                                    <p className="mt-1">{issue.improvedText}</p>
                                                    <div className="flex gap-2 mt-2">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                          handleCopyImproved(issue.improvedText!)
                                                        }
                                                      >
                                                        <Copy className="mr-1 h-3 w-3" />
                                                        コピー
                                                      </Button>
                                                      {onApplyImprovement && (
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={() =>
                                                            handleApplyImprovement(issue)
                                                          }
                                                        >
                                                          <ArrowRight className="mr-1 h-3 w-3" />
                                                          適用
                                                        </Button>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ) : (
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>問題は検出されませんでした</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Recommendations */}
                    {checkResult.recommendations.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">全般的な推奨事項</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {checkResult.recommendations.map((rec, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-muted-foreground"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {step === 'result' ? '閉じる' : 'キャンセル'}
          </Button>
          {step === 'input' ? (
            <Button onClick={handleCheck} disabled={isChecking || !content.trim()}>
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  チェック中...
                </>
              ) : (
                <>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  チェック実行
                </>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStep('input')}>
              再チェック
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
