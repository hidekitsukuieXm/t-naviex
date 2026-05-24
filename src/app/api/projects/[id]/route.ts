import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProjectById,
  updateProject,
  deleteProject,
  isProjectNameTaken,
} from '@/lib/repositories/project-repository';
import { logProjectUpdate, logProjectDelete } from '@/lib/audit';
import { validateProject, VALID_PROJECT_STATUSES } from '@/types/project';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id] - プロジェクト詳細取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    let projectId: bigint;
    try {
      projectId = BigInt(id);
    } catch {
      return NextResponse.json({ error: '無効なプロジェクトIDです。' }, { status: 400 });
    }

    // メンバー情報を含む詳細を取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // BigInt を文字列に変換
    const serializedProject = {
      ...project,
      id: project.id.toString(),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      projectMembers: project.projectMembers.map((member) => ({
        ...member,
        projectId: member.projectId.toString(),
        userId: member.userId.toString(),
        roleId: member.roleId.toString(),
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
        user: {
          ...member.user,
          id: member.user.id.toString(),
        },
        role: {
          ...member.role,
          id: member.role.id.toString(),
        },
      })),
    };

    return NextResponse.json(serializedProject);
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json({ error: 'プロジェクトの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/projects/[id] - プロジェクト更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    let projectId: bigint;
    try {
      projectId = BigInt(id);
    } catch {
      return NextResponse.json({ error: '無効なプロジェクトIDです。' }, { status: 400 });
    }

    // プロジェクトが存在するか確認
    const existingProject = await getProjectById(projectId);
    if (!existingProject) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 名前の必須チェック
    if (body.name !== undefined && (!body.name || body.name.trim() === '')) {
      return NextResponse.json({ error: 'プロジェクト名は必須です。' }, { status: 400 });
    }

    // バリデーション
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

    // プロジェクト名の重複チェック（自分自身は除外）
    if (body.name) {
      const nameTaken = await isProjectNameTaken(body.name.trim(), projectId);
      if (nameTaken) {
        return NextResponse.json(
          { error: 'このプロジェクト名は既に使用されています。' },
          { status: 400 }
        );
      }
    }

    // 更新データを構築
    const updateData: {
      name?: string;
      description?: string | null;
      status?: string;
      projectType?: string | null;
      targetVersion?: string | null;
    } = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.projectType !== undefined) {
      updateData.projectType = body.projectType;
    }

    if (body.targetVersion !== undefined) {
      updateData.targetVersion = body.targetVersion;
    }

    const project = await updateProject(projectId, updateData);

    if (!project) {
      return NextResponse.json({ error: 'プロジェクトの更新に失敗しました。' }, { status: 500 });
    }

    // 監査ログを記録
    await logProjectUpdate(session.user.id, id, {
      updatedFields: Object.keys(updateData),
      projectName: project.name,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'プロジェクトの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - プロジェクト削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    let projectId: bigint;
    try {
      projectId = BigInt(id);
    } catch {
      return NextResponse.json({ error: '無効なプロジェクトIDです。' }, { status: 400 });
    }

    // プロジェクトが存在するか確認（監査ログ用）
    const existingProject = await getProjectById(projectId);
    if (!existingProject) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const result = await deleteProject(projectId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // 監査ログを記録
    await logProjectDelete(session.user.id, id);

    return NextResponse.json({
      message: 'プロジェクトを削除しました。',
      deletedProject: {
        name: existingProject.name,
      },
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'プロジェクトの削除に失敗しました。' }, { status: 500 });
  }
}
