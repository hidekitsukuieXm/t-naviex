import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/copy - プロジェクトコピー
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const sourceProjectId = BigInt(id);
    const body = await request.json();
    const { newName, copyMembers = false, copyDescription = true, newStatus } = body;

    // コピー元プロジェクトの存在確認
    const sourceProject = await prisma.project.findUnique({
      where: { id: sourceProjectId },
      include: {
        projectMembers: copyMembers
          ? {
              select: {
                userId: true,
                roleId: true,
              },
            }
          : false,
      },
    });

    if (!sourceProject) {
      return NextResponse.json(
        { error: 'コピー元プロジェクトが見つかりません。' },
        { status: 404 }
      );
    }

    // 新しいプロジェクト名の検証
    if (!newName || newName.trim() === '') {
      return NextResponse.json({ error: '新しいプロジェクト名は必須です。' }, { status: 400 });
    }

    if (newName.length > 255) {
      return NextResponse.json(
        { error: 'プロジェクト名は255文字以内で入力してください。' },
        { status: 400 }
      );
    }

    // トランザクションでプロジェクトとメンバーをコピー
    const result = await prisma.$transaction(async (tx) => {
      // 新しいプロジェクトを作成
      const newProject = await tx.project.create({
        data: {
          name: newName.trim(),
          description: copyDescription ? sourceProject.description : null,
          projectType: sourceProject.projectType,
          targetVersion: sourceProject.targetVersion,
          status: newStatus || 'PLANNING',
        },
      });

      let copiedMembersCount = 0;

      // メンバーをコピー
      if (copyMembers && sourceProject.projectMembers && sourceProject.projectMembers.length > 0) {
        const memberData = sourceProject.projectMembers.map((member) => ({
          projectId: newProject.id,
          userId: member.userId,
          roleId: member.roleId,
        }));

        await tx.projectMember.createMany({
          data: memberData,
        });

        copiedMembersCount = memberData.length;
      }

      return {
        project: newProject,
        copiedMembersCount,
      };
    });

    // レスポンスを作成
    const serializedProject = {
      id: result.project.id.toString(),
      name: result.project.name,
      description: result.project.description,
      status: result.project.status,
      projectType: result.project.projectType,
      targetVersion: result.project.targetVersion,
      createdAt: result.project.createdAt,
      updatedAt: result.project.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        project: serializedProject,
        copiedItems: {
          members: result.copiedMembersCount,
        },
        sourceProjectId: sourceProjectId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Project copy error:', error);
    return NextResponse.json({ error: 'プロジェクトのコピーに失敗しました。' }, { status: 500 });
  }
}
