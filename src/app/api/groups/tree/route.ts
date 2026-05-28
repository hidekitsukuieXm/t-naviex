/**
 * Group Tree API
 *
 * グループ階層ツリーの取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface GroupTreeNode {
  id: string;
  name: string;
  description: string | null;
  children: GroupTreeNode[];
  memberCount: number;
  depth: number;
}

/**
 * GET /api/groups/tree
 * グループ階層ツリーを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rootId = searchParams.get('rootId');
    const maxDepth = parseInt(searchParams.get('maxDepth') || '10', 10);

    // ルートグループ（親を持たないグループ）を取得
    const rootGroups = await prisma.group.findMany({
      where: rootId ? { id: BigInt(rootId) } : { parentId: null },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { userGroups: true },
        },
      },
    });

    // ツリーを構築
    const tree: GroupTreeNode[] = await Promise.all(
      rootGroups.map((group) =>
        buildTreeNode(group.id, group.name, group.description, group._count.userGroups, 0, maxDepth)
      )
    );

    // 統計情報を取得
    const totalGroups = await prisma.group.count();

    return NextResponse.json({
      tree,
      totalGroups,
      maxDepth,
    });
  } catch (error) {
    console.error('グループツリー取得エラー:', error);
    return NextResponse.json({ error: 'グループツリーの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * ツリーノードを再帰的に構築
 */
async function buildTreeNode(
  id: bigint,
  name: string,
  description: string | null,
  memberCount: number,
  currentDepth: number,
  maxDepth: number
): Promise<GroupTreeNode> {
  const node: GroupTreeNode = {
    id: id.toString(),
    name,
    description,
    children: [],
    memberCount,
    depth: currentDepth,
  };

  // 最大深度に達していない場合は子を取得
  if (currentDepth < maxDepth) {
    const children = await prisma.group.findMany({
      where: { parentId: id },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { userGroups: true },
        },
      },
    });

    node.children = await Promise.all(
      children.map((child) =>
        buildTreeNode(
          child.id,
          child.name,
          child.description,
          child._count.userGroups,
          currentDepth + 1,
          maxDepth
        )
      )
    );
  }

  return node;
}
