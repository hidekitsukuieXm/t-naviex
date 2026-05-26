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
        phase: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { name: true },
        },
        project: {
          select: { name: true },
        },
        sections: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            testCases: {
              where: { deletedAt: null },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                priority: true,
                precondition: true,
                steps: {
                  orderBy: { stepNumber: 'asc' },
                  select: {
                    stepNumber: true,
                    action: true,
                    expectedResult: true,
                  },
                },
                tags: {
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
      phase: testSpec.phase,
      version: testSpec.version,
      createdAt: testSpec.createdAt.toISOString(),
      updatedAt: testSpec.updatedAt.toISOString(),
      authorName: testSpec.author?.name || '不明',
      description: testSpec.description,
      sections: testSpec.sections.map((section) => ({
        id: section.id.toString(),
        name: section.name,
        description: section.description,
        cases: section.testCases.map((tc) => ({
          id: tc.id.toString(),
          title: tc.title,
          description: tc.description,
          priority: tc.priority,
          precondition: tc.precondition,
          steps: tc.steps.map((step) => ({
            stepNumber: step.stepNumber,
            action: step.action,
            expectedResult: step.expectedResult,
          })),
          tags: tc.tags.map((t) => t.tag.name),
        })),
      })),
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(<TestSpecPDF data={pdfData} />);

    // Return PDF as response
    const filename = `test-spec-${testSpec.name.replace(/[^\w\s-]/g, '')}-${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(pdfBuffer, {
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
