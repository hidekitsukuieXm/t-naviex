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
  getTestRunById,
  updateTestRun,
  deleteTestRun,
  type UpdateTestRunInput,
} from '@/lib/repositories/test-run-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/test-runs/[id] - テストラン詳細取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const testRunId = BigInt(id);
      const testRun = await getTestRunById(testRunId);

      if (!testRun) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'テストランが見つかりません。',
          404,
          requestId
        );
      }

      return createSuccessResponse({ testRun }, requestId);
    },
    { requiredScopes: ['READ_TEST_RUNS'] }
  );
}

// PUT /api/v1/test-runs/[id] - テストラン更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const testRunId = BigInt(id);

      // テストランの存在確認
      const existingTestRun = await getTestRunById(testRunId);
      if (!existingTestRun) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'テストランが見つかりません。',
          404,
          requestId
        );
      }

      let body: {
        name?: string;
        description?: string;
        status?: string;
        milestoneId?: string | null;
        configurationId?: string | null;
        assigneeId?: string | null;
        plannedStartDate?: string | null;
        plannedEndDate?: string | null;
        actualStartDate?: string | null;
        actualEndDate?: string | null;
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
      if (body.name !== undefined && body.name.trim() === '') {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'テストラン名は空にできません。',
          400,
          requestId,
          { field: 'name' }
        );
      }

      const updateData: UpdateTestRunInput = {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.milestoneId !== undefined && {
          milestoneId: body.milestoneId ? BigInt(body.milestoneId) : null,
        }),
        ...(body.configurationId !== undefined && {
          configurationId: body.configurationId ? BigInt(body.configurationId) : null,
        }),
        ...(body.assigneeId !== undefined && {
          assigneeId: body.assigneeId ? BigInt(body.assigneeId) : null,
        }),
        ...(body.plannedStartDate !== undefined && {
          plannedStartDate: body.plannedStartDate ? new Date(body.plannedStartDate) : null,
        }),
        ...(body.plannedEndDate !== undefined && {
          plannedEndDate: body.plannedEndDate ? new Date(body.plannedEndDate) : null,
        }),
        ...(body.actualStartDate !== undefined && {
          actualStartDate: body.actualStartDate ? new Date(body.actualStartDate) : null,
        }),
        ...(body.actualEndDate !== undefined && {
          actualEndDate: body.actualEndDate ? new Date(body.actualEndDate) : null,
        }),
      };

      const testRun = await updateTestRun(testRunId, updateData);

      return createSuccessResponse({ testRun }, requestId);
    },
    { requiredScopes: ['WRITE_TEST_RUNS'] }
  );
}

// DELETE /api/v1/test-runs/[id] - テストラン削除
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const testRunId = BigInt(id);

      // テストランの存在確認
      const existingTestRun = await getTestRunById(testRunId);
      if (!existingTestRun) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'テストランが見つかりません。',
          404,
          requestId
        );
      }

      await deleteTestRun(testRunId);

      return createSuccessResponse({ deleted: true }, requestId);
    },
    { requiredScopes: ['WRITE_TEST_RUNS'] }
  );
}
