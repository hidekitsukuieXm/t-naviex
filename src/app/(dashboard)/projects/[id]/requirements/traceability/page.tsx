'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { RequirementTypeBadge } from '@/components/requirements/requirement-type-badge';
import { RequirementStatusBadge } from '@/components/requirements/requirement-status-badge';
import { RequirementPriorityBadge } from '@/components/requirements/requirement-priority-badge';
import {
  type RequirementType,
  type RequirementStatus,
  type RequirementPriority,
  RequirementTypeLabels,
  RequirementPriorityLabels,
} from '@/types/requirement';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, FileText, TestTube2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TraceabilityRow {
  requirement: {
    id: string;
    code: string;
    title: string;
    type: RequirementType;
    status: RequirementStatus;
    priority: RequirementPriority;
  };
  testCases: Array<{
    id: string;
    title: string;
    testSpecId: string;
    testSpecTitle: string;
  }>;
}

interface CoverageStats {
  totalRequirements: number;
  coveredRequirements: number;
  uncoveredRequirements: number;
  coveragePercentage: number;
  byType: Record<string, { total: number; covered: number; percentage: number }>;
  byPriority: Record<string, { total: number; covered: number; percentage: number }>;
}

interface TraceabilityPageProps {
  params: Promise<{ id: string }>;
}

export default function TraceabilityPage({ params }: TraceabilityPageProps) {
  const { id: projectId } = use(params);
  const [matrix, setMatrix] = useState<TraceabilityRow[]>([]);
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [matrixRes, statsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/requirements/traceability`),
          fetch(`/api/projects/${projectId}/requirements/coverage`),
        ]);

        if (!matrixRes.ok || !statsRes.ok) {
          throw new Error('データの取得に失敗しました。');
        }

        const [matrixData, statsData] = await Promise.all([matrixRes.json(), statsRes.json()]);

        if (isMounted) {
          setMatrix(matrixData.matrix || []);
          setStats(statsData.stats || null);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        }
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
  }, [projectId]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const [matrixRes, statsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/requirements/traceability`),
        fetch(`/api/projects/${projectId}/requirements/coverage`),
      ]);

      if (!matrixRes.ok || !statsRes.ok) {
        throw new Error('データの取得に失敗しました。');
      }

      const [matrixData, statsData] = await Promise.all([matrixRes.json(), statsRes.json()]);

      setMatrix(matrixData.matrix || []);
      setStats(statsData.stats || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href={`/projects/${projectId}/requirements`}
          className={cn(buttonVariants({ variant: 'ghost' }))}
        >
          <ArrowLeft className="mr-2 size-4" />
          要求仕様一覧に戻る
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}/requirements`}
          className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}
        >
          <ArrowLeft className="mr-2 size-4" />
          要求仕様一覧に戻る
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">トレーサビリティマトリクス</h1>
            <p className="text-muted-foreground">
              要求仕様とテストケースの紐付け状況を確認できます。
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh}>
            更新
          </Button>
        </div>
      </div>

      {/* Coverage Summary */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                全体カバレッジ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.coveragePercentage}%</div>
              <Progress value={stats.coveragePercentage} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                要求仕様数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalRequirements}</div>
              <p className="text-sm text-muted-foreground">
                カバー済み: {stats.coveredRequirements} / 未カバー: {stats.uncoveredRequirements}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                カバー済み
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-8 text-green-500" />
                <span className="text-3xl font-bold text-green-600">
                  {stats.coveredRequirements}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">未カバー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="size-8 text-red-500" />
                <span className="text-3xl font-bold text-red-600">
                  {stats.uncoveredRequirements}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Coverage by Type and Priority */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">種別別カバレッジ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(stats.byType).map(([type, data]) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {RequirementTypeLabels[type as RequirementType] || type}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {data.covered}/{data.total} ({data.percentage}%)
                    </span>
                  </div>
                  <Progress value={data.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">優先度別カバレッジ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(stats.byPriority).map(([priority, data]) => (
                <div key={priority}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {RequirementPriorityLabels[priority as RequirementPriority] || priority}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {data.covered}/{data.total} ({data.percentage}%)
                    </span>
                  </div>
                  <Progress value={data.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Traceability Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>マトリクス詳細</CardTitle>
          <CardDescription>各要求仕様に紐付けられたテストケースの一覧です。</CardDescription>
        </CardHeader>
        <CardContent>
          {matrix.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="mb-4 size-16" />
              <p className="text-lg">要求仕様がありません。</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">コード</TableHead>
                  <TableHead>要求仕様</TableHead>
                  <TableHead className="w-28">種別</TableHead>
                  <TableHead className="w-28">ステータス</TableHead>
                  <TableHead className="w-32">優先度</TableHead>
                  <TableHead className="w-20 text-center">カバー</TableHead>
                  <TableHead>紐付けテストケース</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.map((row) => (
                  <TableRow key={row.requirement.id}>
                    <TableCell className="font-mono text-sm">
                      <Link
                        href={`/projects/${projectId}/requirements/${row.requirement.id}`}
                        className="hover:underline"
                      >
                        {row.requirement.code}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="max-w-xs truncate">{row.requirement.title}</div>
                    </TableCell>
                    <TableCell>
                      <RequirementTypeBadge type={row.requirement.type} className="text-xs" />
                    </TableCell>
                    <TableCell>
                      <RequirementStatusBadge status={row.requirement.status} className="text-xs" />
                    </TableCell>
                    <TableCell>
                      <RequirementPriorityBadge
                        priority={row.requirement.priority}
                        className="text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {row.testCases.length > 0 ? (
                        <CheckCircle2 className="mx-auto size-5 text-green-500" />
                      ) : (
                        <XCircle className="mx-auto size-5 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      {row.testCases.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.testCases.slice(0, 3).map((tc) => (
                            <Link
                              key={tc.id}
                              href={`/projects/${projectId}/test-specs/${tc.testSpecId}`}
                              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs hover:bg-muted/80"
                            >
                              <TestTube2 className="size-3" />
                              {tc.title.length > 20 ? `${tc.title.substring(0, 20)}...` : tc.title}
                            </Link>
                          ))}
                          {row.testCases.length > 3 && (
                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                              +{row.testCases.length - 3}件
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">紐付けなし</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
