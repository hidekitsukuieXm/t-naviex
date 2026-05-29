/**
 * バグ一覧・作成 API
 * GET /api/projects/[id]/bugs - バグ一覧取得
 * POST /api/projects/[id]/bugs - バグ作成
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  listBugs,
  createBug,
  projectExists,
  getBugStatistics,
} from '@/lib/repositories/bug-repository';
import { validateCreateBugInput } from '@/types/bug';
import type {
  BugListFilters,
  BugListOptions,
  BugStatus,
  BugType,
  BugPriority,
  BugSeverity,
} from '@/types/bug';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/bugs
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const severity = searchParams.get('severity');
    const assigneeId = searchParams.get('assigneeId');
    const reporterId = searchParams.get('reporterId');
    const parentBugId = searchParams.get('parentBugId');
    const query = searchParams.get('query');
    const skip = searchParams.get('skip');
    const take = searchParams.get('take');
    const orderByField = searchParams.get('orderBy');
    const orderDirection = searchParams.get('order');
    const includeStats = searchParams.get('includeStats') === 'true';

    // フィルター条件を構築
    const filters: BugListFilters = {
      projectId: BigInt(projectId),
    };

    if (status) {
      filters.status = status.split(',') as BugStatus[];
    }
    if (type) {
      filters.type = type.split(',') as BugType[];
    }
    if (priority) {
      filters.priority = priority.split(',') as BugPriority[];
    }
    if (severity) {
      filters.severity = severity.split(',') as BugSeverity[];
    }
    if (assigneeId) {
      filters.assigneeId = assigneeId === 'null' ? null : BigInt(assigneeId);
    }
    if (reporterId) {
      filters.reporterId = BigInt(reporterId);
    }
    if (parentBugId !== null) {
      filters.parentBugId = parentBugId === 'null' ? null : BigInt(parentBugId);
    }
    if (query) {
      filters.query = query;
    }

    // オプションを構築
    const options: BugListOptions = {};
    if (skip) {
      options.skip = parseInt(skip, 10);
    }
    if (take) {
      options.take = parseInt(take, 10);
    }
    if (orderByField) {
      options.orderBy = {
        field: orderByField as NonNullable<BugListOptions['orderBy']>['field'],
        direction: (orderDirection === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
      };
    }

    const result = await listBugs(filters, options);

    // 統計情報を含める場合
    let statistics = null;
    if (includeStats) {
      statistics = await getBugStatistics(BigInt(projectId));
    }

    // BigIntをシリアライズ可能な形式に変換
    const serializedBugs = result.bugs.map((bug) => ({
      ...bug,
      id: bug.id.toString(),
      projectId: bug.projectId.toString(),
      parentBugId: bug.parentBugId?.toString() || null,
      testResultId: bug.testResultId?.toString() || null,
      assigneeId: bug.assigneeId?.toString() || null,
      reporterId: bug.reporterId.toString(),
      project: bug.project ? { ...bug.project, id: bug.project.id.toString() } : undefined,
      parentBug: bug.parentBug ? { ...bug.parentBug, id: bug.parentBug.id.toString() } : null,
      childBugs: bug.childBugs?.map((child) => ({
        ...child,
        id: child.id.toString(),
      })),
      testResult: bug.testResult ? { id: bug.testResult.id.toString() } : null,
      assignee: bug.assignee ? { ...bug.assignee, id: bug.assignee.id.toString() } : null,
      reporter: bug.reporter ? { ...bug.reporter, id: bug.reporter.id.toString() } : undefined,
    }));

    return NextResponse.json({
      bugs: serializedBugs,
      total: result.total,
      statistics,
    });
  } catch (error) {
    console.error('List bugs error:', error);
    return NextResponse.json({ error: 'バグ一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects/[id]/bugs
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 入力値の検証
    const validation = validateCreateBugInput({
      ...body,
      projectId: BigInt(projectId),
      reporterId: BigInt(session.user.id),
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const bug = await createBug(validation.data!);

    // BigIntをシリアライズ可能な形式に変換
    const serializedBug = {
      ...bug,
      id: bug.id.toString(),
      projectId: bug.projectId.toString(),
      parentBugId: bug.parentBugId?.toString() || null,
      testResultId: bug.testResultId?.toString() || null,
      assigneeId: bug.assigneeId?.toString() || null,
      reporterId: bug.reporterId.toString(),
    };

    return NextResponse.json(serializedBug, { status: 201 });
  } catch (error) {
    console.error('Create bug error:', error);
    return NextResponse.json({ error: 'バグの作成に失敗しました。' }, { status: 500 });
  }
}
