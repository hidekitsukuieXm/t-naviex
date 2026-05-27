/**
 * ベストプラクティスリポジトリテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createBestPractice,
  getBestPracticeById,
  updateBestPractice,
  deleteBestPractice,
  duplicateBestPractice,
  getBestPractices,
  getBestPracticesByProject,
  getCategories,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getUserFeedback,
  incrementUsageCount,
  getRecommendations,
  getSimilarBestPractices,
} from '../best-practice-repository';

// Prismaクライアントをモック
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      bestPractice: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      bestPracticeTag: {
        deleteMany: vi.fn(),
      },
      bestPracticeFeedback: {
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
vi.mock('@/generated/prisma', () => ({
  Prisma: {},
  BestPracticeComplexity: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
  BestPracticeStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    DEPRECATED: 'DEPRECATED',
    ARCHIVED: 'ARCHIVED',
  },
}));

describe('Best Practice Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBestPractice = {
    id: BigInt(1),
    projectId: BigInt(1),
    title: 'テスト設計のベストプラクティス',
    description: 'テスト設計に関するベストプラクティス',
    content: '詳細な内容',
    category: 'テスト設計',
    complexity: 'MEDIUM' as const,
    status: 'ACTIVE' as const,
    applicability: ['機能テスト', '結合テスト'],
    examples: ['例1', '例2'],
    benefits: ['品質向上', '効率化'],
    risks: ['時間がかかる'],
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
    tags: [{ tag: { id: BigInt(1), name: 'テスト', color: '#3b82f6' } }],
  };

  describe('createBestPractice', () => {
    it('ベストプラクティスを作成できる', async () => {
      vi.mocked(prisma.bestPractice.create).mockResolvedValue(mockBestPractice);

      const result = await createBestPractice({
        title: 'テスト設計のベストプラクティス',
        category: 'テスト設計',
        content: '詳細な内容',
        projectId: BigInt(1),
      });

      expect(prisma.bestPractice.create).toHaveBeenCalled();
      expect(result.title).toBe('テスト設計のベストプラクティス');
    });

    it('タグ付きでベストプラクティスを作成できる', async () => {
      vi.mocked(prisma.bestPractice.create).mockResolvedValue(mockBestPractice);

      await createBestPractice({
        title: 'テスト設計のベストプラクティス',
        category: 'テスト設計',
        content: '詳細な内容',
        projectId: BigInt(1),
        tagIds: [BigInt(1), BigInt(2)],
      });

      expect(prisma.bestPractice.create).toHaveBeenCalledWith(
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

  describe('getBestPracticeById', () => {
    it('IDでベストプラクティスを取得できる', async () => {
      vi.mocked(prisma.bestPractice.findUnique).mockResolvedValue({
        ...mockBestPractice,
        createdBy: { id: BigInt(1), name: 'User', email: 'user@test.com' },
        updatedBy: null,
        feedbacks: [],
      });

      const result = await getBestPracticeById(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.title).toBe('テスト設計のベストプラクティス');
    });

    it('存在しないIDはnullを返す', async () => {
      vi.mocked(prisma.bestPractice.findUnique).mockResolvedValue(null);

      const result = await getBestPracticeById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('updateBestPractice', () => {
    it('ベストプラクティスを更新できる', async () => {
      vi.mocked(prisma.bestPractice.update).mockResolvedValue({
        ...mockBestPractice,
        title: '更新されたタイトル',
      });

      const result = await updateBestPractice(BigInt(1), {
        title: '更新されたタイトル',
      });

      expect(result.title).toBe('更新されたタイトル');
    });

    it('タグを更新すると既存タグを削除して再作成する', async () => {
      vi.mocked(prisma.bestPracticeTag.deleteMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.bestPractice.update).mockResolvedValue(mockBestPractice);

      await updateBestPractice(BigInt(1), {
        tagIds: [BigInt(2)],
      });

      expect(prisma.bestPracticeTag.deleteMany).toHaveBeenCalledWith({
        where: { bestPracticeId: BigInt(1) },
      });
    });
  });

  describe('deleteBestPractice', () => {
    it('ベストプラクティスを削除できる', async () => {
      vi.mocked(prisma.bestPractice.delete).mockResolvedValue(mockBestPractice);

      await deleteBestPractice(BigInt(1));

      expect(prisma.bestPractice.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('duplicateBestPractice', () => {
    it('ベストプラクティスを複製できる', async () => {
      vi.mocked(prisma.bestPractice.findUnique).mockResolvedValue(mockBestPractice);
      vi.mocked(prisma.bestPractice.create).mockResolvedValue({
        ...mockBestPractice,
        id: BigInt(2),
        title: '複製されたベストプラクティス',
        status: 'DRAFT',
      });

      const result = await duplicateBestPractice(BigInt(1), '複製されたベストプラクティス');

      expect(result.title).toBe('複製されたベストプラクティス');
      expect(prisma.bestPractice.create).toHaveBeenCalled();
    });

    it('存在しないベストプラクティスの複製はエラー', async () => {
      vi.mocked(prisma.bestPractice.findUnique).mockResolvedValue(null);

      await expect(duplicateBestPractice(BigInt(999), '新しいタイトル')).rejects.toThrow(
        'Best practice not found'
      );
    });
  });

  describe('getBestPractices', () => {
    it('ページネーション付きでベストプラクティス一覧を取得できる', async () => {
      vi.mocked(prisma.bestPractice.findMany).mockResolvedValue([mockBestPractice]);
      vi.mocked(prisma.bestPractice.count).mockResolvedValue(1);

      const result = await getBestPractices({}, { field: 'updatedAt', order: 'desc' }, 1, 20);

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('フィルターを適用できる', async () => {
      vi.mocked(prisma.bestPractice.findMany).mockResolvedValue([]);
      vi.mocked(prisma.bestPractice.count).mockResolvedValue(0);

      await getBestPractices({
        category: 'テスト設計',
        complexity: 'MEDIUM',
        status: 'ACTIVE',
        minRating: 4,
        search: 'テスト',
      });

      expect(prisma.bestPractice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'テスト設計',
            complexity: 'MEDIUM',
            status: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('getBestPracticesByProject', () => {
    it('プロジェクト内のベストプラクティスを取得できる', async () => {
      vi.mocked(prisma.bestPractice.findMany).mockResolvedValue([mockBestPractice]);
      vi.mocked(prisma.bestPractice.count).mockResolvedValue(1);

      const result = await getBestPracticesByProject(BigInt(1));

      expect(result.items.length).toBe(1);
    });
  });

  describe('getCategories', () => {
    it('使用中のカテゴリ一覧を取得できる', async () => {
      vi.mocked(prisma.bestPractice.findMany).mockResolvedValue([
        { category: 'テスト設計' },
        { category: 'テスト実行' },
      ] as unknown as Awaited<ReturnType<typeof prisma.bestPractice.findMany>>);

      const result = await getCategories(BigInt(1));

      expect(result).toContain('テスト設計');
      expect(result).toContain('テスト実行');
    });
  });

  describe('createFeedback', () => {
    it('フィードバックを作成できる', async () => {
      const mockFeedback = {
        id: BigInt(1),
        bestPracticeId: BigInt(1),
        userId: BigInt(1),
        rating: 5,
        comment: '素晴らしい',
        isHelpful: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: BigInt(1), name: 'User', email: 'user@test.com' },
      };

      vi.mocked(prisma.bestPracticeFeedback.create).mockResolvedValue(mockFeedback);
      vi.mocked(prisma.bestPracticeFeedback.aggregate).mockResolvedValue({
        _avg: { rating: 5 },
        _count: { rating: 1 },
      } as unknown as Awaited<ReturnType<typeof prisma.bestPracticeFeedback.aggregate>>);
      vi.mocked(prisma.bestPractice.update).mockResolvedValue(mockBestPractice);

      const result = await createFeedback(BigInt(1), {
        rating: 5,
        comment: '素晴らしい',
        isHelpful: true,
        userId: BigInt(1),
      });

      expect(result.rating).toBe(5);
      expect(prisma.bestPractice.update).toHaveBeenCalled();
    });
  });

  describe('updateFeedback', () => {
    it('フィードバックを更新できる', async () => {
      const mockFeedback = {
        id: BigInt(1),
        bestPracticeId: BigInt(1),
        userId: BigInt(1),
        rating: 4,
        comment: '更新されたコメント',
        isHelpful: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: BigInt(1), name: 'User', email: 'user@test.com' },
      };

      vi.mocked(prisma.bestPracticeFeedback.update).mockResolvedValue(mockFeedback);
      vi.mocked(prisma.bestPracticeFeedback.aggregate).mockResolvedValue({
        _avg: { rating: 4 },
        _count: { rating: 1 },
      } as unknown as Awaited<ReturnType<typeof prisma.bestPracticeFeedback.aggregate>>);
      vi.mocked(prisma.bestPractice.update).mockResolvedValue(mockBestPractice);

      const result = await updateFeedback(BigInt(1), { rating: 4 });

      expect(result.rating).toBe(4);
    });
  });

  describe('deleteFeedback', () => {
    it('フィードバックを削除できる', async () => {
      vi.mocked(prisma.bestPracticeFeedback.findUnique).mockResolvedValue({
        id: BigInt(1),
        bestPracticeId: BigInt(1),
        userId: BigInt(1),
        rating: 5,
        comment: null,
        isHelpful: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.bestPracticeFeedback.delete).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.bestPracticeFeedback.delete>>
      );
      vi.mocked(prisma.bestPracticeFeedback.aggregate).mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      } as unknown as Awaited<ReturnType<typeof prisma.bestPracticeFeedback.aggregate>>);
      vi.mocked(prisma.bestPractice.update).mockResolvedValue(mockBestPractice);

      await deleteFeedback(BigInt(1));

      expect(prisma.bestPracticeFeedback.delete).toHaveBeenCalled();
    });

    it('存在しないフィードバックの削除はエラー', async () => {
      vi.mocked(prisma.bestPracticeFeedback.findUnique).mockResolvedValue(null);

      await expect(deleteFeedback(BigInt(999))).rejects.toThrow('Feedback not found');
    });
  });

  describe('getUserFeedback', () => {
    it('ユーザーのフィードバックを取得できる', async () => {
      const mockFeedback = {
        id: BigInt(1),
        bestPracticeId: BigInt(1),
        userId: BigInt(1),
        rating: 5,
        comment: 'コメント',
        isHelpful: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: BigInt(1), name: 'User', email: 'user@test.com' },
      };

      vi.mocked(prisma.bestPracticeFeedback.findUnique).mockResolvedValue(mockFeedback);

      const result = await getUserFeedback(BigInt(1), BigInt(1));

      expect(result?.rating).toBe(5);
    });
  });

  describe('incrementUsageCount', () => {
    it('使用回数をインクリメントできる', async () => {
      vi.mocked(prisma.bestPractice.update).mockResolvedValue({
        ...mockBestPractice,
        usageCount: 51,
      });

      await incrementUsageCount(BigInt(1));

      expect(prisma.bestPractice.update).toHaveBeenCalledWith({
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
      vi.mocked(prisma.bestPractice.findMany).mockResolvedValue([mockBestPractice]);

      const result = await getRecommendations({
        projectId: BigInt(1),
        category: 'テスト設計',
        keywords: ['テスト'],
      });

      expect(result.length).toBe(1);
    });
  });

  describe('getSimilarBestPractices', () => {
    it('類似のベストプラクティスを取得できる', async () => {
      vi.mocked(prisma.bestPractice.findUnique).mockResolvedValue(mockBestPractice);
      vi.mocked(prisma.bestPractice.findMany).mockResolvedValue([
        { ...mockBestPractice, id: BigInt(2), title: '類似のベストプラクティス' },
      ]);

      const result = await getSimilarBestPractices(BigInt(1));

      expect(result.length).toBe(1);
    });

    it('存在しないベストプラクティスの場合は空配列を返す', async () => {
      vi.mocked(prisma.bestPractice.findUnique).mockResolvedValue(null);

      const result = await getSimilarBestPractices(BigInt(999));

      expect(result).toEqual([]);
    });
  });
});
