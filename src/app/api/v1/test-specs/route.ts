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
  getTestSpecs,
  createTestSpec,
  type TestSpecSearchParams,
  type CreateTestSpecInput,
} from '@/lib/repositories/test-spec-repository';
import { getProjectById } from '@/lib/repositories/project-repository';

// GET /api/v1/test-specs - テスト仕様書一覧取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const { searchParams } = new URL(request.url);
      const { page, limit } = parsePaginationParams(searchParams);

      const projectId = searchParams.get('projectId');

      const params: TestSpecSearchParams = {
        projectId: projectId ? BigInt(projectId) : undefined,
        query: searchParams.get('query') || undefined,
        status: searchParams.get('status') || undefined,
        page,
        limit,
        sortBy: (searchParams.get('sortBy') as TestSpecSearchParams['sortBy']) || 'updatedAt',
        sortOrder: (searchParams.get('sortOrder') as TestSpecSearchParams['sortOrder']) || 'desc',
      };

      const result = await getTestSpecs(params);
      const pagination = createPaginationMeta(result.total, result.page, result.limit);

      return createSuccessResponse(
        {
          testSpecs: result.testSpecs,
          pagination,
        },
        requestId
      );
    },
    { requiredScopes: ['READ_TEST_SPECS'] }
  );
}

// POST /api/v1/test-specs - テスト仕様書作成
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (context: AuthContext, requestId: string) => {
      let body: {
        projectId?: string;
        name?: string;
        description?: string;
        status?: string;
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
          'テスト仕様書名は必須です。',
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

      const createData: CreateTestSpecInput = {
        projectId,
        name: body.name.trim(),
        description: body.description || null,
        status: body.status || 'DRAFT',
        createdById: context.userId,
      };

      const testSpec = await createTestSpec(createData);

      return NextResponse.json(
        {
          success: true,
          data: { testSpec },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 201, headers: { 'X-Request-Id': requestId } }
      );
    },
    { requiredScopes: ['WRITE_TEST_SPECS'] }
  );
}
