/**
 * Group Members API
 *
 * グループメンバーの管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/groups/[id]/members
 * グループメンバー一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // グループの存在確認
    const group = await prisma.group.findUnique({
      where: { id: BigInt(id) },
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // メンバー一覧を取得
    const [members, total] = await Promise.all([
      prisma.userGroup.findMany({
        where: { groupId: BigInt(id) },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userGroup.count({
        where: { groupId: BigInt(id) },
      }),
    ]);

    const formattedMembers = members.map((member) => ({
      userId: member.userId.toString(),
      groupId: member.groupId.toString(),
      user: {
        id: member.user.id.toString(),
        email: member.user.email,
        name: member.user.name,
      },
      joinedAt: member.createdAt,
    }));

    return NextResponse.json({
      members: formattedMembers,
      total,
      page,
      limit,
      hasMore: skip + members.length < total,
    });
  } catch (error) {
    console.error('グループメンバー取得エラー:', error);
    return NextResponse.json({ error: 'グループメンバーの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/groups/[id]/members
 * グループにメンバーを追加
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, userIds } = body;

    // グループの存在確認
    const group = await prisma.group.findUnique({
      where: { id: BigInt(id) },
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // 一括追加の場合
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const results = await addMultipleMembers(BigInt(id), userIds);
      return NextResponse.json({
        message: 'メンバーを追加しました',
        addedCount: results.addedCount,
        skippedCount: results.skippedCount,
        errors: results.errors,
      });
    }

    // 単一追加の場合
    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDは必須です' }, { status: 400 });
    }

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      return NextResponse.json({ error: '指定されたユーザーが見つかりません' }, { status: 404 });
    }

    // 既にメンバーかどうか確認
    const existingMember = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: BigInt(userId),
          groupId: BigInt(id),
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'このユーザーは既にグループのメンバーです' },
        { status: 409 }
      );
    }

    // メンバーを追加
    await prisma.userGroup.create({
      data: {
        userId: BigInt(userId),
        groupId: BigInt(id),
      },
    });

    return NextResponse.json({
      message: 'メンバーを追加しました',
      userId: userId,
      groupId: id,
    });
  } catch (error) {
    console.error('グループメンバー追加エラー:', error);
    return NextResponse.json({ error: 'グループメンバーの追加に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/groups/[id]/members
 * グループからメンバーを削除（クエリパラメータでuserIdを指定）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userIds = searchParams.get('userIds')?.split(',');

    // グループの存在確認
    const group = await prisma.group.findUnique({
      where: { id: BigInt(id) },
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // 一括削除の場合
    if (userIds && userIds.length > 0) {
      const result = await prisma.userGroup.deleteMany({
        where: {
          groupId: BigInt(id),
          userId: {
            in: userIds.map((uid) => BigInt(uid)),
          },
        },
      });

      return NextResponse.json({
        message: 'メンバーを削除しました',
        removedCount: result.count,
      });
    }

    // 単一削除の場合
    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDは必須です' }, { status: 400 });
    }

    // メンバーの存在確認
    const member = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId: BigInt(userId),
          groupId: BigInt(id),
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'このユーザーはグループのメンバーではありません' },
        { status: 404 }
      );
    }

    // メンバーを削除
    await prisma.userGroup.delete({
      where: {
        userId_groupId: {
          userId: BigInt(userId),
          groupId: BigInt(id),
        },
      },
    });

    return NextResponse.json({
      message: 'メンバーを削除しました',
    });
  } catch (error) {
    console.error('グループメンバー削除エラー:', error);
    return NextResponse.json({ error: 'グループメンバーの削除に失敗しました' }, { status: 500 });
  }
}

/**
 * 複数メンバーを一括追加
 */
async function addMultipleMembers(
  groupId: bigint,
  userIds: string[]
): Promise<{
  addedCount: number;
  skippedCount: number;
  errors: { userId: string; error: string }[];
}> {
  let addedCount = 0;
  let skippedCount = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const userId of userIds) {
    try {
      // ユーザーの存在確認
      const user = await prisma.user.findUnique({
        where: { id: BigInt(userId) },
      });

      if (!user) {
        errors.push({ userId, error: 'ユーザーが見つかりません' });
        continue;
      }

      // 既にメンバーかどうか確認
      const existingMember = await prisma.userGroup.findUnique({
        where: {
          userId_groupId: {
            userId: BigInt(userId),
            groupId,
          },
        },
      });

      if (existingMember) {
        skippedCount++;
        continue;
      }

      // メンバーを追加
      await prisma.userGroup.create({
        data: {
          userId: BigInt(userId),
          groupId,
        },
      });

      addedCount++;
    } catch (err) {
      errors.push({ userId, error: '追加に失敗しました' });
    }
  }

  return { addedCount, skippedCount, errors };
}
