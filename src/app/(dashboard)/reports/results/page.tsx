'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResultData {
  caseId: string;
  caseTitle: string;
  status: string;
  executedAt: string | null;
  executedByName: string | null;
  executionTime: number | null;
  environment: string | null;
  bugCount: number;
}

interface ResultReportData {
  testRunId: string;
  testRunName: string;
  summary: {
    totalCases: number;
    executed: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    executionRate: number;
    passRate: number;
  };
  results: ResultData[];
}

interface TestRunOption {
  id: string;
  name: string;
  status: string;
  caseCount: number;
}

interface ProjectOption {
  id: string;
  name: string;
}

const statusLabels: Record<string, string> = {
  NOT_RUN: '未実行',
  PASSED: '合格',
  FAILED: '不合格',
  BLOCKED: 'ブロック',
  SKIPPED: 'スキップ',
  RETEST: '再テスト',
};

const statusColors: Record<string, string> = {
  NOT_RUN: '#6b7280',
  PASSED: '#10b981',
  FAILED: '#ef4444',
  BLOCKED: '#f59e0b',
  SKIPPED: '#8b5cf6',
  RETEST: '#3b82f6',
};

export default function ResultReportPage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const testRunIdParam = searchParams.get('testRunId');

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [testRuns, setTestRuns] = useState<TestRunOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectIdParam);
  const [selectedTestRunId, setSelectedTestRunId] = useState<string | null>(testRunIdParam);
  const [resultReport, setResultReport] = useState<ResultReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // プロジェクト一覧取得
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
          if (!selectedProjectId && data.projects.length > 0) {
            setSelectedProjectId(data.projects[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, [selectedProjectId]);

  // テストラン一覧取得
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchTestRuns = async () => {
      try {
        const response = await fetch(`/api/projects/${selectedProjectId}/reports?type=results`);
        if (response.ok) {
          const data = await response.json();
          setTestRuns(data.testRuns || []);
          if (!selectedTestRunId && data.testRuns.length > 0) {
            setSelectedTestRunId(data.testRuns[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching test runs:', error);
      }
    };
    fetchTestRuns();
  }, [selectedProjectId, selectedTestRunId]);

  // レポートデータ取得
  useEffect(() => {
    if (!selectedProjectId || !selectedTestRunId) return;

    let isMounted = true;
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/projects/${selectedProjectId}/reports?type=results&testRunId=${selectedTestRunId}`
        );
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setResultReport(data.resultReport);
          }
        }
      } catch (error) {
        console.error('Error fetching result report:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchReport();

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId, selectedTestRunId]);

  const pieData = resultReport
    ? [
        { name: '合格', value: resultReport.summary.passed, color: statusColors.PASSED },
        { name: '不合格', value: resultReport.summary.failed, color: statusColors.FAILED },
        { name: 'ブロック', value: resultReport.summary.blocked, color: statusColors.BLOCKED },
        { name: 'スキップ', value: resultReport.summary.skipped, color: statusColors.SKIPPED },
        {
          name: '未実行',
          value: resultReport.summary.totalCases - resultReport.summary.executed,
          color: statusColors.NOT_RUN,
        },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">結果レポート</h1>
          <p className="text-muted-foreground">テスト結果の詳細レポート</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedProjectId || ''}
            onValueChange={(v) => {
              setSelectedProjectId(v);
              setSelectedTestRunId(null);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="プロジェクト" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedTestRunId || ''}
            onValueChange={(v) => setSelectedTestRunId(v)}
            disabled={!selectedProjectId}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="テストラン" />
            </SelectTrigger>
            <SelectContent>
              {testRuns.map((tr) => (
                <SelectItem key={tr.id} value={tr.id}>
                  {tr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.location.reload()} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !selectedTestRunId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">テストランを選択してください</p>
          </CardContent>
        </Card>
      ) : resultReport ? (
        <>
          {/* サマリー */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{resultReport.testRunName}</CardTitle>
                <CardDescription>テスト進捗</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>実行率</span>
                      <span>{resultReport.summary.executionRate}%</span>
                    </div>
                    <Progress value={resultReport.summary.executionRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span>合格率</span>
                      <span>{resultReport.summary.passRate}%</span>
                    </div>
                    <Progress value={resultReport.summary.passRate} className="h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center pt-4">
                    <div>
                      <div className="text-2xl font-bold">{resultReport.summary.totalCases}</div>
                      <div className="text-xs text-muted-foreground">総ケース</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {resultReport.summary.passed}
                      </div>
                      <div className="text-xs text-muted-foreground">合格</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {resultReport.summary.failed}
                      </div>
                      <div className="text-xs text-muted-foreground">不合格</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>ステータス分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 結果一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>テスト結果一覧</CardTitle>
              <CardDescription>全{resultReport.results.length}件</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>テストケース</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>実行者</TableHead>
                    <TableHead>実行日時</TableHead>
                    <TableHead>環境</TableHead>
                    <TableHead className="text-right">実行時間</TableHead>
                    <TableHead className="text-right">バグ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultReport.results.map((result) => (
                    <TableRow key={result.caseId}>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {result.caseTitle}
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: statusColors[result.status] }}
                          className="text-white"
                        >
                          {statusLabels[result.status] || result.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{result.executedByName || '-'}</TableCell>
                      <TableCell>
                        {result.executedAt
                          ? new Date(result.executedAt).toLocaleString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell>{result.environment || '-'}</TableCell>
                      <TableCell className="text-right">
                        {result.executionTime !== null ? formatDuration(result.executionTime) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {result.bugCount > 0 ? (
                          <Badge variant="destructive">{result.bugCount}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}分${remainingSeconds > 0 ? ` ${remainingSeconds}秒` : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}時間${remainingMinutes > 0 ? ` ${remainingMinutes}分` : ''}`;
}
