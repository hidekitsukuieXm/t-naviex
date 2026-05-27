'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BaselineCard } from '@/components/baselines/baseline-card';
import { BaselineCreateDialog } from '@/components/baselines/baseline-create-dialog';
import { BaselineViewDialog } from '@/components/baselines/baseline-view-dialog';
import { BaselineCompareDialog } from '@/components/baselines/baseline-compare-dialog';
import {
  type BaselineWithStats,
  type BaselineStatus,
  BASELINE_STATUSES,
  BASELINE_STATUS_INFO,
} from '@/types/baseline';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import {
  Loader2,
  Search,
  LayoutGrid,
  List,
  FileText,
  ArrowLeft,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Lock,
  Archive,
  Trash2,
  GitCompare,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface PageParams {
  id: string;
  testSpecId: string;
}

export default function BaselinesPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  const { id: projectId, testSpecId } = resolvedParams;
  const router = useRouter();
  const { toast } = useToast();

  const [baselines, setBaselines] = useState<BaselineWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BaselineStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'snapshotAt' | 'name' | 'version'>('snapshotAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [testSpecName, setTestSpecName] = useState('');

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareSourceBaseline, setCompareSourceBaseline] = useState<BaselineWithStats | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [baselineToDelete, setBaselineToDelete] = useState<BaselineWithStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    let isMounted = true;

    const fetchBaselines = async () => {
      if (isMounted) setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          sortBy,
          sortOrder,
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(statusFilter !== 'ALL' && { status: statusFilter }),
        });

        const response = await fetch(
          `/api/projects/${projectId}/test-specs/${testSpecId}/baselines?${queryParams}`
        );
        const data = await response.json();
        if (isMounted) setBaselines(data.items || []);
      } catch {
        if (isMounted) {
          toast({
            title: 'エラー',
            description: 'ベースラインの取得に失敗しました',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBaselines();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, testSpecId, debouncedSearch, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    let isMounted = true;

    const fetchTestSpec = async () => {
      try {
        const response = await fetch(`/api/test-specs/${testSpecId}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) setTestSpecName(data.name);
        }
      } catch {
        // ignore
      }
    };

    fetchTestSpec();

    return () => {
      isMounted = false;
    };
  }, [testSpecId]);

  const fetchBaselines = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        sortBy,
        sortOrder,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      });

      const response = await fetch(
        `/api/projects/${projectId}/test-specs/${testSpecId}/baselines?${queryParams}`
      );
      const data = await response.json();
      setBaselines(data.items || []);
    } catch {
      toast({
        title: 'エラー',
        description: 'ベースラインの取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, testSpecId, debouncedSearch, statusFilter, sortBy, sortOrder, toast]);

  const handleView = (baseline: BaselineWithStats) => {
    setSelectedBaselineId(baseline.id);
    setViewDialogOpen(true);
  };

  const handleCompare = (baseline: BaselineWithStats) => {
    setCompareSourceBaseline(baseline);
    setCompareDialogOpen(true);
  };

  const handleApprove = async (baseline: BaselineWithStats) => {
    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-specs/${testSpecId}/baselines/${baseline.id}/approve`,
        { method: 'POST' }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '承認に失敗しました');
      }
      toast({
        title: '承認完了',
        description: `ベースライン "${baseline.name}" を承認しました`,
      });
      fetchBaselines();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '承認に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLock = async (baseline: BaselineWithStats) => {
    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-specs/${testSpecId}/baselines/${baseline.id}/lock`,
        { method: 'POST' }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ロックに失敗しました');
      }
      toast({
        title: 'ロック完了',
        description: `ベースライン "${baseline.name}" をロックしました`,
      });
      fetchBaselines();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ロックに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async (baseline: BaselineWithStats) => {
    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-specs/${testSpecId}/baselines/${baseline.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ARCHIVED' }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'アーカイブに失敗しました');
      }
      toast({
        title: 'アーカイブ完了',
        description: `ベースライン "${baseline.name}" をアーカイブしました`,
      });
      fetchBaselines();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'アーカイブに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = (baseline: BaselineWithStats) => {
    setBaselineToDelete(baseline);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!baselineToDelete) return;

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-specs/${testSpecId}/baselines/${baselineToDelete.id}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }
      toast({
        title: '削除完了',
        description: `ベースライン "${baselineToDelete.name}" を削除しました`,
      });
      fetchBaselines();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '削除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setDeleteDialogOpen(false);
      setBaselineToDelete(null);
    }
  };

  const statusColors: Record<BaselineStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    APPROVED: 'bg-green-100 text-green-800',
    LOCKED: 'bg-blue-100 text-blue-800',
    ARCHIVED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">ベースライン管理</h1>
          {testSpecName && <p className="text-muted-foreground">{testSpecName}</p>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                ベースライン一覧
              </CardTitle>
              <CardDescription>テスト仕様書のスナップショットを管理します</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setCompareSourceBaseline(null);
                  setCompareDialogOpen(true);
                }}
                disabled={baselines.length < 2}
              >
                <GitCompare className="size-4" />
              </Button>
              <BaselineCreateDialog
                projectId={projectId}
                testSpecId={testSpecId}
                onSuccess={fetchBaselines}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="名前またはバージョンで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as BaselineStatus | 'ALL')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">すべて</SelectItem>
                {BASELINE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {BASELINE_STATUS_INFO[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="並び順" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="snapshotAt">作成日時</SelectItem>
                <SelectItem value="name">名前</SelectItem>
                <SelectItem value="version">バージョン</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">降順</SelectItem>
                <SelectItem value="asc">昇順</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex rounded-md border">
              <Button
                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('table')}
              >
                <List className="size-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : baselines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="mb-4 size-12" />
              <p className="text-lg">ベースラインがありません</p>
              <p className="text-sm">「ベースライン作成」からスナップショットを作成してください</p>
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {baselines.map((baseline) => (
                <BaselineCard
                  key={baseline.id}
                  baseline={baseline}
                  onView={handleView}
                  onApprove={handleApprove}
                  onLock={handleLock}
                  onArchive={handleArchive}
                  onCompare={handleCompare}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>バージョン</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>ケース数</TableHead>
                  <TableHead>作成者</TableHead>
                  <TableHead>作成日時</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baselines.map((baseline) => (
                  <TableRow key={baseline.id}>
                    <TableCell className="font-medium">{baseline.name}</TableCell>
                    <TableCell>v{baseline.version}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[baseline.status]}>
                        {BASELINE_STATUS_INFO[baseline.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>{baseline.totalCases}</TableCell>
                    <TableCell>{baseline.createdBy?.name || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(baseline.snapshotAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isProcessing}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(baseline)}>
                            <Eye className="mr-2 size-4" />
                            詳細
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCompare(baseline)}>
                            <GitCompare className="mr-2 size-4" />
                            比較
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {baseline.status === 'DRAFT' && (
                            <DropdownMenuItem onClick={() => handleApprove(baseline)}>
                              <CheckCircle className="mr-2 size-4" />
                              承認
                            </DropdownMenuItem>
                          )}
                          {baseline.status === 'APPROVED' && (
                            <DropdownMenuItem onClick={() => handleLock(baseline)}>
                              <Lock className="mr-2 size-4" />
                              ロック
                            </DropdownMenuItem>
                          )}
                          {baseline.status !== 'ARCHIVED' && (
                            <DropdownMenuItem onClick={() => handleArchive(baseline)}>
                              <Archive className="mr-2 size-4" />
                              アーカイブ
                            </DropdownMenuItem>
                          )}
                          {baseline.status !== 'LOCKED' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(baseline)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                削除
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BaselineViewDialog
        projectId={projectId}
        testSpecId={testSpecId}
        baselineId={selectedBaselineId}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <BaselineCompareDialog
        projectId={projectId}
        testSpecId={testSpecId}
        baselines={baselines}
        sourceBaseline={compareSourceBaseline}
        open={compareDialogOpen}
        onOpenChange={setCompareDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ベースラインの削除</AlertDialogTitle>
            <AlertDialogDescription>
              ベースライン「{baselineToDelete?.name}」を削除しますか？
              <br />
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
