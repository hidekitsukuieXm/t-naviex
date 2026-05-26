'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, BarChart3, Users, TrendingUp, RefreshCw, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProjectSummaryStats {
  projectId: string;
  projectName: string;
  testProgress: {
    totalCases: number;
    executedCases: number;
    passedCases: number;
    failedCases: number;
    executionRate: number;
    passRate: number;
  };
  bugStats: {
    total: number;
    openCount: number;
    resolvedCount: number;
    closedCount: number;
  };
  testRunCount: number;
  activeTestRuns: number;
}

interface CrossProjectSummary {
  projects: ProjectSummaryStats[];
  totals: {
    totalProjects: number;
    totalTestCases: number;
    totalExecutedCases: number;
    totalPassedCases: number;
    totalFailedCases: number;
    totalBugs: number;
    openBugs: number;
    resolvedBugs: number;
    avgExecutionRate: number;
    avgPassRate: number;
  };
}

interface UserWorkloadStats {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  projectWorkloads: Array<{
    projectId: string;
    projectName: string;
    executedTests: number;
    executionTime: number;
    bugsReported: number;
    bugsAssigned: number;
    bugsResolved: number;
  }>;
  totals: {
    totalExecutedTests: number;
    totalExecutionTime: number;
    totalBugsReported: number;
    totalBugsAssigned: number;
    totalBugsResolved: number;
    projectCount: number;
  };
}

interface CrossProjectUserWorkload {
  users: UserWorkloadStats[];
  startDate: string;
  endDate: string;
}

interface ProjectComparisonData {
  projectId: string;
  projectName: string;
  metrics: {
    testCaseCount: number;
    executionRate: number;
    passRate: number;
    bugCount: number;
    openBugRate: number;
    avgBugResolutionDays: number | null;
  };
}

interface CrossProjectComparison {
  projects: ProjectComparisonData[];
  bestExecutionRate: { projectId: string; projectName: string; value: number } | null;
  bestPassRate: { projectId: string; projectName: string; value: number } | null;
  lowestOpenBugRate: { projectId: string; projectName: string; value: number } | null;
}

const DAYS_OPTIONS = [7, 14, 30, 60, 90];

