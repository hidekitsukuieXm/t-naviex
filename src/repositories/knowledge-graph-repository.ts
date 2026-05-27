/**
 * Knowledge Graph Repository
 *
 * Neo4jを使用したナレッジグラフのCRUD操作
 */

import {
  readQuery,
  writeQuery,
  runInTransaction,
  verifyConnection,
  createIndexes,
} from '@/lib/neo4j';
import {
  type KnowledgeNode,
  type KnowledgeNodeType,
  type KnowledgeCategory,
  type KnowledgeRelationship,
  type RelationshipType,
  type CreateKnowledgeNodeInput,
  type CreateTestCaseNodeInput,
  type CreateTestStepNodeInput,
  type CreateBugNodeInput,
  type CreateBestPracticeNodeInput,
  type CreateTestDesignKnowledgeNodeInput,
  type CreateBugCountermeasureNodeInput,
  type CreateRelationshipInput,
  type GraphSearchParams,
  type GraphSearchResult,
  type SubGraph,
  type RAGContext,
} from '@/types/knowledge-graph';

// ========================================
// Connection Management
// ========================================

/**
 * Neo4j接続確認
 */
export async function checkConnection(): Promise<boolean> {
  return verifyConnection();
}

/**
 * インデックス作成
 */
export async function initializeIndexes(): Promise<void> {
  await createIndexes();
}

// ========================================
// Node CRUD Operations
// ========================================

/**
 * ナレッジノードを作成
 */
export async function createKnowledgeNode(input: CreateKnowledgeNodeInput): Promise<KnowledgeNode> {
  const cypher = `
    CREATE (n:Knowledge:${input.type} {
      type: $type,
      category: $category,
      sourceId: $sourceId,
      title: $title,
      content: $content,
      description: $description,
      metadata: $metadata,
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN n, id(n) as nodeId
  `;

  const result = await writeQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, {
    type: input.type,
    category: input.category,
    sourceId: input.sourceId,
    title: input.title,
    content: input.content || null,
    description: input.description || null,
    metadata: JSON.stringify(input.metadata || {}),
  });

  if (result.length === 0) {
    throw new Error('ノードの作成に失敗しました');
  }

  const node = result[0].n;
  return {
    ...node,
    id: result[0].nodeId,
    metadata: input.metadata || {},
  };
}

/**
 * テストケースノードを作成
 */
export async function createTestCaseNode(input: CreateTestCaseNodeInput): Promise<KnowledgeNode> {
  const cypher = `
    CREATE (n:Knowledge:TestCase {
      type: 'TestCase',
      category: 'TEST_ASSET',
      sourceId: $sourceId,
      title: $title,
      content: $content,
      description: $description,
      testSpecId: $testSpecId,
      priority: $priority,
      testType: $testType,
      preconditions: $preconditions,
      tags: $tags,
      metadata: $metadata,
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN n, id(n) as nodeId
  `;

  const result = await writeQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, {
    sourceId: input.sourceId,
    title: input.title,
    content: input.content || null,
    description: input.description || null,
    testSpecId: input.testSpecId,
    priority: input.priority,
    testType: input.testType,
    preconditions: input.preconditions || null,
    tags: input.tags || [],
    metadata: JSON.stringify(input.metadata || {}),
  });

  if (result.length === 0) {
    throw new Error('テストケースノードの作成に失敗しました');
  }

  return {
    ...result[0].n,
    id: result[0].nodeId,
    metadata: input.metadata || {},
  };
}

/**
 * テストステップノードを作成
 */
