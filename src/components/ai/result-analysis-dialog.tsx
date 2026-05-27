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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Target,
  Layers,
  FileWarning,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TestResultAnalysisResult,
  RiskLevel,
  QualityLevel,
  QUALITY_LEVEL_INFO,
} from '@/services/ai/test-result-analyzer';

interface ResultAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  initialTestResults?: Array<{
    id: string;
    title: string;
    status: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED';
    module?: string;
    errorMessage?: string;
  }>;
}

type AnalysisStep = 'input' | 'analyzing' | 'result';

const qualityLevelColors: Record<QualityLevel, string> = {
  EXCELLENT: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  FAIR: 'bg-yellow-100 text-yellow-800',
  POOR: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const riskLevelColors: Record<RiskLevel, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const riskLevelLabels: Record<RiskLevel, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '危険',
};

const metricStatusColors = {
  PASS: 'bg-green-100 text-green-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  FAIL: 'bg-red-100 text-red-800',
};

const metricStatusLabels = {
  PASS: '合格',
  WARNING: '警告',
  FAIL: '不合格',
};

const trendIcons = {
  IMPROVING: <TrendingUp className="h-4 w-4 text-green-600" />,
  STABLE: <Minus className="h-4 w-4 text-gray-600" />,
  DECLINING: <TrendingDown className="h-4 w-4 text-red-600" />,
};

