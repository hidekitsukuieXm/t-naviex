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
  type CreateTestRunInput,
} from '@/lib/repositories/test-run-repository';
import type { TestRunSearchParams, TestRunStatus } from '@/types/test-run';
import { getProjectById } from '@/lib/repositories/project-repository';

// GET /api/v1/test-runs - テストラン一覧取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const { searchParams } = new URL(request.url);
      const { page, limit } = parsePaginationParams(searchParams);

      const projectId = searchParams.get('projectId');
      if (!projectId) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'プロジェクトIDは必須です。',
          400,
          requestId,
          { field: 'projectId' }
        );
      }

      const milestoneId = searchParams.get('milestoneId');
      const status = searchParams.get('status') as TestRunStatus | null;

      const params: Partial<TestRunSearchParams> = {
        milestoneId: milestoneId || undefined,
        query: searchParams.get('query') || undefined,
        status: status || undefined,
      };

      const testRuns = await getTestRuns(projectId, params);

      // Manual pagination
      const total = testRuns.length;
      const startIndex = (page - 1) * limit;
      const paginatedTestRuns = testRuns.slice(startIndex, startIndex + limit);
      const pagination = createPaginationMeta(total, page, limit);

      return createSuccessResponse(
        {
          testRuns: paginatedTestRuns,
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
      const project = await getProjectById(BigInt(body.projectId));
      if (!project) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          '指定されたプロジェクトが見つかりません。',
          404,
          requestId
        );
      }

      const createData: CreateTestRunInput = {
        projectId: body.projectId,
        name: body.name.trim(),
        description: body.description || null,
        milestoneId: body.milestoneId || null,
        configurationId: body.configurationId || null,
        plannedStartDate: body.plannedStartDate || null,
        plannedEndDate: body.plannedEndDate || null,
      };

      const testRun = await createTestRun(createData);

      return createSuccessResponse({ testRun }, requestId);
    },
    { requiredScopes: ['WRITE_TEST_RUNS'] }
  );
}
