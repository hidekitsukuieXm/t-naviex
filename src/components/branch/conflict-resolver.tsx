'use client';

/**
 * Conflict Resolver Component
 *
 * マージコンフリクト解決コンポーネント
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import {
  MergeConflict,
  ResolutionType,
  getConflictTypeLabel,
  getResolutionTypeLabel,
} from '@/types/branch';

interface ConflictResolverProps {
  conflicts: MergeConflict[];
  onResolve: (
    conflictId: string,
    resolutionType: ResolutionType,
    resolvedContent?: unknown,
    comment?: string
  ) => Promise<void>;
  isLoading?: boolean;
}

export function ConflictResolver({ conflicts, onResolve, isLoading }: ConflictResolverProps) {
  const [expandedConflictId, setExpandedConflictId] = useState<string | null>(
    conflicts.find((c) => !c.isResolved)?.id || null
  );
  const [selectedResolutions, setSelectedResolutions] = useState<Record<string, ResolutionType>>(
    {}
  );
  const [comments, setComments] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState<string | null>(null);

  const handleResolve = useCallback(
    async (conflictId: string) => {
      const resolutionType = selectedResolutions[conflictId];
      if (!resolutionType) return;

      setResolving(conflictId);
      try {
        // 解決内容を決定
        let resolvedContent: unknown = undefined;
        const conflict = conflicts.find((c) => c.id === conflictId);

        if (conflict) {
          if (resolutionType === ResolutionType.USE_SOURCE) {
            resolvedContent = conflict.sourceContent;
          } else if (resolutionType === ResolutionType.USE_TARGET) {
            resolvedContent = conflict.targetContent;
          }
        }

        await onResolve(conflictId, resolutionType, resolvedContent, comments[conflictId]);

        // 次の未解決コンフリクトを展開
        const nextUnresolved = conflicts.find((c) => c.id !== conflictId && !c.isResolved);
        setExpandedConflictId(nextUnresolved?.id || null);
      } finally {
        setResolving(null);
      }
    },
    [conflicts, selectedResolutions, comments, onResolve]
  );

  const unresolvedCount = conflicts.filter((c) => !c.isResolved).length;
  const resolvedCount = conflicts.filter((c) => c.isResolved).length;

  if (conflicts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <Check className="h-8 w-8 mb-2 text-green-500" />
        <p>コンフリクトはありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* サマリー */}
      <div className="flex items-center gap-4">
        <Badge variant={unresolvedCount > 0 ? 'destructive' : 'default'}>
          {unresolvedCount > 0 ? `${unresolvedCount} 件の未解決コンフリクト` : 'すべて解決済み'}
        </Badge>
        {resolvedCount > 0 && <Badge variant="outline">{resolvedCount} 件解決済み</Badge>}
      </div>

      {/* コンフリクト一覧 */}
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-3 pr-2">
          {conflicts.map((conflict) => (
            <Collapsible
              key={conflict.id}
              open={expandedConflictId === conflict.id}
              onOpenChange={(open) => setExpandedConflictId(open ? conflict.id : null)}
            >
              <Card className={conflict.isResolved ? 'border-green-200 bg-green-50/50' : ''}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expandedConflictId === conflict.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {conflict.isResolved ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <CardTitle className="text-sm font-medium">
                          {conflict.testCaseName}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getConflictTypeLabel(conflict.conflictType)}
                        </Badge>
                        {conflict.isResolved && conflict.resolution && (
                          <Badge variant="secondary" className="text-xs">
                            {getResolutionTypeLabel(conflict.resolution.type)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {!conflict.isResolved ? (
                      <div className="space-y-4">
                        {/* 差分表示 */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              ソース（マージ元）
                            </Label>
                            <pre className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(conflict.sourceContent, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              ターゲット（マージ先）
                            </Label>
                            <pre className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(conflict.targetContent, null, 2)}
                            </pre>
                          </div>
                        </div>

                        {/* 解決方法選択 */}
                        <div className="space-y-3">
                          <Label>解決方法を選択</Label>
                          <RadioGroup
                            value={selectedResolutions[conflict.id] || ''}
                            onValueChange={(value) =>
                              setSelectedResolutions((prev) => ({
                                ...prev,
                                [conflict.id]: value as ResolutionType,
                              }))
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value={ResolutionType.USE_SOURCE}
                                id={`${conflict.id}-source`}
                              />
                              <Label htmlFor={`${conflict.id}-source`} className="font-normal">
                                ソース（マージ元）の内容を使用
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value={ResolutionType.USE_TARGET}
                                id={`${conflict.id}-target`}
                              />
                              <Label htmlFor={`${conflict.id}-target`} className="font-normal">
                                ターゲット（マージ先）の内容を使用
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value={ResolutionType.SKIP}
                                id={`${conflict.id}-skip`}
                              />
                              <Label htmlFor={`${conflict.id}-skip`} className="font-normal">
                                このテストケースをスキップ
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* コメント */}
                        <div className="space-y-2">
                          <Label htmlFor={`comment-${conflict.id}`}>コメント（任意）</Label>
                          <Textarea
                            id={`comment-${conflict.id}`}
                            value={comments[conflict.id] || ''}
                            onChange={(e) =>
                              setComments((prev) => ({
                                ...prev,
                                [conflict.id]: e.target.value,
                              }))
                            }
                            placeholder="解決理由などを記述"
                            rows={2}
                          />
                        </div>

                        {/* 解決ボタン */}
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleResolve(conflict.id)}
                            disabled={
                              !selectedResolutions[conflict.id] ||
                              resolving === conflict.id ||
                              isLoading
                            }
                          >
                            {resolving === conflict.id && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            解決する
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {conflict.resolution?.comment && (
                          <p className="italic">&quot;{conflict.resolution.comment}&quot;</p>
                        )}
                        <p className="mt-2 text-xs">
                          解決日時:{' '}
                          {new Date(conflict.resolution!.resolvedAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ConflictResolver;
