/**
 * Single Bug Countermeasure API
 *
 * GET    /api/projects/[id]/bug-countermeasures/[countermeasureId] - バグ対策ナレッジ詳細取得
 * PUT    /api/projects/[id]/bug-countermeasures/[countermeasureId] - バグ対策ナレッジ更新
 * DELETE /api/projects/[id]/bug-countermeasures/[countermeasureId] - バグ対策ナレッジ削除
 * POST   /api/projects/[id]/bug-countermeasures/[countermeasureId] - バグ対策ナレッジ操作（複製、使用記録）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getBugCountermeasureById,
  updateBugCountermeasure,
  deleteBugCountermeasure,
  duplicateBugCountermeasure,
  incrementUsageCount,
  getSimilarCountermeasures,
} from '@/repositories/bug-countermeasure-repository';
import { validateTitle, validateBugPattern, validateContent } from '@/types/bug-countermeasure';

interface RouteParams {
  params: Promise<{
    id: string;
    countermeasureId: string;
  }>;
}

/**
 * GET /api/projects/[id]/bug-countermeasures/[countermeasureId]
 * バグ対策ナレッジ詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { countermeasureId } = await params;
  const { searchParams } = new URL(request.url);

  try {
    const countermeasure = await getBugCountermeasureById(BigInt(countermeasureId));

    if (!countermeasure) {
      return NextResponse.json({ error: 'Bug countermeasure not found' }, { status: 404 });
    }

    // 類似のバグ対策ナレッジを取得（オプション）
    if (searchParams.get('includeSimilar') === 'true') {
      const similar = await getSimilarCountermeasures(BigInt(countermeasureId), 5);
      return NextResponse.json({ ...countermeasure, similar });
    }

    return NextResponse.json(countermeasure);
  } catch (error) {
    console.error('Failed to fetch bug countermeasure:', error);
    return NextResponse.json({ error: 'Failed to fetch bug countermeasure' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/bug-countermeasures/[countermeasureId]
 * バグ対策ナレッジを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { countermeasureId } = await params;

  try {
    const body = await request.json();

    // 個別バリデーション
    const errors: string[] = [];

    if (body.title !== undefined) {
      const titleResult = validateTitle(body.title);
      if (!titleResult.valid && titleResult.error) {
        errors.push(titleResult.error);
      }
    }

    if (body.bugPattern !== undefined) {
      const bugPatternResult = validateBugPattern(body.bugPattern);
      if (!bugPatternResult.valid && bugPatternResult.error) {
        errors.push(bugPatternResult.error);
      }
    }

    if (body.content !== undefined) {
      const contentResult = validateContent(body.content);
      if (!contentResult.valid && contentResult.error) {
        errors.push(contentResult.error);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    // タグIDをBigIntに変換
    const tagIds = body.tagIds?.map((id: string | number) => BigInt(id));

    const countermeasure = await updateBugCountermeasure(BigInt(countermeasureId), {
      ...body,
      tagIds,
      updatedById: session.user?.id ? BigInt(session.user.id) : undefined,
    });

    return NextResponse.json(countermeasure);
  } catch (error) {
    console.error('Failed to update bug countermeasure:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'このプロジェクトには同じタイトルのバグ対策ナレッジが既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to update bug countermeasure' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/bug-countermeasures/[countermeasureId]
 * バグ対策ナレッジを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { countermeasureId } = await params;

  try {
    await deleteBugCountermeasure(BigInt(countermeasureId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete bug countermeasure:', error);
    return NextResponse.json({ error: 'Failed to delete bug countermeasure' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/bug-countermeasures/[countermeasureId]
 * バグ対策ナレッジ操作（複製、使用記録）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { countermeasureId } = await params;

  try {
    const body = await request.json();
    const { action, newTitle } = body;

    switch (action) {
      case 'duplicate': {
        if (!newTitle) {
          return NextResponse.json(
            { error: 'newTitle is required for duplicate' },
            { status: 400 }
          );
        }

        const titleResult = validateTitle(newTitle);
        if (!titleResult.valid && titleResult.error) {
          return NextResponse.json({ error: titleResult.error }, { status: 400 });
        }

        const duplicated = await duplicateBugCountermeasure(
          BigInt(countermeasureId),
          newTitle,
          session.user?.id ? BigInt(session.user.id) : undefined
        );

        return NextResponse.json(duplicated, { status: 201 });
      }

      case 'use': {
        await incrementUsageCount(BigInt(countermeasureId));
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to perform action on bug countermeasure:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'このプロジェクトには同じタイトルのバグ対策ナレッジが既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
