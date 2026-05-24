import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logProjectMemberAdd } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/members - プロジェクトメンバー一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);

    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
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
      orderBy: { createdAt: 'asc' },
    });

    // BigInt を文字列に変換
    const serializedMembers = members.map((member) => ({
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
    }));

    return NextResponse.json(serializedMembers);
  } catch (error) {
    console.error('Project members fetch error:', error);
    return NextResponse.json(
      { error: 'プロジェクトメンバーの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/members - プロジェクトメンバー追加
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const projectId = BigInt(id);
    const body = await request.json();
    const { userId, roleId } = body;

    // プロジェクトの存在確認
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // 必須パラメータの検証
    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDは必須です。' }, { status: 400 });
    }

    if (!roleId) {
      return NextResponse.json({ error: 'ロールIDは必須です。' }, { status: 400 });
    }

    const userIdBigInt = BigInt(userId);
    const roleIdBigInt = BigInt(roleId);

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: userIdBigInt },
    });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません。' }, { status: 404 });
    }

    // ロールの存在確認
    const role = await prisma.role.findUnique({
      where: { id: roleIdBigInt },
    });

    if (!role) {
      return NextResponse.json({ error: 'ロールが見つかりません。' }, { status: 404 });
    }

    // 既にメンバーとして登録されているか確認
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: userIdBigInt,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'このユーザーは既にプロジェクトメンバーです。' },
        { status: 400 }
      );
    }

    // メンバー追加
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: userIdBigInt,
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

    // 監査ログを記録
    await logProjectMemberAdd(session.user.id, id, userId, {
      userName: member.user.name,
      userEmail: member.user.email,
      roleName: member.role.name,
    });

    return NextResponse.json(serializedMember, { status: 201 });
  } catch (error) {
    console.error('Project member add error:', error);
    return NextResponse.json(
      { error: 'プロジェクトメンバーの追加に失敗しました。' },
      { status: 500 }
    );
  }
}
