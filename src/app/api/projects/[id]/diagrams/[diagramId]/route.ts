/**
 * Transition Diagram API
 *
 * GET /api/projects/:id/diagrams/:diagramId - 遷移図詳細取得
 * PUT /api/projects/:id/diagrams/:diagramId - 遷移図更新
 * DELETE /api/projects/:id/diagrams/:diagramId - 遷移図削除
 * POST /api/projects/:id/diagrams/:diagramId - 操作（paths生成, coverage分析等）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { CoverageType } from '@/generated/prisma';
import {
  getDiagram,
  updateDiagram,
  deleteDiagram,
  addNode,
  updateNode,
  removeNode,
  addEdge,
  updateEdge,
  removeEdge,
  getDiagramPaths,
  deleteDiagramPaths,
  createPaths,
  createCoverageAnalysis,
  generateAllPaths,
  generateNodeCoveragePaths,
  generateEdgeCoveragePaths,
} from '@/repositories/state-transition-repository';
import {
  TransitionNode,
  TransitionEdge,
  PathType,
  CoverageItem,
  TestCaseCoverageMapping,
} from '@/types/state-transition';

interface RouteParams {
  params: Promise<{ id: string; diagramId: string }>;
}

/**
 * GET /api/projects/:id/diagrams/:diagramId
 * 遷移図詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { diagramId } = await params;

  try {
    const diagram = await getDiagram(BigInt(diagramId));

    if (!diagram) {
      return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...diagram,
      id: diagram.id.toString(),
      projectId: diagram.projectId.toString(),
      testCaseId: diagram.testCaseId?.toString() || null,
      generatedPaths: diagram.generatedPaths.map((p) => ({
        ...p,
        id: p.id.toString(),
        diagramId: p.diagramId.toString(),
        generatedTestCaseId: p.generatedTestCaseId?.toString() || null,
      })),
      coverageAnalyses: diagram.coverageAnalyses.map((c) => ({
        ...c,
        id: c.id.toString(),
        diagramId: c.diagramId.toString(),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch diagram:', error);
    return NextResponse.json({ error: 'Failed to fetch diagram' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/:id/diagrams/:diagramId
 * 遷移図を更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { diagramId } = await params;

  try {
    const body = await request.json();
    const { name, description, nodes, edges, metadata } = body;

    const updated = await updateDiagram(BigInt(diagramId), {
      name,
      description,
      nodes,
      edges,
      metadata,
    });

    return NextResponse.json({
      ...updated,
      id: updated.id.toString(),
      projectId: updated.projectId.toString(),
      testCaseId: updated.testCaseId?.toString() || null,
    });
  } catch (error) {
    console.error('Failed to update diagram:', error);
    return NextResponse.json({ error: 'Failed to update diagram' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/:id/diagrams/:diagramId
 * 遷移図を削除（論理削除）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { diagramId } = await params;

  try {
    await deleteDiagram(BigInt(diagramId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete diagram:', error);
    return NextResponse.json({ error: 'Failed to delete diagram' }, { status: 500 });
  }
}

/**
 * POST /api/projects/:id/diagrams/:diagramId
 * 操作を実行
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { diagramId } = await params;
  const diagramIdBigInt = BigInt(diagramId);

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'addNode': {
        const { node } = body;
        if (!node) {
          return NextResponse.json({ error: 'Node is required' }, { status: 400 });
        }
        const result = await addNode(diagramIdBigInt, node as TransitionNode);
        return NextResponse.json({
          ...result,
          id: result.id.toString(),
          projectId: result.projectId.toString(),
          testCaseId: result.testCaseId?.toString() || null,
        });
      }

      case 'updateNode': {
        const { nodeId, updates } = body;
        if (!nodeId) {
          return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
        }
        const result = await updateNode(diagramIdBigInt, nodeId, updates);
        return NextResponse.json({
          ...result,
          id: result.id.toString(),
          projectId: result.projectId.toString(),
          testCaseId: result.testCaseId?.toString() || null,
        });
      }

      case 'removeNode': {
        const { nodeId } = body;
        if (!nodeId) {
          return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
        }
        const result = await removeNode(diagramIdBigInt, nodeId);
        return NextResponse.json({
          ...result,
          id: result.id.toString(),
          projectId: result.projectId.toString(),
          testCaseId: result.testCaseId?.toString() || null,
        });
      }

      case 'addEdge': {
        const { edge } = body;
        if (!edge) {
          return NextResponse.json({ error: 'Edge is required' }, { status: 400 });
        }
        const result = await addEdge(diagramIdBigInt, edge as TransitionEdge);
        return NextResponse.json({
          ...result,
          id: result.id.toString(),
          projectId: result.projectId.toString(),
          testCaseId: result.testCaseId?.toString() || null,
        });
      }

      case 'updateEdge': {
        const { edgeId, updates } = body;
        if (!edgeId) {
          return NextResponse.json({ error: 'Edge ID is required' }, { status: 400 });
        }
        const result = await updateEdge(diagramIdBigInt, edgeId, updates);
        return NextResponse.json({
          ...result,
          id: result.id.toString(),
          projectId: result.projectId.toString(),
          testCaseId: result.testCaseId?.toString() || null,
        });
      }

      case 'removeEdge': {
        const { edgeId } = body;
        if (!edgeId) {
          return NextResponse.json({ error: 'Edge ID is required' }, { status: 400 });
        }
        const result = await removeEdge(diagramIdBigInt, edgeId);
        return NextResponse.json({
          ...result,
          id: result.id.toString(),
          projectId: result.projectId.toString(),
          testCaseId: result.testCaseId?.toString() || null,
        });
      }

      case 'generatePaths': {
        const { coverageType, maxPathLength = 20 } = body;
        const diagram = await getDiagram(diagramIdBigInt);

        if (!diagram) {
          return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
        }

        const nodes = diagram.nodes as unknown as TransitionNode[];
        const edges = diagram.edges as unknown as TransitionEdge[];

        // 開始・終了ノードを検出
        const startNodes = nodes.filter((n) => n.type === 'START');
        const endNodes = nodes.filter((n) => n.type === 'END');

        const firstStartNode = startNodes[0];
        if (!firstStartNode) {
          return NextResponse.json({ error: '開始ノードが見つかりません' }, { status: 400 });
        }

        const startNodeId = firstStartNode.id;
        const endNodeIds = endNodes.length > 0 ? endNodes.map((n) => n.id) : nodes.map((n) => n.id);

        // 既存のパスを削除
        await deleteDiagramPaths(diagramIdBigInt);

        // カバレッジタイプに応じてパスを生成
        let paths;
        let pathType: PathType;

        switch (coverageType) {
          case 'NODE':
            paths = generateNodeCoveragePaths(nodes, edges, startNodeId, endNodeIds);
            pathType = 'ALL_STATES';
            break;
          case 'EDGE':
            paths = generateEdgeCoveragePaths(nodes, edges, startNodeId, endNodeIds);
            pathType = 'ALL_TRANSITIONS';
            break;
          default:
            paths = generateAllPaths(nodes, edges, startNodeId, endNodeIds, maxPathLength);
            pathType = 'SIMPLE';
        }

        // パスを保存
        if (paths.length > 0) {
          await createPaths(
            paths.map((p, i) => ({
              diagramId: diagramIdBigInt,
              name: p.name || `パス ${i + 1}`,
              description: undefined,
              nodeIds: p.nodeIds,
              edgeIds: p.edgeIds,
              pathLength: p.length,
              pathType: pathType,
              isLoop: p.isLoop,
            }))
          );
        }

        // 保存されたパスを取得
        const savedPaths = await getDiagramPaths(diagramIdBigInt);

        return NextResponse.json({
          paths: savedPaths.map((p) => ({
            ...p,
            id: p.id.toString(),
            diagramId: p.diagramId.toString(),
            generatedTestCaseId: p.generatedTestCaseId?.toString() || null,
          })),
          count: savedPaths.length,
        });
      }

      case 'analyzeCoverage': {
        const { coverageType, testCaseIds } = body;
        const diagram = await getDiagram(diagramIdBigInt);

        if (!diagram) {
          return NextResponse.json({ error: 'Diagram not found' }, { status: 404 });
        }

        const nodes = diagram.nodes as unknown as TransitionNode[];
        const edges = diagram.edges as unknown as TransitionEdge[];
        const paths = await getDiagramPaths(diagramIdBigInt);

        // カバレッジ計算
        let totalItems: number;
        let coveredItems: number;
        const items: CoverageItem[] = [];
        const testCaseMapping: TestCaseCoverageMapping[] = [];

        // テストケースIDがある場合は、対応するパスから被覆情報を取得
        const coveredNodeIds = new Set<string>();
        const coveredEdgeIds = new Set<string>();

        if (testCaseIds && testCaseIds.length > 0) {
          const linkedPaths = paths.filter(
            (p) => p.generatedTestCaseId && testCaseIds.includes(Number(p.generatedTestCaseId))
          );

          for (const path of linkedPaths) {
            const nodeIds = path.nodeIds as unknown as string[];
            const edgeIds = path.edgeIds as unknown as string[];

            nodeIds.forEach((id) => coveredNodeIds.add(id));
            edgeIds.forEach((id) => coveredEdgeIds.add(id));

            testCaseMapping.push({
              testCaseId: Number(path.generatedTestCaseId),
              coveredNodes: nodeIds,
              coveredEdges: edgeIds,
              coveredPaths: [path.id.toString()],
            });
          }
        }

        switch (coverageType || 'NODE') {
          case 'NODE':
            totalItems = nodes.length;
            coveredItems = coveredNodeIds.size;
            for (const node of nodes) {
              items.push({
                id: node.id,
                name: node.name,
                type: 'node',
                covered: coveredNodeIds.has(node.id),
                coveredByTestCases: testCaseMapping
                  .filter((m) => m.coveredNodes.includes(node.id))
                  .map((m) => m.testCaseId),
              });
            }
            break;

          case 'EDGE':
            totalItems = edges.length;
            coveredItems = coveredEdgeIds.size;
            for (const edge of edges) {
              items.push({
                id: edge.id,
                name: edge.label || `${edge.sourceNodeId} → ${edge.targetNodeId}`,
                type: 'edge',
                covered: coveredEdgeIds.has(edge.id),
                coveredByTestCases: testCaseMapping
                  .filter((m) => m.coveredEdges.includes(edge.id))
                  .map((m) => m.testCaseId),
              });
            }
            break;

          default:
            totalItems = nodes.length;
            coveredItems = coveredNodeIds.size;
        }

        const coveragePercentage = totalItems > 0 ? (coveredItems / totalItems) * 100 : 0;

        // カバレッジ分析を保存
        const analysis = await createCoverageAnalysis({
          diagramId: diagramIdBigInt,
          coverageType: (coverageType || 'NODE') as CoverageType,
          totalItems,
          coveredItems,
          coveragePercentage,
          items,
          testCaseMapping,
        });

        return NextResponse.json({
          ...analysis,
          id: analysis.id.toString(),
          diagramId: analysis.diagramId.toString(),
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to execute action:', error);
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}
