import { NextRequest, NextResponse } from 'next/server';
import { testResultAnalyzerService } from '@/services/ai/test-result-analyzer';

/**
 * POST /api/ai/analyze-results
 * AIでテスト結果を分析
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { testResults, projectContext, previousCycleResults, qualityThresholds } = body;

    // Validation
    if (!testResults || !Array.isArray(testResults) || testResults.length === 0) {
      return NextResponse.json({ error: 'テスト結果データは必須です' }, { status: 400 });
    }

    // Validate test result items
    const validStatuses = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'];
    for (const result of testResults) {
      if (!result.id || !result.title || !result.status) {
        return NextResponse.json(
          { error: 'テスト結果にはid、title、statusが必要です' },
          { status: 400 }
        );
      }
      if (!validStatuses.includes(result.status)) {
        return NextResponse.json({ error: `無効なステータス: ${result.status}` }, { status: 400 });
      }
    }

    // Normalize test results
    const normalizedTestResults = testResults.map(
      (r: {
        id?: unknown;
        title?: unknown;
        status?: unknown;
        module?: unknown;
        feature?: unknown;
        errorMessage?: unknown;
        executionTime?: unknown;
        retryCount?: unknown;
      }) => ({
        id: String(r.id || ''),
        title: String(r.title || ''),
        status: String(r.status || 'PASSED') as 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED',
        module: r.module ? String(r.module) : undefined,
        feature: r.feature ? String(r.feature) : undefined,
        errorMessage: r.errorMessage ? String(r.errorMessage) : undefined,
        executionTime: r.executionTime ? Number(r.executionTime) : undefined,
        retryCount: r.retryCount ? Number(r.retryCount) : undefined,
      })
    );

    // Normalize previous cycle results if provided
    const normalizedPreviousCycleResults = previousCycleResults
      ? {
          passRate: Number(previousCycleResults.passRate) || 0,
          failRate: Number(previousCycleResults.failRate) || 0,
          topFailureModules: Array.isArray(previousCycleResults.topFailureModules)
            ? previousCycleResults.topFailureModules.map((m: unknown) => String(m))
            : [],
        }
      : undefined;

    // Normalize quality thresholds if provided
    const normalizedQualityThresholds = qualityThresholds
      ? {
          passRate: qualityThresholds.passRate ? Number(qualityThresholds.passRate) : undefined,
          failRate: qualityThresholds.failRate ? Number(qualityThresholds.failRate) : undefined,
          blockRate: qualityThresholds.blockRate ? Number(qualityThresholds.blockRate) : undefined,
        }
      : undefined;

    const result = await testResultAnalyzerService.analyzeResults(projectId, {
      testResults: normalizedTestResults,
      projectContext: projectContext?.trim(),
      previousCycleResults: normalizedPreviousCycleResults,
      qualityThresholds: normalizedQualityThresholds,
    });

    return NextResponse.json({
      result: result.result,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to analyze test results:', error);

    const message = error instanceof Error ? error.message : 'テスト結果分析に失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
