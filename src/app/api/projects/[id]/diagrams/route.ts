/**
 * Transition Diagrams API
 *
 * GET /api/projects/:id/diagrams - 遷移図一覧取得
 * POST /api/projects/:id/diagrams - 遷移図作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DiagramType } from '@/generated/prisma';
import {
  createDiagram,
  findDiagrams,
  hasDiagram,
} from '@/repositories/state-transition-repository';
import {
  TransitionNode,
  TransitionEdge,
  createEmptyStateDiagram,
  createEmptyScreenDiagram,
} from '@/types/state-transition';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/:id/diagrams
 * 遷移図一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const projectId = BigInt(id);

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') as DiagramType | null;
  const testCaseId = searchParams.get('testCaseId');
  const search = searchParams.get('search') || undefined;
  const skip = parseInt(searchParams.get('skip') || '0', 10);
  const take = parseInt(searchParams.get('take') || '20', 10);

  try {
    const result = await findDiagrams({
      projectId,
      type: type || undefined,
      testCaseId: testCaseId ? BigInt(testCaseId) : undefined,
      search,
      skip,
      take,
    });

    // BigIntをstringに変換
    const items = result.items.map((item) => ({
      ...item,
      id: item.id.toString(),
      projectId: item.projectId.toString(),
      testCaseId: item.testCaseId?.toString() || null,
    }));

    return NextResponse.json({
      items,
      total: result.total,
      skip,
      take,
    });
  } catch (error) {
    console.error('Failed to fetch diagrams:', error);
    return NextResponse.json({ error: 'Failed to fetch diagrams' }, { status: 500 });
  }
}

/**
 * POST /api/projects/:id/diagrams
 * 遷移図を作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const projectId = BigInt(id);

  try {
    const body = await request.json();
    const { name, description, type, testCaseId, nodes, edges, metadata, useTemplate } = body;

    // バリデーション
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '名前は必須です' }, { status: 400 });
    }

    if (!type || !['STATE_TRANSITION', 'SCREEN_TRANSITION'].includes(type)) {
      return NextResponse.json({ error: '有効な図タイプを指定してください' }, { status: 400 });
    }

    // 名前の重複チェック
    if (await hasDiagram(projectId, name.trim())) {
      return NextResponse.json({ error: '同名の図が既に存在します' }, { status: 400 });
    }

    // テンプレートを使用する場合
    let initialNodes: TransitionNode[];
    let initialEdges: TransitionEdge[];

    if (useTemplate) {
      const template =
        type === 'STATE_TRANSITION'
          ? createEmptyStateDiagram(name)
          : createEmptyScreenDiagram(name);
      initialNodes = template.nodes;
      initialEdges = template.edges;
    } else {
      initialNodes = nodes || [];
      initialEdges = edges || [];
    }

    const diagram = await createDiagram({
      projectId,
      testCaseId: testCaseId ? BigInt(testCaseId) : undefined,
      name: name.trim(),
      description,
      type: type as DiagramType,
      nodes: initialNodes,
      edges: initialEdges,
      metadata,
    });

    return NextResponse.json(
      {
        ...diagram,
        id: diagram.id.toString(),
        projectId: diagram.projectId.toString(),
        testCaseId: diagram.testCaseId?.toString() || null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create diagram:', error);
    return NextResponse.json({ error: 'Failed to create diagram' }, { status: 500 });
  }
}
