import { NextRequest, NextResponse } from 'next/server';
import {
  testabilityCheckerService,
  CATEGORY_INFO,
  TestabilityCategory,
} from '@/services/ai/testability-checker';

/**
 * POST /api/ai/check-testability
 * AIでテスタビリティをチェック
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { content, contentType, context } = body;

    // Validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'チェック対象のテキストは必須です' }, { status: 400 });
    }

    if (content.length > 50000) {
      return NextResponse.json(
        { error: 'テキストは50000文字以内で入力してください' },
        { status: 400 }
      );
    }

    const validContentTypes = ['requirement', 'specification', 'user_story', 'acceptance_criteria'];
    if (contentType && !validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `無効なコンテンツタイプ: ${contentType}` },
        { status: 400 }
      );
    }

    const result = await testabilityCheckerService.checkTestability(projectId, {
      content: content.trim(),
      contentType: contentType || 'specification',
      context: context?.trim(),
    });

    return NextResponse.json({
      result: result.result,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to check testability:', error);

    const message = error instanceof Error ? error.message : 'テスタビリティチェックに失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/ai/check-testability
 * テスタビリティカテゴリの情報を取得
 */
export async function GET(request: NextRequest) {
  const categoryParam = request.nextUrl.searchParams.get('category');

  if (categoryParam) {
    // Get specific category info
    const category = categoryParam.toUpperCase().replace(/-/g, '_') as TestabilityCategory;
    if (!CATEGORY_INFO[category]) {
      return NextResponse.json({ error: '無効なカテゴリです' }, { status: 400 });
    }

    return NextResponse.json({
      category,
      ...CATEGORY_INFO[category],
    });
  }

  // Return all categories
  return NextResponse.json({
    categories: testabilityCheckerService.getAllCategories(),
  });
}
