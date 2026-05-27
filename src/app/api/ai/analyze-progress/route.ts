import { NextRequest, NextResponse } from 'next/server';
import { testProgressAnalyzerService } from '@/services/ai/test-progress-analyzer';

/**
 * POST /api/ai/analyze-progress
 * AIでテスト進捗を分析
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { progressData, projectContext, teamSize, previousCycleData } = body;

    // Validation
    if (!progressData) {
      return NextResponse.json({ error: '進捗データは必須です' }, { status: 400 });
    }

    // Validate required fields
    if (
      typeof progressData.totalTestCases !== 'number' ||
      typeof progressData.executedTestCases !== 'number' ||
      !progressData.startDate ||
      !progressData.plannedEndDate
    ) {
      return NextResponse.json(
        {
          error:
            '進捗データにはtotalTestCases、executedTestCases、startDate、plannedEndDateが必要です',
        },
        { status: 400 }
      );
    }

    // Normalize progress data
    const normalizedProgressData = {
      totalTestCases: Number(progressData.totalTestCases),
      executedTestCases: Number(progressData.executedTestCases),
      passedTestCases: Number(progressData.passedTestCases) || 0,
      failedTestCases: Number(progressData.failedTestCases) || 0,
      blockedTestCases: Number(progressData.blockedTestCases) || 0,
      skippedTestCases: Number(progressData.skippedTestCases) || 0,
      startDate: String(progressData.startDate),
      plannedEndDate: String(progressData.plannedEndDate),
      currentDate: progressData.currentDate ? String(progressData.currentDate) : undefined,
      dailyProgress: Array.isArray(progressData.dailyProgress)
        ? progressData.dailyProgress.map(
            (d: { date?: unknown; executed?: unknown; passed?: unknown; failed?: unknown }) => ({
              date: String(d.date || ''),
              executed: Number(d.executed) || 0,
              passed: Number(d.passed) || 0,
              failed: Number(d.failed) || 0,
            })
          )
        : undefined,
    };

    const result = await testProgressAnalyzerService.analyzeProgress(projectId, {
      progressData: normalizedProgressData,
      projectContext: projectContext?.trim(),
      teamSize: teamSize ? Number(teamSize) : undefined,
      previousCycleData: previousCycleData
        ? {
            passRate: Number(previousCycleData.passRate) || 0,
            executionRate: Number(previousCycleData.executionRate) || 0,
            actualDuration: Number(previousCycleData.actualDuration) || 0,
          }
        : undefined,
    });

    return NextResponse.json({
      result: result.result,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to analyze progress:', error);

    const message = error instanceof Error ? error.message : '進捗分析に失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
