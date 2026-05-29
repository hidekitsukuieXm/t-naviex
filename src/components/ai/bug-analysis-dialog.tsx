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
  Bug,
  Target,
  Shield,
  Wrench,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BugAnalysisResult,
  BugSeverity,
  BugPriority,
  RootCauseCategory,
  ImpactLevel,
  SEVERITY_INFO,
  ROOT_CAUSE_CATEGORY_INFO,
} from '@/services/ai/bug-analyzer';

interface BugAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  initialBugData?: {
    id: string;
    title: string;
    description: string;
    severity?: string;
    module?: string;
  };
}

type AnalysisStep = 'input' | 'analyzing' | 'result';

const severityColors: Record<BugSeverity, string> = {
  BLOCKER: 'bg-purple-100 text-purple-800',
  CRITICAL: 'bg-red-100 text-red-800',
  MAJOR: 'bg-orange-100 text-orange-800',
  MINOR: 'bg-yellow-100 text-yellow-800',
  TRIVIAL: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<BugPriority, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-800',
};

const priorityLabels: Record<BugPriority, string> = {
  CRITICAL: '緊急',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

const impactColors: Record<ImpactLevel, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-800',
};

const impactLabels: Record<ImpactLevel, string> = {
  CRITICAL: '致命的',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

const effortColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
};

const effortLabels = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
};