export async function createTestStepNode(input: CreateTestStepNodeInput): Promise<KnowledgeNode> {
  const cypher = `
    CREATE (n:Knowledge:TestStep {
      type: 'TestStep',
      category: 'TEST_ASSET',
      sourceId: $sourceId,
      title: $title,
      content: $content,
      description: $description,
      testCaseId: $testCaseId,
      stepNo: $stepNo,
      action: $action,
      expectedResult: $expectedResult,
      metadata: $metadata,
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN n, id(n) as nodeId
  `;

  const result = await writeQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, {
    sourceId: input.sourceId,
    title: input.title,
    content: input.content || null,
    description: input.description || null,
    testCaseId: input.testCaseId,
    stepNo: input.stepNo,
    action: input.action,
    expectedResult: input.expectedResult || null,
    metadata: JSON.stringify(input.metadata || {}),
  });

  if (result.length === 0) {
    throw new Error('テストステップノードの作成に失敗しました');
  }

  return {
    ...result[0].n,
    id: result[0].nodeId,
    metadata: input.metadata || {},
  };
}

/**
 * バグノードを作成
 */
export async function createBugNode(input: CreateBugNodeInput): Promise<KnowledgeNode> {
  const cypher = `
    CREATE (n:Knowledge:Bug {
      type: 'Bug',
      category: 'DEFECT',
      sourceId: $sourceId,
      title: $title,
      content: $content,
      description: $description,
      bugId: $bugId,
      severity: $severity,
      status: $status,
      rootCause: $rootCause,
      resolution: $resolution,
      metadata: $metadata,
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN n, id(n) as nodeId
  `;

  const result = await writeQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, {
    sourceId: input.sourceId,
    title: input.title,
    content: input.content || null,
    description: input.description || null,
    bugId: input.bugId,
    severity: input.severity,
    status: input.status,
    rootCause: input.rootCause || null,
    resolution: input.resolution || null,
    metadata: JSON.stringify(input.metadata || {}),
  });

  if (result.length === 0) {
    throw new Error('バグノードの作成に失敗しました');
  }

  return {
    ...result[0].n,
    id: result[0].nodeId,
    metadata: input.metadata || {},
  };
}

/**
 * ベストプラクティスノードを作成
 */
export async function createBestPracticeNode(
  input: CreateBestPracticeNodeInput
): Promise<KnowledgeNode> {
  const cypher = `
    CREATE (n:Knowledge:BestPractice {
      type: 'BestPractice',
      category: 'BEST_PRACTICE',
      sourceId: $sourceId,
      title: $title,
      content: $content,
      description: $description,
      practiceCategory: $practiceCategory,
      applicability: $applicability,
      examples: $examples,
      metadata: $metadata,
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN n, id(n) as nodeId
  `;

  const result = await writeQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, {
    sourceId: input.sourceId,
    title: input.title,
    content: input.content || null,
    description: input.description || null,
    practiceCategory: input.practiceCategory,
    applicability: input.applicability || [],
    examples: input.examples || [],
    metadata: JSON.stringify(input.metadata || {}),
  });

  if (result.length === 0) {
    throw new Error('ベストプラクティスノードの作成に失敗しました');
  }

  return {
    ...result[0].n,
    id: result[0].nodeId,
    metadata: input.metadata || {},
  };
}

/**
 * テスト設計知識ノードを作成
 */
export async function createTestDesignKnowledgeNode(
  input: CreateTestDesignKnowledgeNodeInput
): Promise<KnowledgeNode> {
  const cypher = `
    CREATE (n:Knowledge:TestDesignKnowledge {
      type: 'TestDesignKnowledge',
      category: 'DESIGN_KNOWLEDGE',
      sourceId: $sourceId,
      title: $title,
      content: $content,
      description: $description,
      technique: $technique,
      applicableScenarios: $applicableScenarios,
      considerations: $considerations,
      metadata: $metadata,
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN n, id(n) as nodeId
  `;

  const result = await writeQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, {
    sourceId: input.sourceId,
    title: input.title,
    content: input.content || null,
    description: input.description || null,
    technique: input.technique,
    applicableScenarios: input.applicableScenarios || [],
    considerations: input.considerations || [],
    metadata: JSON.stringify(input.metadata || {}),
  });

  if (result.length === 0) {
    throw new Error('テスト設計知識ノードの作成に失敗しました');
  }

  return {
    ...result[0].n,
    id: result[0].nodeId,
    metadata: input.metadata || {},
  };
}

/**
 * バグ対策ノードを作成
 */
