import { NextRequest, NextResponse } from 'next/server';
import { testTrendAnalyzerService } from '@/services/ai/test-trend-analyzer';

/**
 * POST /api/ai/analyze-trends
 * AIでテスト傾向を分析
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { historicalData, projectContext, analysisTimeframe, focusAreas } = body;

    // Validation
    if (!historicalData || !Array.isArray(historicalData) || historicalData.length === 0) {
      return NextResponse.json(
        { error: '履歴データは必須です（配列形式で1件以上必要）' },
        { status: 400 }
      );
    }

    // Validate data points
    for (const point of historicalData) {
      if (
        !point.date ||
        typeof point.passRate !== 'number' ||
        typeof point.failRate !== 'number' ||
        typeof point.executedCount !== 'number'
      ) {
        return NextResponse.json(
          { error: '履歴データには date, passRate, failRate, executedCount が必要です' },
          { status: 400 }
        );
      }
    }

    // Normalize historical data
    const normalizedHistoricalData = historicalData.map(
      (d: {
        date?: unknown;
        passRate?: unknown;
        failRate?: unknown;
        executedCount?: unknown;
        passedCount?: unknown;
        failedCount?: unknown;
        blockedCount?: unknown;
        skippedCount?: unknown;
        defectsFound?: unknown;
        defectsClosed?: unknown;
      }) => ({
        date: String(d.date || ''),
        passRate: Number(d.passRate) || 0,
        failRate: Number(d.failRate) || 0,
        executedCount: Number(d.executedCount) || 0,
        passedCount: Number(d.passedCount) || 0,
        failedCount: Number(d.failedCount) || 0,
        blockedCount: d.blockedCount !== undefined ? Number(d.blockedCount) : undefined,
        skippedCount: d.skippedCount !== undefined ? Number(d.skippedCount) : undefined,
        defectsFound: d.defectsFound !== undefined ? Number(d.defectsFound) : undefined,
        defectsClosed: d.defectsClosed !== undefined ? Number(d.defectsClosed) : undefined,
      })
    );

    // Normalize focus areas if provided
    const normalizedFocusAreas = focusAreas ? focusAreas.map((a: unknown) => String(a)) : undefined;

    const result = await testTrendAnalyzerService.analyzeTrends(projectId, {
      historicalData: normalizedHistoricalData,
      projectContext: projectContext?.trim(),
      analysisTimeframe: analysisTimeframe?.trim(),
      focusAreas: normalizedFocusAreas,
    });

    return NextResponse.json({
      result: result.result,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to analyze trends:', error);

    const message = error instanceof Error ? error.message : '傾向分析に失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
