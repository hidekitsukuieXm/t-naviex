import { NextRequest, NextResponse } from 'next/server';
import { testCaseGeneratorService } from '@/services/ai/test-case-generator';

/**
 * POST /api/ai/generate-test-cases
 * AIでテストケースを生成
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { requirement, feature, considerations, testTechnique, detailLevel, count } = body;

    // Validation
    if (!requirement || typeof requirement !== 'string' || requirement.trim().length === 0) {
      return NextResponse.json({ error: '要件は必須です' }, { status: 400 });
    }

    if (requirement.length > 10000) {
      return NextResponse.json({ error: '要件は10000文字以内で入力してください' }, { status: 400 });
    }

    const validDetailLevels = ['basic', 'standard', 'detailed'];
    const normalizedDetailLevel = validDetailLevels.includes(detailLevel)
      ? detailLevel
      : 'standard';

    const normalizedCount = Math.min(Math.max(Number(count) || 5, 1), 20);

    const result = await testCaseGeneratorService.generateTestCases(projectId, {
      requirement: requirement.trim(),
      feature: feature?.trim(),
      considerations: considerations?.trim(),
      testTechnique: testTechnique?.trim(),
      detailLevel: normalizedDetailLevel as 'basic' | 'standard' | 'detailed',
      count: normalizedCount,
    });

    return NextResponse.json({
      testCases: result.testCases,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to generate test cases:', error);

    const message = error instanceof Error ? error.message : 'テストケースの生成に失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