export async function createBugCountermeasureNode(
  input: CreateBugCountermeasureNodeInput
): Promise<KnowledgeNode> {
  const cypher = `
    CREATE (n:Knowledge:BugCountermeasure {
      type: 'BugCountermeasure',
      category: 'COUNTERMEASURE',
      sourceId: $sourceId,
      title: $title,
      content: $content,
      description: $description,
      targetBugPattern: $targetBugPattern,
      preventionMethods: $preventionMethods,
      detectionMethods: $detectionMethods,
      metadata: $metadata,
      createdAt: datetime(),
      updatedAt: datetime()
    })
    RETURN n, id(n) as nodeId
  `;

  const result = await writeQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, {
    sourceId: input.sourceId,
    title: input.title,
    content: input.content || null,
    description: input.description || null,
    targetBugPattern: input.targetBugPattern,
    preventionMethods: input.preventionMethods || [],
    detectionMethods: input.detectionMethods || [],
    metadata: JSON.stringify(input.metadata || {}),
  });

  if (result.length === 0) {
    throw new Error('バグ対策ノードの作成に失敗しました');
  }

  return {
    ...result[0].n,
    id: result[0].nodeId,
    metadata: input.metadata || {},
  };
}

/**
 * ノードをIDで取得
 */
export async function getNodeById(nodeId: number): Promise<KnowledgeNode | null> {
  const cypher = `
    MATCH (n:Knowledge)
    WHERE id(n) = $nodeId
    RETURN n, id(n) as nodeId
  `;

  const result = await readQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, { nodeId });

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0].n,
    id: result[0].nodeId,
  };
}

/**
 * ノードをソースIDで取得
 */
export async function getNodeBySourceId(sourceId: string): Promise<KnowledgeNode | null> {
  const cypher = `
    MATCH (n:Knowledge {sourceId: $sourceId})
    RETURN n, id(n) as nodeId
  `;

  const result = await readQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, { sourceId });

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0].n,
    id: result[0].nodeId,
  };
}

/**
 * ノードをタイプで取得
 */
export async function getNodesByType(
  type: KnowledgeNodeType,
  limit: number = 100,
  offset: number = 0
): Promise<KnowledgeNode[]> {
  const cypher = `
    MATCH (n:Knowledge {type: $type})
    RETURN n, id(n) as nodeId
    ORDER BY n.createdAt DESC
    SKIP $offset
    LIMIT $limit
  `;

  const result = await readQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, {
    type,
    limit,
    offset,
  });

  return result.map((r) => ({
    ...r.n,
    id: r.nodeId,
  }));
}

/**
 * ノードをカテゴリで取得
 */
export async function getNodesByCategory(
  category: KnowledgeCategory,
  limit: number = 100,
  offset: number = 0
): Promise<KnowledgeNode[]> {
  const cypher = `
    MATCH (n:Knowledge {category: $category})
    RETURN n, id(n) as nodeId
    ORDER BY n.createdAt DESC
    SKIP $offset
    LIMIT $limit
  `;

  const result = await readQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, {
    category,
    limit,
    offset,
  });

  return result.map((r) => ({
    ...r.n,
    id: r.nodeId,
  }));
}

/**
 * ノードを更新
 */
export async function updateNode(
  nodeId: number,
  updates: Partial<CreateKnowledgeNodeInput>
): Promise<KnowledgeNode | null> {
  const setClauses: string[] = ['n.updatedAt = datetime()'];
  const params: Record<string, unknown> = { nodeId };

  if (updates.title !== undefined) {
    setClauses.push('n.title = $title');
    params.title = updates.title;
  }
  if (updates.content !== undefined) {
    setClauses.push('n.content = $content');
    params.content = updates.content;
  }
  if (updates.description !== undefined) {
    setClauses.push('n.description = $description');
    params.description = updates.description;
  }
  if (updates.metadata !== undefined) {
    setClauses.push('n.metadata = $metadata');
    params.metadata = JSON.stringify(updates.metadata);
  }

  const cypher = `
    MATCH (n:Knowledge)
    WHERE id(n) = $nodeId
    SET ${setClauses.join(', ')}
    RETURN n, id(n) as nodeId
  `;

  const result = await writeQuery<{ n: KnowledgeNode; nodeId: number }>(cypher, params);

  if (result.length === 0) {
    return null;
  }

  return {
    ...result[0].n,
    id: result[0].nodeId,
  };
}

