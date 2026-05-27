import { NextRequest, NextResponse } from 'next/server';
import { bugAnalyzerService } from '@/services/ai/bug-analyzer';

/**
 * POST /api/ai/analyze-bug
 * AIでバグを分析
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { bugData, projectContext, recentBugs, codeContext } = body;

    // Validation
    if (!bugData) {
      return NextResponse.json({ error: 'バグデータは必須です' }, { status: 400 });
    }

    if (!bugData.id || !bugData.title || !bugData.description) {
      return NextResponse.json(
        { error: 'バグデータにはid、title、descriptionが必要です' },
        { status: 400 }
      );
    }

    // Normalize bug data
    const normalizedBugData = {
      id: String(bugData.id || ''),
      title: String(bugData.title || ''),
      description: String(bugData.description || ''),
      severity: bugData.severity ? String(bugData.severity) : undefined,
      priority: bugData.priority ? String(bugData.priority) : undefined,
      status: bugData.status ? String(bugData.status) : undefined,
      module: bugData.module ? String(bugData.module) : undefined,
      reproductionSteps: bugData.reproductionSteps ? String(bugData.reproductionSteps) : undefined,
      environment: bugData.environment ? String(bugData.environment) : undefined,
      errorLog: bugData.errorLog ? String(bugData.errorLog) : undefined,
      relatedBugs: Array.isArray(bugData.relatedBugs)
        ? bugData.relatedBugs.map((b: unknown) => String(b))
        : undefined,
    };

    // Normalize recent bugs if provided
    const normalizedRecentBugs = recentBugs
      ? recentBugs.map(
          (b: { id?: unknown; title?: unknown; module?: unknown; rootCause?: unknown }) => ({
            id: String(b.id || ''),
            title: String(b.title || ''),
            module: b.module ? String(b.module) : undefined,
            rootCause: b.rootCause ? String(b.rootCause) : undefined,
          })
        )
      : undefined;

    const result = await bugAnalyzerService.analyzeBug(projectId, {
      bugData: normalizedBugData,
      projectContext: projectContext?.trim(),
      recentBugs: normalizedRecentBugs,
      codeContext: codeContext?.trim(),
    });

    return NextResponse.json({
      result: result.result,
      usage: result.usage,
    });
  } catch (error) {
    console.error('Failed to analyze bug:', error);

    const message = error instanceof Error ? error.message : 'バグ分析に失敗しました';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
