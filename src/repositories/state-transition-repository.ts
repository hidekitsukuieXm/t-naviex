/**
 * State Transition Repository
 *
 * 状態遷移・画面遷移図のデータアクセス層
 */

import { Prisma, DiagramType, CoverageType } from '@/generated/prisma';
import prisma from '@/lib/prisma';
import type {
  TransitionNode,
  TransitionEdge,
  DiagramMetadata,
  TransitionPath,
  CoverageItem,
  TestCaseCoverageMapping,
  PathType,
} from '@/types/state-transition';

// ========================================
// 遷移図関連
// ========================================

/**
 * 遷移図作成パラメータ
 */
export interface CreateDiagramParams {
  projectId: bigint;
  testCaseId?: bigint;
  name: string;
  description?: string;
  type: DiagramType;
  nodes: TransitionNode[];
  edges: TransitionEdge[];
  metadata?: DiagramMetadata;
}

/**
 * 遷移図更新パラメータ
 */
export interface UpdateDiagramParams {
  name?: string;
  description?: string;
  nodes?: TransitionNode[];
  edges?: TransitionEdge[];
  metadata?: DiagramMetadata;
  isActive?: boolean;
}

/**
 * 遷移図検索オプション
 */
export interface FindDiagramsOptions {
  projectId: bigint;
  type?: DiagramType;
  testCaseId?: bigint;
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
}

/**
 * 遷移図を作成
 */
