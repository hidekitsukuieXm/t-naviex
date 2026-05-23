// パスワードポリシー設定
export interface PasswordPolicy {
  id: string;
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
  preventReuse: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

// パスワードポリシー更新用データ
export interface UpdatePasswordPolicyData {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  expirationDays?: number;
  preventReuse?: number;
  maxLoginAttempts?: number;
  lockoutDurationMinutes?: number;
}

// アカウントロック情報
export interface AccountLockout {
  id: string;
  userId: string;
  failedAttempts: number;
  lastFailedAt: string | null;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

// デフォルトのパスワードポリシー設定
export const DEFAULT_PASSWORD_POLICY: Omit<PasswordPolicy, 'id' | 'createdAt' | 'updatedAt'> = {
  minLength: 8,
  maxLength: 100,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  expirationDays: 0,
  preventReuse: 0,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
};

// パスワードポリシーのラベル
export const PASSWORD_POLICY_LABELS = {
  minLength: '最小文字数',
  maxLength: '最大文字数',
  requireUppercase: '大文字を必須にする',
  requireLowercase: '小文字を必須にする',
  requireNumbers: '数字を必須にする',
  requireSpecialChars: '特殊文字を必須にする',
  expirationDays: 'パスワード有効期間（日）',
  preventReuse: '過去のパスワード再利用禁止回数',
  maxLoginAttempts: '最大ログイン試行回数',
  lockoutDurationMinutes: 'ロック期間（分）',
} as const;

// パスワードポリシーの説明
export const PASSWORD_POLICY_DESCRIPTIONS = {
  minLength: 'パスワードの最小文字数を設定します（1〜50文字）',
  maxLength: 'パスワードの最大文字数を設定します（50〜200文字）',
  requireUppercase: '大文字（A-Z）を1文字以上必須にします',
  requireLowercase: '小文字（a-z）を1文字以上必須にします',
  requireNumbers: '数字（0-9）を1文字以上必須にします',
  requireSpecialChars: '特殊文字（!@#$%^&*など）を1文字以上必須にします',
  expirationDays: 'パスワードの有効期間を設定します。0の場合は無期限',
  preventReuse: '過去に使用したパスワードの再利用を禁止する回数。0の場合はチェックしない',
  maxLoginAttempts: 'この回数連続でログインに失敗するとアカウントがロックされます',
  lockoutDurationMinutes: 'アカウントロック後、自動解除されるまでの時間（分）',
} as const;

// パスワードポリシーに基づくパスワードバリデーション
export function validatePasswordWithPolicy(
  password: string,
  policy: Omit<PasswordPolicy, 'id' | 'createdAt' | 'updatedAt'>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`パスワードは${policy.minLength}文字以上で入力してください。`);
  }

  if (password.length > policy.maxLength) {
    errors.push(`パスワードは${policy.maxLength}文字以内で入力してください。`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('パスワードには大文字を含めてください。');
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('パスワードには小文字を含めてください。');
  }

  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('パスワードには数字を含めてください。');
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('パスワードには特殊文字（!@#$%^&*など）を含めてください。');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// パスワードポリシー設定のバリデーション
export function validatePasswordPolicySettings(policy: UpdatePasswordPolicyData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (policy.minLength !== undefined) {
    if (policy.minLength < 1 || policy.minLength > 50) {
      errors.push('最小文字数は1〜50の範囲で設定してください。');
    }
  }

  if (policy.maxLength !== undefined) {
    if (policy.maxLength < 50 || policy.maxLength > 200) {
      errors.push('最大文字数は50〜200の範囲で設定してください。');
    }
  }

  if (policy.minLength !== undefined && policy.maxLength !== undefined) {
    if (policy.minLength > policy.maxLength) {
      errors.push('最小文字数は最大文字数以下にしてください。');
    }
  }

  if (policy.expirationDays !== undefined) {
    if (policy.expirationDays < 0 || policy.expirationDays > 365) {
      errors.push('パスワード有効期間は0〜365日の範囲で設定してください。');
    }
  }

  if (policy.preventReuse !== undefined) {
    if (policy.preventReuse < 0 || policy.preventReuse > 24) {
      errors.push('過去のパスワード再利用禁止回数は0〜24の範囲で設定してください。');
    }
  }

  if (policy.maxLoginAttempts !== undefined) {
    if (policy.maxLoginAttempts < 1 || policy.maxLoginAttempts > 10) {
      errors.push('最大ログイン試行回数は1〜10の範囲で設定してください。');
    }
  }

  if (policy.lockoutDurationMinutes !== undefined) {
    if (policy.lockoutDurationMinutes < 1 || policy.lockoutDurationMinutes > 1440) {
      errors.push('ロック期間は1〜1440分（24時間）の範囲で設定してください。');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
