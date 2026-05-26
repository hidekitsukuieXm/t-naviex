/**
 * ダッシュボードリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type { WidgetType, Prisma } from '@/generated/prisma';
import type { DashboardWithWidgets } from '@/types/dashboard';
import crypto from 'crypto';

// ダッシュボード一覧取得（プロジェクト単位）
export async function getDashboardsByProject(
  projectId: bigint,
  userId: bigint
): Promise<DashboardWithWidgets[]> {
  return prisma.dashboard.findMany({
    where: {
      OR: [
        { projectId, userId }, // 自分のダッシュボード
        { projectId, isPublic: true }, // 公開ダッシュボード
      ],
    },
    include: {
      widgets: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

// ダッシュボード一覧取得（ユーザー単位 - プロジェクト横断）
export async function getDashboardsByUser(userId: bigint): Promise<DashboardWithWidgets[]> {
  return prisma.dashboard.findMany({
    where: {
      OR: [
        { userId, projectId: null }, // ユーザーレベルのダッシュボード
        { userId }, // 自分の全ダッシュボード
      ],
    },
    include: {
      widgets: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

// ダッシュボード取得（ID指定）
export async function getDashboardById(dashboardId: bigint): Promise<DashboardWithWidgets | null> {
  return prisma.dashboard.findUnique({
    where: { id: dashboardId },
    include: {
      widgets: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

// 共有トークンでダッシュボード取得
export async function getDashboardByShareToken(
  shareToken: string
): Promise<DashboardWithWidgets | null> {
  return prisma.dashboard.findUnique({
    where: { shareToken },
    include: {
      widgets: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

// デフォルトダッシュボード取得
export async function getDefaultDashboard(
  projectId: bigint,
  userId: bigint
): Promise<DashboardWithWidgets | null> {
  // まずユーザーのデフォルトを探す
  const dashboard = await prisma.dashboard.findFirst({
    where: {
      projectId,
      userId,
      isDefault: true,
    },
    include: {
      widgets: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (dashboard) return dashboard;

  // なければ公開のデフォルトを探す
  return prisma.dashboard.findFirst({
    where: {
      projectId,
      isPublic: true,
      isDefault: true,
    },
    include: {
      widgets: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

// ダッシュボード作成
export async function createDashboard(data: {
  projectId?: bigint | null;
  userId: bigint;
  name: string;
  description?: string;
  isDefault?: boolean;
  isPublic?: boolean;
  layout?: Prisma.InputJsonValue;
}): Promise<DashboardWithWidgets> {
  // isDefaultがtrueの場合、他のデフォルトを解除
  if (data.isDefault) {
    await prisma.dashboard.updateMany({
      where: {
        projectId: data.projectId ?? null,
        userId: data.userId,
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  return prisma.dashboard.create({
    data: {
      projectId: data.projectId ?? null,
      userId: data.userId,
      name: data.name,
      description: data.description,
      isDefault: data.isDefault ?? false,
      isPublic: data.isPublic ?? false,
      layout: data.layout ?? {},
    },
    include: {
      widgets: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

// ダッシュボード更新
export async function updateDashboard(
  dashboardId: bigint,
  data: {
    name?: string;
    description?: string;
    isDefault?: boolean;
    isPublic?: boolean;
    layout?: Prisma.InputJsonValue;
  }
): Promise<DashboardWithWidgets> {
  // isDefaultがtrueの場合、他のデフォルトを解除
  if (data.isDefault) {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
    });

    if (dashboard) {
      await prisma.dashboard.updateMany({
        where: {
          projectId: dashboard.projectId,
          userId: dashboard.userId,
          isDefault: true,
          NOT: { id: dashboardId },
        },
        data: { isDefault: false },
      });
    }
  }

  return prisma.dashboard.update({
    where: { id: dashboardId },
    data,
    include: {
      widgets: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

// ダッシュボード削除
export async function deleteDashboard(dashboardId: bigint): Promise<void> {
  await prisma.dashboard.delete({
    where: { id: dashboardId },
  });
}

// 共有トークン生成
export async function generateShareToken(dashboardId: bigint): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: {
      shareToken: token,
      isPublic: true,
    },
  });

  return token;
}

// 共有トークン無効化
export async function revokeShareToken(dashboardId: bigint): Promise<void> {
  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: {
      shareToken: null,
    },
  });
}

// ウィジェット追加
export async function addWidget(data: {
  dashboardId: bigint;
  widgetType: WidgetType;
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  config?: Prisma.InputJsonValue;
  sortOrder?: number;
}): Promise<DashboardWithWidgets> {
  // 最大sortOrderを取得
  const maxSortOrder = await prisma.dashboardWidget.aggregate({
    where: { dashboardId: data.dashboardId },
    _max: { sortOrder: true },
  });

  await prisma.dashboardWidget.create({
    data: {
      dashboardId: data.dashboardId,
      widgetType: data.widgetType,
      title: data.title,
      x: data.x ?? 0,
      y: data.y ?? 0,
      width: data.width ?? 4,
      height: data.height ?? 3,
      config: data.config ?? {},
      sortOrder: data.sortOrder ?? (maxSortOrder._max.sortOrder ?? 0) + 1,
    },
  });

  return getDashboardById(data.dashboardId) as Promise<DashboardWithWidgets>;
}

// ウィジェット更新
export async function updateWidget(
  widgetId: bigint,
  data: {
    title?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    config?: Prisma.InputJsonValue;
    sortOrder?: number;
  }
): Promise<void> {
  await prisma.dashboardWidget.update({
    where: { id: widgetId },
    data,
  });
}

// ウィジェット削除
export async function deleteWidget(widgetId: bigint): Promise<void> {
  await prisma.dashboardWidget.delete({
    where: { id: widgetId },
  });
}

// ウィジェット一括更新（レイアウト変更用）
export async function updateWidgetPositions(
  widgets: Array<{
    id: bigint;
    x: number;
    y: number;
    width: number;
    height: number;
    sortOrder?: number;
  }>
): Promise<void> {
  await prisma.$transaction(
    widgets.map((widget) =>
      prisma.dashboardWidget.update({
        where: { id: widget.id },
        data: {
          x: widget.x,
          y: widget.y,
          width: widget.width,
          height: widget.height,
          sortOrder: widget.sortOrder,
        },
      })
    )
  );
}

// ダッシュボード複製
export async function duplicateDashboard(
  dashboardId: bigint,
  userId: bigint,
  newName?: string
): Promise<DashboardWithWidgets> {
  const source = await getDashboardById(dashboardId);
  if (!source) {
    throw new Error('ダッシュボードが見つかりません');
  }

  const dashboard = await prisma.dashboard.create({
    data: {
      projectId: source.projectId,
      userId,
      name: newName ?? `${source.name} (コピー)`,
      description: source.description,
      isDefault: false,
      isPublic: false,
      layout: source.layout ?? {},
    },
    include: {
      widgets: true,
    },
  });

  // ウィジェットをコピー
  if (source.widgets.length > 0) {
    await prisma.dashboardWidget.createMany({
      data: source.widgets.map((w) => ({
        dashboardId: dashboard.id,
        widgetType: w.widgetType,
        title: w.title,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        config: w.config ?? {},
        sortOrder: w.sortOrder,
      })),
    });
  }

  return getDashboardById(dashboard.id) as Promise<DashboardWithWidgets>;
}
