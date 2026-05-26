/**
 * Test Result PDF Export API
 * GET /api/projects/[id]/test-runs/[testRunId]/pdf - Export test results as PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import { TestResultPDF, TestResultPDFData, registerFonts } from '@/lib/pdf';

interface RouteParams {
  params: Promise<{ id: string; testRunId: string }>;
}

// Register fonts on module load
registerFonts();

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, testRunId: testRunIdStr } = await params;
    const projectId = BigInt(id);
    const testRunId = BigInt(testRunIdStr);

    // Fetch test run with all related data
    const testRun = await prisma.testRun.findFirst({
      where: {
        id: testRunId,
        projectId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        project: {
          select: { name: true },
        },
        testRunCases: {
          select: {
            id: true,
            status: true,
            testCase: {
              select: {
                id: true,
                title: true,
                priority: true,
                section: {
                  select: { name: true },
                },
              },
            },
            results: {
              select: {
                status: true,
                executedAt: true,
                executionTime: true,
                environment: true,
                note: true,
                executedBy: {
                  select: { name: true },
                },
                bugs: {
                  select: { id: true },
                },
              },
              orderBy: { executedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!testRun) {
      return NextResponse.json({ error: 'テストランが見つかりません。' }, { status: 404 });
    }

    // Calculate summary
    const totalCases = testRun.testRunCases.length;
    const executed = testRun.testRunCases.filter((trc) => trc.status !== 'NOT_RUN').length;
    const passed = testRun.testRunCases.filter((trc) => trc.status === 'PASSED').length;
    const failed = testRun.testRunCases.filter((trc) => trc.status === 'FAILED').length;
    const blocked = testRun.testRunCases.filter((trc) => trc.status === 'BLOCKED').length;
    const skipped = testRun.testRunCases.filter((trc) => trc.status === 'SKIPPED').length;
    const notRun = testRun.testRunCases.filter((trc) => trc.status === 'NOT_RUN').length;

    // Transform data for PDF template
    const pdfData: TestResultPDFData = {
      projectName: testRun.project.name,
      testRunName: testRun.name,
      testRunDescription: testRun.description,
      status: testRun.status,
      startDate: testRun.startDate?.toISOString() || null,
      endDate: testRun.endDate?.toISOString() || null,
      createdAt: testRun.createdAt.toISOString(),
      summary: {
        totalCases,
        executed,
        passed,
        failed,
        blocked,
        skipped,
        notRun,
        executionRate: totalCases > 0 ? Math.round((executed / totalCases) * 100) : 0,
        passRate: executed > 0 ? Math.round((passed / executed) * 100) : 0,
      },
      results: testRun.testRunCases.map((trc) => {
        const latestResult = trc.results[0];
        return {
          caseId: trc.testCase.id.toString(),
          caseTitle: trc.testCase.title,
          sectionName: trc.testCase.section?.name || '',
          priority: trc.testCase.priority,
          status: trc.status,
          executedByName: latestResult?.executedBy?.name || null,
          executedAt: latestResult?.executedAt?.toISOString() || null,
          executionTime: latestResult?.executionTime || null,
          environment: latestResult?.environment || null,
          note: latestResult?.note || null,
          bugCount: latestResult?.bugs?.length || 0,
        };
      }),
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(<TestResultPDF data={pdfData} />);

    // Return PDF as response
    const filename = `test-result-${testRun.name.replace(/[^\w\s-]/g, '')}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Test result PDF generation error:', error);
    return NextResponse.json({ error: 'PDFの生成に失敗しました。' }, { status: 500 });
  }
}
