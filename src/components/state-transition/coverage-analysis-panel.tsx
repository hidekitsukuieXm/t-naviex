'use client';
'use no memo';

/**
 * Coverage Analysis Panel
 *
 * カバレッジ分析パネル
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart3, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CoverageAnalysis,
  CoverageItem,
  CoverageType,
  getCoverageTypeLabel,
} from '@/types/state-transition';

interface CoverageAnalysisPanelProps {
  analysis: CoverageAnalysis | null;
  className?: string;
}

export function CoverageAnalysisPanel({ analysis, className }: CoverageAnalysisPanelProps) {
  const coverageColor = useMemo(() => {
    if (!analysis) return 'text-muted-foreground';
    if (analysis.coveragePercentage >= 80) return 'text-green-600';
    if (analysis.coveragePercentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }, [analysis]);

  const progressColor = useMemo(() => {
    if (!analysis) return 'bg-muted';
    if (analysis.coveragePercentage >= 80) return 'bg-green-500';
    if (analysis.coveragePercentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }, [analysis]);

  if (!analysis) {
    return (
      <Card className={cn('p-6 text-center', className)}>
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
        <p className="mt-4 text-muted-foreground">カバレッジ分析がありません</p>
        <p className="text-sm text-muted-foreground mt-1">「カバレッジ分析」を実行してください</p>
      </Card>
    );
  }

  const items = analysis.items as CoverageItem[];
  const coveredItems = items.filter((i) => i.covered);
  const uncoveredItems = items.filter((i) => !i.covered);

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          カバレッジ分析
          <Badge variant="outline" className="ml-2">
            {getCoverageTypeLabel(analysis.coverageType as CoverageType)}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* カバレッジ率 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">カバレッジ率</span>
            <span className={cn('text-2xl font-bold', coverageColor)}>
              {analysis.coveragePercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={analysis.coveragePercentage} className={progressColor} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {analysis.coveredItems} / {analysis.totalItems} 項目
            </span>
            <span>残り {analysis.totalItems - analysis.coveredItems} 項目</span>
          </div>
        </div>

        {/* サマリーバッジ */}
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-green-500/10 text-green-600 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            カバー済み: {coveredItems.length}
          </Badge>
          <Badge className="bg-red-500/10 text-red-600 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            未カバー: {uncoveredItems.length}
          </Badge>
        </div>

        {/* 詳細リスト */}
        <div className="space-y-4">
          {/* 未カバー項目 */}
          {uncoveredItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                未カバー項目 ({uncoveredItems.length})
              </h4>
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {uncoveredItems.map((item) => (
                    <TooltipProvider key={item.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between p-2 rounded bg-red-500/5 border border-red-200">
                            <span className="text-sm truncate">{item.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.type === 'node'
                                ? 'ノード'
                                : item.type === 'edge'
                                  ? '遷移'
                                  : 'パス'}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>ID: {item.id}</p>
                          <p>タイプ: {item.type}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* カバー済み項目 */}
          {coveredItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                カバー済み項目 ({coveredItems.length})
              </h4>
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {coveredItems.map((item) => (
                    <TooltipProvider key={item.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between p-2 rounded bg-green-500/5 border border-green-200">
                            <span className="text-sm truncate">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.type === 'node'
                                  ? 'ノード'
                                  : item.type === 'edge'
                                    ? '遷移'
                                    : 'パス'}
                              </Badge>
                              {item.coveredByTestCases.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.coveredByTestCases.length} TC
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>ID: {item.id}</p>
                          {item.coveredByTestCases.length > 0 && (
                            <p>テストケース: {item.coveredByTestCases.join(', ')}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* 分析日時 */}
        <div className="text-xs text-muted-foreground text-right">
          分析日時: {new Date(analysis.timestamp).toLocaleString('ja-JP')}
        </div>
      </CardContent>
    </Card>
  );
}

export default CoverageAnalysisPanel;
