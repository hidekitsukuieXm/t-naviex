'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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
import { Loader2, Bug, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DefectData {
  id: string;
  title: string;
  status: string;
  severity: string;
  priority: string;
  assigneeName: string | null;
  reporterName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolutionDays: number | null;
}

interface DefectReportData {
  summary: {
    total: number;
    open: number;
    resolved: number;
    closed: number;
  };
  byStatus: Array<{ status: string; label: string; count: number }>;
  bySeverity: Array<{ severity: string; label: string; count: number }>;
  byPriority: Array<{ priority: string; label: string; count: number }>;
  defects: DefectData[];
}

interface ProjectOption {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  NEW: '#3b82f6',
  OPEN: '#f59e0b',
  IN_PROGRESS: '#8b5cf6',
  RESOLVED: '#10b981',
  VERIFIED: '#06b6d4',
  CLOSED: '#6b7280',
  REJECTED: '#ef4444',
  DEFERRED: '#f97316',
};

const severityColors: Record<string, string> = {
  BLOCKER: '#dc2626',
  CRITICAL: '#ef4444',
  MAJOR: '#f59e0b',
  MINOR: '#10b981',
  TRIVIAL: '#6b7280',
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DefectReportPage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectIdParam);
  const [defectReport, setDefectReport] = useState<DefectReportData | null>(null);
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
        const response = await fetch(`/api/projects/${selectedProjectId}/reports?type=defects`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setDefectReport(data.defectReport);
          }
        }
      } catch (error) {
        console.error('Error fetching defect report:', error);
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

  const severityData = useMemo(() => {
    if (!defectReport) return [];
    return defectReport.bySeverity.map((item) => ({
      name: item.label,
      value: item.count,
    }));
  }, [defectReport]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">欠陥レポート</h1>
          <p className="text-muted-foreground">バグ・欠陥の詳細レポート</p>
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
            <Bug className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">プロジェクトを選択してください</p>
          </CardContent>
        </Card>
      ) : defectReport ? (
        <>
          {/* サマリー */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">総バグ数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{defectReport.summary.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">オープン</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{defectReport.summary.open}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">解決済み</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {defectReport.summary.resolved}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">クローズ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {defectReport.summary.closed}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* グラフ */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ステータス別分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={defectReport.byStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>重大度別分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {severityData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

          {/* バグ一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>バグ一覧</CardTitle>
              <CardDescription>全{defectReport.defects.length}件</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>重大度</TableHead>
                    <TableHead>優先度</TableHead>
                    <TableHead>担当者</TableHead>
                    <TableHead>報告者</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead className="text-right">解決日数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defectReport.defects.map((defect) => (
                    <TableRow key={defect.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {defect.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: statusColors[defect.status] }}
                          className="text-white"
                        >
                          {defect.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: severityColors[defect.severity] }}
                          className="text-white"
                        >
                          {defect.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{defect.priority}</Badge>
                      </TableCell>
                      <TableCell>{defect.assigneeName || '-'}</TableCell>
                      <TableCell>{defect.reporterName || '-'}</TableCell>
                      <TableCell>
                        {new Date(defect.createdAt).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell className="text-right">
                        {defect.resolutionDays !== null ? `${defect.resolutionDays}日` : '-'}
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