/**
 * ノードを削除
 */
export async function deleteNode(nodeId: number): Promise<boolean> {
  const cypher = `
    MATCH (n:Knowledge)
    WHERE id(n) = $nodeId
    DETACH DELETE n
    RETURN count(n) as deleted
  `;

  const result = await writeQuery<{ deleted: number }>(cypher, { nodeId });
  return result.length > 0 && result[0].deleted > 0;
}

// ========================================
// Relationship CRUD Operations
// ========================================

/**
 * リレーションシップを作成
 */
export async function createRelationship(
  input: CreateRelationshipInput
): Promise<KnowledgeRelationship> {
  const cypher = `
    MATCH (start:Knowledge), (end:Knowledge)
    WHERE id(start) = $startNodeId AND id(end) = $endNodeId
    CREATE (start)-[r:${input.type} {
      properties: $properties,
      weight: $weight,
      createdAt: datetime()
    }]->(end)
    RETURN r, id(r) as relId, id(start) as startId, id(end) as endId
  `;

  const result = await writeQuery<{
    r: KnowledgeRelationship;
    relId: number;
    startId: number;
    endId: number;
  }>(cypher, {
    startNodeId: input.startNodeId,
    endNodeId: input.endNodeId,
    properties: JSON.stringify(input.properties || {}),
    weight: input.weight ?? 1.0,
  });

  if (result.length === 0) {
    throw new Error('リレーションシップの作成に失敗しました');
  }

  return {
    id: result[0].relId,
    type: input.type,
    startNodeId: result[0].startId,
    endNodeId: result[0].endId,
    properties: input.properties || {},
    weight: input.weight ?? 1.0,
    createdAt: new Date(),
  };
}

/**
 * ノード間のリレーションシップを取得
 */
export async function getRelationshipsBetween(
  startNodeId: number,
  endNodeId: number
): Promise<KnowledgeRelationship[]> {
  const cypher = `
    MATCH (start:Knowledge)-[r]->(end:Knowledge)
    WHERE id(start) = $startNodeId AND id(end) = $endNodeId
    RETURN r, type(r) as relType, id(r) as relId, id(start) as startId, id(end) as endId
  `;

  const result = await readQuery<{
    r: KnowledgeRelationship;
    relType: string;
    relId: number;
    startId: number;
    endId: number;
  }>(cypher, { startNodeId, endNodeId });

  return result.map((r) => ({
    id: r.relId,
    type: r.relType as RelationshipType,
    startNodeId: r.startId,
    endNodeId: r.endId,
    properties: r.r.properties || {},
    weight: r.r.weight,
    createdAt: r.r.createdAt,
  }));
}

/**
 * ノードの全リレーションシップを取得
 */
export async function getNodeRelationships(nodeId: number): Promise<KnowledgeRelationship[]> {
  const cypher = `
    MATCH (n:Knowledge)-[r]-(other:Knowledge)
    WHERE id(n) = $nodeId
    RETURN r, type(r) as relType, id(r) as relId,
           id(startNode(r)) as startId, id(endNode(r)) as endId
  `;

  const result = await readQuery<{
    r: KnowledgeRelationship;
    relType: string;
    relId: number;
    startId: number;
    endId: number;
  }>(cypher, { nodeId });

  return result.map((r) => ({
    id: r.relId,
    type: r.relType as RelationshipType,
    startNodeId: r.startId,
    endNodeId: r.endId,
    properties: r.r.properties || {},
    weight: r.r.weight,
    createdAt: r.r.createdAt,
  }));
}

/**
 * リレーションシップを削除
 */
