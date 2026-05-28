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
  getTestSpecById,
  updateTestSpec,
  deleteTestSpec,
  type UpdateTestSpecInput,
} from '@/lib/repositories/test-spec-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/test-specs/[id] - テスト仕様書詳細取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const testSpecId = BigInt(id);
      const testSpec = await getTestSpecById(testSpecId);

      if (!testSpec) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'テスト仕様書が見つかりません。',
          404,
          requestId
        );
      }

      return createSuccessResponse({ testSpec }, requestId);
    },
    { requiredScopes: ['READ_TEST_SPECS'] }
  );
}

// PUT /api/v1/test-specs/[id] - テスト仕様書更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const testSpecId = BigInt(id);

      // テスト仕様書の存在確認
      const existingTestSpec = await getTestSpecById(testSpecId);
      if (!existingTestSpec) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'テスト仕様書が見つかりません。',
          404,
          requestId
        );
      }

      let body: {
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
      if (body.name !== undefined && body.name.trim() === '') {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'テスト仕様書名は空にできません。',
          400,
          requestId,
          { field: 'name' }
        );
      }

      const updateData: UpdateTestSpecInput = {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
      };

      const testSpec = await updateTestSpec(testSpecId, updateData);

      return createSuccessResponse({ testSpec }, requestId);
    },
    { requiredScopes: ['WRITE_TEST_SPECS'] }
  );
}

// DELETE /api/v1/test-specs/[id] - テスト仕様書削除
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const testSpecId = BigInt(id);

      // テスト仕様書の存在確認
      const existingTestSpec = await getTestSpecById(testSpecId);
      if (!existingTestSpec) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'テスト仕様書が見つかりません。',
          404,
          requestId
        );
      }

      await deleteTestSpec(testSpecId);

      return createSuccessResponse({ deleted: true }, requestId);
    },
    { requiredScopes: ['WRITE_TEST_SPECS'] }
  );
}
