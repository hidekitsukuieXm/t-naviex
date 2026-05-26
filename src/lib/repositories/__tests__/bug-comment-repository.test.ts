/**
 * バグコメント・添付ファイル・履歴リポジトリのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createBugComment,
  getBugCommentById,
  listBugComments,
  updateBugComment,
  deleteBugComment,
  bugCommentExists,
  createBugAttachment,
  getBugAttachmentById,
  listBugAttachments,
  deleteBugAttachment,
  bugAttachmentExists,
  createBugHistory,
  createBugHistories,
  listBugHistories,
  listBugFieldHistories,
} from '../bug-comment-repository';
import { prisma } from '@/lib/prisma';

// Prismaをモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    bugComment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bugAttachment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    bugHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================
// バグコメントのテスト
// ============================================

describe('BugComment Repository', () => {
  describe('createBugComment', () => {
    it('should create a bug comment', async () => {
      const mockComment = {
        id: BigInt(1),
        bugId: BigInt(1),
        authorId: BigInt(1),
        parentId: null,
        content: 'テストコメント',
        isInternal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.bugComment.create).mockResolvedValue(mockComment as never);

      const result = await createBugComment({
        bugId: BigInt(1),
        authorId: BigInt(1),
        content: 'テストコメント',
      });

      expect(result.content).toBe('テストコメント');
      expect(prisma.bugComment.create).toHaveBeenCalled();
    });

    it('should create a reply comment', async () => {
      const mockComment = {
        id: BigInt(2),
        bugId: BigInt(1),
        authorId: BigInt(1),
        parentId: BigInt(1),
        content: '返信コメント',
        isInternal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.bugComment.create).mockResolvedValue(mockComment as never);

      const result = await createBugComment({
        bugId: BigInt(1),
        authorId: BigInt(1),
        parentId: BigInt(1),
        content: '返信コメント',
      });

      expect(result.parentId).toBe(BigInt(1));
    });

    it('should create an internal comment', async () => {
      const mockComment = {
        id: BigInt(1),
        bugId: BigInt(1),
        authorId: BigInt(1),
        parentId: null,
        content: '内部コメント',
        isInternal: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.bugComment.create).mockResolvedValue(mockComment as never);

      const result = await createBugComment({
        bugId: BigInt(1),
        authorId: BigInt(1),
        content: '内部コメント',
        isInternal: true,
      });

      expect(result.isInternal).toBe(true);
    });
  });

  describe('getBugCommentById', () => {
    it('should return comment with relations', async () => {
      const mockComment = {
        id: BigInt(1),
        bugId: BigInt(1),
        authorId: BigInt(1),
        parentId: null,
        content: 'テストコメント',
        isInternal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: { id: BigInt(1), name: 'ユーザー', email: 'user@example.com', image: null },
        replies: [],
      };

      vi.mocked(prisma.bugComment.findUnique).mockResolvedValue(mockComment as never);

      const result = await getBugCommentById(BigInt(1));
      expect(result).not.toBeNull();
      expect(result?.author?.name).toBe('ユーザー');
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.bugComment.findUnique).mockResolvedValue(null);

      const result = await getBugCommentById(BigInt(999));
      expect(result).toBeNull();
    });
  });

  describe('listBugComments', () => {
    it('should list top-level comments', async () => {
      const mockComments = [
        {
          id: BigInt(1),
          bugId: BigInt(1),
          authorId: BigInt(1),
          parentId: null,
          content: 'コメント1',
          isInternal: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          author: { id: BigInt(1), name: 'ユーザー', email: 'user@example.com', image: null },
          replies: [],
        },
      ];

      vi.mocked(prisma.bugComment.findMany).mockResolvedValue(mockComments as never);

      const result = await listBugComments(BigInt(1));
      expect(result).toHaveLength(1);
    });

    it('should filter out internal comments by default', async () => {
      vi.mocked(prisma.bugComment.findMany).mockResolvedValue([]);

      await listBugComments(BigInt(1));

      expect(prisma.bugComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isInternal: false,
          }),
        })
      );
    });

    it('should include internal comments when specified', async () => {
      vi.mocked(prisma.bugComment.findMany).mockResolvedValue([]);

      await listBugComments(BigInt(1), { includeInternal: true });

      expect(prisma.bugComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            isInternal: false,
          }),
        })
      );
    });
  });

  describe('updateBugComment', () => {
    it('should update comment content', async () => {
      const mockComment = {
        id: BigInt(1),
        bugId: BigInt(1),
        authorId: BigInt(1),
        parentId: null,
        content: '更新されたコメント',
        isInternal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.bugComment.update).mockResolvedValue(mockComment as never);

      const result = await updateBugComment(BigInt(1), { content: '更新されたコメント' });
      expect(result.content).toBe('更新されたコメント');
    });
  });

  describe('deleteBugComment', () => {
    it('should delete a comment', async () => {
      vi.mocked(prisma.bugComment.delete).mockResolvedValue({} as never);

      await deleteBugComment(BigInt(1));
      expect(prisma.bugComment.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('bugCommentExists', () => {
    it('should return true when comment exists', async () => {
      vi.mocked(prisma.bugComment.findUnique).mockResolvedValue({ id: BigInt(1) } as never);

      const result = await bugCommentExists(BigInt(1));
      expect(result).toBe(true);
    });

    it('should return false when comment does not exist', async () => {
      vi.mocked(prisma.bugComment.findUnique).mockResolvedValue(null);

      const result = await bugCommentExists(BigInt(999));
      expect(result).toBe(false);
    });
  });
});

// ============================================
// バグ添付ファイルのテスト
// ============================================

describe('BugAttachment Repository', () => {
  describe('createBugAttachment', () => {
    it('should create a bug attachment', async () => {
      const mockAttachment = {
        id: BigInt(1),
        bugId: BigInt(1),
        uploadedById: BigInt(1),
        fileName: 'test.png',
        fileSize: 1024,
        mimeType: 'image/png',
        storagePath: '/uploads/test.png',
        thumbnailPath: null,
        description: null,
        createdAt: new Date(),
      };

      vi.mocked(prisma.bugAttachment.create).mockResolvedValue(mockAttachment as never);

      const result = await createBugAttachment({
        bugId: BigInt(1),
        uploadedById: BigInt(1),
        fileName: 'test.png',
        fileSize: 1024,
        mimeType: 'image/png',
        storagePath: '/uploads/test.png',
      });

      expect(result.fileName).toBe('test.png');
      expect(prisma.bugAttachment.create).toHaveBeenCalled();
    });
  });

  describe('getBugAttachmentById', () => {
    it('should return attachment with relations', async () => {
      const mockAttachment = {
        id: BigInt(1),
        bugId: BigInt(1),
        uploadedById: BigInt(1),
        fileName: 'test.png',
        fileSize: 1024,
        mimeType: 'image/png',
        storagePath: '/uploads/test.png',
        thumbnailPath: null,
        description: null,
        createdAt: new Date(),
        uploadedBy: { id: BigInt(1), name: 'ユーザー', email: 'user@example.com' },
      };

      vi.mocked(prisma.bugAttachment.findUnique).mockResolvedValue(mockAttachment as never);

      const result = await getBugAttachmentById(BigInt(1));
      expect(result).not.toBeNull();
      expect(result?.uploadedBy?.name).toBe('ユーザー');
    });

    it('should return null when not found', async () => {
      vi.mocked(prisma.bugAttachment.findUnique).mockResolvedValue(null);

      const result = await getBugAttachmentById(BigInt(999));
      expect(result).toBeNull();
    });
  });

  describe('listBugAttachments', () => {
    it('should list attachments for a bug', async () => {
      const mockAttachments = [
        {
          id: BigInt(1),
          bugId: BigInt(1),
          uploadedById: BigInt(1),
          fileName: 'test.png',
          fileSize: 1024,
          mimeType: 'image/png',
          storagePath: '/uploads/test.png',
          thumbnailPath: null,
          description: null,
          createdAt: new Date(),
          uploadedBy: { id: BigInt(1), name: 'ユーザー', email: 'user@example.com' },
        },
      ];

      vi.mocked(prisma.bugAttachment.findMany).mockResolvedValue(mockAttachments as never);

      const result = await listBugAttachments(BigInt(1));
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteBugAttachment', () => {
    it('should delete an attachment', async () => {
      vi.mocked(prisma.bugAttachment.delete).mockResolvedValue({} as never);

      await deleteBugAttachment(BigInt(1));
      expect(prisma.bugAttachment.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('bugAttachmentExists', () => {
    it('should return true when attachment exists', async () => {
      vi.mocked(prisma.bugAttachment.findUnique).mockResolvedValue({ id: BigInt(1) } as never);

      const result = await bugAttachmentExists(BigInt(1));
      expect(result).toBe(true);
    });

    it('should return false when attachment does not exist', async () => {
      vi.mocked(prisma.bugAttachment.findUnique).mockResolvedValue(null);

      const result = await bugAttachmentExists(BigInt(999));
      expect(result).toBe(false);
    });
  });
});

// ============================================
// バグ履歴のテスト
// ============================================

describe('BugHistory Repository', () => {
  describe('createBugHistory', () => {
    it('should create a bug history entry', async () => {
      const mockHistory = {
        id: BigInt(1),
        bugId: BigInt(1),
        changedById: BigInt(1),
        fieldName: 'status',
        oldValue: 'NEW',
        newValue: 'OPEN',
        changedAt: new Date(),
      };

      vi.mocked(prisma.bugHistory.create).mockResolvedValue(mockHistory as never);

      const result = await createBugHistory({
        bugId: BigInt(1),
        changedById: BigInt(1),
        fieldName: 'status',
        oldValue: 'NEW',
        newValue: 'OPEN',
      });

      expect(result.fieldName).toBe('status');
      expect(result.oldValue).toBe('NEW');
      expect(result.newValue).toBe('OPEN');
    });
  });

  describe('createBugHistories', () => {
    it('should create multiple history entries', async () => {
      const mockHistories = [
        {
          id: BigInt(1),
          bugId: BigInt(1),
          changedById: BigInt(1),
          fieldName: 'status',
          oldValue: 'NEW',
          newValue: 'OPEN',
          changedAt: new Date(),
        },
        {
          id: BigInt(2),
          bugId: BigInt(1),
          changedById: BigInt(1),
          fieldName: 'priority',
          oldValue: 'MEDIUM',
          newValue: 'HIGH',
          changedAt: new Date(),
        },
      ];

      vi.mocked(prisma.$transaction).mockResolvedValue(mockHistories);

      const result = await createBugHistories([
        {
          bugId: BigInt(1),
          changedById: BigInt(1),
          fieldName: 'status',
          oldValue: 'NEW',
          newValue: 'OPEN',
        },
        {
          bugId: BigInt(1),
          changedById: BigInt(1),
          fieldName: 'priority',
          oldValue: 'MEDIUM',
          newValue: 'HIGH',
        },
      ]);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', async () => {
      const result = await createBugHistories([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('listBugHistories', () => {
    it('should list all history entries for a bug', async () => {
      const mockHistories = [
        {
          id: BigInt(1),
          bugId: BigInt(1),
          changedById: BigInt(1),
          fieldName: 'status',
          oldValue: 'NEW',
          newValue: 'OPEN',
          changedAt: new Date(),
          changedBy: { id: BigInt(1), name: 'ユーザー', email: 'user@example.com' },
        },
      ];

      vi.mocked(prisma.bugHistory.findMany).mockResolvedValue(mockHistories as never);

      const result = await listBugHistories(BigInt(1));
      expect(result).toHaveLength(1);
      expect(result[0].changedBy?.name).toBe('ユーザー');
    });
  });

  describe('listBugFieldHistories', () => {
    it('should list history entries for a specific field', async () => {
      const mockHistories = [
        {
          id: BigInt(1),
          bugId: BigInt(1),
          changedById: BigInt(1),
          fieldName: 'status',
          oldValue: 'NEW',
          newValue: 'OPEN',
          changedAt: new Date(),
          changedBy: { id: BigInt(1), name: 'ユーザー', email: 'user@example.com' },
        },
      ];

      vi.mocked(prisma.bugHistory.findMany).mockResolvedValue(mockHistories as never);

      const result = await listBugFieldHistories(BigInt(1), 'status');
      expect(result).toHaveLength(1);
      expect(result[0].fieldName).toBe('status');
    });
  });
});
