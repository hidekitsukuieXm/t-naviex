import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createProject,
  getAllProjects,
  getProjects,
  isProjectNameTaken,
  type CreateProjectInput,
  type ProjectSearchParams,
} from '@/lib/repositories/project-repository';
import { logProjectCreate } from '@/lib/audit';
import { validateProject, VALID_PROJECT_STATUSES, type ProjectStatus } from '@/types/project';

// GET /api/projects - プロジェクト一覧取得
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // ページネーションパラメータがあるかどうかで処理を分岐
    const hasPageParam = searchParams.has('page') || searchParams.has('limit');

    if (hasPageParam) {
      // ページネーション付きの取得
      const params: ProjectSearchParams = {
        query: searchParams.get('query') || undefined,
        status: (searchParams.get('status') as ProjectStatus) || undefined,
        projectType: searchParams.get('projectType') || undefined,
        page: parseInt(searchParams.get('page') || '1', 10),
        limit: parseInt(searchParams.get('limit') || '20', 10),
        sortBy: (searchParams.get('sortBy') as ProjectSearchParams['sortBy']) || 'updatedAt',
        sortOrder: (searchParams.get('sortOrder') as ProjectSearchParams['sortOrder']) || 'desc',
      };

      const result = await getProjects(params);
      return NextResponse.json(result);
    } else {
      // 互換性のため、全件取得（ページネーションなし）
      const projects = await getAllProjects();
      return NextResponse.json(projects);
    }
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json({ error: 'プロジェクト一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/projects - プロジェクト作成
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'プロジェクト名は必須です。' }, { status: 400 });
    }

    const validation = validateProject({
      name: body.name,
      description: body.description,
      status: body.status,
      projectType: body.projectType,
      targetVersion: body.targetVersion,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // ステータスのバリデーション
    if (body.status && !VALID_PROJECT_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: '無効なステータスです。' }, { status: 400 });
    }

    // プロジェクト名の重複チェック（オプション）
    const nameTaken = await isProjectNameTaken(body.name.trim());
    if (nameTaken) {
      return NextResponse.json(
        { error: 'このプロジェクト名は既に使用されています。' },
        { status: 400 }
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

    // 監査ログを記録
    await logProjectCreate(session.user.id, project.id, {
      projectName: project.name,
      status: project.status,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'プロジェクトの作成に失敗しました。' }, { status: 500 });
  }
}
