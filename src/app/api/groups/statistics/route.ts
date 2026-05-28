/**
 * Group Statistics API
 *
 * グループ統計情報の取得
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/groups/statistics
 * グループ統計情報を取得
 */
export async function GET() {
  try {
    // 基本統計を取得
    const [totalGroups, rootGroups, totalMembers] = await Promise.all([
      prisma.group.count(),
      prisma.group.count({ where: { parentId: null } }),
      prisma.userGroup.count(),
    ]);

    // 最大深度を計算
    const maxDepth = await calculateMaxDepth();

    // グループごとのメンバー数を取得
    const memberCounts = await prisma.userGroup.groupBy({
      by: ['groupId'],
      _count: true,
    });

    // 平均メンバー数を計算
    const averageMembersPerGroup =
      memberCounts.length > 0
        ? memberCounts.reduce((sum, g) => sum + g._count, 0) / memberCounts.length
        : 0;

    // メンバーのいないグループ数
    const emptyGroups = totalGroups - memberCounts.length;

    // 最大メンバー数のグループ
    let largestGroup = null;
    if (memberCounts.length > 0) {
      const maxMemberCount = Math.max(...memberCounts.map((g) => g._count));
      const largestGroupId = memberCounts.find((g) => g._count === maxMemberCount)?.groupId;
      if (largestGroupId) {
        const group = await prisma.group.findUnique({
          where: { id: largestGroupId },
          select: { id: true, name: true },
        });
        if (group) {
          largestGroup = {
            id: group.id.toString(),
            name: group.name,
            memberCount: maxMemberCount,
          };
        }
      }
    }

    return NextResponse.json({
      totalGroups,
      totalMembers,
      rootGroups,
      maxDepth,
      averageMembersPerGroup: Math.round(averageMembersPerGroup * 100) / 100,
      emptyGroups,
      largestGroup,
    });
  } catch (error) {
    console.error('グループ統計取得エラー:', error);
    return NextResponse.json({ error: 'グループ統計の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * グループ階層の最大深度を計算
 */
async function calculateMaxDepth(): Promise<number> {
  // ルートグループを取得
  const rootGroups = await prisma.group.findMany({
    where: { parentId: null },
    select: { id: true },
  });

  if (rootGroups.length === 0) {
    return 0;
  }

  let maxDepth = 0;

  for (const root of rootGroups) {
    const depth = await getDepth(root.id, 1);
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  }

  return maxDepth;
}

/**
 * 指定したグループからの深度を再帰的に計算
 */
async function getDepth(groupId: bigint, currentDepth: number): Promise<number> {
  const children = await prisma.group.findMany({
    where: { parentId: groupId },
    select: { id: true },
  });

  if (children.length === 0) {
    return currentDepth;
  }

  let maxChildDepth = currentDepth;
  for (const child of children) {
    const childDepth = await getDepth(child.id, currentDepth + 1);
    if (childDepth > maxChildDepth) {
      maxChildDepth = childDepth;
    }
  }

  return maxChildDepth;
}
