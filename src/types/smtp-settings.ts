/**
 * SMTP設定の型定義
 */

// SMTP設定
export interface SmtpSettings {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  authEnabled: boolean;
  username: string | null;
  password: string | null; // マスク表示用（実際のパスワードは返さない）
  fromEmail: string;
  fromName: string | null;
  isEnabled: boolean;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  createdAt: string;
  updatedAt: string;
}

// SMTP設定作成・更新用データ
export interface UpdateSmtpSettingsInput {
  host?: string;
  port?: number;
  secure?: boolean;
  authEnabled?: boolean;
  username?: string | null;
  password?: string | null;
  fromEmail?: string;
  fromName?: string | null;
  isEnabled?: boolean;
}

// SMTP接続テスト結果
export interface SmtpTestResult {
  success: boolean;
  message: string;
  details?: {
    connectionTime?: number;
    tlsVersion?: string;
    authMethod?: string;
  };
}

// デフォルトのSMTP設定
export const DEFAULT_SMTP_SETTINGS: Omit<
  SmtpSettings,
  'id' | 'createdAt' | 'updatedAt' | 'lastTestedAt' | 'lastTestSuccess'
> = {
  host: '',
  port: 587,
  secure: false,
  authEnabled: true,
  username: null,
  password: null,
  fromEmail: '',
  fromName: null,
  isEnabled: false,
};

// SMTP設定のラベル
export const SMTP_SETTINGS_LABELS = {
  host: 'SMTPサーバー',
  port: 'ポート番号',
  secure: 'SSL/TLS',
  authEnabled: '認証を使用',
  username: 'ユーザー名',
  password: 'パスワード',
  fromEmail: '送信元メールアドレス',
  fromName: '送信者名',
  isEnabled: 'メール送信を有効化',
} as const;

// SMTP設定の説明
export const SMTP_SETTINGS_DESCRIPTIONS = {
  host: 'SMTPサーバーのホスト名（例: smtp.gmail.com）',
  port: 'SMTPサーバーのポート番号（通常: 587 for TLS, 465 for SSL, 25 for plain）',
  secure: '直接SSLを使用する場合はON（ポート465）、STARTTLSの場合はOFF（ポート587）',
  authEnabled: 'SMTP認証を使用する場合はON',
  username: 'SMTP認証に使用するユーザー名',
  password: 'SMTP認証に使用するパスワード',
  fromEmail: 'メールの送信元アドレス',
  fromName: 'メールの送信者名（空の場合はメールアドレスが使用されます）',
  isEnabled: 'メール送信機能を有効にするかどうか',
} as const;

// バリデーションエラー
export interface SmtpValidationError {
  field: string;
  message: string;
}

// SMTP設定のバリデーション
export function validateSmtpSettings(settings: UpdateSmtpSettingsInput): {
  valid: boolean;
  errors: SmtpValidationError[];
} {
  const errors: SmtpValidationError[] = [];

  if (settings.host !== undefined) {
    if (!settings.host || settings.host.trim().length === 0) {
      errors.push({ field: 'host', message: 'SMTPサーバーを入力してください。' });
    } else if (settings.host.length > 255) {
      errors.push({ field: 'host', message: 'SMTPサーバーは255文字以内で入力してください。' });
    }
  }

  if (settings.port !== undefined) {
    if (settings.port < 1 || settings.port > 65535) {
      errors.push({ field: 'port', message: 'ポート番号は1〜65535の範囲で入力してください。' });
    }
  }

  if (settings.fromEmail !== undefined) {
    if (!settings.fromEmail || settings.fromEmail.trim().length === 0) {
      errors.push({ field: 'fromEmail', message: '送信元メールアドレスを入力してください。' });
    } else if (!isValidEmail(settings.fromEmail)) {
      errors.push({ field: 'fromEmail', message: '有効なメールアドレスを入力してください。' });
    } else if (settings.fromEmail.length > 255) {
      errors.push({
        field: 'fromEmail',
        message: '送信元メールアドレスは255文字以内で入力してください。',
      });
    }
  }

  if (settings.fromName !== undefined && settings.fromName !== null) {
    if (settings.fromName.length > 255) {
      errors.push({ field: 'fromName', message: '送信者名は255文字以内で入力してください。' });
    }
  }

  if (settings.authEnabled && settings.username !== undefined) {
    if (settings.username && settings.username.length > 255) {
      errors.push({ field: 'username', message: 'ユーザー名は255文字以内で入力してください。' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// メールアドレスの検証
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// パスワードをマスクする
export function maskPassword(password: string | null): string | null {
  if (!password) return null;
  return '********';
}
