import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/roles - ロール一覧取得
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        permissions: true,
      },
      orderBy: { name: 'asc' },
    });

    // BigInt を文字列に変換
    const serializedRoles = roles.map((role) => ({
      id: role.id.toString(),
      name: role.name,
      permissions: role.permissions as Record<string, boolean>,
    }));

    return NextResponse.json(serializedRoles);
  } catch (error) {
    console.error('Roles fetch error:', error);
    return NextResponse.json({ error: 'ロールの取得に失敗しました。' }, { status: 500 });
  }
}
