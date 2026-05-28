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
  getTestCases,
  createTestCase,
  type TestCaseSearchParams,
  type CreateTestCaseInput,
} from '@/lib/repositories/test-case-repository';
import { getTestSpecById } from '@/lib/repositories/test-spec-repository';

// GET /api/v1/test-cases - テストケース一覧取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const { searchParams } = new URL(request.url);
      const { page, limit } = parsePaginationParams(searchParams);

      const testSpecId = searchParams.get('testSpecId');
      const sectionId = searchParams.get('sectionId');

      const params: TestCaseSearchParams = {
        testSpecId: testSpecId ? BigInt(testSpecId) : undefined,
        sectionId: sectionId ? BigInt(sectionId) : undefined,
        query: searchParams.get('query') || undefined,
        priority: searchParams.get('priority') || undefined,
        status: searchParams.get('status') || undefined,
        testType: searchParams.get('testType') || undefined,
        page,
        limit,
        sortBy: (searchParams.get('sortBy') as TestCaseSearchParams['sortBy']) || 'updatedAt',
        sortOrder: (searchParams.get('sortOrder') as TestCaseSearchParams['sortOrder']) || 'desc',
      };

      const result = await getTestCases(params);
      const pagination = createPaginationMeta(result.total, result.page, result.limit);

      return createSuccessResponse(
        {
          testCases: result.testCases,
          pagination,
        },
        requestId
      );
    },
    { requiredScopes: ['READ_TEST_CASES'] }
  );
}

// POST /api/v1/test-cases - テストケース作成
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (context: AuthContext, requestId: string) => {
      let body: {
        testSpecId?: string;
        sectionId?: string;
        title?: string;
        description?: string;
        precondition?: string;
        priority?: string;
        status?: string;
        testType?: string;
        automationStatus?: string;
        estimatedTime?: number;
        steps?: {
          stepNumber: number;
          action: string;
          expectedResult: string;
        }[];
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
      if (!body.testSpecId) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'テスト仕様書IDは必須です。',
          400,
          requestId,
          { field: 'testSpecId' }
        );
      }

      if (!body.title || body.title.trim() === '') {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'テストケースタイトルは必須です。',
          400,
          requestId,
          { field: 'title' }
        );
      }

      // テスト仕様書の存在確認
      const testSpecId = BigInt(body.testSpecId);
      const testSpec = await getTestSpecById(testSpecId);
      if (!testSpec) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          '指定されたテスト仕様書が見つかりません。',
          404,
          requestId
        );
      }

      const createData: CreateTestCaseInput = {
        testSpecId,
        sectionId: body.sectionId ? BigInt(body.sectionId) : null,
        title: body.title.trim(),
        description: body.description || null,
        precondition: body.precondition || null,
        priority: body.priority || 'MEDIUM',
        status: body.status || 'DRAFT',
        testType: body.testType || null,
        automationStatus: body.automationStatus || 'NOT_AUTOMATED',
        estimatedTime: body.estimatedTime || null,
        createdById: context.userId,
        steps: body.steps,
      };

      const testCase = await createTestCase(createData);

      return NextResponse.json(
        {
          success: true,
          data: { testCase },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 201, headers: { 'X-Request-Id': requestId } }
      );
    },
    { requiredScopes: ['WRITE_TEST_CASES'] }
  );
}
