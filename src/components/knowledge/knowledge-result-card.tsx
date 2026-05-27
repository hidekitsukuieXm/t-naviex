'use client';

/**
 * Knowledge Result Card Component
 *
 * ナレッジ検索結果カードコンポーネント
 */

import {
  FileText,
  Bug,
  Lightbulb,
  BookOpen,
  Shield,
  Layers,
  Box,
  Tag as TagIcon,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  KnowledgeNode,
  KnowledgeNodeType,
  KnowledgeCategory,
  KNOWLEDGE_CATEGORY_INFO,
  GraphSearchResult,
} from '@/types/knowledge-graph';

// ========================================
// Types
// ========================================

export interface KnowledgeResultCardProps {
  result: GraphSearchResult;
  onViewDetails: (node: KnowledgeNode) => void;
  onViewGraph?: (node: KnowledgeNode) => void;
}

// ========================================
// Constants
// ========================================

const NODE_TYPE_ICONS: Record<KnowledgeNodeType, typeof FileText> = {
  TestCase: FileText,
  TestStep: Layers,
  Bug: Bug,
  BestPractice: Lightbulb,
  TestDesignKnowledge: BookOpen,
  BugCountermeasure: Shield,
  Feature: Box,
  Module: Box,
  Tag: TagIcon,
};

const NODE_TYPE_LABELS: Record<KnowledgeNodeType, string> = {
  TestCase: 'テストケース',
  TestStep: 'テストステップ',
  Bug: 'バグ',
  BestPractice: 'ベストプラクティス',
  TestDesignKnowledge: 'テスト設計ナレッジ',
  BugCountermeasure: 'バグ対策',
  Feature: '機能',
  Module: 'モジュール',
  Tag: 'タグ',
};

const CATEGORY_COLORS: Record<KnowledgeCategory, string> = {
  TEST_ASSET: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  DEFECT: 'bg-red-500/10 text-red-700 dark:text-red-400',
  BEST_PRACTICE: 'bg-green-500/10 text-green-700 dark:text-green-400',
  DESIGN_KNOWLEDGE: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  COUNTERMEASURE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  SYSTEM_COMPONENT: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
};

// ========================================
// Component
// ========================================

export function KnowledgeResultCard({
  result,
  onViewDetails,
  onViewGraph,
}: KnowledgeResultCardProps) {
  const { node, score, relatedNodes } = result;
  const Icon = NODE_TYPE_ICONS[node.type] || FileText;
  const typeLabel = NODE_TYPE_LABELS[node.type] || node.type;
  const categoryInfo = KNOWLEDGE_CATEGORY_INFO[node.category];
  const categoryColor = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.SYSTEM_COMPONENT;

  // スコアをパーセント表示
  const scorePercent = Math.round(score * 100);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`rounded-md p-1.5 ${categoryColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm line-clamp-1">{node.title}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {typeLabel}
                </Badge>
                <Badge className={`text-[10px] px-1.5 py-0 ${categoryColor}`}>
                  {categoryInfo?.label || node.category}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="font-medium">{scorePercent}%</span>
            <span>一致</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 説明/内容 */}
        {(node.description || node.content) && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {node.description || node.content}
          </p>
        )}

        {/* メタデータ */}
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(node.metadata)
              .slice(0, 3)
              .map(([key, value]) => (
                <Badge key={key} variant="secondary" className="text-[10px]">
                  {key}: {String(value).slice(0, 20)}
                </Badge>
              ))}
          </div>
        )}

        {/* 関連ノード */}
        {relatedNodes && relatedNodes.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-xs text-muted-foreground mb-1">
              関連ノード ({relatedNodes.length}件)
            </p>
            <div className="flex flex-wrap gap-1">
              {relatedNodes.slice(0, 3).map((relNode) => {
                const RelIcon = NODE_TYPE_ICONS[relNode.type] || FileText;
                return (
                  <Badge
                    key={relNode.id}
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-accent"
                    onClick={() => onViewDetails(relNode)}
                  >
                    <RelIcon className="h-3 w-3 mr-1" />
                    {relNode.title.slice(0, 15)}
                    {relNode.title.length > 15 && '...'}
                  </Badge>
                );
              })}
              {relatedNodes.length > 3 && (
                <Badge variant="outline" className="text-[10px]">
                  +{relatedNodes.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewDetails(node)}
          >
            詳細を見る
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          {onViewGraph && (
            <Button variant="ghost" size="sm" onClick={() => onViewGraph(node)}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// Result List Component
// ========================================

export interface KnowledgeResultListProps {
  results: GraphSearchResult[];
  onViewDetails: (node: KnowledgeNode) => void;
  onViewGraph?: (node: KnowledgeNode) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function KnowledgeResultList({
  results,
  onViewDetails,
  onViewGraph,
  isLoading = false,
  emptyMessage = '検索結果がありません',
}: KnowledgeResultListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-md bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-4/5 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {results.map((result) => (
        <KnowledgeResultCard
          key={result.node.id}
          result={result}
          onViewDetails={onViewDetails}
          onViewGraph={onViewGraph}
        />
      ))}
    </div>
  );
}
