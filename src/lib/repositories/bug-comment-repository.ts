/**
 * バグコメント・添付ファイル・履歴リポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  BugComment,
  BugCommentWithRelations,
  CreateBugCommentInput,
  UpdateBugCommentInput,
} from '@/types/bug-comment';
import type {
  BugAttachment,
  BugAttachmentWithRelations,
  CreateBugAttachmentInput,
} from '@/types/bug-attachment';
import type {
  BugHistory,
  BugHistoryWithRelations,
  CreateBugHistoryInput,
} from '@/types/bug-history';

// ============================================
// セレクト定義
// ============================================

const bugCommentSelect = {
  id: true,
  bugId: true,
  authorId: true,
  parentId: true,
  content: true,
  isInternal: true,
  createdAt: true,
  updatedAt: true,
};

const bugCommentWithRelationsSelect = {
  ...bugCommentSelect,
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
  replies: {
    select: bugCommentSelect,
    orderBy: { createdAt: 'asc' as const },
  },
};

const bugAttachmentSelect = {
  id: true,
  bugId: true,
  uploadedById: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  storagePath: true,
  thumbnailPath: true,
  description: true,
  createdAt: true,
};

const bugAttachmentWithRelationsSelect = {
  ...bugAttachmentSelect,
  uploadedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

const bugHistorySelect = {
  id: true,
  bugId: true,
  changedById: true,
  fieldName: true,
  oldValue: true,
  newValue: true,
  changedAt: true,
};

const bugHistoryWithRelationsSelect = {
  ...bugHistorySelect,
  changedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

// ============================================
// 変換関数
// ============================================

interface DbBugComment {
  id: bigint;
  bugId: bigint;
  authorId: bigint;
  parentId: bigint | null;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DbBugCommentWithRelations extends DbBugComment {
  author: { id: bigint; name: string; email: string; image: string | null };
  replies: DbBugComment[];
}

interface DbBugAttachment {
  id: bigint;
  bugId: bigint;
  uploadedById: bigint;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  thumbnailPath: string | null;
  description: string | null;
  createdAt: Date;
}

interface DbBugAttachmentWithRelations extends DbBugAttachment {
  uploadedBy: { id: bigint; name: string; email: string };
}

interface DbBugHistory {
  id: bigint;
  bugId: bigint;
  changedById: bigint;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: Date;
}

interface DbBugHistoryWithRelations extends DbBugHistory {
  changedBy: { id: bigint; name: string; email: string };
}

function toBugComment(db: DbBugComment): BugComment {
  return { ...db };
}

function toBugCommentWithRelations(db: DbBugCommentWithRelations): BugCommentWithRelations {
  return {
    ...toBugComment(db),
    author: db.author,
    replies: db.replies.map(toBugComment),
  };
}

function toBugAttachment(db: DbBugAttachment): BugAttachment {
  return { ...db };
}

function toBugAttachmentWithRelations(
  db: DbBugAttachmentWithRelations
): BugAttachmentWithRelations {
  return {
    ...toBugAttachment(db),
    uploadedBy: db.uploadedBy,
  };
}

function toBugHistory(db: DbBugHistory): BugHistory {
  return { ...db };
}

function toBugHistoryWithRelations(db: DbBugHistoryWithRelations): BugHistoryWithRelations {
  return {
    ...toBugHistory(db),
    changedBy: db.changedBy,
  };
}

// ============================================
// バグコメント CRUD
// ============================================

/**
 * バグコメントを作成
 */
export async function createBugComment(input: CreateBugCommentInput): Promise<BugComment> {
  const db = await prisma.bugComment.create({
    data: {
      bugId: input.bugId,
      authorId: input.authorId,
      parentId: input.parentId ?? null,
      content: input.content,
      isInternal: input.isInternal ?? false,
    },
    select: bugCommentSelect,
  });
  return toBugComment(db);
}

/**
 * バグコメントを取得
 */
export async function getBugCommentById(
  commentId: bigint
): Promise<BugCommentWithRelations | null> {
  const db = await prisma.bugComment.findUnique({
    where: { id: commentId },
    select: bugCommentWithRelationsSelect,
  });
  if (!db) return null;
  return toBugCommentWithRelations(db as DbBugCommentWithRelations);
}

/**
 * バグのコメント一覧を取得（トップレベルのみ）
 */
export async function listBugComments(
  bugId: bigint,
  options: { includeInternal?: boolean } = {}
): Promise<BugCommentWithRelations[]> {
  const where: Record<string, unknown> = {
    bugId,
    parentId: null,
  };

  if (!options.includeInternal) {
    where.isInternal = false;
  }

  const dbComments = await prisma.bugComment.findMany({
    where,
    select: bugCommentWithRelationsSelect,
    orderBy: { createdAt: 'asc' },
  });

  return dbComments.map((db) => toBugCommentWithRelations(db as DbBugCommentWithRelations));
}

