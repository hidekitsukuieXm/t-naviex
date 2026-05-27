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
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  Target,
  Bell,
  Activity,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TestProgressAnalysisResult,
  RiskLevel,
  TrendDirection,
  RISK_LEVEL_INFO,
} from '@/services/ai/test-progress-analyzer';

interface ProgressAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  initialProgressData?: {
    totalTestCases: number;
    executedTestCases: number;
    passedTestCases: number;
    failedTestCases: number;
  };
}

type AnalysisStep = 'input' | 'analyzing' | 'result';

const statusColors = {
  ON_TRACK: 'bg-green-100 text-green-800',
  AT_RISK: 'bg-yellow-100 text-yellow-800',
  DELAYED: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const statusLabels = {
  ON_TRACK: '順調',
  AT_RISK: '要注意',
  DELAYED: '遅延',
  CRITICAL: '危険',
};

const riskLevelColors: Record<RiskLevel, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const trendIcons: Record<TrendDirection, React.ReactNode> = {
  IMPROVING: <TrendingUp className="h-4 w-4 text-green-600" />,
  STABLE: <Minus className="h-4 w-4 text-gray-600" />,
  DECLINING: <TrendingDown className="h-4 w-4 text-red-600" />,
};

const alertTypeColors = {
  INFO: 'bg-blue-50 border-blue-200',
  WARNING: 'bg-yellow-50 border-yellow-200',
  CRITICAL: 'bg-red-50 border-red-200',
};

const alertTypeIcons = {
  INFO: <Bell className="h-4 w-4 text-blue-600" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  CRITICAL: <AlertCircle className="h-4 w-4 text-red-600" />,
};

export function ProgressAnalysisDialog({
  open,
  onOpenChange,
  projectId,
  initialProgressData,
}: ProgressAnalysisDialogProps) {
  const [step, setStep] = useState<AnalysisStep>('input');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestProgressAnalysisResult | null>(null);

  // Form state
  const [totalTestCases, setTotalTestCases] = useState(
    initialProgressData?.totalTestCases?.toString() || ''
  );
  const [executedTestCases, setExecutedTestCases] = useState(
    initialProgressData?.executedTestCases?.toString() || ''
  );
  const [passedTestCases, setPassedTestCases] = useState(
    initialProgressData?.passedTestCases?.toString() || ''
  );
  const [failedTestCases, setFailedTestCases] = useState(
    initialProgressData?.failedTestCases?.toString() || ''
  );
  const [blockedTestCases, setBlockedTestCases] = useState('0');
  const [skippedTestCases, setSkippedTestCases] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [projectContext, setProjectContext] = useState('');

  const handleAnalyze = async () => {
    setStep('analyzing');
    setError(null);

    try {
      const url = new URL('/api/ai/analyze-progress', window.location.origin);
      if (projectId) {
        url.searchParams.set('projectId', projectId);
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progressData: {
            totalTestCases: parseInt(totalTestCases) || 0,
            executedTestCases: parseInt(executedTestCases) || 0,
            passedTestCases: parseInt(passedTestCases) || 0,
            failedTestCases: parseInt(failedTestCases) || 0,
            blockedTestCases: parseInt(blockedTestCases) || 0,
            skippedTestCases: parseInt(skippedTestCases) || 0,
            startDate,
            plannedEndDate,
            currentDate: new Date().toISOString().split('T')[0],
          },
          projectContext: projectContext.trim() || undefined,
          teamSize: teamSize ? parseInt(teamSize) : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '進捗分析に失敗しました');
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
      if (!initialProgressData) {
        setTotalTestCases('');
        setExecutedTestCases('');
        setPassedTestCases('');
        setFailedTestCases('');
        setBlockedTestCases('0');
        setSkippedTestCases('0');
        setStartDate('');
        setPlannedEndDate('');
        setTeamSize('');
        setProjectContext('');
      }
    }, 200);
  };

  const isFormValid = totalTestCases && executedTestCases && startDate && plannedEndDate;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AIテスト進捗分析</DialogTitle>
          <DialogDescription>
            テスト進捗状況をAIが分析し、リスクと改善点を提示します
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
            <Tabs defaultValue="progress" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="progress">進捗データ</TabsTrigger>
                <TabsTrigger value="context">コンテキスト</TabsTrigger>
              </TabsList>

              <TabsContent value="progress" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalTestCases">総テストケース数 *</Label>
                    <Input
                      id="totalTestCases"
                      type="number"
                      min="1"
                      value={totalTestCases}
                      onChange={(e) => setTotalTestCases(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="executedTestCases">実行済み *</Label>
                    <Input
                      id="executedTestCases"
                      type="number"
                      min="0"
                      value={executedTestCases}
                      onChange={(e) => setExecutedTestCases(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passedTestCases">合格</Label>
                    <Input
                      id="passedTestCases"
                      type="number"
                      min="0"
                      value={passedTestCases}
                      onChange={(e) => setPassedTestCases(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="failedTestCases">失敗</Label>
                    <Input
                      id="failedTestCases"
                      type="number"
                      min="0"
                      value={failedTestCases}
                      onChange={(e) => setFailedTestCases(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="blockedTestCases">ブロック</Label>
                    <Input
                      id="blockedTestCases"
                      type="number"
                      min="0"
                      value={blockedTestCases}
                      onChange={(e) => setBlockedTestCases(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skippedTestCases">スキップ</Label>
                    <Input
                      id="skippedTestCases"
                      type="number"
                      min="0"
                      value={skippedTestCases}
                      onChange={(e) => setSkippedTestCases(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">開始日 *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plannedEndDate">計画終了日 *</Label>
                    <Input
                      id="plannedEndDate"
                      type="date"
                      value={plannedEndDate}
                      onChange={(e) => setPlannedEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="context" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="teamSize">チーム人数</Label>
                  <Input
                    id="teamSize"
                    type="number"
                    min="1"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    placeholder="例: 5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectContext">プロジェクトコンテキスト</Label>
                  <Textarea
                    id="projectContext"
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    placeholder="プロジェクトの背景、特別な状況、考慮事項など"
                    rows={4}
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
            <p className="text-lg font-medium">進捗を分析中...</p>
            <p className="text-sm text-muted-foreground">AIがテスト進捗データを分析しています</p>
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
                  <Badge className={statusColors[result.overallStatus]} variant="secondary">
                    {statusLabels[result.overallStatus]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{result.progressPercentage.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">進捗率</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{result.passRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">合格率</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{result.executionRate.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">件/日</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <p className="text-sm font-medium">{result.estimatedCompletionDate}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">完了予測</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>進捗</span>
                    <span>{result.progressPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={result.progressPercentage} />
                </div>
                {result.daysOverdue > 0 && (
                  <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {result.daysOverdue}日の遅延
                  </div>
                )}
                <p className="text-sm mt-4">{result.summary}</p>
              </CardContent>
            </Card>

            {/* Alerts */}
            {result.alerts.length > 0 && (
              <div className="space-y-2">
                {result.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${alertTypeColors[alert.type]}`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {alertTypeIcons[alert.type]}
                      {alert.title}
                    </div>
                    <p className="text-sm mt-1">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      推奨: {alert.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Tabs defaultValue="risks" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="risks">リスク</TabsTrigger>
                <TabsTrigger value="bottlenecks">ボトルネック</TabsTrigger>
                <TabsTrigger value="trends">トレンド</TabsTrigger>
                <TabsTrigger value="actions">推奨アクション</TabsTrigger>
              </TabsList>

              <TabsContent value="risks" className="space-y-4 mt-4">
                {result.delayRisks.length > 0 ? (
                  result.delayRisks.map((risk, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{risk.description}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={riskLevelColors[risk.riskLevel]} variant="secondary">
                              {RISK_LEVEL_INFO[risk.riskLevel].label}
                            </Badge>
                            <Badge variant="outline">{risk.probability}%</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <span className="text-muted-foreground">影響日数: </span>
                          {risk.daysAtRisk}日
                        </div>
                        <div className="text-sm mt-2 text-primary">
                          <span className="text-muted-foreground">緩和策: </span>
                          {risk.mitigation}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    検出されたリスクはありません
                  </p>
                )}
              </TabsContent>

              <TabsContent value="bottlenecks" className="space-y-4 mt-4">
                {result.bottlenecks.length > 0 ? (
                  result.bottlenecks.map((bottleneck, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            {bottleneck.area}
                          </CardTitle>
                          <Badge
                            className={riskLevelColors[bottleneck.severity]}
                            variant="secondary"
                          >
                            {RISK_LEVEL_INFO[bottleneck.severity].label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm">{bottleneck.description}</p>
                        <div className="text-sm">
                          <span className="text-muted-foreground">影響: </span>
                          {bottleneck.impact}
                        </div>
                        <div className="text-sm text-primary">
                          <span className="text-muted-foreground">推奨: </span>
                          {bottleneck.recommendation}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    ボトルネックは検出されませんでした
                  </p>
                )}
              </TabsContent>

              <TabsContent value="trends" className="space-y-4 mt-4">
                {result.trends.length > 0 ? (
                  result.trends.map((trend, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{trend.metric}</span>
                          <div className="flex items-center gap-2">
                            {trendIcons[trend.direction]}
                            <span
                              className={
                                trend.direction === 'IMPROVING'
                                  ? 'text-green-600'
                                  : trend.direction === 'DECLINING'
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                              }
                            >
                              {trend.change > 0 ? '+' : ''}
                              {trend.change.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{trend.observation}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    トレンドデータがありません
                  </p>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-4 mt-4">
                {result.recommendedActions.length > 0 ? (
                  result.recommendedActions.map((action, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            {action.action}
                          </CardTitle>
                          <Badge
                            className={
                              action.priority === 'HIGH'
                                ? 'bg-red-100 text-red-800'
                                : action.priority === 'MEDIUM'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                            }
                            variant="secondary"
                          >
                            {action.priority === 'HIGH'
                              ? '高'
                              : action.priority === 'MEDIUM'
                                ? '中'
                                : '低'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">根拠: </span>
                          {action.rationale}
                        </div>
                        <div className="text-sm text-primary">
                          <span className="text-muted-foreground">期待効果: </span>
                          {action.expectedImpact}
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