export default function CrossProjectReportPage() {
  const [summary, setSummary] = useState<CrossProjectSummary | null>(null);
  const [userWorkload, setUserWorkload] = useState<CrossProjectUserWorkload | null>(null);
  const [comparison, setComparison] = useState<CrossProjectComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'workload' | 'comparison'>('summary');
  const [days, setDays] = useState(30);

  // データ取得
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, workloadRes, comparisonRes] = await Promise.all([
          fetch('/api/reports/cross-project?type=summary'),
          fetch(`/api/reports/cross-project?type=user-workload&days=${days}`),
          fetch('/api/reports/cross-project?type=comparison'),
        ]);

        if (!summaryRes.ok || !workloadRes.ok || !comparisonRes.ok) {
          throw new Error('データの取得に失敗しました');
        }

        const summaryData = await summaryRes.json();
        const workloadData = await workloadRes.json();
        const comparisonData = await comparisonRes.json();

        if (isMounted) {
          setSummary(summaryData.summary);
          setUserWorkload(workloadData.userWorkload);
          setComparison(comparisonData.comparison);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [days]);

  // チャートデータを整形
  const chartData = useMemo(() => {
    if (!summary) return [];
    return summary.projects.map((p) => ({
      name: p.projectName.length > 10 ? `${p.projectName.slice(0, 10)}...` : p.projectName,
      fullName: p.projectName,
      executionRate: p.testProgress.executionRate,
      passRate: p.testProgress.passRate,
      totalCases: p.testProgress.totalCases,
      bugs: p.bugStats.total,
      openBugs: p.bugStats.openCount,
    }));
  }, [summary]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">クロスプロジェクトレポート</h1>
          <p className="text-muted-foreground">複数プロジェクトの横断集計・分析</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
      </div>

      {/* サマリーカード */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">プロジェクト数</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totals.totalProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総テストケース</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totals.totalTestCases.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                実行率: {summary.totals.avgExecutionRate}% | 合格率: {summary.totals.avgPassRate}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総バグ数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totals.totalBugs}</div>
              <p className="text-xs text-muted-foreground">
                オープン: {summary.totals.openBugs} | 解決済み: {summary.totals.resolvedBugs}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">実行済みテスト</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totals.totalExecutedCases.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                合格: {summary.totals.totalPassedCases.toLocaleString()} | 不合格:{' '}
                {summary.totals.totalFailedCases.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* タブコンテンツ */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="summary">プロジェクト別</TabsTrigger>
            <TabsTrigger value="workload">ユーザー工数</TabsTrigger>
            <TabsTrigger value="comparison">比較分析</TabsTrigger>
          </TabsList>
          {activeTab === 'workload' && (
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v, 10))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d.toString()}>
                    {d}日間
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <TabsContent value="summary" className="space-y-4">
          {/* プロジェクト別グラフ */}
          <Card>
            <CardHeader>
              <CardTitle>プロジェクト別進捗率</CardTitle>
              <CardDescription>各プロジェクトの実行率と合格率の比較</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          executionRate: '実行率',
                          passRate: '合格率',
                        };
                        return [`${value}%`, labels[name] || name];
                      }}
                    />
                    <Legend
                      formatter={(value) => {
                        const labels: Record<string, string> = {
                          executionRate: '実行率',
                          passRate: '合格率',
                        };
                        return labels[value] || value;
                      }}
                    />
                    <Bar dataKey="executionRate" fill="#3b82f6" name="executionRate" />
                    <Bar dataKey="passRate" fill="#10b981" name="passRate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* プロジェクト一覧テーブル */}
          <Card>
            <CardHeader>
              <CardTitle>プロジェクト一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>プロジェクト</TableHead>
                    <TableHead className="text-right">テストケース</TableHead>
                    <TableHead className="text-right">実行率</TableHead>
                    <TableHead className="text-right">合格率</TableHead>
                    <TableHead className="text-right">バグ</TableHead>
                    <TableHead className="text-right">オープン</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.projects.map((p) => (
                    <TableRow key={p.projectId}>
                      <TableCell className="font-medium">{p.projectName}</TableCell>
                      <TableCell className="text-right">
                        {p.testProgress.totalCases.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={p.testProgress.executionRate >= 80 ? 'default' : 'secondary'}
                        >
                          {p.testProgress.executionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.testProgress.passRate >= 90 ? 'default' : 'secondary'}>
                          {p.testProgress.passRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{p.bugStats.total}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.bugStats.openCount > 0 ? 'destructive' : 'outline'}>
                          {p.bugStats.openCount}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ユーザー工数分析</CardTitle>
              <CardDescription>
                {userWorkload?.startDate} ~ {userWorkload?.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー</TableHead>
                    <TableHead className="text-right">実行テスト</TableHead>
                    <TableHead className="text-right">実行時間</TableHead>
                    <TableHead className="text-right">報告バグ</TableHead>
                    <TableHead className="text-right">担当バグ</TableHead>
                    <TableHead className="text-right">解決バグ</TableHead>
                    <TableHead className="text-right">担当PJ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userWorkload?.users.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell className="font-medium">
                        {u.userName || u.userEmail || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.totals.totalExecutedTests.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatTime(u.totals.totalExecutionTime)}
                      </TableCell>
                      <TableCell className="text-right">{u.totals.totalBugsReported}</TableCell>
                      <TableCell className="text-right">{u.totals.totalBugsAssigned}</TableCell>
                      <TableCell className="text-right">{u.totals.totalBugsResolved}</TableCell>
                      <TableCell className="text-right">{u.totals.projectCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {/* ベストプロジェクト */}
          {comparison && (
            <div className="grid gap-4 md:grid-cols-3">
              {comparison.bestExecutionRate && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      最高実行率
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">
                      {comparison.bestExecutionRate.projectName}
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {comparison.bestExecutionRate.value}%
                    </div>
                  </CardContent>
                </Card>
              )}
              {comparison.bestPassRate && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      最高合格率
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{comparison.bestPassRate.projectName}</div>
                    <div className="text-2xl font-bold text-green-600">
                      {comparison.bestPassRate.value}%
                    </div>
                  </CardContent>
                </Card>
              )}
              {comparison.lowestOpenBugRate && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      最低オープンバグ率
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">
                      {comparison.lowestOpenBugRate.projectName}
                    </div>
                    <div className="text-2xl font-bold text-amber-600">
                      {comparison.lowestOpenBugRate.value}%
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 比較グラフ */}
          <Card>
            <CardHeader>
              <CardTitle>プロジェクト比較</CardTitle>
              <CardDescription>テストケース数とバグ数の比較</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparison?.projects.map((p) => ({
                      name:
                        p.projectName.length > 10
                          ? `${p.projectName.slice(0, 10)}...`
                          : p.projectName,
                      testCaseCount: p.metrics.testCaseCount,
                      bugCount: p.metrics.bugCount,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          testCaseCount: 'テストケース',
                          bugCount: 'バグ',
                        };
                        return [value.toLocaleString(), labels[name] || name];
                      }}
                    />
                    <Legend
                      formatter={(value) => {
                        const labels: Record<string, string> = {
                          testCaseCount: 'テストケース',
                          bugCount: 'バグ',
                        };
                        return labels[value] || value;
                      }}
                    />
                    <Bar dataKey="testCaseCount" fill="#3b82f6" name="testCaseCount" />
                    <Bar dataKey="bugCount" fill="#ef4444" name="bugCount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 比較テーブル */}
          <Card>
            <CardHeader>
              <CardTitle>詳細比較</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>プロジェクト</TableHead>
                    <TableHead className="text-right">ケース数</TableHead>
                    <TableHead className="text-right">実行率</TableHead>
                    <TableHead className="text-right">合格率</TableHead>
                    <TableHead className="text-right">バグ数</TableHead>
                    <TableHead className="text-right">オープン率</TableHead>
                    <TableHead className="text-right">平均解決日数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison?.projects.map((p) => (
                    <TableRow key={p.projectId}>
                      <TableCell className="font-medium">{p.projectName}</TableCell>
                      <TableCell className="text-right">
                        {p.metrics.testCaseCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">{p.metrics.executionRate}%</TableCell>
                      <TableCell className="text-right">{p.metrics.passRate}%</TableCell>
                      <TableCell className="text-right">{p.metrics.bugCount}</TableCell>
                      <TableCell className="text-right">{p.metrics.openBugRate}%</TableCell>
                      <TableCell className="text-right">
                        {p.metrics.avgBugResolutionDays !== null
                          ? `${p.metrics.avgBugResolutionDays}日`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 時間フォーマット（秒を時間:分に変換）
function formatTime(seconds: number): string {
  if (seconds === 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
