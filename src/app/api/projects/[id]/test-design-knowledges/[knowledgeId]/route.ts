/**
 * Single Test Design Knowledge API
 *
 * GET    /api/projects/[id]/test-design-knowledges/[knowledgeId] - テスト設計ナレッジ詳細取得
 * PUT    /api/projects/[id]/test-design-knowledges/[knowledgeId] - テスト設計ナレッジ更新
 * DELETE /api/projects/[id]/test-design-knowledges/[knowledgeId] - テスト設計ナレッジ削除
 * POST   /api/projects/[id]/test-design-knowledges/[knowledgeId] - テスト設計ナレッジ操作（複製、使用記録）
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestDesignKnowledgeById,
  updateTestDesignKnowledge,
  deleteTestDesignKnowledge,
  duplicateTestDesignKnowledge,
  incrementUsageCount,
  getSimilarKnowledges,
} from '@/repositories/test-design-knowledge-repository';
import { validateTitle, validateTechnique, validateContent } from '@/types/test-design-knowledge';

interface RouteParams {
  params: Promise<{
    id: string;
    knowledgeId: string;
  }>;
}

/**
 * GET /api/projects/[id]/test-design-knowledges/[knowledgeId]
 * テスト設計ナレッジ詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { knowledgeId } = await params;
  const { searchParams } = new URL(request.url);

  try {
    const knowledge = await getTestDesignKnowledgeById(BigInt(knowledgeId));

    if (!knowledge) {
      return NextResponse.json({ error: 'Test design knowledge not found' }, { status: 404 });
    }

    // 類似のテスト設計ナレッジを取得（オプション）
    if (searchParams.get('includeSimilar') === 'true') {
      const similar = await getSimilarKnowledges(BigInt(knowledgeId), 5);
      return NextResponse.json({ ...knowledge, similar });
    }

    return NextResponse.json(knowledge);
  } catch (error) {
    console.error('Failed to fetch test design knowledge:', error);
    return NextResponse.json({ error: 'Failed to fetch test design knowledge' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/test-design-knowledges/[knowledgeId]
 * テスト設計ナレッジを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { knowledgeId } = await params;

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

    if (body.technique !== undefined) {
      const techniqueResult = validateTechnique(body.technique);
      if (!techniqueResult.valid && techniqueResult.error) {
        errors.push(techniqueResult.error);
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

    const knowledge = await updateTestDesignKnowledge(BigInt(knowledgeId), {
      ...body,
      tagIds,
      updatedById: session.user?.id ? BigInt(session.user.id) : undefined,
    });

    return NextResponse.json(knowledge);
  } catch (error) {
    console.error('Failed to update test design knowledge:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'このプロジェクトには同じタイトルのテスト設計ナレッジが既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to update test design knowledge' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/test-design-knowledges/[knowledgeId]
 * テスト設計ナレッジを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { knowledgeId } = await params;

  try {
    await deleteTestDesignKnowledge(BigInt(knowledgeId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete test design knowledge:', error);
    return NextResponse.json({ error: 'Failed to delete test design knowledge' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/test-design-knowledges/[knowledgeId]
 * テスト設計ナレッジ操作（複製、使用記録）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { knowledgeId } = await params;

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

        const duplicated = await duplicateTestDesignKnowledge(
          BigInt(knowledgeId),
          newTitle,
          session.user?.id ? BigInt(session.user.id) : undefined
        );

        return NextResponse.json(duplicated, { status: 201 });
      }

      case 'use': {
        await incrementUsageCount(BigInt(knowledgeId));
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to perform action on test design knowledge:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'このプロジェクトには同じタイトルのテスト設計ナレッジが既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 });
  }
}
