'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  AlertCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Download,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TestEffortEstimationResult,
  ConfidenceLevel,
  COMPLEXITY_INFO,
} from '@/services/ai/test-effort-estimator';

interface EffortEstimationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  initialTestCases?: Array<{
    id: string;
    title: string;
    priority?: string;
  }>;
}

type EstimationStep = 'input' | 'estimating' | 'result';

const confidenceColors: Record<ConfidenceLevel, string> = {
  LOW: 'bg-red-100 text-red-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-green-100 text-green-800',
};

const impactColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
};

export function EffortEstimationDialog({
  open,
  onOpenChange,
  projectId,
  initialTestCases,
}: EffortEstimationDialogProps) {
  const [step, setStep] = useState<EstimationStep>('input');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestEffortEstimationResult | null>(null);

  // Form state
  const [testCasesText, setTestCasesText] = useState(
    initialTestCases ? initialTestCases.map((tc) => `${tc.id}: ${tc.title}`).join('\n') : ''
  );
  const [totalTesters, setTotalTesters] = useState('3');
  const [experienceLevel, setExperienceLevel] = useState<string>('MIXED');
  const [availability, setAvailability] = useState('100');
  const [projectContext, setProjectContext] = useState('');
  const [deadline, setDeadline] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState('8');
  const [historicalText, setHistoricalText] = useState('');

  const handleEstimate = async () => {
    setStep('estimating');
    setError(null);

    try {
      // Parse test cases from text
      const testCases = testCasesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
          const match = line.match(/^([^:]+):\s*(.+)$/);
          if (match && match[1] && match[2]) {
            return { id: match[1].trim(), title: match[2].trim() };
          }
          return { id: `TC-${index + 1}`, title: line };
        });

      if (testCases.length === 0) {
        throw new Error('テストケースを入力してください');
      }

      // Parse historical data
      const historicalData = historicalText.trim()
        ? historicalText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const parts = line.split(',').map((p) => p.trim());
              return {
                projectName: parts[0] ?? 'Unknown',
                testCaseCount: parseInt(parts[1] ?? '0') || 0,
                actualEffort: parseInt(parts[2] ?? '0') || 0,
                teamSize: parseInt(parts[3] ?? '1') || 1,
              };
            })
        : undefined;

      const url = new URL('/api/ai/estimate-effort', window.location.origin);
      if (projectId) {
        url.searchParams.set('projectId', projectId);
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases,
          resources: {
            totalTesters: parseInt(totalTesters),
            experienceLevel,
            availability: parseInt(availability),
          },
          projectContext: projectContext.trim() || undefined,
          historicalData,
          deadline: deadline || undefined,
          hoursPerDay: parseInt(hoursPerDay),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '工数予測に失敗しました');
      }

      const data = await response.json();
      setResult(data.result);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setStep('input');
    }
  };

  const handleReset = () => {
    setStep('input');
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      handleReset();
      if (!initialTestCases) {
        setTestCasesText('');
      }
    }, 200);
  };

  const handleExport = () => {
    if (!result) return;

    const exportData = {
      estimation: {
        totalHours: result.totalEstimatedHours,
        days: result.estimatedDays,
        range: { min: result.rangeMin, max: result.rangeMax },
        confidence: result.confidenceLevel,
        confidenceScore: result.confidenceScore,
      },
      breakdown: result.breakdown,
      riskFactors: result.riskFactors,
      assumptions: result.assumptions,
      recommendation: result.recommendation,
      comparisonWithHistorical: result.comparisonWithHistorical,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `effort-estimation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getConfidenceLabel = (level: ConfidenceLevel) => {
    switch (level) {
      case 'HIGH':
        return '高';
      case 'MEDIUM':
        return '中';
      case 'LOW':
        return '低';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AIテスト工数予測</DialogTitle>
          <DialogDescription>テストケースとリソース情報からAIが工数を予測します</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'input' && (
          <div className="space-y-6">
            <Tabs defaultValue="testcases" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="testcases">テストケース</TabsTrigger>
                <TabsTrigger value="resources">リソース</TabsTrigger>
                <TabsTrigger value="context">コンテキスト</TabsTrigger>
              </TabsList>

              <TabsContent value="testcases" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="testCases">テストケース（1行1件、「ID: タイトル」形式）*</Label>
                  <Textarea
                    id="testCases"
                    value={testCasesText}
                    onChange={(e) => setTestCasesText(e.target.value)}
                    placeholder="TC-001: ユーザーログインテスト&#10;TC-002: パスワードリセットテスト&#10;TC-003: 新規ユーザー登録テスト"
                    rows={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    {testCasesText.split('\n').filter((l) => l.trim()).length}件のテストケース
                  </p>
                </div>

                <div className="p-3 bg-muted rounded-md">
                  <h4 className="text-sm font-medium mb-2">複雑度の目安</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(Object.keys(COMPLEXITY_INFO) as Array<keyof typeof COMPLEXITY_INFO>).map(
                      (key) => (
                        <div key={key} className="flex justify-between">
                          <span>{COMPLEXITY_INFO[key].label}</span>
                          <span className="text-muted-foreground">
                            係数 {COMPLEXITY_INFO[key].weight}x
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="resources" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalTesters">テスター数</Label>
                    <Input
                      id="totalTesters"
                      type="number"
                      min="1"
                      value={totalTesters}
                      onChange={(e) => setTotalTesters(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experienceLevel">経験レベル</Label>
                    <Select
                      value={experienceLevel}
                      onValueChange={(value) => value && setExperienceLevel(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JUNIOR">ジュニア</SelectItem>
                        <SelectItem value="MID">ミドル</SelectItem>
                        <SelectItem value="SENIOR">シニア</SelectItem>
                        <SelectItem value="MIXED">混合</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="availability">稼働率（%）</Label>
                    <Input
                      id="availability"
                      type="number"
                      min="1"
                      max="100"
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hoursPerDay">1日あたり作業時間</Label>
                    <Input
                      id="hoursPerDay"
                      type="number"
                      min="1"
                      max="24"
                      value={hoursPerDay}
                      onChange={(e) => setHoursPerDay(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">締め切り（任意）</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="context" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="projectContext">プロジェクトコンテキスト</Label>
                  <Textarea
                    id="projectContext"
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    placeholder="プロジェクトの背景、技術的な特徴、注意事項など"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="historicalData">
                    過去実績（1行1件、「プロジェクト名,TC数,工数（時間）,人数」形式）
                  </Label>
                  <Textarea
                    id="historicalData"
                    value={historicalText}
                    onChange={(e) => setHistoricalText(e.target.value)}
                    placeholder="前回リリース,50,120,3&#10;初期リリース,100,280,4"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    過去実績を入力すると、より精度の高い予測が可能です
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button onClick={handleEstimate} disabled={!testCasesText.trim()}>
                工数を予測
              </Button>
            </div>
          </div>
        )}

        {step === 'estimating' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">工数を予測中...</p>
            <p className="text-sm text-muted-foreground">
              AIがテストケースとリソースを分析しています
            </p>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    予測結果
                  </CardTitle>
                  <Badge className={confidenceColors[result.confidenceLevel]} variant="secondary">
                    信頼度: {getConfidenceLabel(result.confidenceLevel)} ({result.confidenceScore}%)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-3xl font-bold text-primary">{result.totalEstimatedHours}</p>
                    <p className="text-sm text-muted-foreground">時間</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-3xl font-bold">{result.estimatedDays}</p>
                    <p className="text-sm text-muted-foreground">日</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-lg font-medium">
                      {result.rangeMin} - {result.rangeMax}
                    </p>
                    <p className="text-sm text-muted-foreground">予測範囲（時間）</p>
                  </div>
                </div>
                <p className="text-sm">{result.recommendation}</p>
              </CardContent>
            </Card>

            <Tabs defaultValue="breakdown" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="breakdown">内訳</TabsTrigger>
                <TabsTrigger value="risks">リスク</TabsTrigger>
                <TabsTrigger value="assumptions">前提条件</TabsTrigger>
                <TabsTrigger value="comparison">比較</TabsTrigger>
              </TabsList>

              <TabsContent value="breakdown" className="space-y-4 mt-4">
                {result.breakdown.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-sm">
                        {item.hours}時間 ({item.percentage}%)
                      </span>
                    </div>
                    <Progress value={item.percentage} />
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="risks" className="space-y-4 mt-4">
                {result.riskFactors.length > 0 ? (
                  result.riskFactors.map((risk, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {risk.factor}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={impactColors[risk.impact]} variant="secondary">
                              影響:{' '}
                              {risk.impact === 'HIGH'
                                ? '高'
                                : risk.impact === 'MEDIUM'
                                  ? '中'
                                  : '低'}
                            </Badge>
                            {risk.adjustmentHours !== 0 && (
                              <Badge variant="outline">
                                {risk.adjustmentHours > 0 ? '+' : ''}
                                {risk.adjustmentHours}時間
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{risk.mitigation}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    特筆すべきリスク要因はありません
                  </p>
                )}
              </TabsContent>

              <TabsContent value="assumptions" className="space-y-4 mt-4">
                {result.assumptions.length > 0 ? (
                  result.assumptions.map((assumption, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          {assumption.assumption}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{assumption.rationale}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    前提条件はありません
                  </p>
                )}
              </TabsContent>

              <TabsContent value="comparison" className="space-y-4 mt-4">
                {result.comparisonWithHistorical ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        過去実績との比較
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-2xl font-bold">
                            {result.comparisonWithHistorical.averageEffortPerTestCase.toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">今回予測（時間/TC）</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-2xl font-bold">
                            {result.comparisonWithHistorical.historicalAveragePerTestCase.toFixed(
                              1
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">過去平均（時間/TC）</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <TrendingUp
                          className={`h-4 w-4 ${
                            result.comparisonWithHistorical.variance > 0
                              ? 'text-red-500'
                              : 'text-green-500'
                          }`}
                        />
                        <span
                          className={
                            result.comparisonWithHistorical.variance > 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {result.comparisonWithHistorical.variance > 0 ? '+' : ''}
                          {result.comparisonWithHistorical.variance.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm">{result.comparisonWithHistorical.explanation}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      過去実績データがないため比較できません
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      過去実績を入力すると、より精度の高い分析が可能です
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                エクスポート
              </Button>
              <Button variant="outline" onClick={handleReset}>
                再予測
              </Button>
              <Button onClick={handleClose}>閉じる</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
