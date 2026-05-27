'use client';

/**
 * Knowledge Search Page
 *
 * ナレッジグラフ検索・参照ページ
 */

import { useState, useCallback, use } from 'react';
import { Brain, Grid, LayoutList, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  KnowledgeSearchBar,
  SearchFilters,
  KnowledgeResultList,
  KnowledgeDetailDialog,
  KnowledgeGraphView,
  KnowledgeSuggestions,
  KnowledgeQuickAccess,
  RelatedSuggestions,
} from '@/components/knowledge';
import { KnowledgeNode, GraphSearchResult, SubGraph } from '@/types/knowledge-graph';

// ========================================
// Types
// ========================================

interface PageParams {
  params: Promise<{ id: string }>;
}

// ========================================
// Page Component
// ========================================

export default function KnowledgeSearchPage({ params }: PageParams) {
  use(params); // consume params

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GraphSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<RelatedSuggestions | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [graphData, setGraphData] = useState<SubGraph | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const [hasSearched, setHasSearched] = useState(false);

  // 関連クエリを生成
  const generateRelatedQueries = useCallback((query: string): string[] => {
    const queries: string[] = [];
    if (query.includes('テスト')) {
      queries.push(`${query} ベストプラクティス`);
      queries.push(`${query} 設計技法`);
    }
    if (query.includes('バグ') || query.includes('不具合')) {
      queries.push(`${query} 対策`);
      queries.push(`${query} 予防`);
    }
    return queries.slice(0, 4);
  }, []);

  // サジェスト取得
  const fetchSuggestions = useCallback(
    async (query: string) => {
      try {
        const response = await fetch('/api/knowledge-graph/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'rag-context',
            query,
            options: {
              maxNodes: 5,
              includeRelationships: false,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // サジェストを構築
          const context = data.context;
          if (context?.relevantNodes) {
            const bestPractices = context.relevantNodes.filter(
              (n: KnowledgeNode) => n.type === 'BestPractice'
            );
            const testDesignKnowledge = context.relevantNodes.filter(
              (n: KnowledgeNode) => n.type === 'TestDesignKnowledge'
            );
            const bugCountermeasures = context.relevantNodes.filter(
              (n: KnowledgeNode) => n.type === 'BugCountermeasure'
            );

            setSuggestions({
              bestPractices: bestPractices.slice(0, 3),
              testDesignKnowledge: testDesignKnowledge.slice(0, 3),
              bugCountermeasures: bugCountermeasures.slice(0, 3),
              relatedQueries: generateRelatedQueries(query),
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    },
    [generateRelatedQueries]
  );

  // 検索実行
  const handleSearch = useCallback(
    async (query: string, filters: SearchFilters) => {
      setSearchQuery(query);
      setIsSearching(true);
      setHasSearched(true);

      try {
        // クエリパラメータを構築
        const searchParams = new URLSearchParams();
        if (query) searchParams.append('q', query);
        if (filters.nodeTypes.length > 0) {
          searchParams.append('nodeTypes', filters.nodeTypes.join(','));
        }
        if (filters.categories.length > 0) {
          searchParams.append('categories', filters.categories.join(','));
        }
        searchParams.append('includeRelated', 'true');
        searchParams.append('limit', '20');

        const response = await fetch(`/api/knowledge-graph/search?${searchParams.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);

          // サジェストを取得
          if (data.results && data.results.length > 0) {
            fetchSuggestions(query);
          } else {
            setSuggestions(null);
          }
        }
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [fetchSuggestions]
  );

  // ノード詳細を表示
  const handleViewDetails = useCallback((node: KnowledgeNode) => {
    setSelectedNode(node);
    setIsDetailOpen(true);
  }, []);

  // グラフ表示
  const handleViewGraph = useCallback(async (node: KnowledgeNode) => {
    setIsLoadingGraph(true);
    try {
      const response = await fetch('/api/knowledge-graph/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subgraph',
          nodeId: node.id,
          options: { depth: 2 },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGraphData(data.subgraph);
        setViewMode('graph');
      }
    } catch (error) {
      console.error('Failed to load graph:', error);
    } finally {
      setIsLoadingGraph(false);
    }
  }, []);

  // クイックアクセス
  const handleQuickAccess = useCallback(
    (query: string) => {
      handleSearch(query, { nodeTypes: [], categories: [] });
    },
    [handleSearch]
  );

  // サジェストクエリをクリック
  const handleSuggestedQuery = useCallback(
    (query: string) => {
      handleSearch(query, { nodeTypes: [], categories: [] });
    },
    [handleSearch]
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">ナレッジ検索</h1>
            <p className="text-sm text-muted-foreground">
              テスト設計ナレッジ、ベストプラクティス、バグ対策を検索
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchResults([]);
              setSuggestions(null);
              setGraphData(null);
              setHasSearched(false);
              setSearchQuery('');
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            リセット
          </Button>
        </div>
      </div>

      {/* 検索バー */}
      <KnowledgeSearchBar
        onSearch={handleSearch}
        isSearching={isSearching}
        placeholder="テスト技法、バグパターン、ベストプラクティスを検索..."
      />

      {/* クイックアクセス（検索前のみ表示） */}
      {!hasSearched && <KnowledgeQuickAccess onCategoryClick={handleQuickAccess} />}

      {/* 検索結果 */}
      {hasSearched && (
        <div className="space-y-6">
          {/* 結果ヘッダー */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isSearching ? '検索中...' : `"${searchQuery}" の検索結果: ${searchResults.length}件`}
            </p>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'graph')}>
              <TabsList className="h-8">
                <TabsTrigger value="list" className="h-7 px-2">
                  <LayoutList className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="graph" className="h-7 px-2">
                  <Grid className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* リスト/グラフ表示 */}
          <Tabs value={viewMode} className="mt-0">
            <TabsContent value="list" className="mt-0">
              <KnowledgeResultList
                results={searchResults}
                onViewDetails={handleViewDetails}
                onViewGraph={handleViewGraph}
                isLoading={isSearching}
                emptyMessage="検索結果がありません。別のキーワードで検索してください。"
              />
            </TabsContent>
            <TabsContent value="graph" className="mt-0">
              {graphData ? (
                <KnowledgeGraphView
                  subgraph={graphData}
                  centerNodeId={selectedNode?.id}
                  onNodeClick={handleViewDetails}
                  isLoading={isLoadingGraph}
                  height={500}
                />
              ) : searchResults.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
                  <Grid className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    グラフを表示するには、ノードを選択してください
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => searchResults[0] && handleViewGraph(searchResults[0].node)}
                    disabled={isLoadingGraph}
                  >
                    最初の結果でグラフを表示
                  </Button>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>

          {/* サジェスト */}
          {suggestions && !isSearching && (
            <KnowledgeSuggestions
              suggestions={suggestions}
              onNodeClick={handleViewDetails}
              onQueryClick={handleSuggestedQuery}
            />
          )}
        </div>
      )}

      {/* 詳細ダイアログ */}
      <KnowledgeDetailDialog
        node={selectedNode}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onViewRelated={(node) => {
          setSelectedNode(node);
        }}
        onViewGraph={handleViewGraph}
      />
    </div>
  );
}