/**
 * バグコメントを更新
 */
export async function updateBugComment(
  commentId: bigint,
  input: UpdateBugCommentInput
): Promise<BugComment> {
  const db = await prisma.bugComment.update({
    where: { id: commentId },
    data: input,
    select: bugCommentSelect,
  });
  return toBugComment(db);
}

/**
 * バグコメントを削除
 */
export async function deleteBugComment(commentId: bigint): Promise<void> {
  await prisma.bugComment.delete({
    where: { id: commentId },
  });
}

/**
 * バグコメントの存在確認
 */
export async function bugCommentExists(commentId: bigint): Promise<boolean> {
  const comment = await prisma.bugComment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  return comment !== null;
}

// ============================================
// バグ添付ファイル CRUD
// ============================================

/**
 * バグ添付ファイルを作成
 */
export async function createBugAttachment(input: CreateBugAttachmentInput): Promise<BugAttachment> {
  const db = await prisma.bugAttachment.create({
    data: {
      bugId: input.bugId,
      uploadedById: input.uploadedById,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      storagePath: input.storagePath,
      thumbnailPath: input.thumbnailPath ?? null,
      description: input.description ?? null,
    },
    select: bugAttachmentSelect,
  });
  return toBugAttachment(db);
}

/**
 * バグ添付ファイルを取得
 */
export async function getBugAttachmentById(
  attachmentId: bigint
): Promise<BugAttachmentWithRelations | null> {
  const db = await prisma.bugAttachment.findUnique({
    where: { id: attachmentId },
    select: bugAttachmentWithRelationsSelect,
  });
  if (!db) return null;
  return toBugAttachmentWithRelations(db as DbBugAttachmentWithRelations);
}

/**
 * バグの添付ファイル一覧を取得
 */
export async function listBugAttachments(bugId: bigint): Promise<BugAttachmentWithRelations[]> {
  const dbAttachments = await prisma.bugAttachment.findMany({
    where: { bugId },
    select: bugAttachmentWithRelationsSelect,
    orderBy: { createdAt: 'desc' },
  });

  return dbAttachments.map((db) =>
    toBugAttachmentWithRelations(db as DbBugAttachmentWithRelations)
  );
}

/**
 * バグ添付ファイルを削除
 */
export async function deleteBugAttachment(attachmentId: bigint): Promise<void> {
  await prisma.bugAttachment.delete({
    where: { id: attachmentId },
  });
}

/**
 * バグ添付ファイルの存在確認
 */
export async function bugAttachmentExists(attachmentId: bigint): Promise<boolean> {
  const attachment = await prisma.bugAttachment.findUnique({
    where: { id: attachmentId },
    select: { id: true },
  });
  return attachment !== null;
}

// ============================================
// バグ履歴 CRUD
// ============================================

/**
 * バグ履歴を作成
 */
export async function createBugHistory(input: CreateBugHistoryInput): Promise<BugHistory> {
  const db = await prisma.bugHistory.create({
    data: {
      bugId: input.bugId,
      changedById: input.changedById,
      fieldName: input.fieldName,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    },
    select: bugHistorySelect,
  });
  return toBugHistory(db);
}

/**
 * バグ履歴を一括作成
 */
export async function createBugHistories(inputs: CreateBugHistoryInput[]): Promise<BugHistory[]> {
  if (inputs.length === 0) return [];

  const results = await prisma.$transaction(
    inputs.map((input) =>
      prisma.bugHistory.create({
        data: {
          bugId: input.bugId,
          changedById: input.changedById,
          fieldName: input.fieldName,
          oldValue: input.oldValue ?? null,
          newValue: input.newValue ?? null,
        },
        select: bugHistorySelect,
      })
    )
  );

  return results.map(toBugHistory);
}

/**
 * バグ履歴一覧を取得
 */
export async function listBugHistories(bugId: bigint): Promise<BugHistoryWithRelations[]> {
  const dbHistories = await prisma.bugHistory.findMany({
    where: { bugId },
    select: bugHistoryWithRelationsSelect,
    orderBy: { changedAt: 'desc' },
  });

  return dbHistories.map((db) => toBugHistoryWithRelations(db as DbBugHistoryWithRelations));
}

/**
 * 特定フィールドの履歴を取得
 */
export async function listBugFieldHistories(
  bugId: bigint,
  fieldName: string
): Promise<BugHistoryWithRelations[]> {
  const dbHistories = await prisma.bugHistory.findMany({
    where: { bugId, fieldName },
    select: bugHistoryWithRelationsSelect,
    orderBy: { changedAt: 'desc' },
  });

  return dbHistories.map((db) => toBugHistoryWithRelations(db as DbBugHistoryWithRelations));
}
