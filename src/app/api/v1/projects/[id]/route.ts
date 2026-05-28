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
  getProjectById,
  updateProject,
  deleteProject,
  type UpdateProjectInput,
} from '@/lib/repositories/project-repository';
import { validateProject, VALID_PROJECT_STATUSES, type ProjectStatus } from '@/types/project';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/projects/[id] - プロジェクト詳細取得
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const projectId = BigInt(id);
      const project = await getProjectById(projectId);

      if (!project) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'プロジェクトが見つかりません。',
          404,
          requestId
        );
      }

      return createSuccessResponse({ project }, requestId);
    },
    { requiredScopes: ['READ_PROJECTS'] }
  );
}

// PUT /api/v1/projects/[id] - プロジェクト更新
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const projectId = BigInt(id);

      // プロジェクトの存在確認
      const existingProject = await getProjectById(projectId);
      if (!existingProject) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'プロジェクトが見つかりません。',
          404,
          requestId
        );
      }

      let body: {
        name?: string;
        description?: string;
        status?: ProjectStatus;
        projectType?: string;
        targetVersion?: string;
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
      const validation = validateProject({
        name: body.name || existingProject.name,
        description: body.description ?? existingProject.description,
        status: body.status || existingProject.status,
        projectType: body.projectType ?? existingProject.projectType,
        targetVersion: body.targetVersion ?? existingProject.targetVersion,
      });

      if (!validation.valid) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          validation.errors.join(' '),
          400,
          requestId
        );
      }

      // ステータスのバリデーション
      if (body.status && !VALID_PROJECT_STATUSES.includes(body.status)) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '無効なステータスです。',
          400,
          requestId,
          { field: 'status', validValues: VALID_PROJECT_STATUSES }
        );
      }

      const updateData: UpdateProjectInput = {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.projectType !== undefined && { projectType: body.projectType }),
        ...(body.targetVersion !== undefined && { targetVersion: body.targetVersion }),
      };

      const project = await updateProject(projectId, updateData);

      return createSuccessResponse({ project }, requestId);
    },
    { requiredScopes: ['WRITE_PROJECTS'] }
  );
}

// DELETE /api/v1/projects/[id] - プロジェクト削除
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const { id } = await params;

  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const projectId = BigInt(id);

      // プロジェクトの存在確認
      const existingProject = await getProjectById(projectId);
      if (!existingProject) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'プロジェクトが見つかりません。',
          404,
          requestId
        );
      }

      await deleteProject(projectId);

      return createSuccessResponse({ deleted: true }, requestId);
    },
    { requiredScopes: ['WRITE_PROJECTS'] }
  );
}
