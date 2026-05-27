/**
 * Test Case Review Types
 *
 * テストケースレビューの型定義
 */

// ====================================
// Enums
// ====================================

/**
 * レビューステータス
 */
export const ReviewStatus = {
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

/**
 * レビュー優先度
 */
export const ReviewPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type ReviewPriority = (typeof ReviewPriority)[keyof typeof ReviewPriority];

/**
 * レビューアクション
 */
export const ReviewAction = {
  CREATED: 'CREATED',
  ASSIGNED: 'ASSIGNED',
  COMMENTED: 'COMMENTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REOPENED: 'REOPENED',
  CANCELLED: 'CANCELLED',
  RESOLVED: 'RESOLVED',
} as const;

export type ReviewAction = (typeof ReviewAction)[keyof typeof ReviewAction];

// ====================================
// Core Types
// ====================================

/**
 * レビューリクエスト
 */
export interface TestCaseReview {
  id: string;
  testCaseId: string;
  testCaseTitle?: string;
  requesterId: string;
  requesterName?: string;
  reviewerId?: string;
  reviewerName?: string;
  status: ReviewStatus;
  priority: ReviewPriority;
  title: string;
  description?: string;
  dueDate?: Date;
  reviewedAt?: Date;
  versionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  commentCount?: number;
  unresolvedCount?: number;
}

/**
 * レビューコメント
 */
export interface ReviewComment {
  id: string;
  reviewId: string;
  authorId: string;
  authorName?: string;
  content: string;
  lineRef?: string;
  isResolved: boolean;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  replies?: ReviewComment[];
}

/**
 * レビュー履歴
 */
export interface ReviewHistory {
  id: string;
  reviewId: string;
  userId: string;
  userName?: string;
  action: ReviewAction;
  details?: Record<string, unknown>;
  createdAt: Date;
}

// ====================================
// API Types
// ====================================

/**
 * レビュー作成リクエスト
 */
export interface CreateReviewRequest {
  testCaseId: string;
  reviewerId?: string;
  priority?: ReviewPriority;
  title: string;
  description?: string;
  dueDate?: string;
  versionId?: string;
}

/**
 * レビュー更新リクエスト
 */
export interface UpdateReviewRequest {
  reviewerId?: string;
  priority?: ReviewPriority;
  title?: string;
  description?: string;
  dueDate?: string;
  status?: ReviewStatus;
}

/**
 * コメント作成リクエスト
 */
export interface CreateCommentRequest {
  content: string;
  lineRef?: string;
  parentId?: string;
}

/**
 * レビュー決定リクエスト
 */
export interface ReviewDecisionRequest {
  decision: 'approve' | 'reject';
  comment?: string;
}

/**
 * レビューフィルター
 */
export interface ReviewFilter {
  status?: ReviewStatus[];
  priority?: ReviewPriority[];
  requesterId?: string;
  reviewerId?: string;
  testCaseId?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * レビュー統計
 */
export interface ReviewStats {
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  overdue: number;
  avgReviewTime?: number; // 平均レビュー時間（時間）
}

// ====================================
// Utility Functions
// ====================================

/**
 * レビューステータスのラベルを取得
 */
export function getReviewStatusLabel(status: ReviewStatus): string {
  const labels: Record<ReviewStatus, string> = {
    [ReviewStatus.PENDING]: '未レビュー',
    [ReviewStatus.IN_REVIEW]: 'レビュー中',
    [ReviewStatus.APPROVED]: '承認',
    [ReviewStatus.REJECTED]: '却下',
    [ReviewStatus.CANCELLED]: 'キャンセル',
  };
  return labels[status] || status;
}

/**
 * レビューステータスの色を取得
 */
export function getReviewStatusColor(status: ReviewStatus): string {
  const colors: Record<ReviewStatus, string> = {
    [ReviewStatus.PENDING]: 'text-gray-600 bg-gray-100',
    [ReviewStatus.IN_REVIEW]: 'text-blue-600 bg-blue-100',
    [ReviewStatus.APPROVED]: 'text-green-600 bg-green-100',
    [ReviewStatus.REJECTED]: 'text-red-600 bg-red-100',
    [ReviewStatus.CANCELLED]: 'text-gray-400 bg-gray-50',
  };
  return colors[status] || '';
}

/**
 * レビュー優先度のラベルを取得
 */
export function getReviewPriorityLabel(priority: ReviewPriority): string {
  const labels: Record<ReviewPriority, string> = {
    [ReviewPriority.LOW]: '低',
    [ReviewPriority.MEDIUM]: '中',
    [ReviewPriority.HIGH]: '高',
    [ReviewPriority.URGENT]: '緊急',
  };
  return labels[priority] || priority;
}

/**
 * レビュー優先度の色を取得
 */
export function getReviewPriorityColor(priority: ReviewPriority): string {
  const colors: Record<ReviewPriority, string> = {
    [ReviewPriority.LOW]: 'text-gray-500 bg-gray-50',
    [ReviewPriority.MEDIUM]: 'text-blue-500 bg-blue-50',
    [ReviewPriority.HIGH]: 'text-orange-500 bg-orange-50',
    [ReviewPriority.URGENT]: 'text-red-500 bg-red-50',
  };
  return colors[priority] || '';
}

/**
 * レビューアクションのラベルを取得
 */
export function getReviewActionLabel(action: ReviewAction): string {
  const labels: Record<ReviewAction, string> = {
    [ReviewAction.CREATED]: 'レビュー作成',
    [ReviewAction.ASSIGNED]: 'レビュアー割当',
    [ReviewAction.COMMENTED]: 'コメント追加',
    [ReviewAction.APPROVED]: '承認',
    [ReviewAction.REJECTED]: '却下',
    [ReviewAction.REOPENED]: '再オープン',
    [ReviewAction.CANCELLED]: 'キャンセル',
    [ReviewAction.RESOLVED]: 'コメント解決',
  };
  return labels[action] || action;
}

/**
 * レビューアクションの色を取得
 */
export function getReviewActionColor(action: ReviewAction): string {
  const colors: Record<ReviewAction, string> = {
    [ReviewAction.CREATED]: 'text-blue-600',
    [ReviewAction.ASSIGNED]: 'text-purple-600',
    [ReviewAction.COMMENTED]: 'text-gray-600',
    [ReviewAction.APPROVED]: 'text-green-600',
    [ReviewAction.REJECTED]: 'text-red-600',
    [ReviewAction.REOPENED]: 'text-orange-600',
    [ReviewAction.CANCELLED]: 'text-gray-400',
    [ReviewAction.RESOLVED]: 'text-teal-600',
  };
  return colors[action] || '';
}

/**
 * 期限切れかどうかを判定
 */
export function isOverdue(dueDate: Date | string | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

/**
 * 残り日数を計算
 */
export function getDaysUntilDue(dueDate: Date | string | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 日時をフォーマット
 */
export function formatReviewDate(date: Date | string): string {
  return new Date(date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 相対時間を取得
 */
export function getRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return formatReviewDate(date);
}

/**
 * レビュー統計を計算
 */
export function calculateReviewStats(reviews: TestCaseReview[]): ReviewStats {
  const now = new Date();
  let totalReviewTime = 0;
  let completedCount = 0;

  const stats: ReviewStats = {
    total: reviews.length,
    pending: 0,
    inReview: 0,
    approved: 0,
    rejected: 0,
    overdue: 0,
  };

  for (const review of reviews) {
    switch (review.status) {
      case ReviewStatus.PENDING:
        stats.pending++;
        break;
      case ReviewStatus.IN_REVIEW:
        stats.inReview++;
        break;
      case ReviewStatus.APPROVED:
        stats.approved++;
        break;
      case ReviewStatus.REJECTED:
        stats.rejected++;
        break;
    }

    // 期限切れチェック
    if (
      review.dueDate &&
      new Date(review.dueDate) < now &&
      review.status !== ReviewStatus.APPROVED &&
      review.status !== ReviewStatus.REJECTED &&
      review.status !== ReviewStatus.CANCELLED
    ) {
      stats.overdue++;
    }

    // 平均レビュー時間計算
    if (review.reviewedAt) {
      const reviewTime =
        new Date(review.reviewedAt).getTime() - new Date(review.createdAt).getTime();
      totalReviewTime += reviewTime;
      completedCount++;
    }
  }

  if (completedCount > 0) {
    stats.avgReviewTime = totalReviewTime / completedCount / (1000 * 60 * 60); // 時間単位
  }

  return stats;
}

/**
 * レビューフィルターを適用
 */
export function filterReviews(reviews: TestCaseReview[], filter: ReviewFilter): TestCaseReview[] {
  return reviews.filter((review) => {
    if (filter.status && filter.status.length > 0) {
      if (!filter.status.includes(review.status)) return false;
    }
    if (filter.priority && filter.priority.length > 0) {
      if (!filter.priority.includes(review.priority)) return false;
    }
    if (filter.requesterId && review.requesterId !== filter.requesterId) {
      return false;
    }
    if (filter.reviewerId && review.reviewerId !== filter.reviewerId) {
      return false;
    }
    if (filter.testCaseId && review.testCaseId !== filter.testCaseId) {
      return false;
    }
    if (filter.fromDate) {
      if (new Date(review.createdAt) < new Date(filter.fromDate)) return false;
    }
    if (filter.toDate) {
      if (new Date(review.createdAt) > new Date(filter.toDate)) return false;
    }
    return true;
  });
}
