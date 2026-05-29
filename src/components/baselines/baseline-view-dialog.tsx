'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { type BaselineDetail, BASELINE_STATUS_INFO, type BaselineStatus } from '@/types/baseline';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Calendar, Hash, FileText, CheckCircle, ListOrdered } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface BaselineViewDialogProps {
  projectId: string;
  testSpecId: string;
  baselineId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BaselineViewDialog({
  projectId,
  testSpecId,
  baselineId,
  open,
  onOpenChange,
}: BaselineViewDialogProps) {
  const [baseline, setBaseline] = useState<BaselineDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const fetchBaselineDetails = async () => {
      if (!open || !baselineId) {
        if (isMounted) setBaseline(null);
        return;
      }

      if (isMounted) setIsLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/test-specs/${testSpecId}/baselines/${baselineId}`
        );
        const data = await res.json();
        if (isMounted) setBaseline(data);
      } catch (err) {
        console.error('Failed to fetch baseline:', err);
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

    fetchBaselineDetails();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, baselineId, projectId, testSpecId]);

  const statusColors: Record<BaselineStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    APPROVED: 'bg-green-100 text-green-800',
    LOCKED: 'bg-blue-100 text-blue-800',
    ARCHIVED: 'bg-red-100 text-red-800',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : baseline ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{baseline.name}</DialogTitle>
                <Badge className={statusColors[baseline.status]}>
                  {BASELINE_STATUS_INFO[baseline.status].label}
                </Badge>
              </div>
              <DialogDescription>v{baseline.version}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="cases" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cases">テストケース ({baseline.totalCases})</TabsTrigger>
                <TabsTrigger value="details">詳細情報</TabsTrigger>
                <TabsTrigger value="stats">統計情報</TabsTrigger>
              </TabsList>

              <TabsContent value="cases" className="space-y-4">
                {baseline.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="mb-2 size-8" />
                    <p>テストケースが登録されていません</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Accordion className="w-full">
                      {baseline.items.map((item, index) => (
                        <AccordionItem key={item.id} value={item.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">#{index + 1}</span>
                              <span className="font-medium">{item.snapshotData.title}</span>
                              <Badge variant="outline" className="ml-2">
                                {item.snapshotData.priority}
                              </Badge>
                              <Badge variant="secondary">{item.snapshotData.testType}</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pl-8">
                              {item.snapshotData.description && (
                                <div>
                                  <h5 className="mb-1 text-sm font-medium">説明</h5>
                                  <p className="text-sm text-muted-foreground">
                                    {item.snapshotData.description}
                                  </p>
                                </div>
                              )}

                              {item.snapshotData.preconditions && (
                                <div>
                                  <h5 className="mb-1 text-sm font-medium">前提条件</h5>
                                  <p className="text-sm text-muted-foreground">
                                    {item.snapshotData.preconditions}
                                  </p>
                                </div>
                              )}

                              {item.snapshotData.steps.length > 0 && (
                                <div>
                                  <h5 className="mb-2 flex items-center gap-1 text-sm font-medium">
                                    <ListOrdered className="size-4" />
                                    テスト手順 ({item.snapshotData.steps.length}ステップ)
                                  </h5>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[50px]">#</TableHead>
                                        <TableHead>操作</TableHead>
                                        <TableHead>期待結果</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.snapshotData.steps.map((step) => (
                                        <TableRow key={step.stepNo}>
                                          <TableCell>{step.stepNo}</TableCell>
                                          <TableCell className="whitespace-pre-wrap">
                                            {step.actionMd}
                                          </TableCell>
                                          <TableCell className="whitespace-pre-wrap">
                                            {step.expectedMd || '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}

                              {item.snapshotData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.snapshotData.tags.map((tag) => (
                                    <Badge key={tag} variant="outline">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {baseline.description && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">説明</h4>
                    <p className="text-sm text-muted-foreground">{baseline.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="size-4" />
                      <span>バージョン</span>
                    </div>
                    <p className="font-medium">{baseline.version}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="size-4" />
                      <span>テスト仕様書</span>
                    </div>
                    <p className="font-medium">{baseline.testSpec.name}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="size-4" />
                      <span>作成者</span>
                    </div>
                    <p className="font-medium">{baseline.createdBy?.name || '-'}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>スナップショット日時</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(baseline.snapshotAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>作成日時</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(baseline.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>更新日時</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(baseline.updatedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </p>
                  </div>
                </div>

                {baseline.approvedBy && baseline.approvedAt && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="size-5" />
                      <span className="font-medium">承認済み</span>
                    </div>
                    <p className="mt-2 text-sm text-green-600">
                      {baseline.approvedBy.name}が
                      {format(new Date(baseline.approvedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      に承認しました
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">総テストケース数</p>
                    <p className="text-3xl font-bold">{baseline.totalCases}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">総テストステップ数</p>
                    <p className="text-3xl font-bold">{baseline.totalSteps}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">平均ステップ数/ケース</p>
                    <p className="text-3xl font-bold">
                      {baseline.totalCases > 0
                        ? (baseline.totalSteps / baseline.totalCases).toFixed(1)
                        : 0}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">ステータス</p>
                    <p className="mt-1 text-lg font-medium">
                      {BASELINE_STATUS_INFO[baseline.status].description}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">ベースラインが見つかりません</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
