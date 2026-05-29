/**
 * Groups API
 *
 * グループのCRUD操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/groups
 * グループ一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const parentId = searchParams.get('parentId');
    const includeChildren = searchParams.get('includeChildren') === 'true';
    const includeMembers = searchParams.get('includeMembers') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // 検索条件を構築
    const where: Record<string, unknown> = {};

    if (query) {
      where['OR'] = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (parentId === 'null') {
      where['parentId'] = null;
    } else if (parentId) {
      where['parentId'] = BigInt(parentId);
    }

    // グループ一覧を取得
    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          parent: includeChildren
            ? {
                select: { id: true, name: true },
              }
            : false,
          children: includeChildren
            ? {
                select: { id: true, name: true },
              }
            : false,
          userGroups: includeMembers
            ? {
                include: {
                  user: {
                    select: { id: true, email: true, name: true },
                  },
                },
              }
            : false,
          _count: {
            select: { userGroups: true, children: true },
          },
        },
      }),
      prisma.group.count({ where }),
    ]);

    const formattedGroups = groups.map((group) => ({
      id: group.id.toString(),
      name: group.name,
      description: group.description,
      parentId: group.parentId?.toString() || null,
      parent: group.parent
        ? {
            id: group.parent.id.toString(),
            name: group.parent.name,
          }
        : null,
      children: group.children?.map((child) => ({
        id: child.id.toString(),
        name: child.name,
      })),
      memberCount: group._count.userGroups,
      childrenCount: group._count.children,
      members: group.userGroups?.map((ug) => {
        const user =
          'user' in ug ? (ug as { user: { id: bigint; email: string; name: string } }).user : null;
        return {
          userId: ug.userId.toString(),
          groupId: ug.groupId.toString(),
          user: user
            ? {
                id: user.id.toString(),
                email: user.email,
                name: user.name,
              }
            : undefined,
          joinedAt: ug.createdAt,
        };
      }),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));

    return NextResponse.json({
      groups: formattedGroups,
      total,
      page,
      limit,
      hasMore: skip + groups.length < total,
    });
  } catch (error) {
    console.error('グループ一覧取得エラー:', error);
    return NextResponse.json({ error: 'グループ一覧の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/groups
 * 新しいグループを作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, parentId } = body;

    // バリデーション
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'グループ名は必須です' }, { status: 400 });
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: 'グループ名は255文字以内で入力してください' },
        { status: 400 }
      );
    }

    // 同名グループの重複チェック（同一階層内）
    const existingGroup = await prisma.group.findFirst({
      where: {
        name: name.trim(),
        parentId: parentId ? BigInt(parentId) : null,
      },
    });

    if (existingGroup) {
      return NextResponse.json(
        { error: '同じ階層に同名のグループが既に存在します' },
        { status: 409 }
      );
    }

    // 親グループの存在確認
    if (parentId) {
      const parent = await prisma.group.findUnique({
        where: { id: BigInt(parentId) },
      });

      if (!parent) {
        return NextResponse.json(
          { error: '指定された親グループが見つかりません' },
          { status: 404 }
        );
      }
    }

    // グループを作成
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        parentId: parentId ? BigInt(parentId) : null,
      },
    });

    return NextResponse.json({
      id: group.id.toString(),
      name: group.name,
      description: group.description,
      parentId: group.parentId?.toString() || null,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      message: 'グループを作成しました',
    });
  } catch (error) {
    console.error('グループ作成エラー:', error);
    return NextResponse.json({ error: 'グループの作成に失敗しました' }, { status: 500 });
  }
}
