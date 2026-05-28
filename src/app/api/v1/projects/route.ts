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
  getProjects,
  createProject,
  isProjectNameTaken,
  type CreateProjectInput,
  type ProjectSearchParams,
} from '@/lib/repositories/project-repository';
import { validateProject, type ProjectStatus } from '@/types/project';

// GET /api/v1/projects - プロジェクト一覧取得
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
      const { searchParams } = new URL(request.url);
      const { page, limit } = parsePaginationParams(searchParams);

      const params: ProjectSearchParams = {
        query: searchParams.get('query') || undefined,
        status: (searchParams.get('status') as ProjectStatus) || undefined,
        projectType: searchParams.get('projectType') || undefined,
        page,
        limit,
        sortBy: (searchParams.get('sortBy') as ProjectSearchParams['sortBy']) || 'updatedAt',
        sortOrder: (searchParams.get('sortOrder') as ProjectSearchParams['sortOrder']) || 'desc',
      };

      const result = await getProjects(params);
      const pagination = createPaginationMeta(result.total, result.page, result.limit);

      return createSuccessResponse(
        {
          projects: result.projects,
          pagination,
        },
        requestId
      );
    },
    { requiredScopes: ['READ_PROJECTS'] }
  );
}

// POST /api/v1/projects - プロジェクト作成
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  return withApiAuth(
    request,
    async (_context: AuthContext, requestId: string) => {
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
      if (!body.name || body.name.trim() === '') {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'プロジェクト名は必須です。',
          400,
          requestId,
          { field: 'name' }
        );
      }

      const validation = validateProject({
        name: body.name,
        description: body.description,
        status: body.status,
        projectType: body.projectType,
        targetVersion: body.targetVersion,
      });

      if (!validation.valid) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          validation.errors.join(' '),
          400,
          requestId
        );
      }

      // プロジェクト名の重複チェック
      const nameTaken = await isProjectNameTaken(body.name.trim());
      if (nameTaken) {
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'このプロジェクト名は既に使用されています。',
          400,
          requestId,
          { field: 'name' }
        );
      }

      const createData: CreateProjectInput = {
        name: body.name,
        description: body.description,
        status: body.status,
        projectType: body.projectType,
        targetVersion: body.targetVersion,
      };

      const project = await createProject(createData);

      return NextResponse.json(
        {
          success: true,
          data: { project },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 201, headers: { 'X-Request-Id': requestId } }
      );
    },
    { requiredScopes: ['WRITE_PROJECTS'] }
  );
}
