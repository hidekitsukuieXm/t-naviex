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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { type BaselineWithStats, type BaselineComparisonResult } from '@/types/baseline';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GitCompare, Plus, Minus, Edit, ArrowRight, CheckCircle } from 'lucide-react';

interface BaselineCompareDialogProps {
  projectId: string;
  testSpecId: string;
  baselines: BaselineWithStats[];
  sourceBaseline?: BaselineWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BaselineCompareDialog({
  projectId,
  testSpecId,
  baselines,
  sourceBaseline,
  open,
  onOpenChange,
}: BaselineCompareDialogProps) {
  const [sourceId, setSourceId] = useState<string | null>(sourceBaseline?.id || null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [comparison, setComparison] = useState<BaselineComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    const syncSourceId = () => {
      if (sourceBaseline && isMounted) {
        setSourceId(sourceBaseline.id);
      }
    };
    syncSourceId();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceBaseline?.id]);

  useEffect(() => {
    let isMounted = true;
    const resetOnClose = () => {
      if (!open && isMounted) {
        setComparison(null);
        setTargetId(null);
        if (!sourceBaseline) {
          setSourceId(null);
        }
      }
    };
    resetOnClose();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCompare = async () => {
    if (!sourceId || !targetId) {
      toast({
        title: 'エラー',
        description: '比較するベースラインを選択してください',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/test-specs/${testSpecId}/baselines/compare`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceBaselineId: sourceId,
            targetBaselineId: targetId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '比較に失敗しました');
      }

      const result = await response.json();
      setComparison(result);
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '比較に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const availableTargets = baselines.filter((b) => b.id !== sourceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="size-5" />
            ベースライン比較
          </DialogTitle>
          <DialogDescription>2つのベースライン間の差分を表示します</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-4">
            <div className="space-y-2">
              <Label>比較元（古い）</Label>
              <Select value={sourceId || ''} onValueChange={setSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="ベースラインを選択" />
                </SelectTrigger>
                <SelectContent>
                  {baselines.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} (v{b.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="mb-2 size-5 text-muted-foreground" />

            <div className="space-y-2">
              <Label>比較先（新しい）</Label>
              <Select value={targetId || ''} onValueChange={setTargetId} disabled={!sourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="ベースラインを選択" />
                </SelectTrigger>
                <SelectContent>
                  {availableTargets.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} (v{b.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={handleCompare} disabled={!sourceId || !targetId || isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              比較する
            </Button>
          </div>

          {comparison && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <Plus className="size-4" />
                    <span className="text-sm font-medium">追加</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-green-700">
                    {comparison.added.length}
                  </p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <Minus className="size-4" />
                    <span className="text-sm font-medium">削除</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-red-700">
                    {comparison.removed.length}
                  </p>
                </div>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <Edit className="size-4" />
                    <span className="text-sm font-medium">変更</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-yellow-700">
                    {comparison.modified.length}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="size-4" />
                    <span className="text-sm font-medium">未変更</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold text-gray-700">{comparison.unchanged}</p>
                </div>
              </div>

              <Tabs defaultValue="added" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="added" className="text-green-700">
                    追加 ({comparison.added.length})
                  </TabsTrigger>
                  <TabsTrigger value="removed" className="text-red-700">
                    削除 ({comparison.removed.length})
                  </TabsTrigger>
                  <TabsTrigger value="modified" className="text-yellow-700">
                    変更 ({comparison.modified.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="added">
                  <ScrollArea className="h-[300px]">
                    {comparison.added.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">
                        追加されたケースはありません
                      </p>
                    ) : (
                      <Accordion type="multiple" className="w-full">
                        {comparison.added.map((item) => (
                          <AccordionItem key={item.id} value={item.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Plus className="size-4 text-green-600" />
                                <span>{item.snapshotData.title}</span>
                                <Badge variant="outline">{item.snapshotData.priority}</Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pl-6">
                                {item.snapshotData.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.snapshotData.description}
                                  </p>
                                )}
                                <p className="text-sm">{item.snapshotData.steps.length} ステップ</p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="removed">
                  <ScrollArea className="h-[300px]">
                    {comparison.removed.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">
                        削除されたケースはありません
                      </p>
                    ) : (
                      <Accordion type="multiple" className="w-full">
                        {comparison.removed.map((item) => (
                          <AccordionItem key={item.id} value={item.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Minus className="size-4 text-red-600" />
                                <span>{item.snapshotData.title}</span>
                                <Badge variant="outline">{item.snapshotData.priority}</Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pl-6">
                                {item.snapshotData.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.snapshotData.description}
                                  </p>
                                )}
                                <p className="text-sm">{item.snapshotData.steps.length} ステップ</p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="modified">
                  <ScrollArea className="h-[300px]">
                    {comparison.modified.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">
                        変更されたケースはありません
                      </p>
                    ) : (
                      <Accordion type="multiple" className="w-full">
                        {comparison.modified.map((item) => (
                          <AccordionItem key={item.target.id} value={item.target.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Edit className="size-4 text-yellow-600" />
                                <span>{item.target.snapshotData.title}</span>
                                <Badge variant="outline">{item.changes.length} 変更</Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pl-6">
                                <p className="text-sm font-medium">変更された項目:</p>
                                <div className="flex flex-wrap gap-1">
                                  {item.changes.map((change) => (
                                    <Badge key={change} variant="secondary">
                                      {change}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
