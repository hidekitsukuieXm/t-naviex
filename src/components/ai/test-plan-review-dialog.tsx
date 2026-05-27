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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Target,
  Shield,
  TrendingUp,
  Lightbulb,
  Users,
  Calendar,
  FileSearch,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TestPlanReviewResult,
  ReviewCategory,
  ReviewStatus,
  ReviewItem,
  RiskAssessment,
  REVIEW_CATEGORY_INFO,
} from '@/services/ai/test-plan-reviewer';

interface TestPlanReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  initialTestPlan?: {
    title: string;
    description: string;
    scope: string;
  };
}

type ReviewStep = 'input' | 'reviewing' | 'result';

const categoryIcons: Record<ReviewCategory, React.ReactNode> = {
  SCOPE: <Target className="h-4 w-4" />,
  RESOURCES: <Users className="h-4 w-4" />,
  SCHEDULE: <Calendar className="h-4 w-4" />,
  RISKS: <Shield className="h-4 w-4" />,
  COVERAGE: <FileSearch className="h-4 w-4" />,
  STRATEGY: <TrendingUp className="h-4 w-4" />,
};

const statusColors: Record<ReviewStatus, string> = {
  PASS: 'bg-green-100 text-green-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  FAIL: 'bg-red-100 text-red-800',
};

const statusIcons: Record<ReviewStatus, React.ReactNode> = {
  PASS: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  FAIL: <AlertCircle className="h-4 w-4 text-red-600" />,
};

