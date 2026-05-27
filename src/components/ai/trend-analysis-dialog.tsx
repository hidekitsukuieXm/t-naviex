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
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  Target,
  Calendar,
  BarChart,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TestTrendAnalysisResult,
  TrendDirection,
  RiskLevel,
  Confidence,
  TREND_DIRECTION_INFO,
} from '@/services/ai/test-trend-analyzer';

interface TrendAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  initialHistoricalData?: Array<{
    date: string;
    passRate: number;
    failRate: number;
    executedCount: number;
    passedCount: number;
    failedCount: number;
  }>;
}

type AnalysisStep = 'input' | 'analyzing' | 'result';

const trendIcons: Record<TrendDirection, React.ReactNode> = {
  IMPROVING: <TrendingUp className="h-4 w-4 text-green-600" />,
  STABLE: <Minus className="h-4 w-4 text-gray-600" />,
  DECLINING: <TrendingDown className="h-4 w-4 text-red-600" />,
};

const trendColors: Record<TrendDirection, string> = {
  IMPROVING: 'bg-green-100 text-green-800',
  STABLE: 'bg-gray-100 text-gray-800',
  DECLINING: 'bg-red-100 text-red-800',
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

const confidenceColors: Record<Confidence, string> = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-gray-100 text-gray-800',
};

const confidenceLabels: Record<Confidence, string> = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

