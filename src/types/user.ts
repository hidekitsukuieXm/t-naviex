// ユーザーステータス
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';

// ユーザー基本情報（APIレスポンス用）
export interface User {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  emailVerified: string | null;
  image: string | null;
  mfaEnabled: boolean;
  mfaType: string | null;
  createdAt: string;
  updatedAt: string;
}

// ユーザー詳細情報（管理者用）
export interface UserDetail extends User {
  _count?: {
    projectMembers: number;
    userGroups: number;
  };
}

// ユーザー作成用データ
export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  status?: UserStatus;
}

// ユーザー更新用データ
export interface UpdateUserData {
  email?: string;
  name?: string;
  password?: string;
  status?: UserStatus;
  image?: string | null;
  mfaEnabled?: boolean;
  mfaType?: string | null;
}

// パスワード変更用データ
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// ユーザー検索パラメータ
export interface UserSearchParams {
  query?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ユーザー一覧レスポンス
export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ユーザーステータスラベル
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: '有効',
  INACTIVE: '無効',
  SUSPENDED: '停止中',
  PENDING: '保留中',
};

// パスワードバリデーション
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;

// パスワードバリデーションルール
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`パスワードは${PASSWORD_MAX_LENGTH}文字以内で入力してください。`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('パスワードには大文字を含めてください。');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('パスワードには小文字を含めてください。');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('パスワードには数字を含めてください。');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
