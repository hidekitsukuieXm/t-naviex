import { NextRequest, NextResponse } from 'next/server';
import {
  testEffortEstimatorService,
  ComplexityLevel,
  TestCaseForEstimation,
} from '@/services/ai/test-effort-estimator';

/**
 * POST /api/ai/estimate-effort
 * AIでテスト工数を予測
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { testCases, resources, projectContext, historicalData, deadline, hoursPerDay } = body;

    // Validation
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return NextResponse.json({ error: 'テストケースは必須です' }, { status: 400 });
    }

    // Validate test cases
    for (const tc of testCases) {
      if (!tc.id || !tc.title) {
        return NextResponse.json(
          { error: '各テストケースにはidとtitleが必要です' },
          { status: 400 }
        );
      }
    }

    // Validate resources
    if (resources && typeof resources.totalTesters !== 'number') {
      return NextResponse.json(
        { error: 'resources.totalTestersは数値である必要があります' },
        { status: 400 }
      );
    }

    // Validate hours per day
    const normalizedHoursPerDay = hoursPerDay ? Math.min(Math.max(Number(hoursPerDay), 1), 24) : 8;

    // Normalize test cases
    const normalizedTestCases: TestCaseForEstimation[] = testCases.map(
      (tc: {
        id: unknown;
        title: unknown;
        priority?: unknown;
        complexity?: unknown;
        stepCount?: unknown;
        automationStatus?: unknown;
      }) => ({
        id: String(tc.id),
        title: String(tc.title),
        priority: tc.priority ? String(tc.priority) : undefined,
        complexity: tc.complexity
          ? (String(tc.complexity).toUpperCase() as ComplexityLevel)
          : undefined,
        stepCount: tc.stepCount ? Number(tc.stepCount) : undefined,
        automationStatus: tc.automationStatus
          ? (String(tc.automationStatus).toUpperCase() as 'MANUAL' | 'AUTOMATED' | 'PARTIAL')
          : undefined,
      })
    );

    const result = await testEffortEstimatorService.estimateEffort(projectId, {
      testCases: normalizedTestCases,
      resources: resources
        ? {
            totalTesters: Number(resources.totalTesters),
            experienceLevel: resources.experienceLevel
              ? (String(resources.experienceLevel).toUpperCase() as
                  | 'JUNIOR'
                  | 'MID'
                  | 'SENIOR'
                  | 'MIXED')
              : undefined,
            availability: resources.availability ? Number(resources.availability) : undefined,
          }
        : undefined,
      projectContext: projectContext?.trim(),
      historicalData: historicalData?.map(
        (h: {
          projectName?: unknown;
          testCaseCount?: unknown;
          actualEffort?: unknown;
          teamSize?: unknown;
        }) => ({
          projectName: String(h.projectName || ''),
          testCaseCount: Number(h.testCaseCount) || 0,
          actualEffort: Number(h.actualEffort) || 0,
          teamSize: Number(h.teamSize) || 1,
        })
      ),
      deadline: deadline?.trim(),
      hoursPerDay: normalizedHoursPerDay,
    });

    return NextResponse.json({
      result: result.result,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to estimate effort:', error);

    const message = error instanceof Error ? error.message : '工数予測に失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