export async function deleteRelationship(relationshipId: number): Promise<boolean> {
  const cypher = `
    MATCH ()-[r]->()
    WHERE id(r) = $relationshipId
    DELETE r
    RETURN count(r) as deleted
  `;

  const result = await writeQuery<{ deleted: number }>(cypher, { relationshipId });
  return result.length > 0 && result[0].deleted > 0;
}

// ========================================
// Search Operations
// ========================================

/**
 * フルテキスト検索
 */
export async function searchNodes(params: GraphSearchParams): Promise<GraphSearchResult[]> {
  let cypher: string;
  const cypherParams: Record<string, unknown> = {
    query: params.query,
    limit: params.limit || 10,
  };

  // フルテキストインデックスを使用した検索
  if (params.nodeTypes && params.nodeTypes.length > 0) {
    cypherParams.nodeTypes = params.nodeTypes;
    cypher = `
      CALL db.index.fulltext.queryNodes('knowledge_fulltext', $query)
      YIELD node, score
      WHERE node.type IN $nodeTypes
      ${params.minScore ? 'AND score >= $minScore' : ''}
      RETURN node, score, id(node) as nodeId
      ORDER BY score DESC
      LIMIT $limit
    `;
    if (params.minScore) cypherParams.minScore = params.minScore;
  } else if (params.categories && params.categories.length > 0) {
    cypherParams.categories = params.categories;
    cypher = `
      CALL db.index.fulltext.queryNodes('knowledge_fulltext', $query)
      YIELD node, score
      WHERE node.category IN $categories
      ${params.minScore ? 'AND score >= $minScore' : ''}
      RETURN node, score, id(node) as nodeId
      ORDER BY score DESC
      LIMIT $limit
    `;
    if (params.minScore) cypherParams.minScore = params.minScore;
  } else {
    cypher = `
      CALL db.index.fulltext.queryNodes('knowledge_fulltext', $query)
      YIELD node, score
      ${params.minScore ? 'WHERE score >= $minScore' : ''}
      RETURN node, score, id(node) as nodeId
      ORDER BY score DESC
      LIMIT $limit
    `;
    if (params.minScore) cypherParams.minScore = params.minScore;
  }

  const result = await readQuery<{ node: KnowledgeNode; score: number; nodeId: number }>(
    cypher,
    cypherParams
  );

  const searchResults: GraphSearchResult[] = [];

  for (const r of result) {
    const searchResult: GraphSearchResult = {
      node: { ...r.node, id: r.nodeId },
      score: r.score,
    };

    // 関連ノードを取得（オプション）
    if (params.includeRelated) {
      const depth = params.relatedDepth || 1;
      const relatedCypher = `
        MATCH (n:Knowledge)-[r*1..${depth}]-(related:Knowledge)
        WHERE id(n) = $nodeId
        RETURN DISTINCT related, id(related) as relatedId
        LIMIT 10
      `;
      const relatedResult = await readQuery<{ related: KnowledgeNode; relatedId: number }>(
        relatedCypher,
        { nodeId: r.nodeId }
      );

      searchResult.relatedNodes = relatedResult.map((rel) => ({
        ...rel.related,
        id: rel.relatedId,
      }));
    }

    searchResults.push(searchResult);
  }

  return searchResults;
}

/**
 * 類似ノード検索（将来的にembeddingを使用）
 */
export async function findSimilarNodes(
  nodeId: number,
  limit: number = 5
): Promise<KnowledgeNode[]> {
  // 現在は同じカテゴリ・タイプのノードを返す
  // 将来的にはembedding類似度検索を実装
  const cypher = `
    MATCH (n:Knowledge)
    WHERE id(n) = $nodeId
    WITH n
    MATCH (similar:Knowledge)
    WHERE similar.type = n.type
      AND similar.category = n.category
      AND id(similar) <> id(n)
    RETURN similar, id(similar) as similarId
    LIMIT $limit
  `;

  const result = await readQuery<{ similar: KnowledgeNode; similarId: number }>(cypher, {
    nodeId,
    limit,
  });

  return result.map((r) => ({
    ...r.similar,
    id: r.similarId,
  }));
}

