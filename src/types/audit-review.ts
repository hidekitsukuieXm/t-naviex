// 監査（再鑑）モードの型定義

// 監査レビューステータス
export type AuditReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// 監査レビューステータスラベル
export const AUDIT_REVIEW_STATUS_LABELS: Record<AuditReviewStatus, string> = {
  PENDING: 'レビュー待ち',
  APPROVED: '承認済み',
  REJECTED: '却下',
};

// 監査レビューステータス色
export const AUDIT_REVIEW_STATUS_COLORS: Record<AuditReviewStatus, string> = {
  PENDING: 'yellow',
  APPROVED: 'green',
  REJECTED: 'red',
};

// テストラン監査レビュー
export interface TestRunAuditReview {
  id: string;
  testRunId: string;
  requesterId: string;
  requesterName?: string;
  requesterEmail?: string;
  reviewerId: string | null;
  reviewerName?: string;
  reviewerEmail?: string;
  status: AuditReviewStatus;
  comment: string | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 監査レビュー作成用データ
export interface CreateAuditReviewData {
  testRunId: string;
  reviewerId?: string | null;
  comment?: string | null;
}

// 監査レビュー更新用データ（レビュアー操作）
export interface ReviewAuditData {
  status: 'APPROVED' | 'REJECTED';
  reviewComment?: string | null;
}

// 監査レビュー一覧レスポンス
export interface AuditReviewListResponse {
  reviews: TestRunAuditReview[];
  total: number;
}

// 監査モード設定
export interface AuditModeSettings {
  enabled: boolean;
  requireReviewForStatus?: string[]; // レビュー必須のテスト結果ステータス
  autoAssignReviewer?: boolean;
  notifyOnRequest?: boolean;
  notifyOnReview?: boolean;
}

// デフォルトの監査モード設定
export const DEFAULT_AUDIT_MODE_SETTINGS: AuditModeSettings = {
  enabled: false,
  requireReviewForStatus: ['FAILED', 'BLOCKED'],
  autoAssignReviewer: false,
  notifyOnRequest: true,
  notifyOnReview: true,
};

// バリデーション
export function validateAuditReview(data: CreateAuditReviewData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.testRunId) {
    errors.push('テストランIDは必須です。');
  }

  if (data.comment !== undefined && data.comment !== null && data.comment.length > 5000) {
    errors.push('コメントは5000文字以内で入力してください。');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateReviewResponse(data: ReviewAuditData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.status || !['APPROVED', 'REJECTED'].includes(data.status)) {
    errors.push('ステータスは APPROVED または REJECTED を指定してください。');
  }

  if (
    data.reviewComment !== undefined &&
    data.reviewComment !== null &&
    data.reviewComment.length > 5000
  ) {
    errors.push('レビューコメントは5000文字以内で入力してください。');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
