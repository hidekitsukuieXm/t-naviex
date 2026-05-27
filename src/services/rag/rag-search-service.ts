/**
 * RAG Search Service
 *
 * ナレッジグラフを活用したRAG検索サービス
 */

import {
  searchNodes,
  buildRAGContext,
  findSimilarNodes,
  getSubGraph,
  getNodeById,
  getNodesByType,
} from '@/repositories/knowledge-graph-repository';
import {
  KnowledgeNode,
  KnowledgeNodeType,
  KnowledgeCategory,
  RAGContext,
  GraphSearchResult,
  SubGraph,
  KNOWLEDGE_CATEGORY_INFO,
  RELATIONSHIP_TYPE_INFO,
  RelationshipType,
} from '@/types/knowledge-graph';

// ========================================
// Types
// ========================================

/**
 * RAG検索オプション
 */
export interface RAGSearchOptions {
  query: string;
  nodeTypes?: KnowledgeNodeType[];
  categories?: KnowledgeCategory[];
  limit?: number;
  minScore?: number;
  includeRelated?: boolean;
  relatedDepth?: number;
  includeSuggestions?: boolean;
}

/**
 * RAG検索結果
 */
export interface RAGSearchResponse {
  query: string;
  results: GraphSearchResult[];
  total: number;
  suggestions?: RelatedSuggestions;
  filters: {
    nodeTypes: KnowledgeNodeType[];
    categories: KnowledgeCategory[];
  };
}

/**
 * 関連サジェスト
 */
export interface RelatedSuggestions {
  bestPractices: KnowledgeNode[];
  testDesignKnowledge: KnowledgeNode[];
  bugCountermeasures: KnowledgeNode[];
  relatedQueries: string[];
}

/**
 * グラフ可視化データ
 */
export interface GraphVisualizationData {
  nodes: VisualizationNode[];
  links: VisualizationLink[];
}

/**
 * 可視化ノード
 */
export interface VisualizationNode {
  id: string;
  label: string;
  type: KnowledgeNodeType;
  category: KnowledgeCategory;
  categoryLabel: string;
  description?: string;
  metadata?: Record<string, unknown>;
  size: number;
  color: string;
}

/**
 * 可視化リンク
 */
export interface VisualizationLink {
  source: string;
  target: string;
  type: RelationshipType;
  label: string;
  weight: number;
}

// ========================================
// Constants
// ========================================

/**
 * ノードタイプごとの色
 */
const NODE_TYPE_COLORS: Record<KnowledgeNodeType, string> = {
  TestCase: '#3b82f6', // blue
  TestStep: '#60a5fa', // light blue
  Bug: '#ef4444', // red
  BestPractice: '#22c55e', // green
  TestDesignKnowledge: '#a855f7', // purple
  BugCountermeasure: '#f59e0b', // amber
  Feature: '#06b6d4', // cyan
  Module: '#8b5cf6', // violet
  Tag: '#6b7280', // gray
};

/**
 * カテゴリごとの基本サイズ
 */
const CATEGORY_BASE_SIZES: Record<KnowledgeCategory, number> = {
  TEST_ASSET: 8,
  DEFECT: 10,
  BEST_PRACTICE: 12,
  DESIGN_KNOWLEDGE: 12,
  COUNTERMEASURE: 12,
  SYSTEM_COMPONENT: 6,
};

// ========================================
// Service Functions
// ========================================

/**
 * RAG検索を実行
 */
export async function executeRAGSearch(options: RAGSearchOptions): Promise<RAGSearchResponse> {
  const {
    query,
    nodeTypes,
    categories,
    limit = 20,
    minScore = 0,
    includeRelated = true,
    relatedDepth = 1,
    includeSuggestions = true,
  } = options;

  // 検索実行
  const results = await searchNodes({
    query,
    nodeTypes,
    categories,
    limit,
    minScore,
    includeRelated,
    relatedDepth,
  });

  // サジェスト取得
  let suggestions: RelatedSuggestions | undefined;
  if (includeSuggestions && results.length > 0) {
    suggestions = await getRelatedSuggestions(query, results);
  }

  return {
    query,
    results,
    total: results.length,
    suggestions,
    filters: {
      nodeTypes: nodeTypes || [],
      categories: categories || [],
    },
  };
}

/**
 * 関連サジェストを取得
 */
async function getRelatedSuggestions(
  query: string,
  results: GraphSearchResult[]
): Promise<RelatedSuggestions> {
  // 検索結果からキーワードを抽出
  const keywords = extractKeywords(query);

  // 各タイプのナレッジを取得（検索結果に含まれていないもの）
  const resultIds = new Set(results.map((r) => r.node.id));

  const [bestPractices, testDesignKnowledge, bugCountermeasures] = await Promise.all([
    getNodesByType('BestPractice', { limit: 5 }),
    getNodesByType('TestDesignKnowledge', { limit: 5 }),
    getNodesByType('BugCountermeasure', { limit: 5 }),
  ]);

  // 関連クエリを生成
  const relatedQueries = generateRelatedQueries(query, keywords);

  return {
    bestPractices: bestPractices.filter((n) => !resultIds.has(n.id)),
    testDesignKnowledge: testDesignKnowledge.filter((n) => !resultIds.has(n.id)),
    bugCountermeasures: bugCountermeasures.filter((n) => !resultIds.has(n.id)),
    relatedQueries,
  };
}

