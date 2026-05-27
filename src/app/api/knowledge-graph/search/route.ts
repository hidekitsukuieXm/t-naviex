/**
 * Knowledge Graph Search API
 *
 * GET  /api/knowledge-graph/search - ナレッジグラフ検索
 * POST /api/knowledge-graph/search - RAGコンテキスト構築
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  searchNodes,
  buildRAGContext,
  findSimilarNodes,
  getSubGraph,
} from '@/repositories/knowledge-graph-repository';
import {
  KnowledgeNodeType,
  KnowledgeCategory,
  isValidNodeType,
  isValidCategory,
} from '@/types/knowledge-graph';

/**
 * GET /api/knowledge-graph/search
 * ナレッジグラフを検索
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const nodeTypesParam = searchParams.get('nodeTypes');
    const categoriesParam = searchParams.get('categories');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const minScore = parseFloat(searchParams.get('minScore') || '0');
    const includeRelated = searchParams.get('includeRelated') === 'true';
    const relatedDepth = parseInt(searchParams.get('relatedDepth') || '1', 10);

    // ノードタイプのパース
    let nodeTypes: KnowledgeNodeType[] | undefined;
    if (nodeTypesParam) {
      const types = nodeTypesParam.split(',').filter((t) => isValidNodeType(t));
      if (types.length > 0) {
        nodeTypes = types as KnowledgeNodeType[];
      }
    }

    // カテゴリのパース
    let categories: KnowledgeCategory[] | undefined;
    if (categoriesParam) {
      const cats = categoriesParam.split(',').filter((c) => isValidCategory(c));
      if (cats.length > 0) {
        categories = cats as KnowledgeCategory[];
      }
    }

    // 検索実行
    const results = await searchNodes({
      query,
      nodeTypes,
      categories,
      limit: Math.min(limit, 100),
      minScore,
      includeRelated,
      relatedDepth: Math.min(relatedDepth, 3),
    });

    return NextResponse.json({
      query,
      results,
      total: results.length,
      filters: {
        nodeTypes: nodeTypes || [],
        categories: categories || [],
        minScore,
        includeRelated,
        relatedDepth,
      },
    });
  } catch (error) {
    console.error('Failed to search knowledge graph:', error);
    return NextResponse.json({ error: 'Failed to search knowledge graph' }, { status: 500 });
  }
}

/**
 * POST /api/knowledge-graph/search
 * RAGコンテキストを構築または詳細検索
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, query, nodeId, options = {} } = body;

    switch (action) {
      case 'rag-context': {
        // RAGコンテキスト構築
        if (!query) {
          return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const context = await buildRAGContext(query, {
          maxNodes: options.maxNodes || 10,
          includeRelationships: options.includeRelationships !== false,
          relatedDepth: options.relatedDepth || 2,
          nodeTypes: options.nodeTypes,
          categories: options.categories,
        });

        return NextResponse.json({ context });
      }

      case 'similar': {
        // 類似ノード検索
        if (!nodeId) {
          return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
        }

        const similarNodes = await findSimilarNodes(nodeId, options.limit || 10);

        return NextResponse.json({ similarNodes });
      }

      case 'subgraph': {
        // サブグラフ取得
        if (!nodeId) {
          return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
        }

        const subgraph = await getSubGraph(nodeId, options.depth || 2);

        return NextResponse.json({ subgraph });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to process knowledge graph search:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
