/**
 * Step Definitions API
 *
 * ステップ定義（ステップライブラリ）の一覧取得・作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { GherkinStepType } from '@/generated/prisma';
import {
  findStepDefinitions,
  createStepDefinition,
  getStepDefinitionStats,
} from '@/repositories/bdd-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/bdd/step-definitions
 * ステップ定義一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const projectId = BigInt(id);
    const searchParams = request.nextUrl.searchParams;

    const type = searchParams.get('type') as GherkinStepType | null;
    const search = searchParams.get('search') || undefined;
    const isShared = searchParams.get('isShared');
    const includeShared = searchParams.get('includeShared') === 'true';
    const isActive = searchParams.get('isActive') !== 'false';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const orderBy = (searchParams.get('orderBy') || 'displayText') as
      | 'displayText'
      | 'usageCount'
      | 'lastUsedAt'
      | 'createdAt';
    const orderDirection = (searchParams.get('orderDirection') || 'asc') as 'asc' | 'desc';
    const includeStats = searchParams.get('includeStats') === 'true';

    const skip = (page - 1) * limit;

    const [result, stats] = await Promise.all([
      findStepDefinitions({
        projectId,
        type: type || undefined,
        search,
        isShared: isShared !== null ? isShared === 'true' : undefined,
        includeShared,
        isActive,
        skip,
        take: limit,
        orderBy,
        orderDirection,
      }),
      includeStats ? getStepDefinitionStats(projectId) : null,
    ]);

    // BigIntをstringに変換
    const items = result.items.map((item) => ({
      ...item,
      id: item.id.toString(),
      projectId: item.projectId.toString(),
    }));

    return NextResponse.json({
      items,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
      ...(stats && { stats }),
    });
  } catch (error) {
    console.error('Failed to fetch step definitions:', error);
    return NextResponse.json({ error: 'ステップ定義の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/bdd/step-definitions
 * ステップ定義を作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const projectId = BigInt(id);
    const body = await request.json();

    const { type, pattern, displayText, description, parameters, isShared } = body;

    // バリデーション
    if (!type || !['GIVEN', 'WHEN', 'THEN', 'AND', 'BUT'].includes(type)) {
      return NextResponse.json(
        { error: '有効なステップタイプを指定してください' },
        { status: 400 }
      );
    }

    if (!pattern?.trim()) {
      return NextResponse.json({ error: 'パターンは必須です' }, { status: 400 });
    }

    if (!displayText?.trim()) {
      return NextResponse.json({ error: '表示テキストは必須です' }, { status: 400 });
    }

    // パターンの正規表現が有効かチェック
    try {
      new RegExp(pattern);
    } catch {
      return NextResponse.json({ error: '無効な正規表現パターンです' }, { status: 400 });
    }

    const stepDefinition = await createStepDefinition({
      projectId,
      type: type as GherkinStepType,
      pattern,
      displayText,
      description,
      parameters,
      isShared,
    });

    return NextResponse.json(
      {
        ...stepDefinition,
        id: stepDefinition.id.toString(),
        projectId: stepDefinition.projectId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create step definition:', error);
    return NextResponse.json({ error: 'ステップ定義の作成に失敗しました' }, { status: 500 });
  }
}