export function BugAnalysisDialog({
  open,
  onOpenChange,
  projectId,
  initialBugData,
}: BugAnalysisDialogProps) {
  const [step, setStep] = useState<AnalysisStep>('input');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BugAnalysisResult | null>(null);

  // Form state
  const [bugId, setBugId] = useState(initialBugData?.id || '');
  const [bugTitle, setBugTitle] = useState(initialBugData?.title || '');
  const [bugDescription, setBugDescription] = useState(initialBugData?.description || '');
  const [bugSeverity, setBugSeverity] = useState(initialBugData?.severity || '');
  const [bugModule, setBugModule] = useState(initialBugData?.module || '');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [errorLog, setErrorLog] = useState('');
  const [projectContext, setProjectContext] = useState('');

  const handleAnalyze = async () => {
    setStep('analyzing');
    setError(null);

    try {
      const url = new URL('/api/ai/analyze-bug', window.location.origin);
      if (projectId) {
        url.searchParams.set('projectId', projectId);
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bugData: {
            id: bugId,
            title: bugTitle,
            description: bugDescription,
            severity: bugSeverity || undefined,
            module: bugModule || undefined,
            reproductionSteps: reproductionSteps || undefined,
            errorLog: errorLog || undefined,
          },
          projectContext: projectContext.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'バグ分析に失敗しました');
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
      if (!initialBugData) {
        setBugId('');
        setBugTitle('');
        setBugDescription('');
        setBugSeverity('');
        setBugModule('');
        setReproductionSteps('');
        setErrorLog('');
        setProjectContext('');
      }
    }, 200);
  };

  const isFormValid = bugId && bugTitle && bugDescription;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AIバグ分析</DialogTitle>
          <DialogDescription>バグをAIが分析し、根本原因と解決策を提示します</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'input' && (
          <div className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="details">詳細情報</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bugId">バグID *</Label>
                    <Input
                      id="bugId"
                      value={bugId}
                      onChange={(e) => setBugId(e.target.value)}
                      placeholder="例: BUG-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bugModule">モジュール</Label>
                    <Input
                      id="bugModule"
                      value={bugModule}
                      onChange={(e) => setBugModule(e.target.value)}
                      placeholder="例: 認証"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bugTitle">タイトル *</Label>
                  <Input
                    id="bugTitle"
                    value={bugTitle}
                    onChange={(e) => setBugTitle(e.target.value)}
                    placeholder="バグのタイトル"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bugDescription">説明 *</Label>
                  <Textarea
                    id="bugDescription"
                    value={bugDescription}
                    onChange={(e) => setBugDescription(e.target.value)}
                    placeholder="バグの詳細な説明"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bugSeverity">重大度</Label>
                  <Select
                    value={bugSeverity}
                    onValueChange={(value) => value && setBugSeverity(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="重大度を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BLOCKER">ブロッカー</SelectItem>
                      <SelectItem value="CRITICAL">致命的</SelectItem>
                      <SelectItem value="MAJOR">重大</SelectItem>
                      <SelectItem value="MINOR">軽微</SelectItem>
                      <SelectItem value="TRIVIAL">軽度</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reproductionSteps">再現手順</Label>
                  <Textarea
                    id="reproductionSteps"
                    value={reproductionSteps}
                    onChange={(e) => setReproductionSteps(e.target.value)}
                    placeholder="1. ログイン画面を開く&#10;2. ユーザー名を入力&#10;3. ..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="errorLog">エラーログ</Label>
                  <Textarea
                    id="errorLog"
                    value={errorLog}
                    onChange={(e) => setErrorLog(e.target.value)}
                    placeholder="スタックトレースやエラーメッセージ"
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectContext">プロジェクトコンテキスト</Label>
                  <Textarea
                    id="projectContext"
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    placeholder="プロジェクトの背景、技術スタック、関連情報など"
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button onClick={handleAnalyze} disabled={!isFormValid}>
                分析開始
              </Button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">バグを分析中...</p>
            <p className="text-sm text-muted-foreground">AIがバグの根本原因を分析しています</p>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bug className="h-5 w-5" />
                    分析結果
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={severityColors[result.overallSeverity]} variant="secondary">
                      {SEVERITY_INFO[result.overallSeverity].label}
                    </Badge>
                    <Badge className={priorityColors[result.estimatedPriority]} variant="secondary">
                      優先度: {priorityLabels[result.estimatedPriority]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{result.summary}</p>
              </CardContent>
            </Card>

            {/* Root Cause Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  根本原因分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {ROOT_CAUSE_CATEGORY_INFO[result.rootCauseAnalysis.category].label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    信頼度: {result.rootCauseAnalysis.confidence}%
                  </span>
                </div>
                <p className="text-sm">{result.rootCauseAnalysis.description}</p>
                {result.rootCauseAnalysis.evidence.length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">根拠:</span>
                    <ul className="list-disc list-inside mt-1">
                      {result.rootCauseAnalysis.evidence.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="text-sm text-primary">
                  <span className="text-muted-foreground">推奨修正: </span>
                  {result.rootCauseAnalysis.suggestedFix}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="impact" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="impact">影響評価</TabsTrigger>
                <TabsTrigger value="fix">修正推奨</TabsTrigger>
                <TabsTrigger value="prevention">予防策</TabsTrigger>
                <TabsTrigger value="regression">回帰リスク</TabsTrigger>
              </TabsList>

              <TabsContent value="impact" className="space-y-4 mt-4">
                {result.impactAssessment.length > 0 ? (
                  result.impactAssessment.map((impact, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{impact.area}</CardTitle>
                          <Badge className={impactColors[impact.level]} variant="secondary">
                            {impactLabels[impact.level]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">{impact.description}</p>
                        <div className="text-sm">
                          <span className="text-muted-foreground">影響ユーザー: </span>
                          {impact.affectedUsers}
                        </div>
                        {impact.affectedFeatures.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {impact.affectedFeatures.map((feature, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    影響評価データがありません
                  </p>
                )}

                {/* Similar Patterns */}
                {result.similarPatterns.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      類似パターン
                    </h4>
                    {result.similarPatterns.map((pattern, index) => (
                      <Card key={index} className="mb-3">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{pattern.pattern}</span>
                            <Badge variant="outline">{pattern.occurrences}件</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{pattern.description}</p>
                          <div className="text-sm text-primary mt-2">
                            <span className="text-muted-foreground">予防策: </span>
                            {pattern.preventionStrategy}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="fix" className="space-y-4 mt-4">
                {result.fixRecommendations.length > 0 ? (
                  result.fixRecommendations.map((rec, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Wrench className="h-4 w-4" />
                            {rec.recommendation}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                rec.priority === 'HIGH'
                                  ? 'bg-red-100 text-red-800'
                                  : rec.priority === 'MEDIUM'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                              }
                              variant="secondary"
                            >
                              {rec.priority === 'HIGH'
                                ? '高'
                                : rec.priority === 'MEDIUM'
                                  ? '中'
                                  : '低'}
                            </Badge>
                            <Badge className={effortColors[rec.effort]} variant="outline">
                              工数: {effortLabels[rec.effort]}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">根拠: </span>
                          {rec.rationale}
                        </div>
                        <div className="text-sm text-primary">
                          <span className="text-muted-foreground">期待される効果: </span>
                          {rec.expectedOutcome}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    修正推奨事項がありません
                  </p>
                )}
              </TabsContent>

              <TabsContent value="prevention" className="space-y-4 mt-4">
                {result.preventionMeasures.length > 0 ? (
                  result.preventionMeasures.map((measure, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            {measure.measure}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                measure.effectiveness === 'HIGH'
                                  ? 'bg-green-100 text-green-800'
                                  : measure.effectiveness === 'MEDIUM'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                              }
                              variant="secondary"
                            >
                              効果: {effortLabels[measure.effectiveness]}
                            </Badge>
                            <Badge
                              className={effortColors[measure.implementationCost]}
                              variant="outline"
                            >
                              コスト: {effortLabels[measure.implementationCost]}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">{measure.description}</p>
                        <div className="text-sm">
                          <span className="text-muted-foreground">適用フェーズ: </span>
                          {measure.applicablePhase}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    予防策がありません
                  </p>
                )}
              </TabsContent>

              <TabsContent value="regression" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        回帰リスク
                      </CardTitle>
                      <Badge
                        className={impactColors[result.regressionRisk.level]}
                        variant="secondary"
                      >
                        {impactLabels[result.regressionRisk.level]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.regressionRisk.areas.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">影響領域:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {result.regressionRisk.areas.map((area, i) => (
                            <Badge key={i} variant="outline">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.regressionRisk.testingRecommendations.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">テスト推奨事項:</span>
                        <ul className="text-sm list-disc list-inside mt-1">
                          {result.regressionRisk.testingRecommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {result.detailedAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">詳細分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{result.detailedAnalysis}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                再分析
              </Button>
              <Button onClick={handleClose}>閉じる</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