export async function createDiagram(params: CreateDiagramParams) {
  const { projectId, testCaseId, name, description, type, nodes, edges, metadata } = params;

  return prisma.transitionDiagram.create({
    data: {
      projectId,
      testCaseId,
      name,
      description,
      type,
      nodes: nodes as unknown as Prisma.InputJsonValue,
      edges: edges as unknown as Prisma.InputJsonValue,
      metadata: metadata as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * 遷移図を取得
 */
export async function getDiagram(id: bigint) {
  return prisma.transitionDiagram.findUnique({
    where: { id },
    include: {
      generatedPaths: true,
      coverageAnalyses: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
}

/**
 * 遷移図を検索
 */
export async function findDiagrams(options: FindDiagramsOptions) {
  const { projectId, type, testCaseId, isActive = true, search, skip, take } = options;

  const where: Prisma.TransitionDiagramWhereInput = {
    projectId,
    isActive,
    ...(type && { type }),
    ...(testCaseId && { testCaseId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.transitionDiagram.findMany({
      where,
      skip,
      take,
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        _count: {
          select: { generatedPaths: true },
        },
      },
    }),
    prisma.transitionDiagram.count({ where }),
  ]);

  return { items, total };
}

/**
 * 遷移図を更新
 */
export async function updateDiagram(id: bigint, params: UpdateDiagramParams) {
  const { name, description, nodes, edges, metadata, isActive } = params;

  return prisma.transitionDiagram.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(nodes !== undefined && { nodes: nodes as unknown as Prisma.InputJsonValue }),
      ...(edges !== undefined && { edges: edges as unknown as Prisma.InputJsonValue }),
      ...(metadata !== undefined && { metadata: metadata as unknown as Prisma.InputJsonValue }),
      ...(isActive !== undefined && { isActive }),
    },
  });
}

/**
 * 遷移図を削除（論理削除）
 */
export async function deleteDiagram(id: bigint) {
  return prisma.transitionDiagram.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * ノードを追加
 */
export async function addNode(diagramId: bigint, node: TransitionNode) {
  const diagram = await prisma.transitionDiagram.findUnique({
    where: { id: diagramId },
    select: { nodes: true },
  });

  if (!diagram) {
    throw new Error('Diagram not found');
  }

  const nodes = diagram.nodes as unknown as TransitionNode[];
  nodes.push(node);

  return prisma.transitionDiagram.update({
    where: { id: diagramId },
    data: { nodes: nodes as unknown as Prisma.InputJsonValue },
  });
}

/**
 * ノードを更新
 */
export async function updateNode(
  diagramId: bigint,
  nodeId: string,
  updates: Partial<TransitionNode>
) {
  const diagram = await prisma.transitionDiagram.findUnique({
    where: { id: diagramId },
    select: { nodes: true },
  });

  if (!diagram) {
    throw new Error('Diagram not found');
  }

  const nodes = diagram.nodes as unknown as TransitionNode[];
  const nodeIndex = nodes.findIndex((n) => n.id === nodeId);

  if (nodeIndex === -1) {
    throw new Error('Node not found');
  }

  nodes[nodeIndex] = { ...nodes[nodeIndex], ...updates };

  return prisma.transitionDiagram.update({
    where: { id: diagramId },
    data: { nodes: nodes as unknown as Prisma.InputJsonValue },
  });
}

/**
 * ノードを削除
 */
export async function removeNode(diagramId: bigint, nodeId: string) {
  const diagram = await prisma.transitionDiagram.findUnique({
    where: { id: diagramId },
    select: { nodes: true, edges: true },
  });

  if (!diagram) {
    throw new Error('Diagram not found');
  }

  const nodes = (diagram.nodes as unknown as TransitionNode[]).filter((n) => n.id !== nodeId);
  const edges = (diagram.edges as unknown as TransitionEdge[]).filter(
    (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
  );

  return prisma.transitionDiagram.update({
    where: { id: diagramId },
    data: {
      nodes: nodes as unknown as Prisma.InputJsonValue,
      edges: edges as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * エッジを追加
 */
export async function addEdge(diagramId: bigint, edge: TransitionEdge) {
  const diagram = await prisma.transitionDiagram.findUnique({
    where: { id: diagramId },
    select: { edges: true },
  });

  if (!diagram) {
    throw new Error('Diagram not found');
  }

  const edges = diagram.edges as unknown as TransitionEdge[];
  edges.push(edge);

  return prisma.transitionDiagram.update({
    where: { id: diagramId },
    data: { edges: edges as unknown as Prisma.InputJsonValue },
  });
}

/**
 * エッジを更新
 */
export async function updateEdge(
  diagramId: bigint,
  edgeId: string,
  updates: Partial<TransitionEdge>
) {
  const diagram = await prisma.transitionDiagram.findUnique({
    where: { id: diagramId },
    select: { edges: true },
  });

  if (!diagram) {
    throw new Error('Diagram not found');
  }

  const edges = diagram.edges as unknown as TransitionEdge[];
  const edgeIndex = edges.findIndex((e) => e.id === edgeId);

  if (edgeIndex === -1) {
    throw new Error('Edge not found');
  }

  edges[edgeIndex] = { ...edges[edgeIndex], ...updates };

  return prisma.transitionDiagram.update({
    where: { id: diagramId },
    data: { edges: edges as unknown as Prisma.InputJsonValue },
  });
}

/**
 * エッジを削除
 */
export async function removeEdge(diagramId: bigint, edgeId: string) {
  const diagram = await prisma.transitionDiagram.findUnique({
    where: { id: diagramId },
    select: { edges: true },
  });

  if (!diagram) {
    throw new Error('Diagram not found');
  }

  const edges = (diagram.edges as unknown as TransitionEdge[]).filter((e) => e.id !== edgeId);

  return prisma.transitionDiagram.update({
    where: { id: diagramId },
    data: { edges: edges as unknown as Prisma.InputJsonValue },
  });
}

// ========================================
// パス生成関連
// ========================================

/**
 * パス作成パラメータ
 */
export interface CreatePathParams {
  diagramId: bigint;
  name: string;
  description?: string;
  nodeIds: string[];
  edgeIds: string[];
  pathLength: number;
  pathType: PathType;
  isLoop: boolean;
  coverage?: {
    coveredNodes: string[];
    coveredEdges: string[];
    uncoveredNodes: string[];
    uncoveredEdges: string[];
    nodesCoverage: number;
    edgesCoverage: number;
  };
}

/**
 * パスを作成
 */
export async function createPath(params: CreatePathParams) {
  const { diagramId, name, description, nodeIds, edgeIds, pathLength, pathType, isLoop, coverage } =
    params;

  return prisma.transitionPath.create({
    data: {
      diagramId,
      name,
      description,
      nodeIds: nodeIds as unknown as Prisma.InputJsonValue,
      edgeIds: edgeIds as unknown as Prisma.InputJsonValue,
      pathLength,
      pathType,
      isLoop,
      coverage: coverage as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * パスを一括作成
 */
export async function createPaths(paths: CreatePathParams[]) {
  return prisma.transitionPath.createMany({
    data: paths.map((p) => ({
      diagramId: p.diagramId,
      name: p.name,
      description: p.description,
      nodeIds: p.nodeIds as unknown as Prisma.InputJsonValue,
      edgeIds: p.edgeIds as unknown as Prisma.InputJsonValue,
      pathLength: p.pathLength,
      pathType: p.pathType,
      isLoop: p.isLoop,
      coverage: p.coverage as unknown as Prisma.InputJsonValue,
    })),
  });
}

/**
 * 図のパスを取得
 */
export async function getDiagramPaths(diagramId: bigint) {
  return prisma.transitionPath.findMany({
    where: { diagramId },
    orderBy: [{ pathLength: 'asc' }, { name: 'asc' }],
  });
}

/**
 * パスを削除（図単位）
 */
export async function deleteDiagramPaths(diagramId: bigint) {
  return prisma.transitionPath.deleteMany({
    where: { diagramId },
  });
}

/**
 * パスにテストケースをリンク
 */
export async function linkPathToTestCase(pathId: bigint, testCaseId: bigint) {
  return prisma.transitionPath.update({
    where: { id: pathId },
    data: { generatedTestCaseId: testCaseId },
  });
}

// ========================================
// カバレッジ分析関連
// ========================================

/**
 * カバレッジ分析作成パラメータ
 */
export interface CreateCoverageAnalysisParams {
  diagramId: bigint;
  coverageType: CoverageType;
  totalItems: number;
  coveredItems: number;
  coveragePercentage: number;
  items: CoverageItem[];
  testCaseMapping: TestCaseCoverageMapping[];
}

/**
 * カバレッジ分析を作成
 */
export async function createCoverageAnalysis(params: CreateCoverageAnalysisParams) {
  const {
    diagramId,
    coverageType,
    totalItems,
    coveredItems,
    coveragePercentage,
    items,
    testCaseMapping,
  } = params;

  return prisma.coverageAnalysis.create({
    data: {
      diagramId,
      coverageType,
      totalItems,
      coveredItems,
      coveragePercentage,
      items: items as unknown as Prisma.InputJsonValue,
      testCaseMapping: testCaseMapping as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * 最新のカバレッジ分析を取得
 */
export async function getLatestCoverageAnalysis(diagramId: bigint, coverageType?: CoverageType) {
  return prisma.coverageAnalysis.findFirst({
    where: {
      diagramId,
      ...(coverageType && { coverageType }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * カバレッジ分析履歴を取得
 */
export async function getCoverageAnalysisHistory(
  diagramId: bigint,
  coverageType?: CoverageType,
  limit: number = 10
) {
  return prisma.coverageAnalysis.findMany({
    where: {
      diagramId,
      ...(coverageType && { coverageType }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ========================================
// パス生成アルゴリズム
// ========================================

/**
 * 全パスを生成（DFS）
 */
export function generateAllPaths(
  nodes: TransitionNode[],
  edges: TransitionEdge[],
  startNodeId: string,
  endNodeIds: string[],
  maxLength: number = 20
): TransitionPath[] {
  const paths: TransitionPath[] = [];
  const adjacencyList = buildAdjacencyList(edges);

  function dfs(
    currentNodeId: string,
    visited: Set<string>,
    pathNodes: string[],
    pathEdges: string[]
  ) {
    if (pathNodes.length > maxLength) return;

    if (endNodeIds.includes(currentNodeId)) {
      paths.push({
        id: `path_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: `パス ${paths.length + 1}`,
        nodeIds: [...pathNodes],
        edgeIds: [...pathEdges],
        length: pathNodes.length,
        type: 'SIMPLE',
        isLoop: false,
      });
      return;
    }

    const outgoingEdges = adjacencyList.get(currentNodeId) || [];

    for (const edge of outgoingEdges) {
      if (!visited.has(edge.targetNodeId)) {
        visited.add(edge.targetNodeId);
        pathNodes.push(edge.targetNodeId);
        pathEdges.push(edge.id);

        dfs(edge.targetNodeId, visited, pathNodes, pathEdges);

        visited.delete(edge.targetNodeId);
        pathNodes.pop();
        pathEdges.pop();
      }
    }
  }

  const visited = new Set<string>([startNodeId]);
  dfs(startNodeId, visited, [startNodeId], []);

  return paths;
}

/**
 * 全ノードカバレッジパスを生成
 */
export function generateNodeCoveragePaths(
  nodes: TransitionNode[],
  edges: TransitionEdge[],
  startNodeId: string,
  endNodeIds: string[]
): TransitionPath[] {
  const allPaths = generateAllPaths(nodes, edges, startNodeId, endNodeIds);
  const coveredNodes = new Set<string>();
  const selectedPaths: TransitionPath[] = [];

  // 貪欲法で最小パスセットを選択
  while (coveredNodes.size < nodes.length) {
    let bestPath: TransitionPath | null = null;
    let bestNewCoverage = 0;

    for (const path of allPaths) {
      const newNodes = path.nodeIds.filter((id) => !coveredNodes.has(id));
      if (newNodes.length > bestNewCoverage) {
        bestNewCoverage = newNodes.length;
        bestPath = path;
      }
    }

    if (!bestPath) break;

    selectedPaths.push({
      ...bestPath,
      type: 'ALL_STATES',
    });

    bestPath.nodeIds.forEach((id) => coveredNodes.add(id));
  }

  return selectedPaths;
}

/**
 * 全エッジカバレッジパスを生成
 */
export function generateEdgeCoveragePaths(
  nodes: TransitionNode[],
  edges: TransitionEdge[],
  startNodeId: string,
  endNodeIds: string[]
): TransitionPath[] {
  const allPaths = generateAllPaths(nodes, edges, startNodeId, endNodeIds);
  const coveredEdges = new Set<string>();
  const selectedPaths: TransitionPath[] = [];

  while (coveredEdges.size < edges.length) {
    let bestPath: TransitionPath | null = null;
    let bestNewCoverage = 0;

    for (const path of allPaths) {
      const newEdges = path.edgeIds.filter((id) => !coveredEdges.has(id));
      if (newEdges.length > bestNewCoverage) {
        bestNewCoverage = newEdges.length;
        bestPath = path;
      }
    }

    if (!bestPath) break;

    selectedPaths.push({
      ...bestPath,
      type: 'ALL_TRANSITIONS',
    });

    bestPath.edgeIds.forEach((id) => coveredEdges.add(id));
  }

  return selectedPaths;
}

/**
 * 隣接リストを構築
 */
function buildAdjacencyList(edges: TransitionEdge[]): Map<string, TransitionEdge[]> {
  const adjacencyList = new Map<string, TransitionEdge[]>();

  for (const edge of edges) {
    if (!adjacencyList.has(edge.sourceNodeId)) {
      adjacencyList.set(edge.sourceNodeId, []);
    }
    adjacencyList.get(edge.sourceNodeId)!.push(edge);
  }

  return adjacencyList;
}

// ========================================
// 統計
// ========================================

/**
 * プロジェクトの遷移図統計を取得
 */
export async function getDiagramStats(projectId: bigint) {
  const [stateDiagramCount, screenDiagramCount, totalPathCount, avgCoverage] = await Promise.all([
    prisma.transitionDiagram.count({
      where: { projectId, type: 'STATE_TRANSITION', isActive: true },
    }),
    prisma.transitionDiagram.count({
      where: { projectId, type: 'SCREEN_TRANSITION', isActive: true },
    }),
    prisma.transitionPath.count({
      where: { diagram: { projectId } },
    }),
    prisma.coverageAnalysis.aggregate({
      where: { diagram: { projectId } },
      _avg: { coveragePercentage: true },
    }),
  ]);

  return {
    stateDiagramCount,
    screenDiagramCount,
    totalPathCount,
    avgCoverage: avgCoverage._avg.coveragePercentage || 0,
  };
}

/**
 * 遷移図の存在確認
 */
export async function hasDiagram(projectId: bigint, name: string): Promise<boolean> {
  const count = await prisma.transitionDiagram.count({
    where: { projectId, name, isActive: true },
  });
  return count > 0;
}
