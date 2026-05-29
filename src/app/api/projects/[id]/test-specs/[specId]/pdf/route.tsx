/**
 * Test Specification PDF Export API
 * GET /api/projects/[id]/test-specs/[specId]/pdf - Export test specification as PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import { TestSpecPDF, TestSpecPDFData, registerFonts } from '@/lib/pdf';

interface RouteParams {
  params: Promise<{ id: string; specId: string }>;
}

// Register fonts on module load
registerFonts();

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, specId } = await params;
    const projectId = BigInt(id);
    const testSpecId = BigInt(specId);

    // Fetch test specification with all related data
    const testSpec = await prisma.testSpec.findFirst({
      where: {
        id: testSpecId,
        projectId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: { name: true },
        },
        sections: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            testCases: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                priority: true,
                preconditions: true,
                testSteps: {
                  orderBy: { stepNo: 'asc' },
                  select: {
                    stepNo: true,
                    actionMd: true,
                    expectedMd: true,
                  },
                },
                testCaseTags: {
                  select: {
                    tag: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!testSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // Transform data for PDF template
    const pdfData: TestSpecPDFData = {
      projectName: testSpec.project.name,
      specName: testSpec.name,
      phase: testSpec.status,
      version: testSpec.version,
      createdAt: testSpec.createdAt.toISOString(),
      updatedAt: testSpec.updatedAt.toISOString(),
      authorName: '不明',
      description: testSpec.description,
      sections: testSpec.sections.map((section) => ({
        id: section.id.toString(),
        name: section.name,
        description: null,
        cases: section.testCases.map((tc) => ({
          id: tc.id.toString(),
          title: tc.title,
          description: tc.description,
          priority: tc.priority as string,
          precondition: tc.preconditions,
          steps: tc.testSteps.map((step) => ({
            stepNumber: step.stepNo,
            action: step.actionMd,
            expectedResult: step.expectedMd || '',
          })),
          tags: tc.testCaseTags.map((t) => t.tag.name),
        })),
      })),
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(<TestSpecPDF data={pdfData} />);

    // Return PDF as response
    const filename = `test-spec-${testSpec.name.replace(/[^\w\s-]/g, '')}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Test spec PDF generation error:', error);
    return NextResponse.json({ error: 'PDFの生成に失敗しました。' }, { status: 500 });
  }
}
