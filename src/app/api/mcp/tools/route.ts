/**
 * MCP Tools API
 * POST /api/mcp/tools - Execute MCP tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Tool request schema
const toolRequestSchema = z.object({
  tool: z.string().min(1, 'Tool name is required'),
  arguments: z.record(z.string(), z.unknown()).optional().default({}),
});

// GET - List available tools
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const tools = [
      {
        name: 'list_projects',
        description: 'List all projects in the test management system',
        inputSchema: {},
      },
      {
        name: 'get_test_cases',
        description: 'Get test cases for a specific project or test specification',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID to filter by' },
            specId: { type: 'string', description: 'Test specification ID to filter by' },
            status: { type: 'string', description: 'Status to filter by' },
            priority: { type: 'string', description: 'Priority to filter by' },
            limit: { type: 'number', description: 'Maximum number of results', default: 50 },
          },
        },
      },
      {
        name: 'create_test_case',
        description: 'Create a new test case in a test specification',
        inputSchema: {
          type: 'object',
          required: ['specId', 'title'],
          properties: {
            specId: { type: 'string', description: 'Test specification ID' },
            title: { type: 'string', description: 'Test case title' },
            description: { type: 'string', description: 'Test case description' },
            precondition: { type: 'string', description: 'Preconditions' },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
              default: 'MEDIUM',
            },
            testType: { type: 'string', description: 'Test type' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: { type: 'string' },
                  expectedResult: { type: 'string' },
                },
              },
            },
          },
        },
      },
      {
        name: 'update_test_result',
        description: 'Update the test result status for a test case in a test run',
        inputSchema: {
          type: 'object',
          required: ['testRunId', 'testCaseId', 'status'],
          properties: {
            testRunId: { type: 'string', description: 'Test run ID' },
            testCaseId: { type: 'string', description: 'Test case ID' },
            status: {
              type: 'string',
              enum: ['NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST'],
            },
            comment: { type: 'string', description: 'Comment or notes' },
            executionTime: { type: 'number', description: 'Execution time in milliseconds' },
          },
        },
      },
      {
        name: 'get_test_runs',
        description: 'Get test runs for a specific project',
        inputSchema: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', description: 'Project ID' },
            status: { type: 'string', description: 'Status to filter by' },
            limit: { type: 'number', description: 'Maximum number of results', default: 20 },
          },
        },
      },
      {
        name: 'get_bugs',
        description: 'Get bugs/defects for a specific project',
        inputSchema: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string', description: 'Project ID' },
            status: { type: 'string', description: 'Status to filter by' },
            priority: { type: 'string', description: 'Priority to filter by' },
            limit: { type: 'number', description: 'Maximum number of results', default: 50 },
          },
        },
      },
    ];

    return NextResponse.json({ tools });
  } catch (error) {
    console.error('List MCP tools error:', error);
    return NextResponse.json({ error: 'ツール一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST - Execute a tool
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();
    const validation = toolRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { tool, arguments: args } = validation.data;

    // Execute the tool
    let result: unknown;

    switch (tool) {
      case 'list_projects':
        result = await listProjects();
        break;
      case 'get_test_cases':
        result = await getTestCases(args as Record<string, unknown>);
        break;
      case 'create_test_case':
        result = await createTestCase(args as Record<string, unknown>);
        break;
      case 'update_test_result':
        result = await updateTestResult(args as Record<string, unknown>);
        break;
      case 'get_test_runs':
        result = await getTestRuns(args as Record<string, unknown>);
        break;
      case 'get_bugs':
        result = await getBugs(args as Record<string, unknown>);
        break;
      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Execute MCP tool error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ツールの実行に失敗しました。' },
      { status: 500 }
    );
  }
}

// Tool implementations
async function listProjects() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  return projects.map((p) => ({
    id: p.id.toString(),
    name: p.name,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

async function getTestCases(args: Record<string, unknown>) {
  const where: Record<string, unknown> = { deletedAt: null };

  if (args['specId']) {
    where['testSpecId'] = BigInt(args['specId'] as string);
  } else if (args['projectId']) {
    where['testSpec'] = { projectId: BigInt(args['projectId'] as string) };
  }

  if (args['status']) where['status'] = args['status'];
  if (args['priority']) where['priority'] = args['priority'];

  const testCases = await prisma.testCase.findMany({
    where,
    include: {
      testSpec: true,
      testSteps: { orderBy: { stepNo: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
    take: (args['limit'] as number) || 50,
  });

  return testCases.map((tc) => ({
    id: tc.id.toString(),
    specId: tc.testSpecId.toString(),
    specTitle: tc.testSpec.name,
    title: tc.title,
    description: tc.description,
    precondition: tc.preconditions,
    priority: tc.priority,
    testType: tc.testType,
    steps: tc.testSteps.map((step) => ({
      id: step.id.toString(),
      stepNumber: step.stepNo,
      action: step.actionMd || '',
      expectedResult: step.expectedMd || '',
    })),
    createdAt: tc.createdAt.toISOString(),
    updatedAt: tc.updatedAt.toISOString(),
  }));
}

async function createTestCase(args: Record<string, unknown>) {
  const spec = await prisma.testSpec.findUnique({
    where: { id: BigInt(args['specId'] as string) },
  });

  if (!spec) {
    throw new Error('Test specification not found');
  }

  const maxSortOrder = await prisma.testCase.aggregate({
    where: { testSpecId: BigInt(args['specId'] as string), deletedAt: null },
    _max: { sortOrder: true },
  });

  const steps = args['steps'] as Array<{ action: string; expectedResult: string }> | undefined;

  const testCase = await prisma.testCase.create({
    data: {
      testSpecId: BigInt(args['specId'] as string),
      title: args['title'] as string,
      description: (args['description'] as string) || null,
      preconditions: (args['precondition'] as string) || null,
      priority: ((args['priority'] as string) || 'MEDIUM') as
        | 'LOW'
        | 'MEDIUM'
        | 'HIGH'
        | 'CRITICAL',
      testType: ((args['testType'] as string) || 'FUNCTIONAL') as
        | 'FUNCTIONAL'
        | 'INTEGRATION'
        | 'E2E'
        | 'PERFORMANCE'
        | 'SECURITY'
        | 'USABILITY'
        | 'OTHER',
      sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      testSteps: steps
        ? {
            create: steps.map((step, index) => ({
              stepNo: index + 1,
              actionMd: step.action,
              expectedMd: step.expectedResult,
            })),
          }
        : undefined,
    },
    include: {
      testSteps: { orderBy: { stepNo: 'asc' } },
    },
  });

  return {
    id: testCase.id.toString(),
    specId: testCase.testSpecId.toString(),
    specTitle: spec.name,
    title: testCase.title,
    description: testCase.description,
    precondition: testCase.preconditions,
    priority: testCase.priority,
    testType: testCase.testType,
    steps: testCase.testSteps.map((step) => ({
      id: step.id.toString(),
      stepNumber: step.stepNo,
      action: step.actionMd || '',
      expectedResult: step.expectedMd || '',
    })),
    createdAt: testCase.createdAt.toISOString(),
    updatedAt: testCase.updatedAt.toISOString(),
  };
}

async function updateTestResult(args: Record<string, unknown>) {
  const testRunCase = await prisma.testRunCase.findUnique({
    where: {
      testRunId_testCaseId: {
        testRunId: BigInt(args['testRunId'] as string),
        testCaseId: BigInt(args['testCaseId'] as string),
      },
    },
    include: { testCase: true },
  });

  if (!testRunCase) {
    throw new Error('Test run case not found');
  }

  const updated = await prisma.testRunCase.update({
    where: { id: testRunCase.id },
    data: {
      status: args['status'] as 'NOT_RUN' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' | 'RETEST',
      comment: (args['comment'] as string) || testRunCase.comment,
      executionTime: (args['executionTime'] as number) || testRunCase.executionTime,
      executedAt: new Date(),
    },
  });

  return {
    success: true,
    testRunId: args['testRunId'],
    testCaseId: args['testCaseId'],
    testCaseTitle: testRunCase.testCase.title,
    status: updated.status,
    executedAt: updated.executedAt?.toISOString(),
  };
}

async function getTestRuns(args: Record<string, unknown>) {
  const where: Record<string, unknown> = {
    projectId: BigInt(args['projectId'] as string),
  };

  if (args['status']) where['status'] = args['status'];

  const testRuns = await prisma.testRun.findMany({
    where,
    include: { _count: { select: { testRunCases: true } } },
    orderBy: { updatedAt: 'desc' },
    take: (args['limit'] as number) || 20,
  });

  return Promise.all(
    testRuns.map(async (tr) => {
      const stats = await prisma.testRunCase.groupBy({
        by: ['status'],
        where: { testRunId: tr.id },
        _count: true,
      });

      const statMap = Object.fromEntries(stats.map((s) => [s.status, s._count]));
      const total = tr._count.testRunCases;
      const passed = statMap['PASSED'] || 0;
      const failed = statMap['FAILED'] || 0;
      const executed = total - (statMap['NOT_RUN'] || 0);

      return {
        id: tr.id.toString(),
        name: tr.name,
        description: tr.description,
        status: tr.status,
        progress: total > 0 ? Math.round((executed / total) * 100) : 0,
        passRate: executed > 0 ? Math.round((passed / executed) * 100) : 0,
        totalCases: total,
        passedCases: passed,
        failedCases: failed,
        startedAt: tr.actualStartDate?.toISOString() || null,
        completedAt: tr.actualEndDate?.toISOString() || null,
      };
    })
  );
}

async function getBugs(args: Record<string, unknown>) {
  const where: Record<string, unknown> = {
    projectId: BigInt(args['projectId'] as string),
  };

  if (args['status']) where['status'] = args['status'];
  if (args['priority']) where['priority'] = args['priority'];

  const bugs = await prisma.bug.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: (args['limit'] as number) || 50,
  });

  return bugs.map((b) => ({
    id: b.id.toString(),
    title: b.title,
    description: b.description,
    status: b.status,
    priority: b.priority,
    severity: b.severity,
    type: b.type,
    assigneeId: b.assigneeId?.toString() || null,
    assigneeName: b.assignee?.name || null,
    reporterId: b.reporterId.toString(),
    reporterName: b.reporter?.name || null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));
}
