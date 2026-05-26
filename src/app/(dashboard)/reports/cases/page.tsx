'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Loader2, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CaseData {
  id: string;
  title: string;
  priority: string;
  status: string;
  executedCount: number;
  passedCount: number;
  failedCount: number;
  lastExecutedAt: string | null;
  tags: string[];
}

interface CaseReportData {
  testSpecId: string;
  testSpecName: string;
  phase: string;
  cases: CaseData[];
}

interface ProjectOption {
  id: string;
  name: string;
}

const priorityLabels: Record<string, string> = {
  CRITICAL: '緊急',
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

const statusLabels: Record<string, string> = {
  NOT_RUN: '未実行',
  PASSED: '合格',
  FAILED: '不合格',
  BLOCKED: 'ブロック',
  SKIPPED: 'スキップ',
  RETEST: '再テスト',
};

const phaseLabels: Record<string, string> = {
  UNIT: '単体テスト',
  INTEGRATION: '結合テスト',
  SYSTEM: 'システムテスト',
  ACCEPTANCE: '受入テスト',
  REGRESSION: '回帰テスト',
};

export default function CaseReportPage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectIdParam);
  const [caseReport, setCaseReport] = useState<CaseReportData[] | null>(null);
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

  // レポートデータ取得
  useEffect(() => {
    if (!selectedProjectId) return;

    let isMounted = true;
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/projects/${selectedProjectId}/reports?type=cases`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setCaseReport(data.caseReport);
          }
        }
      } catch (error) {
        console.error('Error fetching case report:', error);
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
  }, [selectedProjectId]);

  const totalCases = caseReport?.reduce((sum, spec) => sum + spec.cases.length, 0) || 0;
  const totalExecuted =
    caseReport?.reduce(
      (sum, spec) => sum + spec.cases.filter((c) => c.status !== 'NOT_RUN').length,
      0
    ) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ケースレポート</h1>
          <p className="text-muted-foreground">テストケースの詳細レポート</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProjectId || ''} onValueChange={(v) => setSelectedProjectId(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="プロジェクトを選択" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
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
      ) : !selectedProjectId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">プロジェクトを選択してください</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* サマリー */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">総テストケース</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCases.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">実行済み</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalExecuted.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">テスト仕様書数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{caseReport?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* テスト仕様書ごとのケース一覧 */}
          {caseReport?.map((spec) => (
            <Card key={spec.testSpecId}>
              <CardHeader>
                <CardTitle>{spec.testSpecName}</CardTitle>
                <CardDescription>
                  フェーズ: {phaseLabels[spec.phase] || spec.phase} | ケース数: {spec.cases.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイトル</TableHead>
                      <TableHead>優先度</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right">実行回数</TableHead>
                      <TableHead className="text-right">合格</TableHead>
                      <TableHead className="text-right">不合格</TableHead>
                      <TableHead>最終実行日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spec.cases.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.title}
                          {c.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {c.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {priorityLabels[c.priority] || c.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              c.status === 'PASSED'
                                ? 'default'
                                : c.status === 'FAILED'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {statusLabels[c.status] || c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{c.executedCount}</TableCell>
                        <TableCell className="text-right text-green-600">{c.passedCount}</TableCell>
                        <TableCell className="text-right text-red-600">{c.failedCount}</TableCell>
                        <TableCell>
                          {c.lastExecutedAt
                            ? new Date(c.lastExecutedAt).toLocaleDateString('ja-JP')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
