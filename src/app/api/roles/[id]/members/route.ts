import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/roles/[id]/members - ロールが割り当てられているメンバー一覧
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    let roleId: bigint;
    try {
      roleId = BigInt(id);
    } catch {
      return NextResponse.json({ error: '無効なロールIDです。' }, { status: 400 });
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });

    if (!role) {
      return NextResponse.json({ error: 'ロールが見つかりません。' }, { status: 404 });
    }

    // Get all project members with this role
    const members = await prisma.projectMember.findMany({
      where: { roleId },
      select: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
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
          },
        },
      },
      orderBy: [{ project: { name: 'asc' } }, { user: { name: 'asc' } }],
    });

    const serializedMembers = members.map((member) => ({
      projectId: member.project.id.toString(),
      projectName: member.project.name,
      userId: member.user.id.toString(),
      userName: member.user.name || '名前なし',
      userEmail: member.user.email,
      roleId: member.role.id.toString(),
    }));

    return NextResponse.json({
      members: serializedMembers,
      total: serializedMembers.length,
    });
  } catch (error) {
    console.error('Get role members error:', error);
    return NextResponse.json({ error: 'ロールメンバーの取得に失敗しました。' }, { status: 500 });
  }
}
