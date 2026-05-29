/**
 * Bug Countermeasures API
 *
 * GET  /api/projects/[id]/bug-countermeasures - バグ対策ナレッジ一覧取得
 * POST /api/projects/[id]/bug-countermeasures - バグ対策ナレッジ作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getBugCountermeasuresByProject,
  createBugCountermeasure,
  getBugPatterns,
} from '@/repositories/bug-countermeasure-repository';
import {
  validateCreateInput,
  type BugCountermeasureFilter,
  type BugCountermeasureSortOption,
  type BugCountermeasureSortField,
} from '@/types/bug-countermeasure';
import type {
  BugCountermeasureCategory,
  BugCountermeasureStatus,
  BugSeverityLevel,
} from '@/generated/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/projects/[id]/bug-countermeasures
 * バグ対策ナレッジ一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const projectId = BigInt(id);
  const { searchParams } = new URL(request.url);

  // バグパターン一覧のみ取得
  if (searchParams.get('bugPatterns') === 'true') {
    const bugPatterns = await getBugPatterns(projectId);
    return NextResponse.json({ bugPatterns });
  }

  // フィルターパラメータの解析
  const filter: BugCountermeasureFilter = {
    search: searchParams.get('search') || undefined,
    bugPattern: searchParams.get('bugPattern') || undefined,
    category: (searchParams.get('category') as BugCountermeasureCategory) || undefined,
    status: (searchParams.get('status') as BugCountermeasureStatus) || undefined,
    severityLevel: (searchParams.get('severityLevel') as BugSeverityLevel) || undefined,
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
  const sortField = (searchParams.get('sortField') as BugCountermeasureSortField) || 'updatedAt';
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const sort: BugCountermeasureSortOption = { field: sortField, order: sortOrder };

  // ページネーションパラメータの解析
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    const result = await getBugCountermeasuresByProject(projectId, filter, sort, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch bug countermeasures:', error);
    return NextResponse.json({ error: 'Failed to fetch bug countermeasures' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/bug-countermeasures
 * バグ対策ナレッジを作成
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

    const countermeasure = await createBugCountermeasure({
      ...body,
      projectId,
      tagIds,
      createdById: session.user?.id ? BigInt(session.user.id) : undefined,
    });

    return NextResponse.json(countermeasure, { status: 201 });
  } catch (error) {
    console.error('Failed to create bug countermeasure:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'このプロジェクトには同じタイトルのバグ対策ナレッジが既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to create bug countermeasure' }, { status: 500 });
  }
}