// ========================================
// Graph Traversal Operations
// ========================================

/**
 * サブグラフを取得
 */
export async function getSubGraph(centerNodeId: number, depth: number = 2): Promise<SubGraph> {
  const cypher = `
    MATCH path = (center:Knowledge)-[r*0..${depth}]-(connected:Knowledge)
    WHERE id(center) = $centerNodeId
    WITH collect(DISTINCT connected) as nodes, collect(DISTINCT r) as rels
    UNWIND nodes as n
    WITH nodes, rels, collect({node: n, nodeId: id(n)}) as nodeData
    UNWIND rels as relList
    UNWIND relList as rel
    WITH nodeData, collect(DISTINCT {
      rel: rel,
      relId: id(rel),
      type: type(rel),
      startId: id(startNode(rel)),
      endId: id(endNode(rel))
    }) as relData
    RETURN nodeData, relData
  `;

  const result = await readQuery<{
    nodeData: Array<{ node: KnowledgeNode; nodeId: number }>;
    relData: Array<{
      rel: KnowledgeRelationship;
      relId: number;
      type: string;
      startId: number;
      endId: number;
    }>;
  }>(cypher, { centerNodeId });

  if (result.length === 0) {
    return { nodes: [], relationships: [], centerNodeId };
  }

  const nodes = result[0].nodeData.map((nd) => ({
    ...nd.node,
    id: nd.nodeId,
  }));

  const relationships = result[0].relData.map((rd) => ({
    id: rd.relId,
    type: rd.type as RelationshipType,
    startNodeId: rd.startId,
    endNodeId: rd.endId,
    properties: rd.rel.properties || {},
    weight: rd.rel.weight,
    createdAt: rd.rel.createdAt,
  }));

  return {
    nodes,
    relationships,
    centerNodeId,
  };
}

/**
 * 2ノード間の最短パスを取得
 */
export async function getShortestPath(
  startNodeId: number,
  endNodeId: number,
  maxDepth: number = 5
): Promise<{ nodes: KnowledgeNode[]; relationships: KnowledgeRelationship[] } | null> {
  const cypher = `
    MATCH path = shortestPath((start:Knowledge)-[*..${maxDepth}]-(end:Knowledge))
    WHERE id(start) = $startNodeId AND id(end) = $endNodeId
    RETURN nodes(path) as pathNodes, relationships(path) as pathRels
  `;

  const result = await readQuery<{
    pathNodes: KnowledgeNode[];
    pathRels: KnowledgeRelationship[];
  }>(cypher, { startNodeId, endNodeId });

  if (result.length === 0) {
    return null;
  }

  return {
    nodes: result[0].pathNodes,
    relationships: result[0].pathRels,
  };
}

// ========================================
// RAG Context Operations
// ========================================

/**
 * RAGコンテキストを構築
 */
export async function buildRAGContext(
  query: string,
  options: {
    maxNodes?: number;
    includeTypes?: KnowledgeNodeType[];
    includeCategories?: KnowledgeCategory[];
  } = {}
): Promise<RAGContext> {
  const searchParams: GraphSearchParams = {
    query,
    limit: options.maxNodes || 10,
    nodeTypes: options.includeTypes,
    categories: options.includeCategories,
    includeRelated: true,
    relatedDepth: 1,
  };

  const searchResults = await searchNodes(searchParams);

  const relevantNodes: KnowledgeNode[] = [];
  const relationships: KnowledgeRelationship[] = [];
  let totalScore = 0;

  for (const result of searchResults) {
    relevantNodes.push(result.node);
    totalScore += result.score;

    if (result.relatedNodes) {
      for (const related of result.relatedNodes) {
        if (!relevantNodes.find((n) => n.id === related.id)) {
          relevantNodes.push(related);
        }
      }
    }

    if (result.relationships) {
      for (const rel of result.relationships) {
        if (!relationships.find((r) => r.id === rel.id)) {
          relationships.push(rel);
        }
      }
    }
  }

  // 関連ノード間のリレーションシップを取得
  for (const node of relevantNodes) {
    const nodeRels = await getNodeRelationships(node.id);
    for (const rel of nodeRels) {
      if (
        !relationships.find((r) => r.id === rel.id) &&
        relevantNodes.find((n) => n.id === rel.startNodeId) &&
        relevantNodes.find((n) => n.id === rel.endNodeId)
      ) {
        relationships.push(rel);
      }
    }
  }

  return {
    relevantNodes,
    relationships,
    totalScore,
    contextSummary: `${relevantNodes.length}件の関連ノードと${relationships.length}件のリレーションシップを検出`,
  };
}

