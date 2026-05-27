/**
 * Best Practices API
 *
 * GET  /api/projects/[id]/best-practices - ベストプラクティス一覧取得
 * POST /api/projects/[id]/best-practices - ベストプラクティス作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getBestPracticesByProject,
  createBestPractice,
  getCategories,
} from '@/repositories/best-practice-repository';
import {
  validateCreateInput,
  type BestPracticeFilter,
  type BestPracticeSortOption,
  type BestPracticeSortField,
} from '@/types/best-practice';
import type { BestPracticeComplexity, BestPracticeStatus } from '@/generated/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/projects/[id]/best-practices
 * ベストプラクティス一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const projectId = BigInt(id);
  const { searchParams } = new URL(request.url);

  // カテゴリ一覧のみ取得
  if (searchParams.get('categories') === 'true') {
    const categories = await getCategories(projectId);
    return NextResponse.json({ categories });
  }

  // フィルターパラメータの解析
  const filter: BestPracticeFilter = {
    search: searchParams.get('search') || undefined,
    category: searchParams.get('category') || undefined,
    complexity: (searchParams.get('complexity') as BestPracticeComplexity) || undefined,
    status: (searchParams.get('status') as BestPracticeStatus) || undefined,
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
  const sortField = (searchParams.get('sortField') as BestPracticeSortField) || 'updatedAt';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const sort: BestPracticeSortOption = { field: sortField, order: sortOrder };

  // ページネーションパラメータの解析
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    const result = await getBestPracticesByProject(projectId, filter, sort, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch best practices:', error);
    return NextResponse.json({ error: 'Failed to fetch best practices' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/best-practices
 * ベストプラクティスを作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
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

    const bestPractice = await createBestPractice({
      ...body,
      projectId,
      tagIds,
      createdById: session.user?.id ? BigInt(session.user.id) : undefined,
    });

    return NextResponse.json(bestPractice, { status: 201 });
  } catch (error) {
    console.error('Failed to create best practice:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'このプロジェクトには同じタイトルのベストプラクティスが既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to create best practice' }, { status: 500 });
  }
}
