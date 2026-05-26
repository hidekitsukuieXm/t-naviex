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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { GeneratedTestCase } from '@/services/ai/test-case-generator';

interface TestCaseGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (testCases: GeneratedTestCase[]) => void;
}

export function TestCaseGenerationDialog({
  open,
  onOpenChange,
  onImport,
}: TestCaseGenerationDialogProps) {
  const { toast } = useToast();

  // Form state
  const [requirement, setRequirement] = useState('');
  const [feature, setFeature] = useState('');
  const [considerations, setConsiderations] = useState('');
  const [testTechnique, setTestTechnique] = useState('');
  const [detailLevel, setDetailLevel] = useState<'basic' | 'standard' | 'detailed'>('standard');
  const [count, setCount] = useState(5);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTestCases, setGeneratedTestCases] = useState<GeneratedTestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const handleGenerate = async () => {
    if (!requirement.trim()) {
      toast({
        title: 'エラー',
        description: '要件を入力してください',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsGenerating(true);

      const response = await fetch('/api/ai/generate-test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement,
          feature,
          considerations,
          testTechnique,
          detailLevel,
          count,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const data = await response.json();
      setGeneratedTestCases(data.testCases);
      setSelectedIds(new Set(data.testCases.map((_: GeneratedTestCase, i: number) => i)));
      setStep('preview');

      toast({
        title: '生成完了',
        description: `${data.testCases.length}件のテストケースを生成しました`,
      });
    } catch (error) {
      console.error('Failed to generate test cases:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'テストケースの生成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = () => {
    const selectedTestCases = generatedTestCases.filter((_, i) => selectedIds.has(i));
    onImport(selectedTestCases);
    handleClose();
    toast({
      title: 'インポート完了',
      description: `${selectedTestCases.length}件のテストケースをインポートしました`,
    });
  };

  const handleClose = () => {
    setRequirement('');
    setFeature('');
    setConsiderations('');
    setTestTechnique('');
    setDetailLevel('standard');
    setCount(5);
    setGeneratedTestCases([]);
    setSelectedIds(new Set());
    setExpandedIds(new Set());
    setStep('input');
    onOpenChange(false);
  };

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIds(newSelected);
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIds(newExpanded);
  };

  const selectAll = () => {
    setSelectedIds(new Set(generatedTestCases.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const priorityBadge = (priority: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      HIGH: 'destructive',
      MEDIUM: 'default',
      LOW: 'secondary',
    };
    return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AIテストケース生成
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? '要件や仕様を入力してテストケースを自動生成します'
              : '生成されたテストケースを確認してインポートします'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="requirement">要件・仕様 *</Label>
              <Textarea
                id="requirement"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="テストケースを生成したい機能の要件や仕様を入力してください"
                className="min-h-[150px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feature">対象機能</Label>
                <Input
                  id="feature"
                  value={feature}
                  onChange={(e) => setFeature(e.target.value)}
                  placeholder="ログイン機能、決済処理など"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testTechnique">テスト技法</Label>
                <Select value={testTechnique} onValueChange={setTestTechnique}>
                  <SelectTrigger id="testTechnique">
                    <SelectValue placeholder="指定なし" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">指定なし</SelectItem>
                    <SelectItem value="equivalence">同値分割</SelectItem>
                    <SelectItem value="boundary">境界値分析</SelectItem>
                    <SelectItem value="decision">デシジョンテーブル</SelectItem>
                    <SelectItem value="state">状態遷移</SelectItem>
                    <SelectItem value="usecase">ユースケーステスト</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="considerations">追加の考慮事項</Label>
              <Textarea
                id="considerations"
                value={considerations}
                onChange={(e) => setConsiderations(e.target.value)}
                placeholder="特に注意すべき点、制約条件など"
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="detailLevel">詳細度</Label>
                <Select
                  value={detailLevel}
                  onValueChange={(v) => setDetailLevel(v as 'basic' | 'standard' | 'detailed')}
                >
                  <SelectTrigger id="detailLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">基本（主要シナリオのみ）</SelectItem>
                    <SelectItem value="standard">標準（一般的なシナリオ）</SelectItem>
                    <SelectItem value="detailed">詳細（エッジケース含む）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="count">生成件数</Label>
                <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
                  <SelectTrigger id="count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3件</SelectItem>
                    <SelectItem value="5">5件</SelectItem>
                    <SelectItem value="10">10件</SelectItem>
                    <SelectItem value="15">15件</SelectItem>
                    <SelectItem value="20">20件</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} / {generatedTestCases.length} 件選択中
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  すべて選択
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  選択解除
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStep('input')}>
                  再生成
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-4">
                {generatedTestCases.map((tc, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-colors ${
                      selectedIds.has(index) ? 'border-primary' : ''
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedIds.has(index)}
                          onCheckedChange={() => toggleSelect(index)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{tc.title}</CardTitle>
                            <div className="flex items-center gap-2">
                              {priorityBadge(tc.priority)}
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
                                {expandedIds.has(index) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{tc.description}</p>
                        </div>
                      </div>
                    </CardHeader>

                    {expandedIds.has(index) && (
                      <CardContent className="pt-0">
                        <div className="space-y-3 text-sm">
                          {tc.preconditions && (
                            <div>
                              <span className="font-medium">事前条件:</span>
                              <p className="text-muted-foreground">{tc.preconditions}</p>
                            </div>
                          )}

                          {tc.steps.length > 0 && (
                            <div>
                              <span className="font-medium">テスト手順:</span>
                              <ol className="list-decimal list-inside mt-1 space-y-1">
                                {tc.steps.map((step) => (
                                  <li key={step.stepNumber} className="text-muted-foreground">
                                    {step.action}
                                    {step.expectedResult && (
                                      <span className="ml-2 text-xs">→ {step.expectedResult}</span>
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

                          {tc.testTechnique && (
                            <div>
                              <span className="font-medium">テスト技法:</span>
                              <span className="text-muted-foreground ml-2">{tc.testTechnique}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          {step === 'input' ? (
            <Button onClick={handleGenerate} disabled={isGenerating || !requirement.trim()}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  生成する
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={selectedIds.size === 0}>
              <Check className="mr-2 h-4 w-4" />
              {selectedIds.size}件をインポート
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
