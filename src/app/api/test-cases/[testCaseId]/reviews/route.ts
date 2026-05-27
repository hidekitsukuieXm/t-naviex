/**
 * Test Case Reviews API
 *
 * テストケースのレビュー一覧取得・作成API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReviewsByTestCase, createReview } from '@/repositories/review-repository';
import type { CreateReviewRequest } from '@/types/review';

interface RouteContext {
  params: Promise<{ testCaseId: string }>;
}

/**
 * GET /api/test-cases/[testCaseId]/reviews
 * テストケースのレビュー一覧を取得
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { testCaseId } = await context.params;

    const reviews = await getReviewsByTestCase(testCaseId);

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Failed to get reviews:', error);
    return NextResponse.json({ error: 'レビュー一覧の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/test-cases/[testCaseId]/reviews
 * レビューを作成
 */
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { testCaseId } = await context.params;
    const body = await request.json();

    // TODO: 実際の認証からユーザーIDを取得
    const requesterId = body.requesterId || '1';

    const data: CreateReviewRequest = {
      testCaseId,
      reviewerId: body.reviewerId,
      priority: body.priority,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      versionId: body.versionId,
    };

    if (!data.title) {
      return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 });
    }

    const review = await createReview(requesterId, data);

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error('Failed to create review:', error);
    return NextResponse.json({ error: 'レビューの作成に失敗しました' }, { status: 500 });
  }
}