export function TrendAnalysisDialog({
  open,
  onOpenChange,
  projectId,
  initialHistoricalData,
}: TrendAnalysisDialogProps) {
  const [step, setStep] = useState<AnalysisStep>('input');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestTrendAnalysisResult | null>(null);

  // Form state
  const [historicalDataJson, setHistoricalDataJson] = useState(
    initialHistoricalData ? JSON.stringify(initialHistoricalData, null, 2) : ''
  );
  const [projectContext, setProjectContext] = useState('');
  const [analysisTimeframe, setAnalysisTimeframe] = useState('');

  const handleAnalyze = async () => {
    setStep('analyzing');
    setError(null);

    try {
      // Parse historical data JSON
      let historicalData;
      try {
        historicalData = JSON.parse(historicalDataJson);
        if (!Array.isArray(historicalData)) {
          throw new Error('履歴データは配列形式で入力してください');
        }
      } catch {
        throw new Error('JSONの形式が正しくありません');
      }

      const url = new URL('/api/ai/analyze-trends', window.location.origin);
      if (projectId) {
        url.searchParams.set('projectId', projectId);
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historicalData,
          projectContext: projectContext.trim() || undefined,
          analysisTimeframe: analysisTimeframe.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '傾向分析に失敗しました');
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
      if (!initialHistoricalData) {
        setHistoricalDataJson('');
        setProjectContext('');
        setAnalysisTimeframe('');
      }
    }, 200);
  };

  const isFormValid = historicalDataJson.trim().length > 0;

  const sampleJson = `[
  { "date": "2024-01-01", "passRate": 85, "failRate": 10, "executedCount": 100, "passedCount": 85, "failedCount": 10 },
  { "date": "2024-01-02", "passRate": 87, "failRate": 8, "executedCount": 120, "passedCount": 104, "failedCount": 10 },
  { "date": "2024-01-03", "passRate": 90, "failRate": 5, "executedCount": 110, "passedCount": 99, "failedCount": 6 }
]`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AIテスト傾向分析</DialogTitle>
          <DialogDescription>履歴データをAIが分析し、傾向とパターンを特定します</DialogDescription>
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
              <Label htmlFor="historicalDataJson">履歴データ (JSON) *</Label>
              <Textarea
                id="historicalDataJson"
                value={historicalDataJson}
                onChange={(e) => setHistoricalDataJson(e.target.value)}
                placeholder={sampleJson}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                各データポイントには date, passRate, failRate, executedCount, passedCount,
                failedCount が必要です。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="analysisTimeframe">分析期間</Label>
                <Textarea
                  id="analysisTimeframe"
                  value={analysisTimeframe}
                  onChange={(e) => setAnalysisTimeframe(e.target.value)}
                  placeholder="例: 過去30日間、2024年Q1"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectContext">プロジェクトコンテキスト</Label>
                <Textarea
                  id="projectContext"
                  value={projectContext}
                  onChange={(e) => setProjectContext(e.target.value)}
                  placeholder="プロジェクトの背景、特別な状況など"
                  rows={2}
                />
              </div>
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
            <p className="text-lg font-medium">傾向を分析中...</p>
            <p className="text-sm text-muted-foreground">
              AIが履歴データのパターンを分析しています
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
                    <Activity className="h-5 w-5" />
                    分析結果
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={trendColors[result.overallTrend]} variant="secondary">
                      {trendIcons[result.overallTrend]}
                      <span className="ml-1">
                        {TREND_DIRECTION_INFO[result.overallTrend].label}
                      </span>
                    </Badge>
                    <Badge variant="outline">健全性スコア: {result.healthScore}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{result.summary}</p>
              </CardContent>
            </Card>

            <Tabs defaultValue="metrics" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="metrics">指標トレンド</TabsTrigger>
                <TabsTrigger value="patterns">パターン</TabsTrigger>
                <TabsTrigger value="anomalies">異常検知</TabsTrigger>
                <TabsTrigger value="predictions">予測</TabsTrigger>
                <TabsTrigger value="actions">推奨アクション</TabsTrigger>
              </TabsList>

              <TabsContent value="metrics" className="space-y-4 mt-4">
                {result.trendMetrics.length > 0 ? (
                  result.trendMetrics.map((metric, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{metric.metricName}</span>
                          <div className="flex items-center gap-2">
                            {trendIcons[metric.direction]}
                            <Badge className={trendColors[metric.direction]} variant="secondary">
                              {TREND_DIRECTION_INFO[metric.direction].label}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                          <div>
                            <span className="text-muted-foreground">現在値: </span>
                            <strong>{metric.currentValue}</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">前回値: </span>
                            {metric.previousValue}
                          </div>
                          <div>
                            <span
                              className={
                                metric.changePercent > 0
                                  ? 'text-green-600'
                                  : metric.changePercent < 0
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                              }
                            >
                              {metric.changePercent > 0 ? '+' : ''}
                              {metric.changePercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{metric.observation}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    トレンド指標データがありません
                  </p>
                )}

                {/* Cyclical Analysis */}
                {result.cyclicalAnalysis.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <BarChart className="h-4 w-4" />
                      サイクル分析
                    </h4>
                    {result.cyclicalAnalysis.map((cycle, index) => (
                      <Card key={index} className="mb-3">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{cycle.cycleName}</span>
                            <Badge className={trendColors[cycle.trend]} variant="secondary">
                              {TREND_DIRECTION_INFO[cycle.trend].label}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">平均合格率: </span>
                              {cycle.averagePassRate.toFixed(1)}%
                            </div>
                            <div>
                              <span className="text-muted-foreground">平均欠陥数: </span>
                              {cycle.averageDefects}件
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{cycle.observation}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="patterns" className="space-y-4 mt-4">
                {result.patterns.length > 0 ? (
                  result.patterns.map((pattern, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            {pattern.pattern}
                          </CardTitle>
                          <Badge
                            className={riskLevelColors[pattern.significance]}
                            variant="secondary"
                          >
                            {riskLevelLabels[pattern.significance]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">{pattern.description}</p>
                        <div className="text-sm">
                          <span className="text-muted-foreground">頻度: </span>
                          {pattern.frequency}
                        </div>
                        <div className="text-sm text-primary">
                          <span className="text-muted-foreground">推奨: </span>
                          {pattern.recommendation}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    パターンは検出されませんでした
                  </p>
                )}

                {/* Seasonal Patterns */}
                {result.seasonalPatterns.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      季節性パターン
                    </h4>
                    {result.seasonalPatterns.map((seasonal, index) => (
                      <Card key={index} className="mb-3">
                        <CardContent className="pt-4">
                          <div className="font-medium mb-2">{seasonal.period}</div>
                          <p className="text-sm">{seasonal.description}</p>
                          <div className="text-sm mt-2">
                            <span className="text-muted-foreground">影響: </span>
                            {seasonal.impact}
                          </div>
                          <div className="text-sm text-primary">
                            <span className="text-muted-foreground">推奨: </span>
                            {seasonal.recommendation}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="anomalies" className="space-y-4 mt-4">
                {result.anomalies.length > 0 ? (
                  result.anomalies.map((anomaly, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            {anomaly.metric}
                          </CardTitle>
                          <Badge variant="outline">{anomaly.date}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">期待値: </span>
                            {anomaly.expectedValue}
                          </div>
                          <div>
                            <span className="text-muted-foreground">実際値: </span>
                            <strong className="text-orange-600">{anomaly.actualValue}</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">偏差: </span>
                            {anomaly.deviation.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">原因推測: </span>
                          {anomaly.possibleCause}
                        </div>
                        <div className="text-sm text-primary">
                          <span className="text-muted-foreground">推奨対応: </span>
                          {anomaly.recommendation}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    異常は検出されませんでした
                  </p>
                )}
              </TabsContent>

              <TabsContent value="predictions" className="space-y-4 mt-4">
                {result.predictions.length > 0 ? (
                  result.predictions.map((prediction, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{prediction.metric}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">予測値: {prediction.predictedValue}</Badge>
                            <Badge
                              className={confidenceColors[prediction.confidence]}
                              variant="secondary"
                            >
                              信頼度: {confidenceLabels[prediction.confidence]}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">
                          <span className="text-muted-foreground">期間: </span>
                          {prediction.timeframe}
                        </div>
                        {prediction.assumptions.length > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">前提条件:</span>
                            <ul className="list-disc list-inside mt-1">
                              {prediction.assumptions.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {prediction.risks.length > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">リスク:</span>
                            <ul className="list-disc list-inside mt-1 text-orange-600">
                              {prediction.risks.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    予測データがありません
                  </p>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4 mt-4">
                {result.recommendations.length > 0 ? (
                  result.recommendations.map((rec, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{rec.recommendation}</CardTitle>
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
