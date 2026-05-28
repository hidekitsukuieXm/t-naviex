/**
 * MCP Resources API
 * GET /api/mcp/resources - List available resources
 * GET /api/mcp/resources?uri=xxx - Read a specific resource
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - List resources or read a specific resource
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const uri = searchParams.get('uri');

    if (uri) {
      // Read a specific resource
      return await readResource(uri);
    } else {
      // List available resources
      return await listResources();
    }
  } catch (error) {
    console.error('MCP resources error:', error);
    return NextResponse.json({ error: 'リソースの取得に失敗しました。' }, { status: 500 });
  }
}

async function listResources() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
  });

  const resources = [];

  // Add test_specs resources
  for (const p of projects) {
    resources.push({
      uri: `test://specs/${p.id}`,
      name: `Test Specifications - ${p.name}`,
      description: `Test specifications for project ${p.name}`,
      mimeType: 'application/json',
    });
  }

  // Add test_runs resources
  for (const p of projects) {
    resources.push({
      uri: `test://runs/${p.id}`,
      name: `Test Runs - ${p.name}`,
      description: `Test runs for project ${p.name}`,
      mimeType: 'application/json',
    });
  }

  // Add bugs resources
  for (const p of projects) {
    resources.push({
      uri: `test://bugs/${p.id}`,
      name: `Bugs - ${p.name}`,
      description: `Bugs/defects for project ${p.name}`,
      mimeType: 'application/json',
    });
  }

  return NextResponse.json({ resources });
}

async function readResource(uri: string) {
  // Parse the URI
  const match = uri.match(/^test:\/\/(\w+)\/(\d+)$/);

  if (!match) {
    return NextResponse.json({ error: 'Invalid resource URI format' }, { status: 400 });
  }

  const [, resourceType, projectId] = match;

  let data: unknown;

  switch (resourceType) {
    case 'specs':
      data = await getTestSpecs(projectId);
      break;
    case 'runs':
      data = await getTestRuns(projectId);
      break;
    case 'bugs':
      data = await getBugs(projectId);
      break;
    default:
      return NextResponse.json({ error: 'Unknown resource type' }, { status: 400 });
  }

  return NextResponse.json({
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  });
}

async function getTestSpecs(projectId: string) {
  const specs = await prisma.testSpec.findMany({
    where: { projectId: BigInt(projectId) },
    include: {
      _count: { select: { testCases: { where: { deletedAt: null } } } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return specs.map((s) => ({
    id: s.id.toString(),
    name: s.name,
    description: s.description,
    status: s.status,
    testCaseCount: s._count.testCases,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
}

async function getTestRuns(projectId: string) {
  const runs = await prisma.testRun.findMany({
    where: { projectId: BigInt(projectId) },
    include: {
      _count: { select: { testRunCases: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return runs.map((r) => ({
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
}

async function getBugs(projectId: string) {
  const bugs = await prisma.bug.findMany({
    where: { projectId: BigInt(projectId) },
    include: {
      assignee: { select: { name: true } },
      reporter: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return bugs.map((b) => ({
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
}
