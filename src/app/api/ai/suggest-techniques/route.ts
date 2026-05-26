import { NextRequest, NextResponse } from 'next/server';
import {
  testTechniqueSuggesterService,
  TestTechnique,
  TECHNIQUE_INFO,
} from '@/services/ai/test-technique-suggester';

/**
 * POST /api/ai/suggest-techniques
 * AIでテスト技法を提案
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { requirement, feature, inputTypes, constraints } = body;

    // Validation
    if (!requirement || typeof requirement !== 'string' || requirement.trim().length === 0) {
      return NextResponse.json({ error: '要件は必須です' }, { status: 400 });
    }

    if (requirement.length > 10000) {
      return NextResponse.json({ error: '要件は10000文字以内で入力してください' }, { status: 400 });
    }

    const result = await testTechniqueSuggesterService.suggestTechniques(projectId, {
      requirement: requirement.trim(),
      feature: feature?.trim(),
      inputTypes: inputTypes?.trim(),
      constraints: constraints?.trim(),
    });

    return NextResponse.json({
      result: result.result,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to suggest test techniques:', error);

    const message = error instanceof Error ? error.message : 'テスト技法の提案に失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/ai/suggest-techniques
 * テスト技法の一覧を取得
 */
export async function GET(request: NextRequest) {
  const techniqueParam = request.nextUrl.searchParams.get('technique');

  if (techniqueParam) {
    // Get specific technique guide
    try {
      const technique = techniqueParam.toUpperCase().replace(/-/g, '_') as TestTechnique;
      if (!TECHNIQUE_INFO[technique]) {
        return NextResponse.json({ error: '無効なテスト技法です' }, { status: 400 });
      }

      const guide = testTechniqueSuggesterService.getTechniqueGuide(technique);
      return NextResponse.json(guide);
    } catch {
      return NextResponse.json({ error: '無効なテスト技法です' }, { status: 400 });
    }
  }

  // Return all technique info
  return NextResponse.json({
    techniques: Object.entries(TECHNIQUE_INFO).map(([key, value]) => ({
      technique: key,
      ...value,
    })),
  });
}