export function ResultAnalysisDialog({
  open,
  onOpenChange,
  projectId,
  initialTestResults,
}: ResultAnalysisDialogProps) {
  const [step, setStep] = useState<AnalysisStep>('input');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestResultAnalysisResult | null>(null);

  // Form state
  const [testResultsJson, setTestResultsJson] = useState(
    initialTestResults ? JSON.stringify(initialTestResults, null, 2) : ''
  );
  const [projectContext, setProjectContext] = useState('');

  const handleAnalyze = async () => {
    setStep('analyzing');
    setError(null);

    try {
      // Parse test results JSON
      let testResults;
      try {
        testResults = JSON.parse(testResultsJson);
        if (!Array.isArray(testResults)) {
          throw new Error('テスト結果は配列形式で入力してください');
        }
      } catch {
        throw new Error('JSONの形式が正しくありません');
      }

      const url = new URL('/api/ai/analyze-results', window.location.origin);
      if (projectId) {
        url.searchParams.set('projectId', projectId);
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testResults,
          projectContext: projectContext.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'テスト結果分析に失敗しました');
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
      if (!initialTestResults) {
        setTestResultsJson('');
        setProjectContext('');
      }
    }, 200);
  };

  const isFormValid = testResultsJson.trim().length > 0;

  const sampleJson = `[
  { "id": "TC-001", "title": "ログインテスト", "status": "PASSED", "module": "認証" },
  { "id": "TC-002", "title": "データ登録テスト", "status": "FAILED", "module": "データ管理", "errorMessage": "タイムアウトエラー" },
  { "id": "TC-003", "title": "検索機能テスト", "status": "PASSED", "module": "検索" }
]`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AIテスト結果分析</DialogTitle>
          <DialogDescription>
            テスト結果をAIが分析し、品質傾向と改善点を提示します
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'input' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="testResultsJson">テスト結果データ (JSON) *</Label>
              <Textarea
                id="testResultsJson"
                value={testResultsJson}
                onChange={(e) => setTestResultsJson(e.target.value)}
                placeholder={sampleJson}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                各テスト結果にはid、title、status (PASSED/FAILED/BLOCKED/SKIPPED)が必要です。
                module、errorMessageはオプションです。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectContext">プロジェクトコンテキスト</Label>
              <Textarea
                id="projectContext"
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                placeholder="プロジェクトの背景、特別な状況、考慮事項など"
                rows={3}
              />
            </div>

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
            <p className="text-lg font-medium">テスト結果を分析中...</p>
            <p className="text-sm text-muted-foreground">AIがテスト結果データを分析しています</p>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    分析結果
                  </CardTitle>
                  <Badge className={qualityLevelColors[result.overallQuality]} variant="secondary">
                    {QUALITY_LEVEL_INFO[result.overallQuality].label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{result.qualityScore}</p>
                    <p className="text-xs text-muted-foreground">品質スコア</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">
                      {result.passRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">合格率</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-700">{result.failRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">失敗率</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-700">
                      {result.blockRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">ブロック率</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-700">
                      {result.skipRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">スキップ率</p>
                  </div>
                </div>
                <p className="text-sm">{result.summary}</p>
              </CardContent>
            </Card>

            <Tabs defaultValue="patterns" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="patterns">失敗パターン</TabsTrigger>
                <TabsTrigger value="modules">モジュール分析</TabsTrigger>
                <TabsTrigger value="regression">回帰リスク</TabsTrigger>
                <TabsTrigger value="metrics">品質指標</TabsTrigger>
                <TabsTrigger value="actions">推奨アクション</TabsTrigger>
              </TabsList>

              <TabsContent value="patterns" className="space-y-4 mt-4">
                {result.failurePatterns.length > 0 ? (
                  result.failurePatterns.map((pattern, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileWarning className="h-4 w-4" />
                            {pattern.pattern}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={riskLevelColors[pattern.severity]}
                              variant="secondary"
                            >
                              {riskLevelLabels[pattern.severity]}
                            </Badge>
                            <Badge variant="outline">{pattern.occurrences}件</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">{pattern.description}</p>
                        <div className="text-sm">
                          <span className="text-muted-foreground">根本原因: </span>
                          {pattern.rootCause}
                        </div>
                        <div className="text-sm text-primary">
                          <span className="text-muted-foreground">推奨対応: </span>
                          {pattern.recommendation}
                        </div>
                        {pattern.affectedTests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {pattern.affectedTests.slice(0, 5).map((testId, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {testId}
                              </Badge>
                            ))}
                            {pattern.affectedTests.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{pattern.affectedTests.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    失敗パターンは検出されませんでした
                  </p>
                )}
              </TabsContent>

              <TabsContent value="modules" className="space-y-4 mt-4">
                {result.moduleAnalysis.length > 0 ? (
                  result.moduleAnalysis.map((module, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            {module.module}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={qualityLevelColors[module.status]}
                              variant="secondary"
                            >
                              {QUALITY_LEVEL_INFO[module.status].label}
                            </Badge>
                            <span className="text-sm">合格率: {module.passRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <span className="text-muted-foreground">失敗件数: </span>
                          {module.failCount}件
                        </div>
                        <p className="text-sm mt-2 text-muted-foreground">{module.observation}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    モジュール分析データがありません
                  </p>
                )}
              </TabsContent>

              <TabsContent value="regression" className="space-y-4 mt-4">
                {result.regressionRisks.length > 0 ? (
                  result.regressionRisks.map((risk, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {risk.module}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={riskLevelColors[risk.riskLevel]} variant="secondary">
                              {riskLevelLabels[risk.riskLevel]}
                            </Badge>
                            <Badge variant="outline">最近の失敗: {risk.recentFailures}件</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">兆候: </span>
                          {risk.indicators.join(', ')}
                        </div>
                        <div className="text-sm text-primary">
                          <span className="text-muted-foreground">推奨: </span>
                          {risk.recommendation}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    回帰リスクは検出されませんでした
                  </p>
                )}

                {/* Focus Areas */}
                {result.focusAreas.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      重点対応領域
                    </h4>
                    {result.focusAreas.map((area, index) => (
                      <Card key={index} className="mb-3">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{area.area}</span>
                            <Badge className={riskLevelColors[area.riskLevel]} variant="secondary">
                              {riskLevelLabels[area.riskLevel]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{area.reason}</p>
                          {area.suggestedActions.length > 0 && (
                            <ul className="text-sm mt-2 list-disc list-inside">
                              {area.suggestedActions.map((action, i) => (
                                <li key={i}>{action}</li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="metrics" className="space-y-4 mt-4">
                {result.qualityMetrics.length > 0 ? (
                  result.qualityMetrics.map((metric, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{metric.metric}</span>
                          <div className="flex items-center gap-2">
                            {trendIcons[metric.trend]}
                            <Badge
                              className={metricStatusColors[metric.status]}
                              variant="secondary"
                            >
                              {metricStatusLabels[metric.status]}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>
                            値: <strong>{metric.value}</strong>
                          </span>
                          <span className="text-muted-foreground">閾値: {metric.threshold}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{metric.observation}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    品質指標データがありません
                  </p>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4 mt-4">
                {result.recommendations.length > 0 ? (
                  result.recommendations.map((rec, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            {rec.recommendation}
                          </CardTitle>
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
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">根拠: </span>
                          {rec.rationale}
                        </div>
                        <div className="text-sm text-primary">
                          <span className="text-muted-foreground">期待効果: </span>
                          {rec.expectedImpact}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    推奨アクションはありません
                  </p>
                )}
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
