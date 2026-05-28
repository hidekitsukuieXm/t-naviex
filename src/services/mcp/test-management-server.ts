/**
 * MCP Server for Test Management (CoBrain Integration)
 * Provides tools and resources for test management operations
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Types for MCP responses
export interface MCPProject {
  id: string;
  name: string;
  description: string | null;
  prefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface MCPTestCase {
  id: string;
  specId: string;
  specName: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  priority: string;
  testType: string | null;
  steps: MCPTestStep[];
  createdAt: string;
  updatedAt: string;
}

export interface MCPTestStep {
  id: string;
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface MCPTestRun {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  passRate: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface MCPBug {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  severity: string;
  type: string;
  assigneeId: string | null;
  assigneeName: string | null;
  reporterId: string;
  reporterName: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create the MCP Server for test management
 */
export function createTestManagementServer(): McpServer {
  const server = new McpServer(
    {
      name: 't-naviex-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
      instructions: `
T-NaviEx Test Management MCP Server

This server provides access to test management functionality including:
- Listing projects
- Managing test cases and test specifications
- Managing test runs and execution results
- Managing bugs and defects

Use the provided tools to interact with the test management system.
      `.trim(),
    }
  );

  // ============================================
  // Tools
  // ============================================

  // list_projects - List all projects
  server.registerTool(
    'list_projects',
    {
      description: 'List all projects in the test management system',
    },
    async () => {
      try {
        const projects = await prisma.project.findMany({
          orderBy: { updatedAt: 'desc' },
        });

        const result: MCPProject[] = projects.map((p) => ({
          id: p.id.toString(),
          name: p.name,
          description: p.description,
          prefix: p.prefix,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing projects: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // get_test_cases - Get test cases for a project or spec
  server.registerTool(
    'get_test_cases',
    {
      description: 'Get test cases for a specific project or test specification',
      inputSchema: {
        projectId: z.string().optional().describe('Project ID to filter by'),
        specId: z.string().optional().describe('Test specification ID to filter by'),
        priority: z.string().optional().describe('Priority to filter by'),
        limit: z.number().optional().default(50).describe('Maximum number of results'),
      },
    },
    async (args) => {
      try {
        const where: Record<string, unknown> = {
          deletedAt: null,
        };

        if (args.specId) {
          where.testSpecId = BigInt(args.specId);
        } else if (args.projectId) {
          where.testSpec = { projectId: BigInt(args.projectId) };
        }

        if (args.priority) {
          where.priority = args.priority;
        }

        const testCases = await prisma.testCase.findMany({
          where,
          include: {
            testSpec: true,
            testSteps: {
              orderBy: { stepNumber: 'asc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: args.limit || 50,
        });

        const result: MCPTestCase[] = testCases.map((tc) => ({
          id: tc.id.toString(),
          specId: tc.testSpecId.toString(),
          specName: tc.testSpec.name,
          title: tc.title,
          description: tc.description,
          preconditions: tc.preconditions,
          priority: tc.priority,
          testType: tc.testType,
          steps: tc.testSteps.map((step) => ({
            id: step.id.toString(),
            stepNumber: step.stepNumber,
            action: step.action || '',
            expectedResult: step.expectedResult || '',
          })),
          createdAt: tc.createdAt.toISOString(),
          updatedAt: tc.updatedAt.toISOString(),
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting test cases: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // create_test_case - Create a new test case
  server.registerTool(
    'create_test_case',
    {
      description: 'Create a new test case in a test specification',
      inputSchema: {
        specId: z.string().describe('Test specification ID'),
        title: z.string().describe('Test case title'),
        description: z.string().optional().describe('Test case description'),
        preconditions: z.string().optional().describe('Preconditions'),
        priority: z
          .enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
          .optional()
          .default('MEDIUM')
          .describe('Priority'),
        testType: z.string().optional().describe('Test type'),
        steps: z
          .array(
            z.object({
              action: z.string().describe('Step action'),
              expectedResult: z.string().describe('Expected result'),
            })
          )
          .optional()
          .describe('Test steps'),
      },
    },
    async (args) => {
      try {
        // Verify spec exists
        const spec = await prisma.testSpec.findUnique({
          where: { id: BigInt(args.specId) },
        });

        if (!spec) {
          return {
            content: [{ type: 'text', text: 'Test specification not found' }],
            isError: true,
          };
        }

        // Get next sort order
        const maxSortOrder = await prisma.testCase.aggregate({
          where: { testSpecId: BigInt(args.specId), deletedAt: null },
          _max: { sortOrder: true },
        });

        const testCase = await prisma.testCase.create({
          data: {
            testSpecId: BigInt(args.specId),
            title: args.title,
            description: args.description || null,
            preconditions: args.preconditions || null,
            priority: args.priority || 'MEDIUM',
            testType: args.testType || 'FUNCTIONAL',
            sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
            testSteps: args.steps
              ? {
                  create: args.steps.map((step, index) => ({
                    stepNumber: index + 1,
                    action: step.action,
                    expectedResult: step.expectedResult,
                  })),
                }
              : undefined,
          },
          include: {
            testSteps: { orderBy: { stepNumber: 'asc' } },
          },
        });

        const result: MCPTestCase = {
          id: testCase.id.toString(),
          specId: testCase.testSpecId.toString(),
          specName: spec.name,
          title: testCase.title,
          description: testCase.description,
          preconditions: testCase.preconditions,
          priority: testCase.priority,
          testType: testCase.testType,
          steps: testCase.testSteps.map((step) => ({
            id: step.id.toString(),
            stepNumber: step.stepNumber,
            action: step.action || '',
            expectedResult: step.expectedResult || '',
          })),
          createdAt: testCase.createdAt.toISOString(),
          updatedAt: testCase.updatedAt.toISOString(),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating test case: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // update_test_result - Update test result for a test run case
  server.registerTool(
    'update_test_result',
    {
      description: 'Update the test result status for a test case in a test run',
      inputSchema: {
        testRunId: z.string().describe('Test run ID'),
        testCaseId: z.string().describe('Test case ID'),
        status: z
          .enum(['NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'RETEST'])
          .describe('Result status'),
        comment: z.string().optional().describe('Comment or notes'),
        executionTime: z.number().optional().describe('Execution time in milliseconds'),
      },
    },
    async (args) => {
      try {
        // Find the test run case
        const testRunCase = await prisma.testRunCase.findUnique({
          where: {
            testRunId_testCaseId: {
              testRunId: BigInt(args.testRunId),
              testCaseId: BigInt(args.testCaseId),
            },
          },
          include: {
            testCase: true,
            testRun: true,
          },
        });

        if (!testRunCase) {
          return {
            content: [{ type: 'text', text: 'Test run case not found' }],
            isError: true,
          };
        }

        // Update the test run case
        const updated = await prisma.testRunCase.update({
          where: { id: testRunCase.id },
          data: {
            status: args.status,
            comment: args.comment || testRunCase.comment,
            executionTime: args.executionTime || testRunCase.executionTime,
            executedAt: new Date(),
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  testRunId: args.testRunId,
                  testCaseId: args.testCaseId,
                  testCaseTitle: testRunCase.testCase.title,
                  status: updated.status,
                  executedAt: updated.executedAt?.toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating test result: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // get_test_runs - Get test runs for a project
  server.registerTool(
    'get_test_runs',
    {
      description: 'Get test runs for a specific project',
      inputSchema: {
        projectId: z.string().describe('Project ID'),
        status: z.string().optional().describe('Status to filter by'),
        limit: z.number().optional().default(20).describe('Maximum number of results'),
      },
    },
    async (args) => {
      try {
        const where: Record<string, unknown> = {
          projectId: BigInt(args.projectId),
        };

        if (args.status) {
          where.status = args.status;
        }

        const testRuns = await prisma.testRun.findMany({
          where,
          include: {
            _count: {
              select: { testRunCases: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: args.limit || 20,
        });

        // Get statistics for each test run
        const result: MCPTestRun[] = await Promise.all(
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

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting test runs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // get_bugs - Get bugs for a project
  server.registerTool(
    'get_bugs',
    {
      description: 'Get bugs/defects for a specific project',
      inputSchema: {
        projectId: z.string().describe('Project ID'),
        status: z.string().optional().describe('Status to filter by'),
        priority: z.string().optional().describe('Priority to filter by'),
        limit: z.number().optional().default(50).describe('Maximum number of results'),
      },
    },
    async (args) => {
      try {
        const where: Record<string, unknown> = {
          projectId: BigInt(args.projectId),
        };

        if (args.status) {
          where.status = args.status;
        }
        if (args.priority) {
          where.priority = args.priority;
        }

        const bugs = await prisma.bug.findMany({
          where,
          include: {
            assignee: { select: { id: true, name: true } },
            reporter: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: args.limit || 50,
        });

        const result: MCPBug[] = bugs.map((b) => ({
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

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting bugs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // ============================================
  // Resources
  // ============================================

  // test_specs resource - List test specifications
  server.registerResource(
    'test_specs',
    new ResourceTemplate('test://specs/{projectId}', {
      list: async () => {
        const projects = await prisma.project.findMany({
          select: { id: true, name: true },
        });

        return {
          resources: projects.map((p) => ({
            uri: `test://specs/${p.id}`,
            name: `Test Specifications - ${p.name}`,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    {
      description: 'Test specifications for a project',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const projectId = variables.projectId as string;
      const specs = await prisma.testSpec.findMany({
        where: { projectId: BigInt(projectId) },
        include: {
          _count: { select: { testCases: { where: { deletedAt: null } } } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const data = specs.map((s) => ({
        id: s.id.toString(),
        name: s.name,
        description: s.description,
        status: s.status,
        testCaseCount: s._count.testCases,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // test_runs resource - List test runs
  server.registerResource(
    'test_runs',
    new ResourceTemplate('test://runs/{projectId}', {
      list: async () => {
        const projects = await prisma.project.findMany({
          select: { id: true, name: true },
        });

        return {
          resources: projects.map((p) => ({
            uri: `test://runs/${p.id}`,
            name: `Test Runs - ${p.name}`,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    {
      description: 'Test runs for a project',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const projectId = variables.projectId as string;
      const runs = await prisma.testRun.findMany({
        where: { projectId: BigInt(projectId) },
        include: {
          _count: { select: { testRunCases: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const data = runs.map((r) => ({
        id: r.id.toString(),
        name: r.name,
        description: r.description,
        status: r.status,
        totalCases: r._count.testRunCases,
        startedAt: r.actualStartDate?.toISOString() || null,
        completedAt: r.actualEndDate?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  // bugs resource - List bugs
  server.registerResource(
    'bugs',
    new ResourceTemplate('test://bugs/{projectId}', {
      list: async () => {
        const projects = await prisma.project.findMany({
          select: { id: true, name: true },
        });

        return {
          resources: projects.map((p) => ({
            uri: `test://bugs/${p.id}`,
            name: `Bugs - ${p.name}`,
            mimeType: 'application/json',
          })),
        };
      },
    }),
    {
      description: 'Bugs/defects for a project',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const projectId = variables.projectId as string;
      const bugs = await prisma.bug.findMany({
        where: { projectId: BigInt(projectId) },
        include: {
          assignee: { select: { name: true } },
          reporter: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      });

      const data = bugs.map((b) => ({
        id: b.id.toString(),
        title: b.title,
        status: b.status,
        priority: b.priority,
        severity: b.severity,
        assignee: b.assignee?.name || null,
        reporter: b.reporter?.name || null,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }));

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

/**
 * Run the MCP server with stdio transport
 */
export async function runMcpServer(): Promise<void> {
  const server = createTestManagementServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

// Run if executed directly
if (require.main === module) {
  runMcpServer().catch(console.error);
}
