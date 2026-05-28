/**
 * Automation Test Results Import API
 * POST /api/integrations/automation/import - Import automation test results
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  detectAndParseReport,
  mapResultsToTestCases,
  type TestCaseMapping,
  type MappedTestResult,
} from '@/services/automation-client';
import { z } from 'zod';

const mappingSchema = z.object({
  automationTestName: z.string().min(1),
  testCaseId: z.string().min(1),
});

const importSchema = z.object({
  content: z.string().min(1, 'コンテンツは必須です'),
  format: z.enum(['auto', 'playwright', 'junit', 'testng']).optional().default('auto'),
  testRunId: z.string().min(1, 'テストラン IDは必須です'),
  mappings: z.array(mappingSchema).min(1, '少なくとも1つのマッピングが必要です'),
});

// POST /api/integrations/automation/import
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validation = importSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { content, testRunId, mappings } = validation.data;
    const userId = BigInt(session.user.id);

    // Check if test run exists
    const testRun = await prisma.testRun.findUnique({
      where: { id: BigInt(testRunId) },
      include: {
        testRunCases: {
          include: {
            testCase: true,
          },
        },
      },
    });

    if (!testRun) {
      return NextResponse.json({ error: 'テストランが見つかりません。' }, { status: 404 });
    }

    // Parse the report
    const parseResult = detectAndParseReport(content);
    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { error: parseResult.error || '解析に失敗しました。' },
        { status: 400 }
      );
    }

    // Build mappings with test case info
    const testCaseMappings: TestCaseMapping[] = [];
    for (const mapping of mappings) {
      const testRunCase = testRun.testRunCases.find(
        (trc) => trc.testCaseId.toString() === mapping.testCaseId
      );
      if (testRunCase) {
        testCaseMappings.push({
          automationTestName: mapping.automationTestName,
          testCaseId: BigInt(mapping.testCaseId),
          testCaseName: testRunCase.testCase.title,
        });
      }
    }

    // Map results to test cases
    const mappedResults = mapResultsToTestCases(parseResult.data, testCaseMappings);

    // Import results
    const importedResults: Array<{
      testCaseId: string;
      testCaseName: string;
      status: string;
      resultId?: string;
    }> = [];

    for (const mappedResult of mappedResults) {
      await importTestResult(testRun.id, mappedResult, userId, importedResults);
    }

    return NextResponse.json({
      success: true,
      message: `${importedResults.length}件のテスト結果をインポートしました。`,
      importedCount: importedResults.length,
      results: importedResults,
      report: {
        format: parseResult.data.format,
        summary: parseResult.data.summary,
      },
    });
  } catch (error) {
    console.error('Import automation results error:', error);
    return NextResponse.json({ error: 'テスト結果のインポートに失敗しました。' }, { status: 500 });
  }
}

async function importTestResult(
  testRunId: bigint,
  mappedResult: MappedTestResult,
  userId: bigint,
  importedResults: Array<{
    testCaseId: string;
    testCaseName: string;
    status: string;
    resultId?: string;
  }>
) {
  // Find the test run case
  const testRunCase = await prisma.testRunCase.findUnique({
    where: {
      testRunId_testCaseId: {
        testRunId,
        testCaseId: mappedResult.testCaseId,
      },
    },
  });

  if (!testRunCase) {
    importedResults.push({
      testCaseId: mappedResult.testCaseId.toString(),
      testCaseName: mappedResult.testCaseName,
      status: 'skipped',
    });
    return;
  }

  // Map automation status to TestRunCaseStatus
  let status: 'NOT_RUN' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' | 'RETEST';
  switch (mappedResult.status) {
    case 'passed':
      status = 'PASSED';
      break;
    case 'failed':
      status = 'FAILED';
      break;
    case 'skipped':
    case 'pending':
      status = 'SKIPPED';
      break;
    case 'flaky':
      status = 'RETEST';
      break;
    default:
      status = 'NOT_RUN';
  }

  // Update test run case
  await prisma.testRunCase.update({
    where: { id: testRunCase.id },
    data: {
      status,
      executedAt: new Date(),
      executedById: userId,
      executionTime: mappedResult.duration,
      comment: mappedResult.errorMessage
        ? `[Automation Import]\n${mappedResult.errorMessage}`
        : '[Automation Import]',
    },
  });

  // Create test result record
  const testResult = await prisma.testResult.create({
    data: {
      testRunCaseId: testRunCase.id,
      status,
      executedById: userId,
      executedAt: new Date(),
      executionTime: mappedResult.duration,
      notes: mappedResult.errorMessage || null,
      errorDetails: mappedResult.stackTrace || null,
      environment: 'Automated Test',
      version: 1,
    },
  });

  importedResults.push({
    testCaseId: mappedResult.testCaseId.toString(),
    testCaseName: mappedResult.testCaseName,
    status,
    resultId: testResult.id.toString(),
  });
}
