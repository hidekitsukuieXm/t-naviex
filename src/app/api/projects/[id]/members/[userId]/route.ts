import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

// PUT /api/projects/[id]/members/[userId] - メンバーロール更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, userId } = await params;
    const projectId = BigInt(id);
    const userIdBigInt = BigInt(userId);
    const body = await request.json();
    const { roleId } = body;

    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // メンバーの存在確認
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: userIdBigInt,
        },
      },
    });

    if (!existingMember) {
      return NextResponse.json(
        { error: 'このユーザーはプロジェクトメンバーではありません。' },
        { status: 404 }
      );
    }

    // 必須パラメータの検証
    if (!roleId) {
      return NextResponse.json({ error: 'ロールIDは必須です。' }, { status: 400 });
    }

    const roleIdBigInt = BigInt(roleId);

    // ロールの存在確認
    const role = await prisma.role.findUnique({
      where: { id: roleIdBigInt },
    });

    if (!role) {
      return NextResponse.json({ error: 'ロールが見つかりません。' }, { status: 404 });
    }

    // ロール更新
    const member = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId: userIdBigInt,
        },
      },
      data: {
        roleId: roleIdBigInt,
      },
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
    });

    const serializedMember = {
      projectId: member.projectId.toString(),
      userId: member.userId.toString(),
      roleId: member.roleId.toString(),
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      user: {
        id: member.user.id.toString(),
        name: member.user.name,
        email: member.user.email,
      },
      role: {
        id: member.role.id.toString(),
        name: member.role.name,
      },
    };

    return NextResponse.json(serializedMember);
  } catch (error) {
    console.error('Project member role update error:', error);
    return NextResponse.json({ error: 'メンバーロールの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/members/[userId] - メンバー削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, userId } = await params;
    const projectId = BigInt(id);
    const userIdBigInt = BigInt(userId);

    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // メンバーの存在確認
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: userIdBigInt,
        },
      },
    });

    if (!existingMember) {
      return NextResponse.json(
        { error: 'このユーザーはプロジェクトメンバーではありません。' },
        { status: 404 }
      );
    }

    // メンバー削除
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: userIdBigInt,
        },
      },
    });

    return NextResponse.json({ message: 'メンバーを削除しました。' });
  } catch (error) {
    console.error('Project member delete error:', error);
    return NextResponse.json({ error: 'メンバーの削除に失敗しました。' }, { status: 500 });
  }
}
