/**
 * ダッシュボードリポジトリのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDashboardsByProject,
  getDashboardsByUser,
  getDashboardById,
  getDashboardByShareToken,
  getDefaultDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  generateShareToken,
  revokeShareToken,
  addWidget,
  updateWidget,
  deleteWidget,
  updateWidgetPositions,
  duplicateDashboard,
} from '@/repositories/dashboard-repository';

// Prismaモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dashboard: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    dashboardWidget: {
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';

describe('dashboard-repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardsByProject', () => {
    it('プロジェクトのダッシュボード一覧を取得する', async () => {
      const mockDashboards = [
        {
          id: BigInt(1),
          projectId: BigInt(1),
          userId: BigInt(1),
          name: 'Test Dashboard',
          widgets: [],
        },
      ];

      vi.mocked(prisma.dashboard.findMany).mockResolvedValue(mockDashboards as never);

      const result = await getDashboardsByProject(BigInt(1), BigInt(1));

      expect(prisma.dashboard.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { projectId: BigInt(1), userId: BigInt(1) },
            { projectId: BigInt(1), isPublic: true },
          ],
        },
        include: {
          widgets: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      expect(result).toEqual(mockDashboards);
    });
  });

  describe('getDashboardsByUser', () => {
    it('ユーザーのダッシュボード一覧を取得する', async () => {
      const mockDashboards = [
        {
          id: BigInt(1),
          userId: BigInt(1),
          name: 'User Dashboard',
          widgets: [],
        },
      ];

      vi.mocked(prisma.dashboard.findMany).mockResolvedValue(mockDashboards as never);

      const result = await getDashboardsByUser(BigInt(1));

      expect(prisma.dashboard.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ userId: BigInt(1), projectId: null }, { userId: BigInt(1) }],
        },
        include: {
          widgets: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      expect(result).toEqual(mockDashboards);
    });
  });

  describe('getDashboardById', () => {
    it('IDでダッシュボードを取得する', async () => {
      const mockDashboard = {
        id: BigInt(1),
        name: 'Test Dashboard',
        widgets: [],
      };

      vi.mocked(prisma.dashboard.findUnique).mockResolvedValue(mockDashboard as never);

      const result = await getDashboardById(BigInt(1));

      expect(prisma.dashboard.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        include: {
          widgets: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      expect(result).toEqual(mockDashboard);
    });

    it('存在しない場合はnullを返す', async () => {
      vi.mocked(prisma.dashboard.findUnique).mockResolvedValue(null);

      const result = await getDashboardById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getDashboardByShareToken', () => {
    it('共有トークンでダッシュボードを取得する', async () => {
      const mockDashboard = {
        id: BigInt(1),
        shareToken: 'test-token',
        widgets: [],
      };

      vi.mocked(prisma.dashboard.findUnique).mockResolvedValue(mockDashboard as never);

      const result = await getDashboardByShareToken('test-token');

      expect(prisma.dashboard.findUnique).toHaveBeenCalledWith({
        where: { shareToken: 'test-token' },
        include: {
          widgets: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      expect(result).toEqual(mockDashboard);
    });
  });

  describe('getDefaultDashboard', () => {
    it('デフォルトダッシュボードを取得する', async () => {
      const mockDashboard = {
        id: BigInt(1),
        isDefault: true,
        widgets: [],
      };

      vi.mocked(prisma.dashboard.findFirst).mockResolvedValue(mockDashboard as never);

      const result = await getDefaultDashboard(BigInt(1), BigInt(1));

      expect(prisma.dashboard.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: BigInt(1),
          userId: BigInt(1),
          isDefault: true,
        },
        include: {
          widgets: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      expect(result).toEqual(mockDashboard);
    });
  });

  describe('createDashboard', () => {
    it('ダッシュボードを作成する', async () => {
      const mockDashboard = {
        id: BigInt(1),
        projectId: BigInt(1),
        userId: BigInt(1),
        name: 'New Dashboard',
        widgets: [],
      };

      vi.mocked(prisma.dashboard.create).mockResolvedValue(mockDashboard as never);

      const result = await createDashboard({
        projectId: BigInt(1),
        userId: BigInt(1),
        name: 'New Dashboard',
      });

      expect(prisma.dashboard.create).toHaveBeenCalled();
      expect(result).toEqual(mockDashboard);
    });

    it('isDefaultがtrueの場合、他のデフォルトを解除する', async () => {
      const mockDashboard = {
        id: BigInt(1),
        isDefault: true,
        widgets: [],
      };

      vi.mocked(prisma.dashboard.updateMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.dashboard.create).mockResolvedValue(mockDashboard as never);

      await createDashboard({
        projectId: BigInt(1),
        userId: BigInt(1),
        name: 'Default Dashboard',
        isDefault: true,
      });

      expect(prisma.dashboard.updateMany).toHaveBeenCalledWith({
        where: {
          projectId: BigInt(1),
          userId: BigInt(1),
          isDefault: true,
        },
        data: { isDefault: false },
      });
    });
  });

  describe('updateDashboard', () => {
    it('ダッシュボードを更新する', async () => {
      const mockDashboard = {
        id: BigInt(1),
        name: 'Updated Dashboard',
        widgets: [],
      };

      vi.mocked(prisma.dashboard.update).mockResolvedValue(mockDashboard as never);

      const result = await updateDashboard(BigInt(1), {
        name: 'Updated Dashboard',
      });

      expect(prisma.dashboard.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { name: 'Updated Dashboard' },
        include: {
          widgets: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      expect(result).toEqual(mockDashboard);
    });
  });

  describe('deleteDashboard', () => {
    it('ダッシュボードを削除する', async () => {
      vi.mocked(prisma.dashboard.delete).mockResolvedValue({} as never);

      await deleteDashboard(BigInt(1));

      expect(prisma.dashboard.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('generateShareToken', () => {
    it('共有トークンを生成する', async () => {
      vi.mocked(prisma.dashboard.update).mockResolvedValue({} as never);

      const result = await generateShareToken(BigInt(1));

      expect(result).toHaveLength(64);
      expect(prisma.dashboard.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          shareToken: expect.any(String),
          isPublic: true,
        },
      });
    });
  });

  describe('revokeShareToken', () => {
    it('共有トークンを無効化する', async () => {
      vi.mocked(prisma.dashboard.update).mockResolvedValue({} as never);

      await revokeShareToken(BigInt(1));

      expect(prisma.dashboard.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          shareToken: null,
        },
      });
    });
  });

  describe('addWidget', () => {
    it('ウィジェットを追加する', async () => {
      const mockDashboard = {
        id: BigInt(1),
        widgets: [{ id: BigInt(1), widgetType: 'PROGRESS_SUMMARY' }],
      };

      vi.mocked(prisma.dashboardWidget.aggregate).mockResolvedValue({
        _max: { sortOrder: 0 },
      } as never);
      vi.mocked(prisma.dashboardWidget.create).mockResolvedValue({} as never);
      vi.mocked(prisma.dashboard.findUnique).mockResolvedValue(mockDashboard as never);

      const result = await addWidget({
        dashboardId: BigInt(1),
        widgetType: 'PROGRESS_SUMMARY',
      });

      expect(prisma.dashboardWidget.create).toHaveBeenCalled();
      expect(result).toEqual(mockDashboard);
    });
  });

  describe('updateWidget', () => {
    it('ウィジェットを更新する', async () => {
      vi.mocked(prisma.dashboardWidget.update).mockResolvedValue({} as never);

      await updateWidget(BigInt(1), {
        title: 'Updated Widget',
        x: 1,
        y: 1,
      });

      expect(prisma.dashboardWidget.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          title: 'Updated Widget',
          x: 1,
          y: 1,
        },
      });
    });
  });

  describe('deleteWidget', () => {
    it('ウィジェットを削除する', async () => {
      vi.mocked(prisma.dashboardWidget.delete).mockResolvedValue({} as never);

      await deleteWidget(BigInt(1));

      expect(prisma.dashboardWidget.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('updateWidgetPositions', () => {
    it('ウィジェット位置を一括更新する', async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([]);

      await updateWidgetPositions([
        { id: BigInt(1), x: 0, y: 0, width: 4, height: 3 },
        { id: BigInt(2), x: 4, y: 0, width: 4, height: 3 },
      ]);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('duplicateDashboard', () => {
    it('ダッシュボードを複製する', async () => {
      const sourceDashboard = {
        id: BigInt(1),
        projectId: BigInt(1),
        name: 'Original',
        description: 'Test',
        layout: {},
        widgets: [
          {
            widgetType: 'PROGRESS_SUMMARY',
            title: 'Widget 1',
            x: 0,
            y: 0,
            width: 4,
            height: 3,
            config: {},
            sortOrder: 0,
          },
        ],
      };
      const newDashboard = {
        id: BigInt(2),
        name: 'Original (コピー)',
        widgets: [],
      };

      vi.mocked(prisma.dashboard.findUnique).mockResolvedValueOnce(sourceDashboard as never);
      vi.mocked(prisma.dashboard.create).mockResolvedValue(newDashboard as never);
      vi.mocked(prisma.dashboardWidget.createMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.dashboard.findUnique).mockResolvedValue({
        ...newDashboard,
        widgets: [{ id: BigInt(3) }],
      } as never);

      const result = await duplicateDashboard(BigInt(1), BigInt(1));

      expect(prisma.dashboard.create).toHaveBeenCalled();
      expect(prisma.dashboardWidget.createMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('存在しないダッシュボードはエラー', async () => {
      vi.mocked(prisma.dashboard.findUnique).mockResolvedValue(null);

      await expect(duplicateDashboard(BigInt(999), BigInt(1))).rejects.toThrow(
        'ダッシュボードが見つかりません'
      );
    });
  });
});
