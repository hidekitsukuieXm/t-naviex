/**
 * Single Best Practice API
 *
 * GET    /api/projects/[id]/best-practices/[bestPracticeId] - ベストプラクティス詳細取得
 * PUT    /api/projects/[id]/best-practices/[bestPracticeId] - ベストプラクティス更新
 * DELETE /api/projects/[id]/best-practices/[bestPracticeId] - ベストプラクティス削除
 * POST   /api/projects/[id]/best-practices/[bestPracticeId] - ベストプラクティス操作（複製、使用記録）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getBestPracticeById,
  updateBestPractice,
  deleteBestPractice,
  duplicateBestPractice,
  incrementUsageCount,
  getSimilarBestPractices,
} from '@/repositories/best-practice-repository';
import { validateTitle, validateCategory, validateContent } from '@/types/best-practice';

interface RouteParams {
  params: Promise<{
    id: string;
    bestPracticeId: string;
  }>;
}

/**
 * GET /api/projects/[id]/best-practices/[bestPracticeId]
 * ベストプラクティス詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bestPracticeId } = await params;
  const { searchParams } = new URL(request.url);

  try {
    const bestPractice = await getBestPracticeById(BigInt(bestPracticeId));

    if (!bestPractice) {
      return NextResponse.json({ error: 'Best practice not found' }, { status: 404 });
    }

    // 類似のベストプラクティスを取得（オプション）
    if (searchParams.get('includeSimilar') === 'true') {
      const similar = await getSimilarBestPractices(BigInt(bestPracticeId), 5);
      return NextResponse.json({ ...bestPractice, similar });
    }

    return NextResponse.json(bestPractice);
  } catch (error) {
    console.error('Failed to fetch best practice:', error);
    return NextResponse.json({ error: 'Failed to fetch best practice' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/best-practices/[bestPracticeId]
 * ベストプラクティスを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bestPracticeId } = await params;

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

    if (body.category !== undefined) {
      const categoryResult = validateCategory(body.category);
      if (!categoryResult.valid && categoryResult.error) {
        errors.push(categoryResult.error);
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

    const bestPractice = await updateBestPractice(BigInt(bestPracticeId), {
      ...body,
      tagIds,
      updatedById: session.user?.id ? BigInt(session.user.id) : undefined,
    });

    return NextResponse.json(bestPractice);
  } catch (error) {
    console.error('Failed to update best practice:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'このプロジェクトには同じタイトルのベストプラクティスが既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to update best practice' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/best-practices/[bestPracticeId]
 * ベストプラクティスを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bestPracticeId } = await params;

  try {
    await deleteBestPractice(BigInt(bestPracticeId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete best practice:', error);
    return NextResponse.json({ error: 'Failed to delete best practice' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/best-practices/[bestPracticeId]
 * ベストプラクティス操作（複製、使用記録）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bestPracticeId } = await params;

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

        const duplicated = await duplicateBestPractice(
          BigInt(bestPracticeId),
          newTitle,
          session.user?.id ? BigInt(session.user.id) : undefined
        );

        return NextResponse.json(duplicated, { status: 201 });
      }

      case 'use': {
        await incrementUsageCount(BigInt(bestPracticeId));
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to perform action on best practice:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'このプロジェクトには同じタイトルのベストプラクティスが既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
