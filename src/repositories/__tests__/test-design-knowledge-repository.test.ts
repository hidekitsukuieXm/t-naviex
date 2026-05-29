/**
 * テスト設計ナレッジリポジトリテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createTestDesignKnowledge,
  getTestDesignKnowledgeById,
  updateTestDesignKnowledge,
  deleteTestDesignKnowledge,
  duplicateTestDesignKnowledge,
  getTestDesignKnowledges,
  getTestDesignKnowledgesByProject,
  getTechniques,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getUserFeedback,
  incrementUsageCount,
  getRecommendations,
  getSimilarKnowledges,
} from '../test-design-knowledge-repository';

// Prismaクライアントをモック
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      testDesignKnowledge: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      testDesignKnowledgeTag: {
        deleteMany: vi.fn(),
      },
      testDesignKnowledgeFeedback: {
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
  TestTechniqueCategory: {
    BLACK_BOX: 'BLACK_BOX',
    WHITE_BOX: 'WHITE_BOX',
    EXPERIENCE_BASED: 'EXPERIENCE_BASED',
    STRUCTURE_BASED: 'STRUCTURE_BASED',
  },
  TestDesignKnowledgeStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    DEPRECATED: 'DEPRECATED',
    ARCHIVED: 'ARCHIVED',
  },
}));

describe('Test Design Knowledge Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTestDesignKnowledge = {
    id: BigInt(1),
    projectId: BigInt(1),
    title: '境界値分析の基本',
    description: '境界値分析に関する基本的なナレッジ',
    content: '詳細な内容',
    technique: '境界値分析',
    category: 'BLACK_BOX' as const,
    status: 'ACTIVE' as const,
    applicableScenarios: ['数値入力', '日付入力'],
    considerations: ['境界値を特定する', '無効値も含める'],
    examples: ['例1', '例2'],
    tools: ['テストツール'],
    references: ['参考文献'],
    inputTypes: ['数値', '日付'],
    outputTypes: ['テストケース'],
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
    tags: [{ tag: { id: BigInt(1), name: 'テスト技法', color: '#3b82f6' } }],
  };

  describe('createTestDesignKnowledge', () => {
    it('テスト設計ナレッジを作成できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.create).mockResolvedValue(mockTestDesignKnowledge);

      const result = await createTestDesignKnowledge({
        title: '境界値分析の基本',
        technique: '境界値分析',
        content: '詳細な内容',
        projectId: BigInt(1),
      });

      expect(prisma.testDesignKnowledge.create).toHaveBeenCalled();
      expect(result.title).toBe('境界値分析の基本');
    });

    it('タグ付きでテスト設計ナレッジを作成できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.create).mockResolvedValue(mockTestDesignKnowledge);

      await createTestDesignKnowledge({
        title: '境界値分析の基本',
        technique: '境界値分析',
        content: '詳細な内容',
        projectId: BigInt(1),
        tagIds: [BigInt(1), BigInt(2)],
      });

      expect(prisma.testDesignKnowledge.create).toHaveBeenCalledWith(
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

  describe('getTestDesignKnowledgeById', () => {
    it('IDでテスト設計ナレッジを取得できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.findUnique).mockResolvedValue({
        ...mockTestDesignKnowledge,
        createdBy: { id: BigInt(1), name: 'User', email: 'user@test.com' },
        updatedBy: null,
        feedbacks: [],
      });

      const result = await getTestDesignKnowledgeById(BigInt(1));

      expect(result).not.toBeNull();
      expect(result?.title).toBe('境界値分析の基本');
    });

    it('存在しないIDはnullを返す', async () => {
      vi.mocked(prisma.testDesignKnowledge.findUnique).mockResolvedValue(null);

      const result = await getTestDesignKnowledgeById(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('updateTestDesignKnowledge', () => {
    it('テスト設計ナレッジを更新できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.update).mockResolvedValue({
        ...mockTestDesignKnowledge,
        title: '更新されたタイトル',
      });

      const result = await updateTestDesignKnowledge(BigInt(1), {
        title: '更新されたタイトル',
      });

      expect(result.title).toBe('更新されたタイトル');
    });

    it('タグを更新すると既存タグを削除して再作成する', async () => {
      vi.mocked(prisma.testDesignKnowledgeTag.deleteMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.testDesignKnowledge.update).mockResolvedValue(mockTestDesignKnowledge);

      await updateTestDesignKnowledge(BigInt(1), {
        tagIds: [BigInt(2)],
      });

      expect(prisma.testDesignKnowledgeTag.deleteMany).toHaveBeenCalledWith({
        where: { testDesignKnowledgeId: BigInt(1) },
      });
    });
  });

  describe('deleteTestDesignKnowledge', () => {
    it('テスト設計ナレッジを削除できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.delete).mockResolvedValue(mockTestDesignKnowledge);

      await deleteTestDesignKnowledge(BigInt(1));

      expect(prisma.testDesignKnowledge.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('duplicateTestDesignKnowledge', () => {
    it('テスト設計ナレッジを複製できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.findUnique).mockResolvedValue(mockTestDesignKnowledge);
      vi.mocked(prisma.testDesignKnowledge.create).mockResolvedValue({
        ...mockTestDesignKnowledge,
        id: BigInt(2),
        title: '複製されたナレッジ',
        status: 'DRAFT',
      });

      const result = await duplicateTestDesignKnowledge(BigInt(1), '複製されたナレッジ');

      expect(result.title).toBe('複製されたナレッジ');
      expect(prisma.testDesignKnowledge.create).toHaveBeenCalled();
    });

    it('存在しないテスト設計ナレッジの複製はエラー', async () => {
      vi.mocked(prisma.testDesignKnowledge.findUnique).mockResolvedValue(null);

      await expect(duplicateTestDesignKnowledge(BigInt(999), '新しいタイトル')).rejects.toThrow(
        'Test design knowledge not found'
      );
    });
  });

  describe('getTestDesignKnowledges', () => {
    it('ページネーション付きでテスト設計ナレッジ一覧を取得できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.findMany).mockResolvedValue([mockTestDesignKnowledge]);
      vi.mocked(prisma.testDesignKnowledge.count).mockResolvedValue(1);

      const result = await getTestDesignKnowledges(
        {},
        { field: 'updatedAt', order: 'desc' },
        1,
        20
      );

      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('フィルターを適用できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.findMany).mockResolvedValue([]);
      vi.mocked(prisma.testDesignKnowledge.count).mockResolvedValue(0);

      await getTestDesignKnowledges({
        technique: '境界値分析',
        category: 'BLACK_BOX',
        status: 'ACTIVE',
        minRating: 4,
        search: 'テスト',
      });

      expect(prisma.testDesignKnowledge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            technique: '境界値分析',
            category: 'BLACK_BOX',
            status: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('getTestDesignKnowledgesByProject', () => {
    it('プロジェクト内のテスト設計ナレッジを取得できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.findMany).mockResolvedValue([mockTestDesignKnowledge]);
      vi.mocked(prisma.testDesignKnowledge.count).mockResolvedValue(1);

      const result = await getTestDesignKnowledgesByProject(BigInt(1));

      expect(result.items.length).toBe(1);
    });
  });

  describe('getTechniques', () => {
    it('使用中のテスト技法一覧を取得できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.findMany).mockResolvedValue([
        { technique: '境界値分析' },
        { technique: '同値分割' },
      ] as unknown as Awaited<ReturnType<typeof prisma.testDesignKnowledge.findMany>>);

      const result = await getTechniques(BigInt(1));

      expect(result).toContain('境界値分析');
      expect(result).toContain('同値分割');
    });
  });

  describe('createFeedback', () => {
    it('フィードバックを作成できる', async () => {
      const mockFeedback = {
        id: BigInt(1),
        testDesignKnowledgeId: BigInt(1),
        userId: BigInt(1),
        rating: 5,
        comment: '素晴らしい',
        isHelpful: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: BigInt(1), name: 'User', email: 'user@test.com' },
      };

      vi.mocked(prisma.testDesignKnowledgeFeedback.create).mockResolvedValue(mockFeedback);
      vi.mocked(prisma.testDesignKnowledgeFeedback.aggregate).mockResolvedValue({
        _avg: { rating: 5 },
        _count: { rating: 1 },
      } as unknown as Awaited<ReturnType<typeof prisma.testDesignKnowledgeFeedback.aggregate>>);
      vi.mocked(prisma.testDesignKnowledge.update).mockResolvedValue(mockTestDesignKnowledge);

      const result = await createFeedback(BigInt(1), {
        rating: 5,
        comment: '素晴らしい',
        isHelpful: true,
        userId: BigInt(1),
      });

      expect(result.rating).toBe(5);
      expect(prisma.testDesignKnowledge.update).toHaveBeenCalled();
    });
  });

  describe('updateFeedback', () => {
    it('フィードバックを更新できる', async () => {
      const mockFeedback = {
        id: BigInt(1),
        testDesignKnowledgeId: BigInt(1),
        userId: BigInt(1),
        rating: 4,
        comment: '更新されたコメント',
        isHelpful: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: BigInt(1), name: 'User', email: 'user@test.com' },
      };

      vi.mocked(prisma.testDesignKnowledgeFeedback.update).mockResolvedValue(mockFeedback);
      vi.mocked(prisma.testDesignKnowledgeFeedback.aggregate).mockResolvedValue({
        _avg: { rating: 4 },
        _count: { rating: 1 },
      } as unknown as Awaited<ReturnType<typeof prisma.testDesignKnowledgeFeedback.aggregate>>);
      vi.mocked(prisma.testDesignKnowledge.update).mockResolvedValue(mockTestDesignKnowledge);

      const result = await updateFeedback(BigInt(1), { rating: 4 });

      expect(result.rating).toBe(4);
    });
  });

  describe('deleteFeedback', () => {
    it('フィードバックを削除できる', async () => {
      vi.mocked(prisma.testDesignKnowledgeFeedback.findUnique).mockResolvedValue({
        id: BigInt(1),
        testDesignKnowledgeId: BigInt(1),
        userId: BigInt(1),
        rating: 5,
        comment: null,
        isHelpful: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.testDesignKnowledgeFeedback.delete).mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prisma.testDesignKnowledgeFeedback.delete>>
      );
      vi.mocked(prisma.testDesignKnowledgeFeedback.aggregate).mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      } as unknown as Awaited<ReturnType<typeof prisma.testDesignKnowledgeFeedback.aggregate>>);
      vi.mocked(prisma.testDesignKnowledge.update).mockResolvedValue(mockTestDesignKnowledge);

      await deleteFeedback(BigInt(1));

      expect(prisma.testDesignKnowledgeFeedback.delete).toHaveBeenCalled();
    });

    it('存在しないフィードバックの削除はエラー', async () => {
      vi.mocked(prisma.testDesignKnowledgeFeedback.findUnique).mockResolvedValue(null);

      await expect(deleteFeedback(BigInt(999))).rejects.toThrow('Feedback not found');
    });
  });

  describe('getUserFeedback', () => {
    it('ユーザーのフィードバックを取得できる', async () => {
      const mockFeedback = {
        id: BigInt(1),
        testDesignKnowledgeId: BigInt(1),
        userId: BigInt(1),
        rating: 5,
        comment: 'コメント',
        isHelpful: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: BigInt(1), name: 'User', email: 'user@test.com' },
      };

      vi.mocked(prisma.testDesignKnowledgeFeedback.findUnique).mockResolvedValue(mockFeedback);

      const result = await getUserFeedback(BigInt(1), BigInt(1));

      expect(result?.rating).toBe(5);
    });
  });

  describe('incrementUsageCount', () => {
    it('使用回数をインクリメントできる', async () => {
      vi.mocked(prisma.testDesignKnowledge.update).mockResolvedValue({
        ...mockTestDesignKnowledge,
        usageCount: 51,
      });

      await incrementUsageCount(BigInt(1));

      expect(prisma.testDesignKnowledge.update).toHaveBeenCalledWith({
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
      vi.mocked(prisma.testDesignKnowledge.findMany).mockResolvedValue([mockTestDesignKnowledge]);

      const result = await getRecommendations({
        projectId: BigInt(1),
        category: 'BLACK_BOX',
        keywords: ['境界値'],
      });

      expect(result.length).toBe(1);
    });
  });

  describe('getSimilarKnowledges', () => {
    it('類似のテスト設計ナレッジを取得できる', async () => {
      vi.mocked(prisma.testDesignKnowledge.findUnique).mockResolvedValue(mockTestDesignKnowledge);
      vi.mocked(prisma.testDesignKnowledge.findMany).mockResolvedValue([
        { ...mockTestDesignKnowledge, id: BigInt(2), title: '類似のナレッジ' },
      ]);

      const result = await getSimilarKnowledges(BigInt(1));

      expect(result.length).toBe(1);
    });

    it('存在しないテスト設計ナレッジの場合は空配列を返す', async () => {
      vi.mocked(prisma.testDesignKnowledge.findUnique).mockResolvedValue(null);

      const result = await getSimilarKnowledges(BigInt(999));

      expect(result).toEqual([]);
    });
  });
});
