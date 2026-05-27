'use client';
'use no memo';

/**
 * Impact Analysis Display Component
 *
 * 影響分析結果の表示
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
import { AlertTriangle, Box, Layers, FileText, Clock, TrendingUp } from 'lucide-react';
import {
  ImpactAnalysis,
  AffectedModule,
  AffectedFeature,
  AffectedRequirement,
} from '@/types/smart-test-selection';

interface ImpactAnalysisDisplayProps {
  analysis: ImpactAnalysis;
}

export function ImpactAnalysisDisplay({ analysis }: ImpactAnalysisDisplayProps) {
  const riskColor =
    analysis.riskScore >= 70
      ? 'text-red-600'
      : analysis.riskScore >= 40
        ? 'text-yellow-600'
        : 'text-green-600';

  const highImpactModules = analysis.affectedModules.filter((m) => m.impactLevel === 'HIGH');
  const highImpactFeatures = analysis.affectedFeatures.filter((f) => f.impactLevel === 'HIGH');

  return (
    <div className="space-y-4">
      {/* サマリーカード */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            影響分析サマリー
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>

          <div className="flex items-center justify-between">
            <span className="text-sm">リスクスコア</span>
            <span className={`text-2xl font-bold ${riskColor}`}>{analysis.riskScore}/100</span>
          </div>
          <Progress value={analysis.riskScore} className="h-2" />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            分析日時: {new Date(analysis.analyzedAt).toLocaleString('ja-JP')}
          </div>
        </CardContent>
      </Card>

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Box className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">影響モジュール</p>
                <p className="text-lg font-medium">{analysis.affectedModules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <Layers className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">影響機能</p>
                <p className="text-lg font-medium">{analysis.affectedFeatures.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">影響要件</p>
                <p className="text-lg font-medium">{analysis.affectedRequirements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 高影響項目 */}
      {(highImpactModules.length > 0 || highImpactFeatures.length > 0) && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <TrendingUp className="h-4 w-4" />
              高影響項目
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {highImpactModules.map((module) => (
                <div
                  key={module.moduleId}
                  className="flex items-center justify-between p-2 bg-destructive/5 rounded"
                >
                  <span className="text-sm font-medium">{module.moduleName}</span>
                  <Badge variant="destructive" className="text-xs">
                    モジュール
                  </Badge>
                </div>
              ))}
              {highImpactFeatures.map((feature) => (
                <div
                  key={feature.featureId}
                  className="flex items-center justify-between p-2 bg-destructive/5 rounded"
                >
                  <span className="text-sm font-medium">{feature.featureName}</span>
                  <Badge variant="destructive" className="text-xs">
                    機能
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 詳細アコーディオン */}
      <Accordion type="multiple" className="space-y-2">
        {/* 影響モジュール */}
        {analysis.affectedModules.length > 0 && (
          <AccordionItem value="modules" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm py-3">
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4" />
                影響モジュール ({analysis.affectedModules.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {analysis.affectedModules.map((module) => (
                    <ModuleItem key={module.moduleId} module={module} />
                  ))}
                </div>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* 影響機能 */}
        {analysis.affectedFeatures.length > 0 && (
          <AccordionItem value="features" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm py-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                影響機能 ({analysis.affectedFeatures.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {analysis.affectedFeatures.map((feature) => (
                    <FeatureItem key={feature.featureId} feature={feature} />
                  ))}
                </div>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* 影響要件 */}
        {analysis.affectedRequirements.length > 0 && (
          <AccordionItem value="requirements" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                影響要件 ({analysis.affectedRequirements.length})
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {analysis.affectedRequirements.map((req) => (
                    <RequirementItem key={req.requirementId} requirement={req} />
                  ))}
                </div>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function ModuleItem({ module }: { module: AffectedModule }) {
  const levelColor =
    module.impactLevel === 'HIGH'
      ? 'destructive'
      : module.impactLevel === 'MEDIUM'
        ? 'default'
        : 'secondary';

  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{module.moduleName}</span>
        <div className="flex items-center gap-2">
          {module.directlyAffected && (
            <Badge variant="outline" className="text-xs">
              直接影響
            </Badge>
          )}
          <Badge variant={levelColor} className="text-xs">
            {module.impactLevel}
          </Badge>
        </div>
      </div>
      {module.relatedChanges.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          関連変更: {module.relatedChanges.length}件
        </p>
      )}
    </div>
  );
}

function FeatureItem({ feature }: { feature: AffectedFeature }) {
  const levelColor =
    feature.impactLevel === 'HIGH'
      ? 'destructive'
      : feature.impactLevel === 'MEDIUM'
        ? 'default'
        : 'secondary';

  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{feature.featureName}</span>
        <div className="flex items-center gap-2">
          {feature.directlyAffected && (
            <Badge variant="outline" className="text-xs">
              直接影響
            </Badge>
          )}
          <Badge variant={levelColor} className="text-xs">
            {feature.impactLevel}
          </Badge>
        </div>
      </div>
      {feature.relatedChanges.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          関連変更: {feature.relatedChanges.length}件
        </p>
      )}
    </div>
  );
}

function RequirementItem({ requirement }: { requirement: AffectedRequirement }) {
  const levelColor =
    requirement.impactLevel === 'HIGH'
      ? 'destructive'
      : requirement.impactLevel === 'MEDIUM'
        ? 'default'
        : 'secondary';

  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{requirement.requirementName}</span>
        <Badge variant={levelColor} className="text-xs">
          {requirement.impactLevel}
        </Badge>
      </div>
      {requirement.relatedChanges.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          関連変更: {requirement.relatedChanges.length}件
        </p>
      )}
    </div>
  );
}

export default ImpactAnalysisDisplay;
