/**
 * Test Case Review Repository
 *
 * テストケースレビューのデータアクセス層
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import type {
  TestCaseReview,
  ReviewComment,
  ReviewHistory,
  CreateReviewRequest,
  UpdateReviewRequest,
  CreateCommentRequest,
  ReviewFilter,
  ReviewStats,
  ReviewStatus,
  ReviewAction,
} from '@/types/review';

// ====================================
// Type Converters
// ====================================

function convertToTestCaseReview(dbReview: {
  id: bigint;
  testCaseId: bigint;
  requesterId: bigint;
  reviewerId: bigint | null;
  status: string;
  priority: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  reviewedAt: Date | null;
  versionId: bigint | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  testCase?: { title: string };
  _count?: { comments: number };
  comments?: { isResolved: boolean }[];
}): TestCaseReview {
  const unresolvedCount = dbReview.comments
    ? dbReview.comments.filter((c) => !c.isResolved).length
    : undefined;

  return {
    id: dbReview.id.toString(),
    testCaseId: dbReview.testCaseId.toString(),
    testCaseTitle: dbReview.testCase?.title,
    requesterId: dbReview.requesterId.toString(),
    reviewerId: dbReview.reviewerId?.toString(),
    status: dbReview.status as ReviewStatus,
    priority: dbReview.priority as TestCaseReview['priority'],
    title: dbReview.title,
    description: dbReview.description || undefined,
    dueDate: dbReview.dueDate || undefined,
    reviewedAt: dbReview.reviewedAt || undefined,
    versionId: dbReview.versionId?.toString(),
    metadata: dbReview.metadata as Record<string, unknown> | undefined,
    createdAt: dbReview.createdAt,
    updatedAt: dbReview.updatedAt,
    commentCount: dbReview._count?.comments,
    unresolvedCount,
  };
}

function convertToReviewComment(dbComment: {
  id: bigint;
  reviewId: bigint;
  authorId: bigint;
  content: string;
  lineRef: string | null;
  isResolved: boolean;
  parentId: bigint | null;
  createdAt: Date;
  updatedAt: Date;
  replies?: Array<{
    id: bigint;
    reviewId: bigint;
    authorId: bigint;
    content: string;
    lineRef: string | null;
    isResolved: boolean;
    parentId: bigint | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): ReviewComment {
  return {
    id: dbComment.id.toString(),
    reviewId: dbComment.reviewId.toString(),
    authorId: dbComment.authorId.toString(),
    content: dbComment.content,
    lineRef: dbComment.lineRef || undefined,
    isResolved: dbComment.isResolved,
    parentId: dbComment.parentId?.toString(),
    createdAt: dbComment.createdAt,
    updatedAt: dbComment.updatedAt,
    replies: dbComment.replies?.map((reply) => convertToReviewComment(reply)),
  };
}

function convertToReviewHistory(dbHistory: {
  id: bigint;
  reviewId: bigint;
  userId: bigint;
  action: string;
  details: Prisma.JsonValue;
  createdAt: Date;
}): ReviewHistory {
  return {
    id: dbHistory.id.toString(),
    reviewId: dbHistory.reviewId.toString(),
    userId: dbHistory.userId.toString(),
    action: dbHistory.action as ReviewAction,
    details: dbHistory.details as Record<string, unknown> | undefined,
    createdAt: dbHistory.createdAt,
  };
}

// ====================================
// Review CRUD Operations
// ====================================

/**
 * レビューを作成
 */
export async function createReview(
  requesterId: string,
  data: CreateReviewRequest
): Promise<TestCaseReview> {
  const review = await prisma.testCaseReview.create({
    data: {
      testCaseId: BigInt(data.testCaseId),
      requesterId: BigInt(requesterId),
      reviewerId: data.reviewerId ? BigInt(data.reviewerId) : null,
      priority: data.priority || 'MEDIUM',
      title: data.title,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      versionId: data.versionId ? BigInt(data.versionId) : null,
    },
    include: {
      testCase: { select: { title: true } },
      _count: { select: { comments: true } },
    },
  });

  // 履歴を記録
  await prisma.reviewHistory.create({
    data: {
      reviewId: review.id,
      userId: BigInt(requesterId),
      action: 'CREATED',
      details: { title: data.title },
    },
  });

  return convertToTestCaseReview(review);
}

