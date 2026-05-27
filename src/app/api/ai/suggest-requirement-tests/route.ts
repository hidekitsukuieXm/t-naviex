import { NextRequest, NextResponse } from 'next/server';
import { requirementTestSuggesterService } from '@/services/ai/requirement-test-suggester';

/**
 * POST /api/ai/suggest-requirement-tests
 * AIで要件からテストケースを提案
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { requirements, existingTestCases, context, maxSuggestions } = body;

    // Validation
    if (!requirements || !Array.isArray(requirements) || requirements.length === 0) {
      return NextResponse.json({ error: '要件は必須です' }, { status: 400 });
    }

    // Validate requirements structure
    for (const req of requirements) {
      if (!req.id || !req.title || !req.description) {
        return NextResponse.json(
          { error: '各要件にはid、title、descriptionが必要です' },
          { status: 400 }
        );
      }
    }

    // Validate existing test cases if provided
    if (existingTestCases) {
      if (!Array.isArray(existingTestCases)) {
        return NextResponse.json(
          { error: 'existingTestCasesは配列である必要があります' },
          { status: 400 }
        );
      }
      for (const tc of existingTestCases) {
        if (!tc.id || !tc.title) {
          return NextResponse.json(
            { error: '各テストケースにはidとtitleが必要です' },
            { status: 400 }
          );
        }
      }
    }

    // Validate maxSuggestions
    const normalizedMaxSuggestions = maxSuggestions
      ? Math.min(Math.max(Number(maxSuggestions), 1), 20)
      : 10;

    const result = await requirementTestSuggesterService.suggestTests(projectId, {
      requirements: requirements.map(
        (r: {
          id: string;
          title: string;
          description: string;
          priority?: string;
          type?: string;
        }) => ({
          id: String(r.id),
          title: String(r.title),
          description: String(r.description),
          priority: r.priority,
          type: r.type,
        })
      ),
      existingTestCases: existingTestCases?.map(
        (tc: {
          id: string;
          title: string;
          description?: string;
          linkedRequirements?: string[];
        }) => ({
          id: String(tc.id),
          title: String(tc.title),
          description: tc.description,
          linkedRequirements: tc.linkedRequirements,
        })
      ),
      context: context?.trim(),
      maxSuggestions: normalizedMaxSuggestions,
    });

    return NextResponse.json({
      result: result.result,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to suggest requirement tests:', error);

    const message = error instanceof Error ? error.message : 'テスト提案の生成に失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
