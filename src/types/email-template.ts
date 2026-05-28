/**
 * メールテンプレートの型定義
 */

// メールテンプレートタイプ
export type EmailTemplateType =
  | 'WELCOME'
  | 'PASSWORD_RESET'
  | 'TEST_ASSIGNED'
  | 'TEST_COMPLETED'
  | 'BUG_REPORTED'
  | 'BUG_ASSIGNED'
  | 'BUG_UPDATED'
  | 'BUG_RESOLVED'
  | 'REVIEW_REQUEST'
  | 'MILESTONE_REMINDER'
  | 'DAILY_DIGEST'
  | 'CUSTOM';

// メールテンプレート
export interface EmailTemplate {
  id: string;
  name: string;
  type: EmailTemplateType;
  subject: string;
  body: string;
  variables: string[];
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// メールテンプレート作成用データ
export interface CreateEmailTemplateInput {
  name: string;
  type?: EmailTemplateType;
  subject: string;
  body: string;
  variables?: string[];
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

// メールテンプレート更新用データ
export interface UpdateEmailTemplateInput {
  name?: string;
  type?: EmailTemplateType;
  subject?: string;
  body?: string;
  variables?: string[];
  description?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
}

// メールテンプレート検索パラメータ
export interface EmailTemplateSearchParams {
  type?: EmailTemplateType;
  isActive?: boolean;
  query?: string;
  page?: number;
  limit?: number;
}

// メールテンプレート一覧レスポンス
export interface EmailTemplateListResponse {
  templates: EmailTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// テンプレートタイプのラベル
export const EMAIL_TEMPLATE_TYPE_LABELS: Record<EmailTemplateType, string> = {
  WELCOME: 'ウェルカムメール',
  PASSWORD_RESET: 'パスワードリセット',
  TEST_ASSIGNED: 'テスト割当通知',
  TEST_COMPLETED: 'テスト完了通知',
  BUG_REPORTED: 'バグ報告通知',
  BUG_ASSIGNED: 'バグ割当通知',
  BUG_UPDATED: 'バグ更新通知',
  BUG_RESOLVED: 'バグ解決通知',
  REVIEW_REQUEST: 'レビュー依頼',
  MILESTONE_REMINDER: 'マイルストーンリマインダー',
  DAILY_DIGEST: '日次ダイジェスト',
  CUSTOM: 'カスタム',
};

// テンプレートタイプの説明
export const EMAIL_TEMPLATE_TYPE_DESCRIPTIONS: Record<EmailTemplateType, string> = {
  WELCOME: '新規ユーザー登録時に送信されるウェルカムメール',
  PASSWORD_RESET: 'パスワードリセット要求時に送信されるメール',
  TEST_ASSIGNED: 'テストケースが割り当てられた際に担当者に送信',
  TEST_COMPLETED: 'テスト実施が完了した際に関係者に送信',
  BUG_REPORTED: '新しいバグが報告された際に関係者に送信',
  BUG_ASSIGNED: 'バグが割り当てられた際に担当者に送信',
  BUG_UPDATED: 'バグが更新された際に関係者に送信',
  BUG_RESOLVED: 'バグが解決された際に報告者に送信',
  REVIEW_REQUEST: 'レビュー依頼時に送信されるメール',
  MILESTONE_REMINDER: 'マイルストーンの期限が近づいた際に送信',
  DAILY_DIGEST: '日次進捗サマリーメール',
  CUSTOM: 'カスタムテンプレート',
};

// デフォルトの使用可能変数
export const DEFAULT_TEMPLATE_VARIABLES: Record<EmailTemplateType, string[]> = {
  WELCOME: ['userName', 'userEmail', 'loginUrl', 'appName'],
  PASSWORD_RESET: ['userName', 'resetLink', 'expiresIn', 'appName'],
  TEST_ASSIGNED: [
    'userName',
    'testCaseTitle',
    'testRunName',
    'projectName',
    'assignedBy',
    'dueDate',
    'testCaseUrl',
  ],
  TEST_COMPLETED: [
    'userName',
    'testRunName',
    'projectName',
    'totalCases',
    'passedCases',
    'failedCases',
    'passRate',
    'reportUrl',
  ],
  BUG_REPORTED: [
    'userName',
    'bugTitle',
    'bugId',
    'projectName',
    'reportedBy',
    'severity',
    'priority',
    'bugUrl',
  ],
  BUG_ASSIGNED: [
    'userName',
    'bugTitle',
    'bugId',
    'projectName',
    'assignedBy',
    'severity',
    'priority',
    'bugUrl',
  ],
  BUG_UPDATED: [
    'userName',
    'bugTitle',
    'bugId',
    'projectName',
    'updatedBy',
    'changedFields',
    'bugUrl',
  ],
  BUG_RESOLVED: [
    'userName',
    'bugTitle',
    'bugId',
    'projectName',
    'resolvedBy',
    'resolution',
    'bugUrl',
  ],
  REVIEW_REQUEST: [
    'userName',
    'itemType',
    'itemTitle',
    'projectName',
    'requestedBy',
    'dueDate',
    'reviewUrl',
  ],
  MILESTONE_REMINDER: [
    'userName',
    'milestoneName',
    'projectName',
    'dueDate',
    'daysRemaining',
    'progress',
    'milestoneUrl',
  ],
  DAILY_DIGEST: [
    'userName',
    'projectName',
    'date',
    'newBugs',
    'resolvedBugs',
    'testsExecuted',
    'testsPassed',
    'dashboardUrl',
  ],
  CUSTOM: [],
};

// バリデーションエラー
export interface EmailTemplateValidationError {
  field: string;
  message: string;
}

// メールテンプレートのバリデーション
export function validateEmailTemplate(
  template: CreateEmailTemplateInput | UpdateEmailTemplateInput
): {
  valid: boolean;
  errors: EmailTemplateValidationError[];
} {
  const errors: EmailTemplateValidationError[] = [];

  if ('name' in template && template.name !== undefined) {
    if (!template.name || template.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'テンプレート名を入力してください。' });
    } else if (template.name.length > 100) {
      errors.push({ field: 'name', message: 'テンプレート名は100文字以内で入力してください。' });
    } else if (!/^[a-zA-Z0-9_-]+$/.test(template.name)) {
      errors.push({
        field: 'name',
        message: 'テンプレート名は英数字、ハイフン、アンダースコアのみ使用できます。',
      });
    }
  }

