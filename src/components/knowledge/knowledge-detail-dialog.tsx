'use client';

/**
 * Knowledge Detail Dialog Component
 *
 * ナレッジ詳細表示ダイアログ
 */

import { useState, useEffect } from 'react';
import {
  FileText,
  Bug,
  Lightbulb,
  BookOpen,
  Shield,
  Layers,
  Box,
  Tag as TagIcon,
  Calendar,
  GitBranch,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  KnowledgeNode,
  KnowledgeNodeType,
  KnowledgeCategory,
  KnowledgeRelationship,
  KNOWLEDGE_CATEGORY_INFO,
  RELATIONSHIP_TYPE_INFO,
  RelationshipType,
  SubGraph,
} from '@/types/knowledge-graph';

// ========================================
// Types
// ========================================

export interface KnowledgeDetailDialogProps {
  node: KnowledgeNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewRelated?: (node: KnowledgeNode) => void;
  onViewGraph?: (node: KnowledgeNode) => void;
}

interface NodeDetails {
  node: KnowledgeNode;
  relatedNodes: KnowledgeNode[];
  subgraph: SubGraph | null;
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

export function KnowledgeDetailDialog({
  node,
  open,
  onOpenChange,
  onViewRelated,
  onViewGraph,
}: KnowledgeDetailDialogProps) {
  const [details, setDetails] = useState<NodeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!node || !open) {
      // Use requestAnimationFrame to avoid sync setState
      requestAnimationFrame(() => {
        if (isMounted) {
          setDetails(null);
        }
      });
      return () => {
        isMounted = false;
      };
    }