export function TestPlanReviewDialog({
  open,
  onOpenChange,
  projectId,
  initialTestPlan,
}: TestPlanReviewDialogProps) {
  const [step, setStep] = useState<ReviewStep>('input');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestPlanReviewResult | null>(null);

  // Form state
  const [title, setTitle] = useState(initialTestPlan?.title || '');
  const [description, setDescription] = useState(initialTestPlan?.description || '');
  const [scope, setScope] = useState(initialTestPlan?.scope || '');
  const [objectives, setObjectives] = useState('');
  const [testTypes, setTestTypes] = useState('');
  const [team, setTeam] = useState('');
  const [tools, setTools] = useState('');
  const [environment, setEnvironment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [risks, setRisks] = useState('');
  const [exitCriteria, setExitCriteria] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [focusAreas, setFocusAreas] = useState<ReviewCategory[]>([]);

  const handleReview = async () => {
    setStep('reviewing');
    setError(null);

    try {
      const testPlan: Record<string, unknown> = {
        title,
        description,
        scope,
      };

      if (objectives.trim()) {
        testPlan.objectives = objectives
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean);
      }

      if (testTypes.trim()) {
        testPlan.testTypes = testTypes
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean);
      }

      if (team || tools.trim() || environment) {
        testPlan.resources = {
          team: team || undefined,
          tools: tools.trim()
            ? tools
                .split('\n')
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
          environment: environment || undefined,
        };
      }

      if (startDate || endDate) {
        testPlan.schedule = {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
      }

      if (risks.trim()) {
        testPlan.risks = risks
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean)
          .map((r) => ({ description: r }));
      }

      if (exitCriteria.trim()) {
        testPlan.exitCriteria = exitCriteria
          .split('\n')
          .map((c) => c.trim())
          .filter(Boolean);
      }

      const url = new URL('/api/ai/review-test-plan', window.location.origin);
      if (projectId) {
        url.searchParams.set('projectId', projectId);
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPlan,
          projectContext: projectContext.trim() || undefined,
          focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'レビューに失敗しました');
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
    // Reset state after close animation
    setTimeout(() => {
      handleReset();
      if (!initialTestPlan) {
        setTitle('');
        setDescription('');
        setScope('');
        setObjectives('');
        setTestTypes('');
        setTeam('');
        setTools('');
        setEnvironment('');
        setStartDate('');
        setEndDate('');
        setRisks('');
        setExitCriteria('');
        setProjectContext('');
        setFocusAreas([]);
      }
    }, 200);
  };

  const toggleFocusArea = (category: ReviewCategory) => {
    setFocusAreas((prev) =>
      prev.includes(category) ? prev.filter((a) => a !== category) : [...prev, category]
    );
  };

  const getOverallStatusColor = (status: ReviewStatus) => {
    switch (status) {
      case 'PASS':
        return 'text-green-600';
      case 'WARNING':
        return 'text-yellow-600';
      case 'FAIL':
        return 'text-red-600';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AIテスト計画レビュー</DialogTitle>
          <DialogDescription>テスト計画をAIがレビューし、改善提案を提供します</DialogDescription>
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="resources">リソース</TabsTrigger>
                <TabsTrigger value="schedule">スケジュール</TabsTrigger>
                <TabsTrigger value="options">オプション</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">テスト計画名 *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例: ユーザー管理機能テスト計画"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">説明 *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="テスト計画の概要を記述してください"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scope">テスト範囲 *</Label>
                  <Textarea
                    id="scope"
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    placeholder="テスト対象の機能や範囲を記述してください"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives">目的（1行1項目）</Label>
                  <Textarea
                    id="objectives"
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    placeholder="機能の正常動作を確認する&#10;性能要件を満たすことを検証する"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testTypes">テスト種別（1行1項目）</Label>
                  <Textarea
                    id="testTypes"
                    value={testTypes}
                    onChange={(e) => setTestTypes(e.target.value)}
                    placeholder="機能テスト&#10;結合テスト&#10;性能テスト"
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="resources" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="team">チーム構成</Label>
                  <Textarea
                    id="team"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    placeholder="テストリード1名、テスター3名、自動化エンジニア1名"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tools">使用ツール（1行1項目）</Label>
                  <Textarea
                    id="tools"
                    value={tools}
                    onChange={(e) => setTools(e.target.value)}
                    placeholder="Playwright&#10;Jest&#10;T-NaviEx"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment">テスト環境</Label>
                  <Textarea
                    id="environment"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    placeholder="ステージング環境（AWS EC2）&#10;テストデータ: 本番相当のサンプルデータ"
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">開始日</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">終了日</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="risks">リスク（1行1項目）</Label>
                  <Textarea
                    id="risks"
                    value={risks}
                    onChange={(e) => setRisks(e.target.value)}
                    placeholder="テスト環境の不安定性&#10;要件変更による手戻り&#10;リソース不足"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exitCriteria">終了基準（1行1項目）</Label>
                  <Textarea
                    id="exitCriteria"
                    value={exitCriteria}
                    onChange={(e) => setExitCriteria(e.target.value)}
                    placeholder="全テストケース消化率100%&#10;重大バグ残存0件&#10;バグ修正率95%以上"
                    rows={3}
                  />
                </div>
              </TabsContent>

              <TabsContent value="options" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="projectContext">プロジェクトコンテキスト</Label>
                  <Textarea
                    id="projectContext"
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    placeholder="プロジェクトの背景や特別な考慮事項"
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>重点レビュー領域（任意）</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(REVIEW_CATEGORY_INFO) as ReviewCategory[]).map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`focus-${category}`}
                          checked={focusAreas.includes(category)}
                          onCheckedChange={() => toggleFocusArea(category)}
                        />
                        <Label
                          htmlFor={`focus-${category}`}
                          className="flex items-center gap-2 text-sm font-normal cursor-pointer"
                        >
                          {categoryIcons[category]}
                          {REVIEW_CATEGORY_INFO[category].label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    選択しない場合は全領域をレビューします
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button
                onClick={handleReview}
                disabled={!title.trim() || !description.trim() || !scope.trim()}
              >
                レビュー開始
              </Button>
            </div>
          </div>
        )}

        {step === 'reviewing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">テスト計画をレビュー中...</p>
            <p className="text-sm text-muted-foreground">AIが計画の各観点を分析しています</p>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-6">
            {/* Overall Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">総合評価</CardTitle>
                  <Badge className={statusColors[result.overallStatus]} variant="secondary">
                    {statusIcons[result.overallStatus]}
                    <span className="ml-1">
                      {result.overallStatus === 'PASS'
                        ? '合格'
                        : result.overallStatus === 'WARNING'
                          ? '要注意'
                          : '要改善'}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">スコア</span>
                    <Progress value={result.overallScore} className="flex-1" />
                    <span
                      className={`text-2xl font-bold ${getOverallStatusColor(result.overallStatus)}`}
                    >
                      {result.overallScore}
                    </span>
                  </div>
                  <p className="text-sm">{result.summary}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="items" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="items">レビュー項目</TabsTrigger>
                <TabsTrigger value="risks">リスク評価</TabsTrigger>
                <TabsTrigger value="strengths">強み・改善点</TabsTrigger>
                <TabsTrigger value="insights">分析結果</TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="space-y-4 mt-4">
                {result.reviewItems.map((item, index) => (
                  <ReviewItemCard key={index} item={item} />
                ))}
              </TabsContent>

              <TabsContent value="risks" className="space-y-4 mt-4">
                {result.riskAssessments.length > 0 ? (
                  result.riskAssessments.map((risk, index) => (
                    <RiskAssessmentCard key={index} risk={risk} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    リスク評価項目はありません
                  </p>
                )}
              </TabsContent>

              <TabsContent value="strengths" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      強み
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.strengths.length > 0 ? (
                      <ul className="space-y-2">
                        {result.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-green-600 mt-1">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">特筆すべき強みはありません</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      改善点
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.improvements.length > 0 ? (
                      <ul className="space-y-2">
                        {result.improvements.map((improvement, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-yellow-600 mt-1">•</span>
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">改善点はありません</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="space-y-4 mt-4">
                {result.comparisonInsights.length > 0 ? (
                  result.comparisonInsights.map((insight, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{insight.aspect}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <span className="text-xs text-muted-foreground">観察</span>
                          <p className="text-sm">{insight.observation}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">推奨</span>
                          <p className="text-sm text-primary">{insight.recommendation}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    分析結果はありません
                  </p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                再レビュー
              </Button>
              <Button onClick={handleClose}>閉じる</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReviewItemCard({ item }: { item: ReviewItem }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {categoryIcons[item.category]}
            {item.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {REVIEW_CATEGORY_INFO[item.category].label}
            </Badge>
            <Badge className={statusColors[item.status]} variant="secondary">
              {statusIcons[item.status]}
              <span className="ml-1">{item.score}</span>
            </Badge>
          </div>
        </div>
        <CardDescription>{REVIEW_CATEGORY_INFO[item.category].description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.findings.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">発見事項</span>
            <ul className="mt-1 space-y-1">
              {item.findings.map((finding, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  {finding}
                </li>
              ))}
            </ul>
          </div>
        )}
        {item.suggestions.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">改善提案</span>
            <ul className="mt-1 space-y-1">
              {item.suggestions.map((suggestion, index) => (
                <li key={index} className="text-sm flex items-start gap-2 text-primary">
                  <Lightbulb className="h-3 w-3 mt-1 flex-shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskAssessmentCard({ risk }: { risk: RiskAssessment }) {
  const severityColors = {
    HIGH: 'bg-red-100 text-red-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {risk.riskId}: {risk.description}
          </CardTitle>
          <Badge
            className={risk.isAdequate ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
            variant="secondary"
          >
            {risk.isAdequate ? '対策十分' : '対策不十分'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-4">
          <div>
            <span className="text-xs text-muted-foreground">深刻度</span>
            <Badge className={severityColors[risk.severity]} variant="secondary">
              {risk.severity === 'HIGH' ? '高' : risk.severity === 'MEDIUM' ? '中' : '低'}
            </Badge>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">発生可能性</span>
            <Badge className={severityColors[risk.likelihood]} variant="secondary">
              {risk.likelihood === 'HIGH' ? '高' : risk.likelihood === 'MEDIUM' ? '中' : '低'}
            </Badge>
          </div>
        </div>
        {risk.currentMitigation && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">現在の対策</span>
            <p className="text-sm mt-1">{risk.currentMitigation}</p>
          </div>
        )}
        {risk.suggestedMitigation && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">推奨対策</span>
            <p className="text-sm mt-1 text-primary">{risk.suggestedMitigation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