  if ('subject' in template && template.subject !== undefined) {
    if (!template.subject || template.subject.trim().length === 0) {
      errors.push({ field: 'subject', message: '件名を入力してください。' });
    } else if (template.subject.length > 500) {
      errors.push({ field: 'subject', message: '件名は500文字以内で入力してください。' });
    }
  }

  if ('body' in template && template.body !== undefined) {
    if (!template.body || template.body.trim().length === 0) {
      errors.push({ field: 'body', message: '本文を入力してください。' });
    }
  }

  if (
    'description' in template &&
    template.description !== undefined &&
    template.description !== null
  ) {
    if (template.description.length > 500) {
      errors.push({ field: 'description', message: '説明は500文字以内で入力してください。' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// テンプレート変数を置換
export function substituteVariables(
  template: string,
  variables: Record<string, string | number | boolean | null | undefined>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value?.toString() ?? '');
  }

  return result;
}

// テンプレートから使用されている変数を抽出
export function extractVariables(template: string): string[] {
  const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

// デフォルトテンプレート（システムプリセット）
export const DEFAULT_TEMPLATES: Array<CreateEmailTemplateInput> = [
  {
    name: 'welcome-default',
    type: 'WELCOME',
    subject: '{{appName}}へようこそ',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h1>{{appName}}へようこそ！</h1>
  <p>{{userName}}様</p>
  <p>アカウントが正常に作成されました。</p>
  <p>以下のリンクからログインしてください：</p>
  <p><a href="{{loginUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">ログイン</a></p>
  <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
</body>
</html>`,
    variables: ['userName', 'userEmail', 'loginUrl', 'appName'],
    description: '新規ユーザー登録時のウェルカムメール',
    isDefault: true,
  },
  {
    name: 'password-reset-default',
    type: 'PASSWORD_RESET',
    subject: '【{{appName}}】パスワードリセットのご案内',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h1>パスワードリセット</h1>
  <p>{{userName}}様</p>
  <p>パスワードリセットのリクエストを受け付けました。</p>
  <p>以下のリンクからパスワードをリセットしてください：</p>
  <p><a href="{{resetLink}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">パスワードをリセット</a></p>
  <p>このリンクは{{expiresIn}}後に無効になります。</p>
  <p>このメールに心当たりがない場合は、無視してください。</p>
</body>
</html>`,
    variables: ['userName', 'resetLink', 'expiresIn', 'appName'],
    description: 'パスワードリセット要求時のメール',
    isDefault: true,
  },
  {
    name: 'test-assigned-default',
    type: 'TEST_ASSIGNED',
    subject: '【{{projectName}}】テストケースが割り当てられました',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h1>テストケース割当通知</h1>
  <p>{{userName}}様</p>
  <p>以下のテストケースが割り当てられました：</p>
  <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>プロジェクト</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{projectName}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>テストラン</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{testRunName}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>テストケース</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{testCaseTitle}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>割当者</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{assignedBy}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>期限</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{dueDate}}</td></tr>
  </table>
  <p><a href="{{testCaseUrl}}" style="background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">テストケースを確認</a></p>
</body>
</html>`,
    variables: [
      'userName',
      'testCaseTitle',
      'testRunName',
      'projectName',
      'assignedBy',
      'dueDate',
      'testCaseUrl',
    ],
    description: 'テストケース割当時の通知メール',
    isDefault: true,
  },
  {
    name: 'bug-reported-default',
    type: 'BUG_REPORTED',
    subject: '【{{projectName}}】新しいバグが報告されました: {{bugTitle}}',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h1>新規バグ報告</h1>
  <p>{{userName}}様</p>
  <p>新しいバグが報告されました：</p>
  <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>バグID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">#{{bugId}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>タイトル</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{bugTitle}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>プロジェクト</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{projectName}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>報告者</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{reportedBy}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>重大度</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{severity}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>優先度</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{priority}}</td></tr>
  </table>
  <p><a href="{{bugUrl}}" style="background-color: #EF4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">バグを確認</a></p>
</body>
</html>`,
    variables: [
      'userName',
      'bugTitle',
      'bugId',
      'projectName',
      'reportedBy',
      'severity',
      'priority',
      'bugUrl',
    ],
    description: 'バグ報告時の通知メール',
    isDefault: true,
  },
  {
    name: 'review-request-default',
    type: 'REVIEW_REQUEST',
    subject: '【{{projectName}}】レビュー依頼: {{itemTitle}}',
    body: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h1>レビュー依頼</h1>
  <p>{{userName}}様</p>
  <p>レビューをお願いします：</p>
  <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>種類</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{itemType}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>タイトル</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{itemTitle}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>プロジェクト</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{projectName}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>依頼者</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{requestedBy}}</td></tr>
    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>期限</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{dueDate}}</td></tr>
  </table>
  <p><a href="{{reviewUrl}}" style="background-color: #8B5CF6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">レビューする</a></p>
</body>
</html>`,
    variables: [
      'userName',
      'itemType',
      'itemTitle',
      'projectName',
      'requestedBy',
      'dueDate',
      'reviewUrl',
    ],
    description: 'レビュー依頼時のメール',
    isDefault: true,
  },
];
