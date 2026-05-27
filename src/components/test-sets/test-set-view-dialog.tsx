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
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type TestSetDetail, TEST_SET_STATUS_INFO } from '@/types/test-set';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Calendar, Hash, Tag, ListChecks, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface TestSetViewDialogProps {
  projectId: string;
  testSetId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestCasesChange?: () => void;
}

export function TestSetViewDialog({
  projectId,
  testSetId,
  open,
  onOpenChange,
  onTestCasesChange,
}: TestSetViewDialogProps) {
  const [testSet, setTestSet] = useState<TestSetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [removingCaseId, setRemovingCaseId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const fetchTestSetDetails = async () => {
      if (!open || !testSetId) {
        if (isMounted) setTestSet(null);
        return;
      }

      if (isMounted) setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/test-sets/${testSetId}`);
        const data = await res.json();
        if (isMounted) setTestSet(data);
      } catch (err) {
        console.error('Failed to fetch test set:', err);
        if (isMounted) {
          toast({
            title: 'エラー',
            description: 'テストセットの取得に失敗しました',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTestSetDetails();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, testSetId, projectId]);

  const handleRemoveTestCase = async (testCaseId: string) => {
    if (!testSetId) return;

    setRemovingCaseId(testCaseId);
    try {
      const response = await fetch(`/api/projects/${projectId}/test-sets/${testSetId}/cases`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCaseIds: [testCaseId] }),
      });

      if (!response.ok) {
        throw new Error('テストケースの削除に失敗しました');
      }

      // Update local state
      setTestSet((prev) =>
        prev
          ? {
              ...prev,
              testCases: prev.testCases.filter((tc) => tc.testCaseId !== testCaseId),
              testCaseCount: prev.testCaseCount - 1,
            }
          : null
      );

      toast({
        title: '削除完了',
        description: 'テストケースをテストセットから削除しました',
      });

      onTestCasesChange?.();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'テストケースの削除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setRemovingCaseId(null);
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    ARCHIVED: 'bg-red-100 text-red-800',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : testSet ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{testSet.name}</DialogTitle>
                <Badge className={statusColors[testSet.status]}>
                  {TEST_SET_STATUS_INFO[testSet.status].label}
                </Badge>
              </div>
              <DialogDescription>v{testSet.version}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="test-cases" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="test-cases">テストケース ({testSet.testCaseCount})</TabsTrigger>
                <TabsTrigger value="details">詳細情報</TabsTrigger>
                <TabsTrigger value="usage">使用状況</TabsTrigger>
              </TabsList>

              <TabsContent value="test-cases" className="space-y-4">
                {testSet.testCases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ListChecks className="mb-2 size-8" />
                    <p>テストケースが登録されていません</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>タイトル</TableHead>
                        <TableHead className="w-[100px]">優先度</TableHead>
                        <TableHead className="w-[100px]">タイプ</TableHead>
                        <TableHead className="w-[80px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testSet.testCases.map((tc, index) => (
                        <TableRow key={tc.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{tc.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{tc.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{tc.testType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTestCase(tc.testCaseId)}
                              disabled={removingCaseId === tc.testCaseId}
                            >
                              {removingCaseId === tc.testCaseId ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4 text-destructive" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {testSet.description && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">説明</h4>
                    <p className="text-sm text-muted-foreground">{testSet.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="size-4" />
                      <span>バージョン</span>
                    </div>
                    <p className="font-medium">{testSet.version}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="size-4" />
                      <span>作成者</span>
                    </div>
                    <p className="font-medium">{testSet.createdBy?.name || '-'}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>作成日時</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(testSet.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      <span>更新日時</span>
                    </div>
                    <p className="font-medium">
                      {format(new Date(testSet.updatedAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </p>
                  </div>
                </div>

                {testSet.tags.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="size-4" />
                      <span>タグ</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {testSet.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="usage" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">実行回数</p>
                    <p className="text-2xl font-bold">{testSet.executionCount}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">最終実行日時</p>
                    <p className="text-lg font-medium">
                      {testSet.lastExecutedAt
                        ? format(new Date(testSet.lastExecutedAt), 'yyyy/MM/dd HH:mm', {
                            locale: ja,
                          })
                        : '-'}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">テストセットが見つかりません</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
