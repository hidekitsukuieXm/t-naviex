/**
 * Test Design Knowledges API
 *
 * GET  /api/projects/[id]/test-design-knowledges - テスト設計ナレッジ一覧取得
 * POST /api/projects/[id]/test-design-knowledges - テスト設計ナレッジ作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestDesignKnowledgesByProject,
  createTestDesignKnowledge,
  getTechniques,
} from '@/repositories/test-design-knowledge-repository';
import {
  validateCreateInput,
  type TestDesignKnowledgeFilter,
  type TestDesignKnowledgeSortOption,
  type TestDesignKnowledgeSortField,
} from '@/types/test-design-knowledge';
import type { TestTechniqueCategory, TestDesignKnowledgeStatus } from '@/generated/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/projects/[id]/test-design-knowledges
 * テスト設計ナレッジ一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const projectId = BigInt(id);
  const { searchParams } = new URL(request.url);

  // テスト技法一覧のみ取得
  if (searchParams.get('techniques') === 'true') {
    const techniques = await getTechniques(projectId);
    return NextResponse.json({ techniques });
  }

  // フィルターパラメータの解析
  const filter: TestDesignKnowledgeFilter = {
    search: searchParams.get('search') || undefined,
    technique: searchParams.get('technique') || undefined,
    category: (searchParams.get('category') as TestTechniqueCategory) || undefined,
    status: (searchParams.get('status') as TestDesignKnowledgeStatus) || undefined,
    minRating: searchParams.get('minRating')
      ? parseFloat(searchParams.get('minRating')!)
      : undefined,
    includeGlobal: searchParams.get('includeGlobal') !== 'false',
  };

  // タグIDの解析
  const tagIdsParam = searchParams.get('tagIds');
  if (tagIdsParam) {
    filter.tagIds = tagIdsParam.split(',').map((id) => BigInt(id));
  }

  // ソートパラメータの解析
  const sortField = (searchParams.get('sortField') as TestDesignKnowledgeSortField) || 'updatedAt';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const sort: TestDesignKnowledgeSortOption = { field: sortField, order: sortOrder };

  // ページネーションパラメータの解析
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    const result = await getTestDesignKnowledgesByProject(projectId, filter, sort, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch test design knowledges:', error);
    return NextResponse.json({ error: 'Failed to fetch test design knowledges' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/test-design-knowledges
 * テスト設計ナレッジを作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const projectId = BigInt(id);

  try {
    const body = await request.json();

    // バリデーション
    const validation = validateCreateInput({
      ...body,
      projectId,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // タグIDをBigIntに変換
    const tagIds = body.tagIds?.map((id: string | number) => BigInt(id));

    const knowledge = await createTestDesignKnowledge({
      ...body,
      projectId,
      tagIds,
      createdById: session.user?.id ? BigInt(session.user.id) : undefined,
    });

    return NextResponse.json(knowledge, { status: 201 });
  } catch (error) {
    console.error('Failed to create test design knowledge:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'このプロジェクトには同じタイトルのテスト設計ナレッジが既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to create test design knowledge' }, { status: 500 });
  }
}
