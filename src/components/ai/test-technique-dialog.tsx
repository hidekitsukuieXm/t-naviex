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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Lightbulb,
  BookOpen,
  ChevronRight,
  Target,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  TestTechniqueSuggestionResult,
  TechniqueSuggestion,
  TechniqueGuide,
  TECHNIQUE_INFO,
} from '@/services/ai/test-technique-suggester';

interface TestTechniqueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRequirement?: string;
  onSelectTechnique?: (technique: string) => void;
}

export function TestTechniqueDialog({
  open,
  onOpenChange,
  initialRequirement,
  onSelectTechnique,
}: TestTechniqueDialogProps) {
  const { toast } = useToast();

  // Form state
  const [requirement, setRequirement] = useState(initialRequirement || '');
  const [feature, setFeature] = useState('');
  const [inputTypes, setInputTypes] = useState('');
  const [constraints, setConstraints] = useState('');

  // Suggestion state
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionResult, setSuggestionResult] = useState<TestTechniqueSuggestionResult | null>(
    null
  );
  const [selectedGuide, setSelectedGuide] = useState<TechniqueGuide | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  const [step, setStep] = useState<'input' | 'result'>('input');

  const handleSuggest = async () => {
    if (!requirement.trim()) {
      toast({
        title: 'エラー',
        description: '要件を入力してください',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSuggesting(true);

      const response = await fetch('/api/ai/suggest-techniques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement,
          feature,
          inputTypes,
          constraints,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Suggestion failed');
      }

      const data = await response.json();
      setSuggestionResult(data.result);
      setStep('result');

      toast({
        title: '提案完了',
        description: `${data.result.suggestions.length}件のテスト技法を提案しました`,
      });
    } catch (error) {
      console.error('Failed to suggest techniques:', error);
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '提案に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const loadTechniqueGuide = async (technique: string) => {
    try {
      setIsLoadingGuide(true);
      const response = await fetch(`/api/ai/suggest-techniques?technique=${technique}`);
      if (!response.ok) {
        throw new Error('Failed to load guide');
      }
      const guide = await response.json();
      setSelectedGuide(guide);
    } catch (error) {
      console.error('Failed to load technique guide:', error);
      toast({
        title: 'エラー',
        description: 'ガイドの読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingGuide(false);
    }
  };

  const handleSelectTechnique = (technique: string) => {
    if (onSelectTechnique) {
      onSelectTechnique(technique);
      toast({
        title: 'テスト技法を選択しました',
        description: TECHNIQUE_INFO[technique as keyof typeof TECHNIQUE_INFO]?.name || technique,
      });
    }
  };

  const handleClose = () => {
    setRequirement(initialRequirement || '');
    setFeature('');
    setInputTypes('');
    setConstraints('');
    setSuggestionResult(null);
    setSelectedGuide(null);
    setStep('input');
    onOpenChange(false);
  };

  const getApplicabilityBadge = (applicability: TechniqueSuggestion['applicability']) => {
    const variants: Record<
      TechniqueSuggestion['applicability'],
      'default' | 'secondary' | 'outline'
    > = {
      HIGH: 'default',
      MEDIUM: 'secondary',
      LOW: 'outline',
    };
    const labels: Record<TechniqueSuggestion['applicability'], string> = {
      HIGH: '適合度: 高',
      MEDIUM: '適合度: 中',
      LOW: '適合度: 低',
    };
    return <Badge variant={variants[applicability]}>{labels[applicability]}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AIテスト技法提案
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? 'テスト対象の特性を入力して、適切なテスト技法を提案します'
              : selectedGuide
                ? 'テスト技法の詳細ガイド'
                : '提案されたテスト技法を確認してください'}
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
                placeholder="テスト対象の要件や機能の説明を入力してください"
                className="min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feature">対象機能</Label>
                <Input
                  id="feature"
                  value={feature}
                  onChange={(e) => setFeature(e.target.value)}
                  placeholder="ログイン機能、検索機能など"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inputTypes">入力データの種類</Label>
                <Input
                  id="inputTypes"
                  value={inputTypes}
                  onChange={(e) => setInputTypes(e.target.value)}
                  placeholder="数値、文字列、日付など"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="constraints">制約・考慮事項</Label>
              <Textarea
                id="constraints"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="テスト時間の制約、リソースの制限など"
                className="min-h-[60px]"
              />
            </div>
          </div>
        ) : selectedGuide ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedGuide(null)}
              className="self-start mb-2"
            >
              ← 提案一覧に戻る
            </Button>

            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      {selectedGuide.name}
                    </CardTitle>
                    <CardDescription>{selectedGuide.description}</CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      いつ使うか
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {selectedGuide.whenToUse.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      適用手順
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-2">
                      {selectedGuide.howToApply.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="pt-0.5">{item}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">適用例</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedGuide.examples.map((example, i) => (
                        <li key={i} className="text-sm p-2 bg-muted rounded-md">
                          {example}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {suggestionResult && (
              <Tabs defaultValue="suggestions" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="suggestions">
                    提案技法 ({suggestionResult.suggestions.length})
                  </TabsTrigger>
                  <TabsTrigger value="guidance">設計ガイダンス</TabsTrigger>
                </TabsList>

                <TabsContent value="suggestions" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-3 pr-4">
                      {suggestionResult.suggestions.map((suggestion, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                {suggestion.name}
                              </CardTitle>
                              {getApplicabilityBadge(suggestion.applicability)}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <span className="text-sm font-medium">推奨理由:</span>
                              <p className="text-sm text-muted-foreground mt-1">
                                {suggestion.reason}
                              </p>
                            </div>

                            {suggestion.example && (
                              <div>
                                <span className="text-sm font-medium">適用例:</span>
                                <p className="text-sm text-muted-foreground mt-1 p-2 bg-muted rounded-md">
                                  {suggestion.example}
                                </p>
                              </div>
                            )}

                            {suggestion.guidelines.length > 0 && (
                              <Accordion>
                                <AccordionItem value="guidelines" className="border-none">
                                  <AccordionTrigger className="text-sm py-2">
                                    適用ガイドライン ({suggestion.guidelines.length})
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <ul className="space-y-1">
                                      {suggestion.guidelines.map((guideline, i) => (
                                        <li
                                          key={i}
                                          className="text-sm text-muted-foreground flex items-start gap-2"
                                        >
                                          <ChevronRight className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                          {guideline}
                                        </li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            )}

                            <div className="flex gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadTechniqueGuide(suggestion.technique)}
                                disabled={isLoadingGuide}
                              >
                                <BookOpen className="mr-1 h-4 w-4" />
                                詳細ガイド
                              </Button>
                              {onSelectTechnique && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleSelectTechnique(suggestion.technique)}
                                >
                                  この技法を選択
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="guidance" className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-4 pr-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">全体的な推奨</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {suggestionResult.overallRecommendation}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">テスト設計ガイダンス</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {suggestionResult.testDesignGuidance}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {step === 'result' ? '閉じる' : 'キャンセル'}
          </Button>
          {step === 'input' ? (
            <Button onClick={handleSuggest} disabled={isSuggesting || !requirement.trim()}>
              {isSuggesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  技法を提案
                </>
              )}
            </Button>
          ) : !selectedGuide ? (
            <Button variant="outline" onClick={() => setStep('input')}>
              再分析
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