// ========================================
// Bulk Operations
// ========================================

/**
 * 複数ノードを一括作成
 */
export async function bulkCreateNodes(
  inputs: CreateKnowledgeNodeInput[]
): Promise<KnowledgeNode[]> {
  const queries = inputs.map((input) => ({
    cypher: `
      CREATE (n:Knowledge:${input.type} {
        type: $type,
        category: $category,
        sourceId: $sourceId,
        title: $title,
        content: $content,
        description: $description,
        metadata: $metadata,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN n, id(n) as nodeId
    `,
    params: {
      type: input.type,
      category: input.category,
      sourceId: input.sourceId,
      title: input.title,
      content: input.content || null,
      description: input.description || null,
      metadata: JSON.stringify(input.metadata || {}),
    },
  }));

  const results = await runInTransaction<{ n: KnowledgeNode; nodeId: number }>(queries);

  return results.flatMap((resultSet) =>
    resultSet.map((r) => ({
      ...r.n,
      id: r.nodeId,
    }))
  );
}

/**
 * 複数リレーションシップを一括作成
 */
export async function bulkCreateRelationships(
  inputs: CreateRelationshipInput[]
): Promise<KnowledgeRelationship[]> {
  const relationships: KnowledgeRelationship[] = [];

  for (const input of inputs) {
    const rel = await createRelationship(input);
    relationships.push(rel);
  }

  return relationships;
}

/**
 * ソースIDに基づくノードの削除
 */
export async function deleteNodesBySourceId(sourceId: string): Promise<number> {
  const cypher = `
    MATCH (n:Knowledge {sourceId: $sourceId})
    DETACH DELETE n
    RETURN count(n) as deleted
  `;

  const result = await writeQuery<{ deleted: number }>(cypher, { sourceId });
  return result.length > 0 ? result[0].deleted : 0;
}

// ========================================
// Statistics Operations
// ========================================

/**
 * グラフ統計情報を取得
 */
export async function getGraphStatistics(): Promise<{
  totalNodes: number;
  nodesByType: Record<string, number>;
  nodesByCategory: Record<string, number>;
  totalRelationships: number;
  relationshipsByType: Record<string, number>;
}> {
  const nodeCountCypher = `
    MATCH (n:Knowledge)
    RETURN count(n) as total,
           n.type as type,
           n.category as category
  `;

  const relCountCypher = `
    MATCH ()-[r]->()
    RETURN count(r) as total, type(r) as type
  `;

  const nodeResults = await readQuery<{ total: number; type: string; category: string }>(
    nodeCountCypher
  );
  const relResults = await readQuery<{ total: number; type: string }>(relCountCypher);

  const nodesByType: Record<string, number> = {};
  const nodesByCategory: Record<string, number> = {};
  let totalNodes = 0;

  for (const r of nodeResults) {
    totalNodes += r.total;
    nodesByType[r.type] = (nodesByType[r.type] || 0) + r.total;
    nodesByCategory[r.category] = (nodesByCategory[r.category] || 0) + r.total;
  }

  const relationshipsByType: Record<string, number> = {};
  let totalRelationships = 0;

  for (const r of relResults) {
    totalRelationships += r.total;
    relationshipsByType[r.type] = r.total;
  }

  return {
    totalNodes,
    nodesByType,
    nodesByCategory,
    totalRelationships,
    relationshipsByType,
  };
}
