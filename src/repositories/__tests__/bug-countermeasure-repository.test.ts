/**
 * バグ対策ナレッジリポジトリテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createBugCountermeasure,
  getBugCountermeasureById,
  updateBugCountermeasure,
  deleteBugCountermeasure,
  duplicateBugCountermeasure,
  getBugCountermeasures,
  getBugCountermeasuresByProject,
  getBugPatterns,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getUserFeedback,
  incrementUsageCount,
  getRecommendations,
  getSimilarCountermeasures,
} from '../bug-countermeasure-repository';

// Prismaクライアントをモック
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      bugCountermeasure: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      bugCountermeasureTag: {
        deleteMany: vi.fn(),
      },
      bugCountermeasureFeedback: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        aggregate: vi.fn(),
      },
    },
  };
});

// Prisma生成型をモック
vi.mock('@prisma/client', () => ({
  Prisma: {},
  BugCountermeasureCategory: {
    PREVENTION: 'PREVENTION',
    DETECTION: 'DETECTION',
    CORRECTION: 'CORRECTION',
    ROOT_CAUSE: 'ROOT_CAUSE',
    PROCESS: 'PROCESS',
    TOOL: 'TOOL',
    OTHER: 'OTHER',
  },
  BugCountermeasureStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    DEPRECATED: 'DEPRECATED',
    ARCHIVED: 'ARCHIVED',
  },
  BugSeverityLevel: {
    CRITICAL: 'CRITICAL',
    MAJOR: 'MAJOR',
    MINOR: 'MINOR',
    TRIVIAL: 'TRIVIAL',
  },
}));

describe('Bug Countermeasure Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBugCountermeasure = {
    id: BigInt(1),
    projectId: BigInt(1),
    title: 'Null参照エラー対策',
    description: 'Null参照エラーに関する対策ナレッジ',
    content: '詳細な内容',
    bugPattern: 'Null参照エラー',
    category: 'PREVENTION' as const,
    status: 'ACTIVE' as const,
    severityLevel: 'MAJOR' as const,
    rootCauses: ['初期化忘れ', 'nullチェック漏れ'],
    symptoms: ['NullPointerException', 'アプリクラッシュ'],
    preventionMeasures: ['null安全な言語機能を使う', '防御的プログラミング'],
    detectionMethods: ['静的解析', 'コードレビュー'],
    correctionSteps: ['nullチェック追加', 'Optional型の使用'],
    affectedAreas: ['全モジュール'],
    testCoverage: ['null入力テスト'],
    examples: ['例1', '例2'],
    references: ['参考文献'],
    rating: 4.5,
    ratingCount: 10,
    usageCount: 50,
    lastUsedAt: new Date(),
    metadata: null,
    version: '1.0.0',
    createdById: BigInt(1),
    updatedById: BigInt(1),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [{ tag: { id: BigInt(1), name: 'バグ対策', color: '#ef4444' } }],
  };

  describe('createBugCountermeasure', () => {
    it('バグ対策ナレッジを作成できる', async () => {
      vi.mocked(prisma.bugCountermeasure.create).mockResolvedValue(mockBugCountermeasure);

      const result = await createBugCountermeasure({
        title: 'Null参照エラー対策',
        bugPattern: 'Null参照エラー',
        content: '詳細な内容',
        projectId: BigInt(1),
      });

      expect(prisma.bugCountermeasure.create).toHaveBeenCalled();
      expect(result.title).toBe('Null参照エラー対策');
    });

    it('タグ付きでバグ対策ナレッジを作成できる', async () => {
      vi.mocked(prisma.bugCountermeasure.create).mockResolvedValue(mockBugCountermeasure);

      await createBugCountermeasure({
        title: 'Null参照エラー対策',
        bugPattern: 'Null参照エラー',
        content: '詳細な内容',
        projectId: BigInt(1),
        tagIds: [BigInt(1), BigInt(2)],
      });

      expect(prisma.bugCountermeasure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: expect.objectContaining({
              create: expect.any(Array),
            }),
          }),
        })
      );
    });
  });

  describe('getBugCountermeasureById', () => {
    it('IDでバグ対策ナレッジを取得できる', async () => {
      vi.mocked(prisma.bugCountermeasure.findUnique).mockResolvedValue({
        ...mockBugCountermeasure,
        createdBy: { id: BigInt(1), name: 'User', email: 'user@test.com' },
        updatedBy: null,
        feedbacks: [],
      });

      const result = await getBugCountermeasureById(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Null参照エラー対策');
    });

    it('存在しないIDはnullを返す', async () => {
      vi.mocked(prisma.bugCountermeasure.findUnique).mockResolvedValue(null);

      const result = await getBugCountermeasureById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('updateBugCountermeasure', () => {
    it('バグ対策ナレッジを更新できる', async () => {
      vi.mocked(prisma.bugCountermeasure.update).mockResolvedValue({
        ...mockBugCountermeasure,
        title: '更新されたタイトル',
      });

      const result = await updateBugCountermeasure(BigInt(1), {
        title: '更新されたタイトル',
      });

      expect(result.title).toBe('更新されたタイトル');
    });

    it('タグを更新すると既存タグを削除して再作成する', async () => {
      vi.mocked(prisma.bugCountermeasureTag.deleteMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.bugCountermeasure.update).mockResolvedValue(mockBugCountermeasure);

      await updateBugCountermeasure(BigInt(1), {
        tagIds: [BigInt(2)],
      });

      expect(prisma.bugCountermeasureTag.deleteMany).toHaveBeenCalledWith({
        where: { bugCountermeasureId: BigInt(1) },
      });
    });
  });

  describe('deleteBugCountermeasure', () => {
    it('バグ対策ナレッジを削除できる', async () => {
      vi.mocked(prisma.bugCountermeasure.delete).mockResolvedValue(mockBugCountermeasure);

      await deleteBugCountermeasure(BigInt(1));

      expect(prisma.bugCountermeasure.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('duplicateBugCountermeasure', () => {
    it('バグ対策ナレッジを複製できる', async () => {
      vi.mocked(prisma.bugCountermeasure.findUnique).mockResolvedValue(mockBugCountermeasure);
      vi.mocked(prisma.bugCountermeasure.create).mockResolvedValue({
        ...mockBugCountermeasure,
        id: BigInt(2),
        title: '複製されたナレッジ',
        status: 'DRAFT',
      });

      const result = await duplicateBugCountermeasure(BigInt(1), '複製されたナレッジ');

      expect(result.title).toBe('複製されたナレッジ');
      expect(prisma.bugCountermeasure.create).toHaveBeenCalled();
    });

    it('存在しないバグ対策ナレッジの複製はエラー', async () => {
      vi.mocked(prisma.bugCountermeasure.findUnique).mockResolvedValue(null);

      await expect(duplicateBugCountermeasure(BigInt(999), '新しいタイトル')).rejects.toThrow(
        'Bug countermeasure not found'
      );
    });
  });

  describe('getBugCountermeasures', () => {
    it('ページネーション付きでバグ対策ナレッジ一覧を取得できる', async () => {
      vi.mocked(prisma.bugCountermeasure.findMany).mockResolvedValue([mockBugCountermeasure]);
      vi.mocked(prisma.bugCountermeasure.count).mockResolvedValue(1);

      const result = await getBugCountermeasures({}, { field: 'updatedAt', order: 'desc' }, 1, 20);

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('フィルターを適用できる', async () => {
      vi.mocked(prisma.bugCountermeasure.findMany).mockResolvedValue([]);
      vi.mocked(prisma.bugCountermeasure.count).mockResolvedValue(0);

      await getBugCountermeasures({
        bugPattern: 'Null参照エラー',
        category: 'PREVENTION',
        status: 'ACTIVE',
        severityLevel: 'MAJOR',
        minRating: 4,
        search: 'テスト',
      });

      expect(prisma.bugCountermeasure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bugPattern: 'Null参照エラー',
            category: 'PREVENTION',
            status: 'ACTIVE',
            severityLevel: 'MAJOR',
          }),
        })
      );
    });
  });

  describe('getBugCountermeasuresByProject', () => {
    it('プロジェクト内のバグ対策ナレッジを取得できる', async () => {
      vi.mocked(prisma.bugCountermeasure.findMany).mockResolvedValue([mockBugCountermeasure]);
      vi.mocked(prisma.bugCountermeasure.count).mockResolvedValue(1);

      const result = await getBugCountermeasuresByProject(BigInt(1));

      expect(result.items.length).toBe(1);
    });
  });

  describe('getBugPatterns', () => {
    it('使用中のバグパターン一覧を取得できる', async () => {
      vi.mocked(prisma.bugCountermeasure.findMany).mockResolvedValue([
        { bugPattern: 'Null参照エラー' },
        { bugPattern: '境界値エラー' },
      ] as unknown as Awaited<ReturnType<typeof prisma.bugCountermeasure.findMany>>);

      const result = await getBugPatterns(BigInt(1));

      expect(result).toContain('Null参照エラー');
      expect(result).toContain('境界値エラー');
    });
  });

  describe('createFeedback', () => {
    it('フィードバックを作成できる', async () => {
      const mockFeedback = {
        id: BigInt(1),
        bugCountermeasureId: BigInt(1),
        userId: BigInt(1),
        rating: 5,
        comment: '素晴らしい',
        isHelpful: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: BigInt(1), name: 'User', email: 'user@test.com' },
      };

      vi.mocked(prisma.bugCountermeasureFeedback.create).mockResolvedValue(mockFeedback);
      vi.mocked(prisma.bugCountermeasureFeedback.aggregate).mockResolvedValue({
        _avg: { rating: 5 },
        _count: { rating: 1 },
      } as unknown as Awaited<ReturnType<typeof prisma.bugCountermeasureFeedback.aggregate>>);
      vi.mocked(prisma.bugCountermeasure.update).mockResolvedValue(mockBugCountermeasure);

      const result = await createFeedback(BigInt(1), {
        rating: 5,
        comment: '素晴らしい',
        isHelpful: true,
        userId: BigInt(1),
      });

      expect(result.rating).toBe(5);
      expect(prisma.bugCountermeasure.update).toHaveBeenCalled();
    });
  });

  describe('updateFeedback', () => {
    it('フィードバックを更新できる', async () => {
      const mockFeedback = {
        id: BigInt(1),
        bugCountermeasureId: BigInt(1),
        userId: BigInt(1),
        rating: 4,
        comment: '更新されたコメント',
        isHelpful: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: BigInt(1), name: 'User', email: 'user@test.com' },
      };

      vi.mocked(prisma.bugCountermeasureFeedback.update).mockResolvedValue(mockFeedback);
      vi.mocked(prisma.bugCountermeasureFeedback.aggregate).mockResolvedValue({
        _avg: { rating: 4 },
        _count: { rating: 1 },
      } as unknown as Awaited<ReturnType<typeof prisma.bugCountermeasureFeedback.aggregate>>);
      vi.mocked(prisma.bugCountermeasure.update).mockResolvedValue(mockBugCountermeasure);

      const result = await updateFeedback(BigInt(1), { rating: 4 });

      expect(result.rating).toBe(4);
    });
  });

  describe('deleteFeedback', () => {
    it('フィードバックを削除できる', async () => {
      vi.mocked(prisma.bugCountermeasureFeedback.findUnique).mockResolvedValue({
        id: BigInt(1),
        bugCountermeasureId: BigInt(1),
        userId: BigInt(1),
        rating: 5,
        comment: null,
        isHelpful: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.bugCountermeasureFeedback.delete).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.bugCountermeasureFeedback.delete>>
      );
      vi.mocked(prisma.bugCountermeasureFeedback.aggregate).mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      } as unknown as Awaited<ReturnType<typeof prisma.bugCountermeasureFeedback.aggregate>>);
      vi.mocked(prisma.bugCountermeasure.update).mockResolvedValue(mockBugCountermeasure);

      await deleteFeedback(BigInt(1));

      expect(prisma.bugCountermeasureFeedback.delete).toHaveBeenCalled();
    });

    it('存在しないフィードバックの削除はエラー', async () => {
      vi.mocked(prisma.bugCountermeasureFeedback.findUnique).mockResolvedValue(null);

      await expect(deleteFeedback(BigInt(999))).rejects.toThrow('Feedback not found');
    });
  });

  describe('getUserFeedback', () => {
    it('ユーザーのフィードバックを取得できる', async () => {
      const mockFeedback = {
        id: BigInt(1),
        bugCountermeasureId: BigInt(1),
        userId: BigInt(1),
        rating: 5,
        comment: 'コメント',
        isHelpful: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: BigInt(1), name: 'User', email: 'user@test.com' },
      };

      vi.mocked(prisma.bugCountermeasureFeedback.findUnique).mockResolvedValue(mockFeedback);

      const result = await getUserFeedback(BigInt(1), BigInt(1));

      expect(result?.rating).toBe(5);
    });
  });

  describe('incrementUsageCount', () => {
    it('使用回数をインクリメントできる', async () => {
      vi.mocked(prisma.bugCountermeasure.update).mockResolvedValue({
        ...mockBugCountermeasure,
        usageCount: 51,
      });

      await incrementUsageCount(BigInt(1));

      expect(prisma.bugCountermeasure.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getRecommendations', () => {
    it('コンテキストに基づいて推奨を取得できる', async () => {
      vi.mocked(prisma.bugCountermeasure.findMany).mockResolvedValue([mockBugCountermeasure]);

      const result = await getRecommendations({
        projectId: BigInt(1),
        category: 'PREVENTION',
        keywords: ['Null'],
      });

      expect(result.length).toBe(1);
    });
  });

  describe('getSimilarCountermeasures', () => {
    it('類似のバグ対策ナレッジを取得できる', async () => {
      vi.mocked(prisma.bugCountermeasure.findUnique).mockResolvedValue(mockBugCountermeasure);
      vi.mocked(prisma.bugCountermeasure.findMany).mockResolvedValue([
        { ...mockBugCountermeasure, id: BigInt(2), title: '類似のナレッジ' },
      ]);

      const result = await getSimilarCountermeasures(BigInt(1));

      expect(result.length).toBe(1);
    });

    it('存在しないバグ対策ナレッジの場合は空配列を返す', async () => {
      vi.mocked(prisma.bugCountermeasure.findUnique).mockResolvedValue(null);

      const result = await getSimilarCountermeasures(BigInt(999));

      expect(result).toEqual([]);
    });
  });
});
