'use client';

/**
 * Knowledge Suggestions Component
 *
 * 関連ナレッジのサジェストコンポーネント
 */

import { Lightbulb, BookOpen, Shield, Search, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KnowledgeNode } from '@/types/knowledge-graph';

// ========================================
// Types
// ========================================

export interface RelatedSuggestions {
  bestPractices: KnowledgeNode[];
  testDesignKnowledge: KnowledgeNode[];
  bugCountermeasures: KnowledgeNode[];
  relatedQueries: string[];
}

export interface KnowledgeSuggestionsProps {
  suggestions: RelatedSuggestions | null;
  onNodeClick: (node: KnowledgeNode) => void;
  onQueryClick: (query: string) => void;
  isLoading?: boolean;
}

// ========================================
// Component
// ========================================

export function KnowledgeSuggestions({
  suggestions,
  onNodeClick,
  onQueryClick,
  isLoading = false,
}: KnowledgeSuggestionsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-3/4 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!suggestions) return null;

  const hasSuggestions =
    suggestions.bestPractices.length > 0 ||
    suggestions.testDesignKnowledge.length > 0 ||
    suggestions.bugCountermeasures.length > 0 ||
    suggestions.relatedQueries.length > 0;

  if (!hasSuggestions) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">関連サジェスト</h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ベストプラクティス */}
        {suggestions.bestPractices.length > 0 && (
          <SuggestionCard
            title="ベストプラクティス"
            icon={Lightbulb}
            iconColor="text-green-600"
            nodes={suggestions.bestPractices}
            onNodeClick={onNodeClick}
          />
        )}

        {/* テスト設計ナレッジ */}
        {suggestions.testDesignKnowledge.length > 0 && (
          <SuggestionCard
            title="テスト設計ナレッジ"
            icon={BookOpen}
            iconColor="text-purple-600"
            nodes={suggestions.testDesignKnowledge}
            onNodeClick={onNodeClick}
          />
        )}

        {/* バグ対策 */}
        {suggestions.bugCountermeasures.length > 0 && (
          <SuggestionCard
            title="バグ対策"
            icon={Shield}
            iconColor="text-amber-600"
            nodes={suggestions.bugCountermeasures}
            onNodeClick={onNodeClick}
          />
        )}

        {/* 関連検索クエリ */}
        {suggestions.relatedQueries.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Search className="h-4 w-4 text-blue-600" />
                関連検索
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {suggestions.relatedQueries.map((query, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-auto py-1.5"
                    onClick={() => onQueryClick(query)}
                  >
                    <Search className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span className="truncate">{query}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ========================================
// Sub Components
// ========================================

interface SuggestionCardProps {
  title: string;
  icon: typeof Lightbulb;
  iconColor: string;
  nodes: KnowledgeNode[];
  onNodeClick: (node: KnowledgeNode) => void;
}

function SuggestionCard({ title, icon: Icon, iconColor, nodes, onNodeClick }: SuggestionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[120px]">
          <div className="space-y-1">
            {nodes.map((node) => (
              <Button
                key={node.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs h-auto py-1.5"
                onClick={() => onNodeClick(node)}
              >
                <span className="truncate flex-1 text-left">{node.title}</span>
                <ChevronRight className="h-3 w-3 flex-shrink-0 ml-1" />
              </Button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ========================================
// Quick Access Component
// ========================================

export interface KnowledgeQuickAccessProps {
  onCategoryClick: (category: string) => void;
}

export function KnowledgeQuickAccess({ onCategoryClick }: KnowledgeQuickAccessProps) {
  const quickAccessItems = [
    {
      id: 'test-design',
      label: 'テスト設計',
      description: 'テスト技法やナレッジを検索',
      icon: BookOpen,
      color: 'bg-purple-500/10 text-purple-700',
      query: 'テスト設計',
    },
    {
      id: 'best-practice',
      label: 'ベストプラクティス',
      description: 'テスト実践のベストプラクティス',
      icon: Lightbulb,
      color: 'bg-green-500/10 text-green-700',
      query: 'ベストプラクティス',
    },
    {
      id: 'bug-prevention',
      label: 'バグ対策',
      description: 'バグ予防と対策のナレッジ',
      icon: Shield,
      color: 'bg-amber-500/10 text-amber-700',
      query: 'バグ対策',
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">クイックアクセス</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {quickAccessItems.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onCategoryClick(item.query)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2 ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium">{item.label}</h4>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