    const fetchNodeDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/knowledge-graph/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'subgraph',
            nodeId: node.id,
            options: { depth: 1 },
          }),
        });

        if (response.ok && isMounted) {
          const data = await response.json();
          const relatedNodes =
            data.subgraph?.nodes?.filter((n: KnowledgeNode) => n.id !== node.id) || [];
          setDetails({
            node,
            relatedNodes,
            subgraph: data.subgraph,
          });
        }
      } catch (error) {
        console.error('Failed to fetch node details:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchNodeDetails();

    return () => {
      isMounted = false;
    };
  }, [node, open]);

  if (!node) return null;

  const Icon = NODE_TYPE_ICONS[node.type] || FileText;
  const typeLabel = NODE_TYPE_LABELS[node.type] || node.type;
  const categoryInfo = KNOWLEDGE_CATEGORY_INFO[node.category];
  const categoryColor = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.SYSTEM_COMPONENT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 ${categoryColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <DialogTitle className="text-lg">{node.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {typeLabel}
                </Badge>
                <Badge className={`text-xs ${categoryColor}`}>
                  {categoryInfo?.label || node.category}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="content" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">内容</TabsTrigger>
            <TabsTrigger value="relations">関連</TabsTrigger>
            <TabsTrigger value="metadata">メタデータ</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* 説明 */}
                {node.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">説明</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {node.description}
                    </p>
                  </div>
                )}

                {/* コンテンツ */}
                {node.content && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">内容</h4>
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-sm whitespace-pre-wrap">{node.content}</p>
                    </div>
                  </div>
                )}

                {/* タイプ別の追加情報 */}
                <TypeSpecificContent node={node} />

                <Separator />

                {/* 日時情報 */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>作成: {new Date(node.createdAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>更新: {new Date(node.updatedAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="relations" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : details?.relatedNodes && details.relatedNodes.length > 0 ? (
                <div className="space-y-4">
                  {/* リレーションシップ */}
                  {details.subgraph?.relationships && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">リレーションシップ</h4>
                      <div className="space-y-2">
                        {details.subgraph.relationships.map((rel) => (
                          <RelationshipItem
                            key={rel.id}
                            relationship={rel}
                            nodes={details.subgraph?.nodes || []}
                            currentNodeId={node.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* 関連ノード */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">
                      関連ナレッジ ({details.relatedNodes.length}件)
                    </h4>
                    <div className="grid gap-2">
                      {details.relatedNodes.map((relNode) => {
                        const RelIcon = NODE_TYPE_ICONS[relNode.type] || FileText;
                        const relCategoryColor =
                          CATEGORY_COLORS[relNode.category] || CATEGORY_COLORS.SYSTEM_COMPONENT;
                        return (
                          <div
                            key={relNode.id}
                            className="flex items-center justify-between p-2 rounded-md border hover:bg-accent cursor-pointer"
                            onClick={() => onViewRelated?.(relNode)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`rounded p-1 ${relCategoryColor}`}>
                                <RelIcon className="h-3 w-3" />
                              </div>
                              <span className="text-sm">{relNode.title}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {NODE_TYPE_LABELS[relNode.type] || relNode.type}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <GitBranch className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">関連ノードがありません</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metadata" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* 基本情報 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">基本情報</h4>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b">
                          <td className="px-3 py-2 font-medium text-muted-foreground">ID</td>
                          <td className="px-3 py-2">{node.id}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-3 py-2 font-medium text-muted-foreground">ソースID</td>
                          <td className="px-3 py-2 font-mono text-xs">{node.sourceId}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-3 py-2 font-medium text-muted-foreground">タイプ</td>
                          <td className="px-3 py-2">{typeLabel}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium text-muted-foreground">カテゴリ</td>
                          <td className="px-3 py-2">{categoryInfo?.label || node.category}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* カスタムメタデータ */}
                {node.metadata && Object.keys(node.metadata).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">カスタムメタデータ</h4>
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <tbody>
                          {Object.entries(node.metadata).map(([key, value], idx, arr) => (
                            <tr key={key} className={idx < arr.length - 1 ? 'border-b' : ''}>
                              <td className="px-3 py-2 font-medium text-muted-foreground">{key}</td>
                              <td className="px-3 py-2">
                                {typeof value === 'object'
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* アクションボタン */}
        <div className="flex justify-end gap-2 mt-4">
          {onViewGraph && (
            <Button variant="outline" onClick={() => onViewGraph(node)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              グラフで表示
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========================================
// Sub Components
// ========================================

function TypeSpecificContent({ node }: { node: KnowledgeNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metadata = node.metadata as Record<string, any> | undefined;

  switch (node.type) {
    case 'TestCase':
      return (
        <div className="space-y-3">
          {metadata?.priority && (
            <div>
              <span className="text-xs text-muted-foreground">優先度:</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {metadata.priority}
              </Badge>
            </div>
          )}
          {metadata?.testType && (
            <div>
              <span className="text-xs text-muted-foreground">テスト種別:</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {metadata.testType}
              </Badge>
            </div>
          )}
          {metadata?.tags && Array.isArray(metadata.tags) && (
            <div>
              <span className="text-xs text-muted-foreground">タグ:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {metadata.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case 'Bug':
      return (
        <div className="space-y-3">
          {metadata?.severity && (
            <div>
              <span className="text-xs text-muted-foreground">重大度:</span>
              <Badge variant="destructive" className="ml-2 text-xs">
                {metadata.severity}
              </Badge>
            </div>
          )}
          {metadata?.status && (
            <div>
              <span className="text-xs text-muted-foreground">ステータス:</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {metadata.status}
              </Badge>
            </div>
          )}
          {metadata?.rootCause && (
            <div>
              <h4 className="text-sm font-medium mb-1">根本原因</h4>
              <p className="text-sm text-muted-foreground">{metadata.rootCause}</p>
            </div>
          )}
        </div>
      );

    case 'BestPractice':
      return (
        <div className="space-y-3">
          {metadata?.category && (
            <div>
              <span className="text-xs text-muted-foreground">カテゴリ:</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {metadata.category}
              </Badge>
            </div>
          )}
          {metadata?.applicability && Array.isArray(metadata.applicability) && (
            <div>
              <h4 className="text-sm font-medium mb-1">適用対象</h4>
              <div className="flex flex-wrap gap-1">
                {metadata.applicability.map((item: string) => (
                  <Badge key={item} variant="outline" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}

function RelationshipItem({
  relationship,
  nodes,
  currentNodeId,
}: {
  relationship: KnowledgeRelationship;
  nodes: KnowledgeNode[];
  currentNodeId: number;
}) {
  const relInfo = RELATIONSHIP_TYPE_INFO[relationship.type as RelationshipType];
  const isOutgoing = relationship.startNodeId === currentNodeId;
  const targetNodeId = isOutgoing ? relationship.endNodeId : relationship.startNodeId;
  const targetNode = nodes.find((n) => n.id === targetNodeId);

  if (!targetNode) return null;

  const TargetIcon = NODE_TYPE_ICONS[targetNode.type] || FileText;

  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {isOutgoing ? (
          <>
            <span>→</span>
            <Badge variant="outline" className="text-[10px]">
              {relInfo?.label || relationship.type}
            </Badge>
          </>
        ) : (
          <>
            <Badge variant="outline" className="text-[10px]">
              {relInfo?.label || relationship.type}
            </Badge>
            <span>←</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <TargetIcon className="h-3 w-3" />
        <span className="text-sm">{targetNode.title}</span>
      </div>
    </div>
  );
}
