import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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
    const projectId = BigInt(id);

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
      projectMembers: project.projectMembers.map((member) => ({
        ...member,
        projectId: member.projectId.toString(),
        userId: member.userId.toString(),
        roleId: member.roleId.toString(),
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
    console.error('Project fetch error:', error);
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
    const projectId = BigInt(id);
    const body = await request.json();
    const { name, description, projectType, targetVersion, status } = body;

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'プロジェクト名は必須です。' }, { status: 400 });
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: 'プロジェクト名は255文字以内で入力してください。' },
        { status: 400 }
      );
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        projectType: projectType?.trim() || null,
        targetVersion: targetVersion?.trim() || null,
        status: status || existingProject.status,
      },
    });

    return NextResponse.json({
      ...project,
      id: project.id.toString(),
    });
  } catch (error) {
    console.error('Project update error:', error);
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
    const projectId = BigInt(id);

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ message: 'プロジェクトを削除しました。' });
  } catch (error) {
    console.error('Project deletion error:', error);
    return NextResponse.json({ error: 'プロジェクトの削除に失敗しました。' }, { status: 500 });
  }
}
