'use client';
'use no memo';

/**
 * Coverage Display Component
 *
 * カバレッジ表示
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckCircle2, XCircle, BarChart3, Clock, Percent } from 'lucide-react';
import { CoverageSummary, GenerationStatistics, PairInfo } from '@/types/combinatorial';

interface CoverageDisplayProps {
  coverage: CoverageSummary;
  statistics: GenerationStatistics;
}

export function CoverageDisplay({ coverage, statistics }: CoverageDisplayProps) {
  const coverageColor =
    coverage.coveragePercentage >= 100
      ? 'text-green-600'
      : coverage.coveragePercentage >= 80
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="space-y-4">
      {/* カバレッジサマリー */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            ペアカバレッジ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              <span className={coverageColor}>{coverage.coveragePercentage}%</span>
            </span>
            <Badge variant={coverage.coveragePercentage >= 100 ? 'default' : 'secondary'}>
              {coverage.coveredPairs} / {coverage.totalPairs} ペア
            </Badge>
          </div>
          <Progress value={coverage.coveragePercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* 統計情報 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">生成統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">生成数</p>
                <p className="text-sm font-medium">{statistics.totalCombinations} 件</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">全組合せ</p>
                <p className="text-sm font-medium">
                  {statistics.allCombinationsCount.toLocaleString()} 件
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <Percent className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">削減率</p>
                <p className="text-sm font-medium">{statistics.reductionPercentage}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">生成時間</p>
                <p className="text-sm font-medium">{statistics.generationTimeMs} ms</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 未カバーペア */}
      {coverage.uncoveredPairs && coverage.uncoveredPairs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              未カバーペア ({coverage.uncoveredPairs.length} 件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="uncovered" className="border-none">
                <AccordionTrigger className="text-sm py-2">詳細を表示</AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {coverage.uncoveredPairs.map((pair, index) => (
                        <UncoveredPairItem key={index} pair={pair} />
                      ))}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UncoveredPairItem({ pair }: { pair: PairInfo }) {
  return (
    <div className="text-xs p-2 bg-muted rounded flex items-center gap-2">
      <Badge variant="outline" className="text-xs">
        {pair.param1Name}={pair.value1}
      </Badge>
      <span className="text-muted-foreground">×</span>
      <Badge variant="outline" className="text-xs">
        {pair.param2Name}={pair.value2}
      </Badge>
    </div>
  );
}

export default CoverageDisplay;
