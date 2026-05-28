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
  getBugById,
  updateBug,
  deleteBug,
  type UpdateBugInput,
} from '@/lib/repositories/bug-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/bugs/[id] - バグ詳細取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const bugId = BigInt(id);
      const bug = await getBugById(bugId);

      if (!bug) {
        return createErrorResponse(ErrorCodes.NOT_FOUND, 'バグが見つかりません。', 404, requestId);
      }

      return createSuccessResponse({ bug }, requestId);
    },
    { requiredScopes: ['READ_BUGS'] }
  );
}

// PUT /api/v1/bugs/[id] - バグ更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const bugId = BigInt(id);

      // バグの存在確認
      const existingBug = await getBugById(bugId);
      if (!existingBug) {
        return createErrorResponse(ErrorCodes.NOT_FOUND, 'バグが見つかりません。', 404, requestId);
      }

      let body: {
        title?: string;
        description?: string;
        stepsToReproduce?: string;
        expectedBehavior?: string;
        actualBehavior?: string;
        status?: string;
        priority?: string;
        severity?: string;
        assigneeId?: string | null;
        resolution?: string;
        resolvedAt?: string | null;
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
      if (body.title !== undefined && body.title.trim() === '') {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'バグタイトルは空にできません。',
          400,
          requestId,
          { field: 'title' }
        );
      }

      const updateData: UpdateBugInput = {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.stepsToReproduce !== undefined && { stepsToReproduce: body.stepsToReproduce }),
        ...(body.expectedBehavior !== undefined && { expectedBehavior: body.expectedBehavior }),
        ...(body.actualBehavior !== undefined && { actualBehavior: body.actualBehavior }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.severity !== undefined && { severity: body.severity }),
        ...(body.assigneeId !== undefined && {
          assigneeId: body.assigneeId ? BigInt(body.assigneeId) : null,
        }),
        ...(body.resolution !== undefined && { resolution: body.resolution }),
        ...(body.resolvedAt !== undefined && {
          resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : null,
        }),
        ...(body.environment !== undefined && { environment: body.environment }),
        ...(body.version !== undefined && { version: body.version }),
      };

      const bug = await updateBug(bugId, updateData);

      return createSuccessResponse({ bug }, requestId);
    },
    { requiredScopes: ['WRITE_BUGS'] }
  );
}

// DELETE /api/v1/bugs/[id] - バグ削除
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const bugId = BigInt(id);

      // バグの存在確認
      const existingBug = await getBugById(bugId);
      if (!existingBug) {
        return createErrorResponse(ErrorCodes.NOT_FOUND, 'バグが見つかりません。', 404, requestId);
      }

      await deleteBug(bugId);

      return createSuccessResponse({ deleted: true }, requestId);
    },
    { requiredScopes: ['WRITE_BUGS'] }
  );
}
