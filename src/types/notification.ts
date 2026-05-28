/**
 * 通知の型定義
 */

// 通知設定タイプ
export type NotificationSettingType =
  | 'TEST_ASSIGNED'
  | 'TEST_COMPLETED'
  | 'BUG_REPORTED'
  | 'BUG_ASSIGNED'
  | 'BUG_UPDATED'
  | 'BUG_RESOLVED'
  | 'REVIEW_REQUEST'
  | 'MILESTONE_REMINDER'
  | 'DAILY_DIGEST';

// ユーザー通知設定
export interface UserNotificationSettings {
  id: string;
  userId: string;
  notificationType: NotificationSettingType;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ユーザー通知設定の一覧
export interface UserNotificationSettingsList {
  settings: UserNotificationSettings[];
}

// ユーザー通知設定更新用
export interface UpdateUserNotificationSettingsInput {
  notificationType: NotificationSettingType;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
}

// 通知設定タイプのラベル
export const NOTIFICATION_TYPE_LABELS: Record<NotificationSettingType, string> = {
  TEST_ASSIGNED: 'テスト割当',
  TEST_COMPLETED: 'テスト完了',
  BUG_REPORTED: 'バグ報告',
  BUG_ASSIGNED: 'バグ割当',
  BUG_UPDATED: 'バグ更新',
  BUG_RESOLVED: 'バグ解決',
  REVIEW_REQUEST: 'レビュー依頼',
  MILESTONE_REMINDER: 'マイルストーンリマインダー',
  DAILY_DIGEST: '日次ダイジェスト',
};

// 通知設定タイプの説明
export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<NotificationSettingType, string> = {
  TEST_ASSIGNED: 'テストケースが割り当てられた際に通知を受け取る',
  TEST_COMPLETED: 'テストランが完了した際に通知を受け取る',
  BUG_REPORTED: '新しいバグが報告された際に通知を受け取る',
  BUG_ASSIGNED: 'バグが割り当てられた際に通知を受け取る',
  BUG_UPDATED: '担当バグが更新された際に通知を受け取る',
  BUG_RESOLVED: '報告したバグが解決された際に通知を受け取る',
  REVIEW_REQUEST: 'レビュー依頼を受け取った際に通知を受け取る',
  MILESTONE_REMINDER: 'マイルストーンの期限が近づいた際に通知を受け取る',
  DAILY_DIGEST: '日次の進捗サマリーメールを受け取る',
};

// デフォルトの通知設定
export const DEFAULT_NOTIFICATION_SETTINGS: Record<
  NotificationSettingType,
  { emailEnabled: boolean; inAppEnabled: boolean }
> = {
  TEST_ASSIGNED: { emailEnabled: true, inAppEnabled: true },
  TEST_COMPLETED: { emailEnabled: true, inAppEnabled: true },
  BUG_REPORTED: { emailEnabled: true, inAppEnabled: true },
  BUG_ASSIGNED: { emailEnabled: true, inAppEnabled: true },
  BUG_UPDATED: { emailEnabled: false, inAppEnabled: true },
  BUG_RESOLVED: { emailEnabled: true, inAppEnabled: true },
  REVIEW_REQUEST: { emailEnabled: true, inAppEnabled: true },
  MILESTONE_REMINDER: { emailEnabled: true, inAppEnabled: true },
  DAILY_DIGEST: { emailEnabled: false, inAppEnabled: false },
};

// メールキューステータス
export type EmailQueueStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

// メールキュー項目
export interface EmailQueueItem {
  id: string;
  templateId: string | null;
  toEmail: string;
  toName: string | null;
  subject: string;
  body: string;
  variables: Record<string, unknown> | null;
  status: EmailQueueStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// メール送信リクエスト
export interface SendEmailRequest {
  templateId?: string;
  templateType?: string;
  toEmail: string;
  toName?: string;
  subject?: string;
  body?: string;
  variables?: Record<string, string | number | boolean | null | undefined>;
  priority?: number;
  scheduledAt?: string;
}

// メール送信レスポンス
export interface SendEmailResponse {
  success: boolean;
  queueId?: string;
  message: string;
}

// バッチメール送信リクエスト
export interface BatchSendEmailRequest {
  templateId?: string;
  templateType?: string;
  recipients: Array<{
    toEmail: string;
    toName?: string;
    variables?: Record<string, string | number | boolean | null | undefined>;
  }>;
  subject?: string;
  body?: string;
  priority?: number;
  scheduledAt?: string;
}

// バッチメール送信レスポンス
export interface BatchSendEmailResponse {
  success: boolean;
  queued: number;
  failed: number;
  queueIds: string[];
  message: string;
}

// 通知送信リクエスト
export interface SendNotificationRequest {
  type: NotificationSettingType;
  userId: string;
  variables: Record<string, string | number | boolean | null | undefined>;
  projectId?: string;
}

// 通知送信レスポンス
export interface SendNotificationResponse {
  success: boolean;
  emailSent: boolean;
  inAppSent: boolean;
  message: string;
}

// メール送信ログ
export interface EmailSendLog {
  id: string;
  queueId: string | null;
  templateId: string | null;
  toEmail: string;
  subject: string;
  success: boolean;
  errorMessage: string | null;
  messageId: string | null;
  sentAt: string;
}

// メール送信ログ検索パラメータ
export interface EmailSendLogSearchParams {
  toEmail?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// メール送信ログ一覧レスポンス
export interface EmailSendLogListResponse {
  logs: EmailSendLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
