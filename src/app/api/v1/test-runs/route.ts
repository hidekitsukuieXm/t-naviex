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
  getTestRuns,
  createTestRun,
  type TestRunSearchParams,
  type CreateTestRunInput,
} from '@/lib/repositories/test-run-repository';
import { getProjectById } from '@/lib/repositories/project-repository';

// GET /api/v1/test-runs - テストラン一覧取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const { searchParams } = new URL(request.url);
      const { page, limit } = parsePaginationParams(searchParams);

      const projectId = searchParams.get('projectId');
      const milestoneId = searchParams.get('milestoneId');

      const params: TestRunSearchParams = {
        projectId: projectId ? BigInt(projectId) : undefined,
        milestoneId: milestoneId ? BigInt(milestoneId) : undefined,
        query: searchParams.get('query') || undefined,
        status: searchParams.get('status') || undefined,
        page,
        limit,
        sortBy: (searchParams.get('sortBy') as TestRunSearchParams['sortBy']) || 'updatedAt',
        sortOrder: (searchParams.get('sortOrder') as TestRunSearchParams['sortOrder']) || 'desc',
      };

      const result = await getTestRuns(params);
      const pagination = createPaginationMeta(result.total, result.page, result.limit);

      return createSuccessResponse(
        {
          testRuns: result.testRuns,
          pagination,
        },
        requestId
      );
    },
    { requiredScopes: ['READ_TEST_RUNS'] }
  );
}

// POST /api/v1/test-runs - テストラン作成
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (context: AuthContext, requestId: string) => {
      let body: {
        projectId?: string;
        name?: string;
        description?: string;
        milestoneId?: string;
        configurationId?: string;
        testCaseIds?: string[];
        assigneeId?: string;
        plannedStartDate?: string;
        plannedEndDate?: string;
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

      if (!body.name || body.name.trim() === '') {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'テストラン名は必須です。',
          400,
          requestId,
          { field: 'name' }
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

      const createData: CreateTestRunInput = {
        projectId,
        name: body.name.trim(),
        description: body.description || null,
        milestoneId: body.milestoneId ? BigInt(body.milestoneId) : null,
        configurationId: body.configurationId ? BigInt(body.configurationId) : null,
        testCaseIds: body.testCaseIds?.map((id) => BigInt(id)) || [],
        assigneeId: body.assigneeId ? BigInt(body.assigneeId) : null,
        createdById: context.userId,
        plannedStartDate: body.plannedStartDate ? new Date(body.plannedStartDate) : null,
        plannedEndDate: body.plannedEndDate ? new Date(body.plannedEndDate) : null,
      };

      const testRun = await createTestRun(createData);

      return NextResponse.json(
        {
          success: true,
          data: { testRun },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 201, headers: { 'X-Request-Id': requestId } }
      );
    },
    { requiredScopes: ['WRITE_TEST_RUNS'] }
  );
}
