import { NextRequest, NextResponse } from 'next/server';
import { testPlanReviewerService, ReviewCategory } from '@/services/ai/test-plan-reviewer';

/**
 * POST /api/ai/review-test-plan
 * AIでテスト計画をレビュー
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { testPlan, projectContext, previousPlans, focusAreas } = body;

    // Validation
    if (!testPlan) {
      return NextResponse.json({ error: 'テスト計画は必須です' }, { status: 400 });
    }

    if (!testPlan.title || !testPlan.description || !testPlan.scope) {
      return NextResponse.json(
        { error: 'テスト計画にはtitle、description、scopeが必要です' },
        { status: 400 }
      );
    }

    // Validate focus areas
    const validCategories: ReviewCategory[] = [
      'SCOPE',
      'RESOURCES',
      'SCHEDULE',
      'RISKS',
      'COVERAGE',
      'STRATEGY',
    ];
    const normalizedFocusAreas = focusAreas
      ? (focusAreas as string[]).filter((area): area is ReviewCategory =>
          validCategories.includes(area as ReviewCategory)
        )
      : undefined;

    // Validate previous plans
    if (previousPlans && !Array.isArray(previousPlans)) {
      return NextResponse.json(
        { error: 'previousPlansは配列である必要があります' },
        { status: 400 }
      );
    }

    const result = await testPlanReviewerService.reviewTestPlan(projectId, {
      testPlan: {
        title: String(testPlan.title),
        description: String(testPlan.description),
        scope: String(testPlan.scope),
        objectives: Array.isArray(testPlan.objectives)
          ? testPlan.objectives.map((o: unknown) => String(o))
          : undefined,
        testTypes: Array.isArray(testPlan.testTypes)
          ? testPlan.testTypes.map((t: unknown) => String(t))
          : undefined,
        resources: testPlan.resources
          ? {
              team: testPlan.resources.team ? String(testPlan.resources.team) : undefined,
              tools: Array.isArray(testPlan.resources.tools)
                ? testPlan.resources.tools.map((t: unknown) => String(t))
                : undefined,
              environment: testPlan.resources.environment
                ? String(testPlan.resources.environment)
                : undefined,
            }
          : undefined,
        schedule: testPlan.schedule
          ? {
              startDate: testPlan.schedule.startDate
                ? String(testPlan.schedule.startDate)
                : undefined,
              endDate: testPlan.schedule.endDate ? String(testPlan.schedule.endDate) : undefined,
              milestones: Array.isArray(testPlan.schedule.milestones)
                ? testPlan.schedule.milestones.map((m: { name?: unknown; date?: unknown }) => ({
                    name: String(m.name || ''),
                    date: String(m.date || ''),
                  }))
                : undefined,
            }
          : undefined,
        risks: Array.isArray(testPlan.risks)
          ? testPlan.risks.map((r: { description?: unknown; mitigation?: unknown }) => ({
              description: String(r.description || ''),
              mitigation: r.mitigation ? String(r.mitigation) : undefined,
            }))
          : undefined,
        exitCriteria: Array.isArray(testPlan.exitCriteria)
          ? testPlan.exitCriteria.map((c: unknown) => String(c))
          : undefined,
      },
      projectContext: projectContext?.trim(),
      previousPlans: previousPlans?.map((p: { title?: unknown; summary?: unknown }) => ({
        title: String(p.title || ''),
        summary: String(p.summary || ''),
      })),
      focusAreas: normalizedFocusAreas,
    });

    return NextResponse.json({
      result: result.result,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to review test plan:', error);

    const message = error instanceof Error ? error.message : 'テスト計画のレビューに失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
