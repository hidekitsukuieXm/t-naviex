// セッション設定
export interface SessionSettings {
  id: string;
  sessionTimeoutMinutes: number;
  warningBeforeMinutes: number;
  extendOnActivity: boolean;
  maxConcurrentSessions: number;
  createdAt: string;
  updatedAt: string;
}

// セッション設定更新用データ
export interface UpdateSessionSettingsData {
  sessionTimeoutMinutes?: number;
  warningBeforeMinutes?: number;
  extendOnActivity?: boolean;
  maxConcurrentSessions?: number;
}

// デフォルトのセッション設定
export const DEFAULT_SESSION_SETTINGS: Omit<SessionSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  sessionTimeoutMinutes: 30,
  warningBeforeMinutes: 5,
  extendOnActivity: true,
  maxConcurrentSessions: 0,
};

// セッション設定のラベル
export const SESSION_SETTINGS_LABELS = {
  sessionTimeoutMinutes: 'セッションタイムアウト（分）',
  warningBeforeMinutes: 'タイムアウト警告時間（分）',
  extendOnActivity: 'アクティビティ時にセッション延長',
  maxConcurrentSessions: '同時セッション数上限',
} as const;

// セッション設定の説明
export const SESSION_SETTINGS_DESCRIPTIONS = {
  sessionTimeoutMinutes:
    'ユーザーが非アクティブ状態の場合、この時間経過後に自動ログアウトします（1〜480分）',
  warningBeforeMinutes: 'タイムアウト前にこの時間だけ警告を表示します（1〜30分）',
  extendOnActivity: 'ユーザーの操作（クリック、入力等）があった場合、セッションを自動延長します',
  maxConcurrentSessions: '同一ユーザーの同時ログイン数を制限します。0の場合は無制限',
} as const;

// セッション設定のバリデーション
export function validateSessionSettings(settings: UpdateSessionSettingsData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (settings.sessionTimeoutMinutes !== undefined) {
    if (settings.sessionTimeoutMinutes < 1 || settings.sessionTimeoutMinutes > 480) {
      errors.push('セッションタイムアウトは1〜480分の範囲で設定してください。');
    }
  }

  if (settings.warningBeforeMinutes !== undefined) {
    if (settings.warningBeforeMinutes < 1 || settings.warningBeforeMinutes > 30) {
      errors.push('タイムアウト警告時間は1〜30分の範囲で設定してください。');
    }
  }

  if (settings.sessionTimeoutMinutes !== undefined && settings.warningBeforeMinutes !== undefined) {
    if (settings.warningBeforeMinutes >= settings.sessionTimeoutMinutes) {
      errors.push('警告時間はタイムアウト時間より短く設定してください。');
    }
  }

  if (settings.maxConcurrentSessions !== undefined) {
    if (settings.maxConcurrentSessions < 0 || settings.maxConcurrentSessions > 10) {
      errors.push('同時セッション数上限は0〜10の範囲で設定してください。');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// セッションタイムアウト警告の状態
export type SessionWarningState = 'active' | 'warning' | 'expired';

// セッションタイムアウト警告のコンテキスト
export interface SessionTimeoutContext {
  state: SessionWarningState;
  remainingSeconds: number;
  sessionTimeoutMinutes: number;
  warningBeforeMinutes: number;
  extendSession: () => void;
  logout: () => void;
}