/**
 * レビューを取得
 */
export async function getReview(id: string): Promise<TestCaseReview | null> {
  const review = await prisma.testCaseReview.findUnique({
    where: { id: BigInt(id) },
    include: {
      testCase: { select: { title: true } },
      _count: { select: { comments: true } },
      comments: { select: { isResolved: true } },
    },
  });

  if (!review) return null;
  return convertToTestCaseReview(review);
}

/**
 * レビュー一覧を取得
 */
export async function getReviews(
  filter: ReviewFilter & { page?: number; pageSize?: number }
): Promise<{ reviews: TestCaseReview[]; total: number }> {
  const { page = 1, pageSize = 20, ...filterParams } = filter;

  const where: Prisma.TestCaseReviewWhereInput = {};

  if (filterParams.status && filterParams.status.length > 0) {
    where.status = { in: filterParams.status };
  }
  if (filterParams.priority && filterParams.priority.length > 0) {
    where.priority = { in: filterParams.priority };
  }
  if (filterParams.requesterId) {
    where.requesterId = BigInt(filterParams.requesterId);
  }
  if (filterParams.reviewerId) {
    where.reviewerId = BigInt(filterParams.reviewerId);
  }
  if (filterParams.testCaseId) {
    where.testCaseId = BigInt(filterParams.testCaseId);
  }
  if (filterParams.fromDate) {
    where.createdAt = { gte: new Date(filterParams.fromDate) };
  }
  if (filterParams.toDate) {
    where.createdAt = {
      ...((where.createdAt as Prisma.DateTimeFilter) || {}),
      lte: new Date(filterParams.toDate),
    };
  }

  const [reviews, total] = await Promise.all([
    prisma.testCaseReview.findMany({
      where,
      include: {
        testCase: { select: { title: true } },
        _count: { select: { comments: true } },
        comments: { select: { isResolved: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.testCaseReview.count({ where }),
  ]);

  return {
    reviews: reviews.map(convertToTestCaseReview),
    total,
  };
}

/**
 * テストケースのレビュー一覧を取得
 */
export async function getReviewsByTestCase(testCaseId: string): Promise<TestCaseReview[]> {
  const reviews = await prisma.testCaseReview.findMany({
    where: { testCaseId: BigInt(testCaseId) },
    include: {
      testCase: { select: { title: true } },
      _count: { select: { comments: true } },
      comments: { select: { isResolved: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return reviews.map(convertToTestCaseReview);
}

/**
 * レビューを更新
 */
export async function updateReview(
  id: string,
  userId: string,
  data: UpdateReviewRequest
): Promise<TestCaseReview> {
  const updateData: Prisma.TestCaseReviewUpdateInput = {};

  if (data.reviewerId !== undefined) {
    updateData.reviewerId = data.reviewerId ? BigInt(data.reviewerId) : null;
  }
  if (data.priority !== undefined) {
    updateData.priority = data.priority;
  }
  if (data.title !== undefined) {
    updateData.title = data.title;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
    if (data.status === 'APPROVED' || data.status === 'REJECTED') {
      updateData.reviewedAt = new Date();
    }
  }

  const review = await prisma.testCaseReview.update({
    where: { id: BigInt(id) },
    data: updateData,
    include: {
      testCase: { select: { title: true } },
      _count: { select: { comments: true } },
      comments: { select: { isResolved: true } },
    },
  });

  // 履歴を記録
  if (data.reviewerId !== undefined) {
    await prisma.reviewHistory.create({
      data: {
        reviewId: BigInt(id),
        userId: BigInt(userId),
        action: 'ASSIGNED',
        details: { reviewerId: data.reviewerId },
      },
    });
  }

  return convertToTestCaseReview(review);
}

/**
 * レビューを承認/却下
 */
export async function decideReview(
  id: string,
  userId: string,
  decision: 'approve' | 'reject',
  comment?: string
): Promise<TestCaseReview> {
  const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  const action = decision === 'approve' ? 'APPROVED' : 'REJECTED';

  const review = await prisma.testCaseReview.update({
    where: { id: BigInt(id) },
    data: {
      status,
      reviewedAt: new Date(),
    },
    include: {
      testCase: { select: { title: true } },
      _count: { select: { comments: true } },
      comments: { select: { isResolved: true } },
    },
  });

  // 履歴を記録
  await prisma.reviewHistory.create({
    data: {
      reviewId: BigInt(id),
      userId: BigInt(userId),
      action,
      details: comment ? { comment } : undefined,
    },
  });

  // コメントがある場合は追加
  if (comment) {
    await prisma.reviewComment.create({
      data: {
        reviewId: BigInt(id),
        authorId: BigInt(userId),
        content: comment,
      },
    });
  }

  return convertToTestCaseReview(review);
}

/**
 * レビューを再オープン
 */
export async function reopenReview(id: string, userId: string): Promise<TestCaseReview> {
  const review = await prisma.testCaseReview.update({
    where: { id: BigInt(id) },
    data: {
      status: 'IN_REVIEW',
      reviewedAt: null,
    },
    include: {
      testCase: { select: { title: true } },
      _count: { select: { comments: true } },
      comments: { select: { isResolved: true } },
    },
  });

  await prisma.reviewHistory.create({
    data: {
      reviewId: BigInt(id),
      userId: BigInt(userId),
      action: 'REOPENED',
    },
  });

  return convertToTestCaseReview(review);
}

/**
 * レビューをキャンセル
 */
export async function cancelReview(id: string, userId: string): Promise<TestCaseReview> {
  const review = await prisma.testCaseReview.update({
    where: { id: BigInt(id) },
    data: { status: 'CANCELLED' },
    include: {
      testCase: { select: { title: true } },
      _count: { select: { comments: true } },
      comments: { select: { isResolved: true } },
    },
  });

  await prisma.reviewHistory.create({
    data: {
      reviewId: BigInt(id),
      userId: BigInt(userId),
      action: 'CANCELLED',
    },
  });

  return convertToTestCaseReview(review);
}

/**
 * レビューを削除
 */
export async function deleteReview(id: string): Promise<void> {
  await prisma.testCaseReview.delete({
    where: { id: BigInt(id) },
  });
}

// ====================================
// Comment Operations
// ====================================

/**
 * コメントを追加
 */
export async function addComment(
  reviewId: string,
  authorId: string,
  data: CreateCommentRequest
): Promise<ReviewComment> {
  const comment = await prisma.reviewComment.create({
    data: {
      reviewId: BigInt(reviewId),
      authorId: BigInt(authorId),
      content: data.content,
      lineRef: data.lineRef,
      parentId: data.parentId ? BigInt(data.parentId) : null,
    },
  });

  // レビューステータスを更新（未レビューなら進行中に）
  await prisma.testCaseReview.updateMany({
    where: {
      id: BigInt(reviewId),
      status: 'PENDING',
    },
    data: { status: 'IN_REVIEW' },
  });

  // 履歴を記録
  await prisma.reviewHistory.create({
    data: {
      reviewId: BigInt(reviewId),
      userId: BigInt(authorId),
      action: 'COMMENTED',
      details: { commentId: comment.id.toString() },
    },
  });

  return convertToReviewComment(comment);
}

/**
 * コメント一覧を取得
 */
export async function getComments(reviewId: string): Promise<ReviewComment[]> {
  const comments = await prisma.reviewComment.findMany({
    where: {
      reviewId: BigInt(reviewId),
      parentId: null, // トップレベルコメントのみ
    },
    include: {
      replies: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return comments.map(convertToReviewComment);
}

/**
 * コメントを解決
 */
export async function resolveComment(commentId: string, userId: string): Promise<ReviewComment> {
  const comment = await prisma.reviewComment.update({
    where: { id: BigInt(commentId) },
    data: { isResolved: true },
  });

  // 履歴を記録
  await prisma.reviewHistory.create({
    data: {
      reviewId: comment.reviewId,
      userId: BigInt(userId),
      action: 'RESOLVED',
      details: { commentId },
    },
  });

  return convertToReviewComment(comment);
}

/**
 * コメントを未解決に戻す
 */
export async function unresolveComment(commentId: string): Promise<ReviewComment> {
  const comment = await prisma.reviewComment.update({
    where: { id: BigInt(commentId) },
    data: { isResolved: false },
  });

  return convertToReviewComment(comment);
}

/**
 * コメントを削除
 */
export async function deleteComment(commentId: string): Promise<void> {
  // 返信も含めて削除
  await prisma.reviewComment.deleteMany({
    where: { parentId: BigInt(commentId) },
  });
  await prisma.reviewComment.delete({
    where: { id: BigInt(commentId) },
  });
}

// ====================================
// History Operations
// ====================================

/**
 * レビュー履歴を取得
 */
export async function getReviewHistory(reviewId: string): Promise<ReviewHistory[]> {
  const histories = await prisma.reviewHistory.findMany({
    where: { reviewId: BigInt(reviewId) },
    orderBy: { createdAt: 'desc' },
  });

  return histories.map(convertToReviewHistory);
}

// ====================================
// Statistics
// ====================================

/**
 * レビュー統計を取得
 */
export async function getReviewStats(filter?: {
  testCaseId?: string;
  requesterId?: string;
  reviewerId?: string;
}): Promise<ReviewStats> {
  const where: Prisma.TestCaseReviewWhereInput = {};

  if (filter?.testCaseId) {
    where.testCaseId = BigInt(filter.testCaseId);
  }
  if (filter?.requesterId) {
    where.requesterId = BigInt(filter.requesterId);
  }
  if (filter?.reviewerId) {
    where.reviewerId = BigInt(filter.reviewerId);
  }

  const [total, pending, inReview, approved, rejected] = await Promise.all([
    prisma.testCaseReview.count({ where }),
    prisma.testCaseReview.count({ where: { ...where, status: 'PENDING' } }),
    prisma.testCaseReview.count({ where: { ...where, status: 'IN_REVIEW' } }),
    prisma.testCaseReview.count({ where: { ...where, status: 'APPROVED' } }),
    prisma.testCaseReview.count({ where: { ...where, status: 'REJECTED' } }),
  ]);

  // 期限切れのレビュー数
  const now = new Date();
  const overdue = await prisma.testCaseReview.count({
    where: {
      ...where,
      dueDate: { lt: now },
      status: { in: ['PENDING', 'IN_REVIEW'] },
    },
  });

  // 平均レビュー時間
  const completedReviews = await prisma.testCaseReview.findMany({
    where: {
      ...where,
      reviewedAt: { not: null },
    },
    select: {
      createdAt: true,
      reviewedAt: true,
    },
  });

  let avgReviewTime: number | undefined;
  if (completedReviews.length > 0) {
    const totalTime = completedReviews.reduce(
      (sum: number, r: { createdAt: Date; reviewedAt: Date | null }) => {
        if (r.reviewedAt) {
          return sum + (r.reviewedAt.getTime() - r.createdAt.getTime());
        }
        return sum;
      },
      0
    );
    avgReviewTime = totalTime / completedReviews.length / (1000 * 60 * 60); // 時間単位
  }

  return {
    total,
    pending,
    inReview,
    approved,
    rejected,
    overdue,
    avgReviewTime,
  };
}

/**
 * ユーザーの担当レビュー一覧を取得
 */
export async function getMyReviews(
  userId: string,
  type: 'requested' | 'assigned'
): Promise<TestCaseReview[]> {
  const where: Prisma.TestCaseReviewWhereInput =
    type === 'requested' ? { requesterId: BigInt(userId) } : { reviewerId: BigInt(userId) };

  const reviews = await prisma.testCaseReview.findMany({
    where,
    include: {
      testCase: { select: { title: true } },
      _count: { select: { comments: true } },
      comments: { select: { isResolved: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return reviews.map(convertToTestCaseReview);
}

/**
 * レビュアーを割り当て
 */
export async function assignReviewer(
  reviewId: string,
  reviewerId: string,
  assignerId: string
): Promise<TestCaseReview> {
  const review = await prisma.testCaseReview.update({
    where: { id: BigInt(reviewId) },
    data: { reviewerId: BigInt(reviewerId) },
    include: {
      testCase: { select: { title: true } },
      _count: { select: { comments: true } },
      comments: { select: { isResolved: true } },
    },
  });

  await prisma.reviewHistory.create({
    data: {
      reviewId: BigInt(reviewId),
      userId: BigInt(assignerId),
      action: 'ASSIGNED',
      details: { reviewerId },
    },
  });

  return convertToTestCaseReview(review);
}
