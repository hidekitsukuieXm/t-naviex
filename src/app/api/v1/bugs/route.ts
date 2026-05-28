import { NextRequest, NextResponse } from 'next/server';
import {
  withApiAuth,
  createSuccessResponse,
  createErrorResponse,
  parsePaginationParams,
  createPaginationMeta,
  ErrorCodes,
  type AuthContext,
  type ApiResponse,
} from '@/lib/middleware/api-auth';
import {
  getBugs,
  createBug,
  type BugSearchParams,
  type CreateBugInput,
} from '@/lib/repositories/bug-repository';
import { getProjectById } from '@/lib/repositories/project-repository';

// GET /api/v1/bugs - バグ一覧取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const { searchParams } = new URL(request.url);
      const { page, limit } = parsePaginationParams(searchParams);

      const projectId = searchParams.get('projectId');
      const assigneeId = searchParams.get('assigneeId');

      const params: BugSearchParams = {
        projectId: projectId ? BigInt(projectId) : undefined,
        assigneeId: assigneeId ? BigInt(assigneeId) : undefined,
        query: searchParams.get('query') || undefined,
        status: searchParams.get('status') || undefined,
        priority: searchParams.get('priority') || undefined,
        severity: searchParams.get('severity') || undefined,
        page,
        limit,
        sortBy: (searchParams.get('sortBy') as BugSearchParams['sortBy']) || 'updatedAt',
        sortOrder: (searchParams.get('sortOrder') as BugSearchParams['sortOrder']) || 'desc',
      };

      const result = await getBugs(params);
      const pagination = createPaginationMeta(result.total, result.page, result.limit);

      return createSuccessResponse(
        {
          bugs: result.bugs,
          pagination,
        },
        requestId
      );
    },
    { requiredScopes: ['READ_BUGS'] }
  );
}

// POST /api/v1/bugs - バグ作成
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (context: AuthContext, requestId: string) => {
      let body: {
        projectId?: string;
        title?: string;
        description?: string;
        stepsToReproduce?: string;
        expectedBehavior?: string;
        actualBehavior?: string;
        status?: string;
        priority?: string;
        severity?: string;
        assigneeId?: string;
        testResultId?: string;
        environment?: string;
        version?: string;
      };

      try {
        body = await request.json();
      } catch {
        return createErrorResponse(
          ErrorCodes.BAD_REQUEST,
          'リクエストボディのJSONが無効です。',
          400,
          requestId
        );
      }

      // バリデーション
      if (!body.projectId) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'プロジェクトIDは必須です。',
          400,
          requestId,
          { field: 'projectId' }
        );
      }

      if (!body.title || body.title.trim() === '') {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'バグタイトルは必須です。',
          400,
          requestId,
          { field: 'title' }
        );
      }

      // プロジェクトの存在確認
      const projectId = BigInt(body.projectId);
      const project = await getProjectById(projectId);
      if (!project) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          '指定されたプロジェクトが見つかりません。',
          404,
          requestId
        );
      }

      const createData: CreateBugInput = {
        projectId,
        title: body.title.trim(),
        description: body.description || null,
        stepsToReproduce: body.stepsToReproduce || null,
        expectedBehavior: body.expectedBehavior || null,
        actualBehavior: body.actualBehavior || null,
        status: body.status || 'NEW',
        priority: body.priority || 'MEDIUM',
        severity: body.severity || 'NORMAL',
        assigneeId: body.assigneeId ? BigInt(body.assigneeId) : null,
        reporterId: context.userId,
        testResultId: body.testResultId ? BigInt(body.testResultId) : null,
        environment: body.environment || null,
        version: body.version || null,
      };

      const bug = await createBug(createData);

      return NextResponse.json(
        {
          success: true,
          data: { bug },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 201, headers: { 'X-Request-Id': requestId } }
      );
    },
    { requiredScopes: ['WRITE_BUGS'] }
  );
}
