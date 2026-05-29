/**
 * Group Detail API
 *
 * 個別グループの管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/groups/[id]
 * 特定のグループを取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeMembers = searchParams.get('includeMembers') === 'true';
    const includeHierarchy = searchParams.get('includeHierarchy') === 'true';

    const group = await prisma.group.findUnique({
      where: { id: BigInt(id) },
      include: {
        parent: includeHierarchy
          ? {
              select: { id: true, name: true, description: true },
            }
          : false,
        children: includeHierarchy
          ? {
              select: { id: true, name: true, description: true },
              orderBy: { name: 'asc' },
            }
          : false,
        userGroups: includeMembers
          ? {
              include: {
                user: {
                  select: { id: true, email: true, name: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            }
          : false,
        _count: {
          select: { userGroups: true, children: true },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // 階層パスを取得（ルートまで遡る）
    let path: { id: string; name: string }[] = [];
    if (includeHierarchy) {
      path = await getGroupPath(group.id);
    }

    return NextResponse.json({
      id: group.id.toString(),
      name: group.name,
      description: group.description,
      parentId: group.parentId?.toString() || null,
      parent: group.parent
        ? {
            id: group.parent.id.toString(),
            name: group.parent.name,
            description: group.parent.description,
          }
        : null,
      children: group.children?.map((child) => ({
        id: child.id.toString(),
        name: child.name,
        description: child.description,
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
      path,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    });
  } catch (error) {
    console.error('グループ取得エラー:', error);
    return NextResponse.json({ error: 'グループの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * PUT /api/groups/[id]
 * グループを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, parentId } = body;

    // 既存グループを確認
    const existingGroup = await prisma.group.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // 名前のバリデーション
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'グループ名は必須です' }, { status: 400 });
      }

      if (name.length > 255) {
        return NextResponse.json(
          { error: 'グループ名は255文字以内で入力してください' },
          { status: 400 }
        );
      }

      // 同名グループの重複チェック（同一階層内、自分自身を除く）
      const targetParentId = parentId !== undefined ? parentId : existingGroup.parentId?.toString();
      const duplicateGroup = await prisma.group.findFirst({
        where: {
          name: name.trim(),
          parentId: targetParentId ? BigInt(targetParentId) : null,
          NOT: { id: BigInt(id) },
        },
      });

      if (duplicateGroup) {
        return NextResponse.json(
          { error: '同じ階層に同名のグループが既に存在します' },
          { status: 409 }
        );
      }
    }

    // 親グループの変更時のバリデーション
    if (parentId !== undefined && parentId !== null) {
      // 自分自身を親に設定できない
      if (parentId === id) {
        return NextResponse.json(
          { error: '自分自身を親グループに設定することはできません' },
          { status: 400 }
        );
      }

      // 親グループの存在確認
      const parent = await prisma.group.findUnique({
        where: { id: BigInt(parentId) },
      });

      if (!parent) {
        return NextResponse.json(
          { error: '指定された親グループが見つかりません' },
          { status: 404 }
        );
      }

      // 循環参照チェック（子孫を親に設定できない）
      const isDescendant = await checkIsDescendant(BigInt(parentId), BigInt(id));
      if (isDescendant) {
        return NextResponse.json(
          { error: '子孫グループを親に設定することはできません' },
          { status: 400 }
        );
      }
    }

    // グループを更新
    const updatedGroup = await prisma.group.update({
      where: { id: BigInt(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(parentId !== undefined && {
          parentId: parentId ? BigInt(parentId) : null,
        }),
      },
    });

    return NextResponse.json({
      id: updatedGroup.id.toString(),
      name: updatedGroup.name,
      description: updatedGroup.description,
      parentId: updatedGroup.parentId?.toString() || null,
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt,
      message: 'グループを更新しました',
    });
  } catch (error) {
    console.error('グループ更新エラー:', error);
    return NextResponse.json({ error: 'グループの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/groups/[id]
 * グループを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const cascade = searchParams.get('cascade') === 'true';

    // 既存グループを確認
    const existingGroup = await prisma.group.findUnique({
      where: { id: BigInt(id) },
      include: {
        _count: {
          select: { children: true, userGroups: true },
        },
      },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: 'グループが見つかりません' }, { status: 404 });
    }

    // 子グループがある場合
    if (existingGroup._count.children > 0) {
      if (!cascade) {
        return NextResponse.json(
          {
            error:
              '子グループが存在します。cascade=trueを指定するか、先に子グループを削除してください',
            childrenCount: existingGroup._count.children,
          },
          { status: 400 }
        );
      }

      // カスケード削除（子グループも含めて削除）
      await deleteGroupRecursive(BigInt(id));
    } else {
      // 単一グループを削除
      await prisma.group.delete({
        where: { id: BigInt(id) },
      });
    }

    return NextResponse.json({
      message: 'グループを削除しました',
    });
  } catch (error) {
    console.error('グループ削除エラー:', error);
    return NextResponse.json({ error: 'グループの削除に失敗しました' }, { status: 500 });
  }
}

/**
 * グループの階層パスを取得（ルートまで遡る）
 */
async function getGroupPath(groupId: bigint): Promise<{ id: string; name: string }[]> {
  const path: { id: string; name: string }[] = [];
  let currentId: bigint | null = groupId;

  while (currentId) {
    const foundGroup: { id: bigint; name: string; parentId: bigint | null } | null =
      await prisma.group.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });

    if (!foundGroup) break;

    path.unshift({ id: foundGroup.id.toString(), name: foundGroup.name });
    currentId = foundGroup.parentId;
  }

  return path;
}

/**
 * 指定したグループが別のグループの子孫かどうかをチェック
 */
async function checkIsDescendant(groupId: bigint, potentialAncestorId: bigint): Promise<boolean> {
  let currentId: bigint | null = groupId;

  while (currentId) {
    const foundGroup: { parentId: bigint | null } | null = await prisma.group.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    if (!foundGroup) return false;

    if (foundGroup.parentId && foundGroup.parentId === potentialAncestorId) {
      return true;
    }

    currentId = foundGroup.parentId;
  }

  return false;
}

/**
 * グループを再帰的に削除
 */
async function deleteGroupRecursive(groupId: bigint): Promise<void> {
  // 子グループを取得
  const children = await prisma.group.findMany({
    where: { parentId: groupId },
    select: { id: true },
  });

  // 子グループを先に削除
  for (const child of children) {
    await deleteGroupRecursive(child.id);
  }

  // 自身を削除
  await prisma.group.delete({
    where: { id: groupId },
  });
}
