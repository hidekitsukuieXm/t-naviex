import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/users/search - ユーザー検索
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // 検索条件を構築
    const whereCondition: {
      status: string;
      OR?: Array<
        | { name: { contains: string; mode: 'insensitive' } }
        | { email: { contains: string; mode: 'insensitive' } }
      >;
      NOT?: { projectMembers: { some: { projectId: bigint } } };
    } = {
      status: 'ACTIVE',
    };

    // 検索クエリがある場合は名前またはメールで検索
    if (query.trim()) {
      whereCondition.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    // プロジェクトIDがある場合は既存のメンバーを除外
    if (projectId) {
      const projectIdBigInt = BigInt(projectId);
      whereCondition.NOT = {
        projectMembers: {
          some: {
            projectId: projectIdBigInt,
          },
        },
      };
    }

    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    // BigInt を文字列に変換
    const serializedUsers = users.map((user) => ({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      status: user.status,
    }));

    return NextResponse.json(serializedUsers);
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ error: 'ユーザーの検索に失敗しました。' }, { status: 500 });
  }
}