/**
 * キーワードを抽出
 */
function extractKeywords(query: string): string[] {
  // 日本語と英語のストップワード
  const stopWords = new Set([
    'の',
    'に',
    'は',
    'を',
    'が',
    'と',
    'で',
    'て',
    'た',
    'する',
    'ある',
    'いる',
    'なる',
    'れる',
    'できる',
    'the',
    'a',
    'an',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'can',
    'and',
    'or',
    'but',
    'if',
    'then',
    'else',
    'when',
    'at',
    'by',
    'for',
    'with',
    'about',
    'against',
    'between',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'to',
    'from',
    'up',
    'down',
    'in',
    'out',
    'on',
    'off',
    'over',
    'under',
  ]);

  // クエリを単語に分割
  const words = query
    .toLowerCase()
    .split(/[\s\u3000]+/) // 半角・全角スペースで分割
    .filter((word) => word.length >= 2 && !stopWords.has(word));

  return [...new Set(words)]; // 重複を除去
}

/**
 * 関連クエリを生成
 */
function generateRelatedQueries(query: string, keywords: string[]): string[] {
  const relatedQueries: string[] = [];

  // キーワードベースの関連クエリ
  if (keywords.length >= 2) {
    // 2つのキーワードの組み合わせ
    for (let i = 0; i < Math.min(keywords.length, 3); i++) {
      for (let j = i + 1; j < Math.min(keywords.length, 3); j++) {
        relatedQueries.push(`${keywords[i]} ${keywords[j]}`);
      }
    }
  }

  // テスト関連のサジェスト
  if (query.includes('テスト') || query.includes('test')) {
    relatedQueries.push(`${keywords[0] || 'テスト'} ベストプラクティス`);
    relatedQueries.push(`${keywords[0] || 'テスト'} 設計技法`);
  }

  // バグ関連のサジェスト
  if (query.includes('バグ') || query.includes('bug') || query.includes('不具合')) {
    relatedQueries.push(`${keywords[0] || 'バグ'} 対策`);
    relatedQueries.push(`${keywords[0] || 'バグ'} 原因分析`);
  }

  return relatedQueries.slice(0, 5);
}

/**
 * RAGコンテキストを構築
 */
export async function buildRAGContextForQuery(
  query: string,
  options: {
    maxNodes?: number;
    includeRelationships?: boolean;
    relatedDepth?: number;
    nodeTypes?: KnowledgeNodeType[];
    categories?: KnowledgeCategory[];
  } = {}
): Promise<RAGContext> {
  return buildRAGContext(query, {
    maxNodes: options.maxNodes || 10,
    includeRelationships: options.includeRelationships !== false,
    relatedDepth: options.relatedDepth || 2,
    nodeTypes: options.nodeTypes,
    categories: options.categories,
  });
}

/**
 * サブグラフを可視化データに変換
 */
export function convertSubGraphToVisualization(subgraph: SubGraph): GraphVisualizationData {
  const nodes: VisualizationNode[] = subgraph.nodes.map((node) => ({
    id: String(node.id),
    label: node.title,
    type: node.type,
    category: node.category,
    categoryLabel: KNOWLEDGE_CATEGORY_INFO[node.category]?.label || node.category,
    description: node.description,
    metadata: node.metadata,
    size: CATEGORY_BASE_SIZES[node.category] || 8,
    color: NODE_TYPE_COLORS[node.type] || '#6b7280',
  }));

  const links: VisualizationLink[] = subgraph.relationships.map((rel) => ({
    source: String(rel.startNodeId),
    target: String(rel.endNodeId),
    type: rel.type,
    label: RELATIONSHIP_TYPE_INFO[rel.type]?.label || rel.type,
    weight: rel.weight || 1,
  }));

  return { nodes, links };
}

/**
 * ノードの詳細を取得
 */
export async function getNodeDetails(nodeId: number): Promise<{
  node: KnowledgeNode | null;
  relatedNodes: KnowledgeNode[];
  subgraph: SubGraph | null;
}> {
  const node = await getNodeById(nodeId);
  if (!node) {
    return { node: null, relatedNodes: [], subgraph: null };
  }

  const [relatedNodes, subgraph] = await Promise.all([
    findSimilarNodes(nodeId, 5),
    getSubGraph(nodeId, 1),
  ]);

  return { node, relatedNodes, subgraph };
}

/**
 * ノードタイプの色を取得
 */
export function getNodeTypeColor(type: KnowledgeNodeType): string {
  return NODE_TYPE_COLORS[type] || '#6b7280';
}

/**
 * カテゴリ情報を取得
 */
export function getCategoryInfo(category: KnowledgeCategory): {
  label: string;
  description: string;
} {
  return (
    KNOWLEDGE_CATEGORY_INFO[category] || {
      label: category,
      description: '',
    }
  );
}

/**
 * リレーションシップ情報を取得
 */
export function getRelationshipInfo(type: RelationshipType): {
  label: string;
  description: string;
} {
  return (
    RELATIONSHIP_TYPE_INFO[type] || {
      label: type,
      description: '',
    }
  );
}
