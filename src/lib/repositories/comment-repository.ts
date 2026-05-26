/**
 * コメントリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  Comment,
  CommentMention,
  CreateCommentInput,
  UpdateCommentInput,
  CommentTargetType,
} from '@/types/comment';

// ============================================
// セレクト定義
// ============================================

const authorSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
};

const mentionSelect = {
  id: true,
  commentId: true,
  userId: true,
  user: {
    select: authorSelect,
  },
  createdAt: true,
};

const commentSelect = {
  id: true,
  targetType: true,
  targetId: true,
  parentId: true,
  authorId: true,
  author: {
    select: authorSelect,
  },
  content: true,
  isEdited: true,
  isResolved: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  mentions: {
    select: mentionSelect,
  },
};

// ============================================
// 変換関数
// ============================================

interface DbAuthor {
  id: bigint;
  name: string;
  email: string;
  image: string | null;
}

interface DbMention {
  id: bigint;
  commentId: bigint;
  userId: bigint;
  user?: DbAuthor;
  createdAt: Date;
}

interface DbComment {
  id: bigint;
  targetType: string;
  targetId: bigint;
  parentId: bigint | null;
  authorId: bigint;
  author?: DbAuthor;
  content: string;
  isEdited: boolean;
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  mentions?: DbMention[];
}

function serializeAuthor(author: DbAuthor) {
  return {
    id: author.id.toString(),
    name: author.name,
    email: author.email,
    image: author.image,
  };
}

function serializeMention(mention: DbMention): CommentMention {
  return {
    id: mention.id.toString(),
    commentId: mention.commentId.toString(),
    userId: mention.userId.toString(),
    user: mention.user ? serializeAuthor(mention.user) : undefined,
    createdAt: mention.createdAt.toISOString(),
  };
}

function serializeComment(comment: DbComment): Comment {
  return {
    id: comment.id.toString(),
    targetType: comment.targetType as CommentTargetType,
    targetId: comment.targetId.toString(),
    parentId: comment.parentId?.toString() || null,
    authorId: comment.authorId.toString(),
    author: comment.author ? serializeAuthor(comment.author) : undefined,
    content: comment.content,
    isEdited: comment.isEdited,
    isResolved: comment.isResolved,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    deletedAt: comment.deletedAt?.toISOString() || null,
    mentions: comment.mentions?.map(serializeMention),
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * コメント作成
 */
export async function createComment(input: CreateCommentInput, authorId: string): Promise<Comment> {
  const comment = await prisma.comment.create({
    data: {
      targetType: input.targetType,
      targetId: BigInt(input.targetId),
      parentId: input.parentId ? BigInt(input.parentId) : null,
      authorId: BigInt(authorId),
      content: input.content,
      mentions: input.mentionUserIds
        ? {
            create: input.mentionUserIds.map((userId) => ({
              userId: BigInt(userId),
            })),
          }
        : undefined,
    },
    select: commentSelect,
  });

  return serializeComment(comment as unknown as DbComment);
}

/**
 * コメント取得（ID指定）
 */
export async function getCommentById(id: string): Promise<Comment | null> {
  const comment = await prisma.comment.findUnique({
    where: { id: BigInt(id), deletedAt: null },
    select: commentSelect,
  });

  if (!comment) {
    return null;
  }

  return serializeComment(comment as unknown as DbComment);
}

/**
 * ターゲットに紐づくコメント一覧取得
 */
export async function getCommentsByTarget(
  targetType: CommentTargetType,
  targetId: string
): Promise<Comment[]> {
  const comments = await prisma.comment.findMany({
    where: {
      targetType,
      targetId: BigInt(targetId),
      deletedAt: null,
    },
    select: commentSelect,
    orderBy: { createdAt: 'asc' },
  });

  return comments.map((c) => serializeComment(c as unknown as DbComment));
}

/**
 * コメント更新
 */
export async function updateComment(
  id: string,
  input: UpdateCommentInput,
  authorId: string
): Promise<Comment | null> {
  const existing = await prisma.comment.findUnique({
    where: { id: BigInt(id), deletedAt: null },
    select: { id: true, authorId: true },
  });

  if (!existing) {
    return null;
  }

  // 作成者のみ編集可能
  if (existing.authorId.toString() !== authorId) {
    throw new Error('このコメントを編集する権限がありません。');
  }

  // 既存メンションを削除して再作成
  await prisma.commentMention.deleteMany({
    where: { commentId: BigInt(id) },
  });

  const comment = await prisma.comment.update({
    where: { id: BigInt(id) },
    data: {
      content: input.content,
      isEdited: true,
      mentions: input.mentionUserIds
        ? {
            create: input.mentionUserIds.map((userId) => ({
              userId: BigInt(userId),
            })),
          }
        : undefined,
    },
    select: commentSelect,
  });

  return serializeComment(comment as unknown as DbComment);
}

/**
 * コメント削除（論理削除）
 */
export async function deleteComment(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.comment.findUnique({
    where: { id: BigInt(id), deletedAt: null },
    select: { id: true, authorId: true },
  });

  if (!existing) {
    return { success: false, error: 'コメントが見つかりません。' };
  }

  // 作成者のみ削除可能
  if (existing.authorId.toString() !== userId) {
    return { success: false, error: 'このコメントを削除する権限がありません。' };
  }

  await prisma.comment.update({
    where: { id: BigInt(id) },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}

/**
 * コメント解決状態更新
 */
export async function resolveComment(id: string, isResolved: boolean): Promise<Comment | null> {
  const existing = await prisma.comment.findUnique({
    where: { id: BigInt(id), deletedAt: null },
    select: { id: true, parentId: true },
  });

  if (!existing) {
    return null;
  }

  // スレッドのルートコメントのみ解決可能
  if (existing.parentId !== null) {
    throw new Error('返信コメントは解決済みにできません。');
  }

  const comment = await prisma.comment.update({
    where: { id: BigInt(id) },
    data: { isResolved },
    select: commentSelect,
  });

  return serializeComment(comment as unknown as DbComment);
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * ユーザーへのメンション一覧取得
 */
export async function getMentionsByUserId(userId: string): Promise<CommentMention[]> {
  const mentions = await prisma.commentMention.findMany({
    where: {
      userId: BigInt(userId),
      comment: {
        deletedAt: null,
      },
    },
    select: mentionSelect,
    orderBy: { createdAt: 'desc' },
  });

  return mentions.map((m) => serializeMention(m as unknown as DbMention));
}

/**
 * コメント数取得
 */
export async function getCommentCount(
  targetType: CommentTargetType,
  targetId: string
): Promise<number> {
  return prisma.comment.count({
    where: {
      targetType,
      targetId: BigInt(targetId),
      deletedAt: null,
    },
  });
}

/**
 * 未解決コメント数取得
 */
export async function getUnresolvedCommentCount(
  targetType: CommentTargetType,
  targetId: string
): Promise<number> {
  return prisma.comment.count({
    where: {
      targetType,
      targetId: BigInt(targetId),
      parentId: null, // ルートコメントのみ
      isResolved: false,
      deletedAt: null,
    },
  });
}
