import { NextRequest, NextResponse } from 'next/server';
import {
  withApiAuth,
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  type AuthContext,
  type ApiResponse,
} from '@/lib/middleware/api-auth';
import {
  getTestCaseById,
  updateTestCase,
  deleteTestCase,
  type UpdateTestCaseInput,
} from '@/lib/repositories/test-case-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/test-cases/[id] - テストケース詳細取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const testCaseId = BigInt(id);
      const testCase = await getTestCaseById(testCaseId);

      if (!testCase) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'テストケースが見つかりません。',
          404,
          requestId
        );
      }

      return createSuccessResponse({ testCase }, requestId);
    },
    { requiredScopes: ['READ_TEST_CASES'] }
  );
}

// PUT /api/v1/test-cases/[id] - テストケース更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const testCaseId = BigInt(id);

      // テストケースの存在確認
      const existingTestCase = await getTestCaseById(testCaseId);
      if (!existingTestCase) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'テストケースが見つかりません。',
          404,
          requestId
        );
      }

      let body: {
        sectionId?: string | null;
        title?: string;
        description?: string;
        precondition?: string;
        priority?: string;
        status?: string;
        testType?: string;
        automationStatus?: string;
        estimatedTime?: number | null;
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
      if (body.title !== undefined && body.title.trim() === '') {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'テストケースタイトルは空にできません。',
          400,
          requestId,
          { field: 'title' }
        );
      }

      const updateData: UpdateTestCaseInput = {
        ...(body.sectionId !== undefined && {
          sectionId: body.sectionId ? BigInt(body.sectionId) : null,
        }),
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.precondition !== undefined && { precondition: body.precondition }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.testType !== undefined && { testType: body.testType }),
        ...(body.automationStatus !== undefined && { automationStatus: body.automationStatus }),
        ...(body.estimatedTime !== undefined && { estimatedTime: body.estimatedTime }),
        ...(body.steps !== undefined && { steps: body.steps }),
      };

      const testCase = await updateTestCase(testCaseId, updateData);

      return createSuccessResponse({ testCase }, requestId);
    },
    { requiredScopes: ['WRITE_TEST_CASES'] }
  );
}

// DELETE /api/v1/test-cases/[id] - テストケース削除
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const testCaseId = BigInt(id);

      // テストケースの存在確認
      const existingTestCase = await getTestCaseById(testCaseId);
      if (!existingTestCase) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'テストケースが見つかりません。',
          404,
          requestId
        );
      }

      await deleteTestCase(testCaseId);

      return createSuccessResponse({ deleted: true }, requestId);
    },
    { requiredScopes: ['WRITE_TEST_CASES'] }
  );
}
