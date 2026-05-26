import { NextRequest, NextResponse } from 'next/server';
import { testCaseReviewerService } from '@/services/ai/test-case-reviewer';

/**
 * POST /api/ai/review-test-case
 * AIでテストケースをレビュー
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { testCase, context, reviewFocus } = body;

    // Validation
    if (!testCase || typeof testCase !== 'object') {
      return NextResponse.json({ error: 'テストケースは必須です' }, { status: 400 });
    }

    if (!testCase.title || typeof testCase.title !== 'string') {
      return NextResponse.json({ error: 'テストケースタイトルは必須です' }, { status: 400 });
    }

    if (!testCase.expectedResult || typeof testCase.expectedResult !== 'string') {
      return NextResponse.json({ error: '期待結果は必須です' }, { status: 400 });
    }

    // Validate steps
    if (!Array.isArray(testCase.steps)) {
      return NextResponse.json({ error: 'テスト手順は配列である必要があります' }, { status: 400 });
    }

    // Validate review focus if provided
    const validFocus = ['preconditions', 'steps', 'expectedResult', 'coverage', 'clarity'];
    if (reviewFocus && Array.isArray(reviewFocus)) {
      const invalidFocus = reviewFocus.filter((f: string) => !validFocus.includes(f));
      if (invalidFocus.length > 0) {
        return NextResponse.json(
          { error: `無効なレビュー観点: ${invalidFocus.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const result = await testCaseReviewerService.reviewTestCase(projectId, {
      testCase: {
        id: String(testCase.id || ''),
        title: testCase.title,
        description: testCase.description,
        preconditions: testCase.preconditions,
        steps: testCase.steps.map(
          (s: { stepNumber?: number; action?: string; expectedResult?: string }, i: number) => ({
            stepNumber: Number(s.stepNumber) || i + 1,
            action: String(s.action || ''),
            expectedResult: String(s.expectedResult || ''),
          })
        ),
        expectedResult: testCase.expectedResult,
        priority: testCase.priority,
        testType: testCase.testType,
      },
      context: context?.trim(),
      reviewFocus: reviewFocus as (
        | 'preconditions'
        | 'steps'
        | 'expectedResult'
        | 'coverage'
        | 'clarity'
      )[],
    });

    return NextResponse.json({
      review: result.review,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to review test case:', error);

    const message = error instanceof Error ? error.message : 'テストケースのレビューに失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
