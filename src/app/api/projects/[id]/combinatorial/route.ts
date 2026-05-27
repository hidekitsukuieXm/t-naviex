/**
 * Combinatorial Testing API Routes
 *
 * 組合せテスト定義の一覧取得・作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createCombinatorialDefinition,
  getCombinatorialDefinitions,
  getOrthogonalArrayTemplates,
  recommendOrthogonalArray,
} from '@/repositories/combinatorial-repository';
import { CombinatorialMethod, CombinatorialParameter } from '@/types/combinatorial';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/combinatorial
 * 組合せテスト定義一覧を取得
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: '無効なプロジェクトIDです' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 直交表テンプレート一覧を取得
    if (action === 'orthogonal-arrays') {
      const templates = getOrthogonalArrayTemplates();
      return NextResponse.json({ templates });
    }

    // 直交表推奨を取得
    if (action === 'recommend-orthogonal') {
      const parametersJson = searchParams.get('parameters');
      if (!parametersJson) {
        return NextResponse.json({ error: 'パラメータが必要です' }, { status: 400 });
      }

      try {
        const parameters: CombinatorialParameter[] = JSON.parse(parametersJson);
        const recommended = recommendOrthogonalArray(parameters);
        return NextResponse.json({ recommended });
      } catch {
        return NextResponse.json({ error: 'パラメータのパースに失敗しました' }, { status: 400 });
      }
    }

    // 定義一覧を取得
    const testCaseId = searchParams.get('testCaseId');
    const method = searchParams.get('method') as CombinatorialMethod | null;
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const result = await getCombinatorialDefinitions(projectId, {
      testCaseId: testCaseId ? parseInt(testCaseId, 10) : undefined,
      method: method || undefined,
      search: search || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get combinatorial definitions:', error);
    return NextResponse.json({ error: '組合せテスト定義の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/combinatorial
 * 組合せテスト定義を作成
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id, 10);

    if (isNaN(projectId)) {
      return NextResponse.json({ error: '無効なプロジェクトIDです' }, { status: 400 });
    }

    const body = await req.json();

    // バリデーション
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: '名前は必須です' }, { status: 400 });
    }

    if (!body.parameters || !Array.isArray(body.parameters) || body.parameters.length < 2) {
      return NextResponse.json({ error: 'パラメータを2つ以上設定してください' }, { status: 400 });
    }

    if (
      !body.method ||
      !['PAIRWISE', 'ALL_COMBINATIONS', 'ORTHOGONAL_ARRAY', 'N_WISE'].includes(body.method)
    ) {
      return NextResponse.json({ error: '無効な組合せ手法です' }, { status: 400 });
    }

    if (body.method === 'N_WISE' && (!body.nWiseLevel || body.nWiseLevel < 2)) {
      return NextResponse.json(
        { error: 'N-wiseのレベルは2以上を指定してください' },
        { status: 400 }
      );
    }

    const definition = await createCombinatorialDefinition(projectId, {
      name: body.name,
      description: body.description,
      testCaseId: body.testCaseId,
      parameters: body.parameters,
      method: body.method,
      nWiseLevel: body.nWiseLevel,
      constraints: body.constraints,
      metadata: body.metadata,
    });

    return NextResponse.json(definition, { status: 201 });
  } catch (error) {
    console.error('Failed to create combinatorial definition:', error);

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: '同じ名前の定義が既に存在します' }, { status: 409 });
    }

    return NextResponse.json({ error: '組合せテスト定義の作成に失敗しました' }, { status: 500 });
  }
}
