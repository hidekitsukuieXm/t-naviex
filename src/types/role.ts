// 権限アクション
export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

// リソースタイプ
export type ResourceType =
  | 'projects'
  | 'users'
  | 'roles'
  | 'testCases'
  | 'testRuns'
  | 'testResults'
  | 'bugs'
  | 'reports'
  | 'settings';

// 権限定義（リソースごとのアクション配列）
export type Permissions = {
  [key in ResourceType]?: PermissionAction[];
};

// ロール基本情報
export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  permissions: Permissions;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

// ロール作成用データ
export interface CreateRoleData {
  name: string;
  displayName: string;
  description?: string;
  permissions: Permissions;
}

// ロール更新用データ
export interface UpdateRoleData {
  name?: string;
  displayName?: string;
  description?: string | null;
  permissions?: Permissions;
}

// ロール一覧レスポンス
export interface RoleListResponse {
  roles: Role[];
  total: number;
}

// システムロール名（削除・名前変更不可）
export const SYSTEM_ROLE_NAMES = ['SYSTEM_ADMIN', 'PROJECT_ADMIN', 'MEMBER', 'GUEST'] as const;

export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[number];

// デフォルトロール定義
export const DEFAULT_ROLES: Record<
  SystemRoleName,
  { displayName: string; description: string; permissions: Permissions }
> = {
  SYSTEM_ADMIN: {
    displayName: 'システム管理者',
    description: 'システム全体の管理権限を持つロール',
    permissions: {
      projects: ['create', 'read', 'update', 'delete'],
      users: ['create', 'read', 'update', 'delete'],
      roles: ['create', 'read', 'update', 'delete'],
      testCases: ['create', 'read', 'update', 'delete'],
      testRuns: ['create', 'read', 'update', 'delete'],
      testResults: ['create', 'read', 'update', 'delete'],
      bugs: ['create', 'read', 'update', 'delete'],
      reports: ['create', 'read', 'update', 'delete'],
      settings: ['read', 'update'],
    },
  },
  PROJECT_ADMIN: {
    displayName: 'プロジェクト管理者',
    description: 'プロジェクト内の管理権限を持つロール',
    permissions: {
      projects: ['read', 'update'],
      users: ['read'],
      roles: ['read'],
      testCases: ['create', 'read', 'update', 'delete'],
      testRuns: ['create', 'read', 'update', 'delete'],
      testResults: ['create', 'read', 'update', 'delete'],
      bugs: ['create', 'read', 'update', 'delete'],
      reports: ['create', 'read', 'update', 'delete'],
      settings: ['read'],
    },
  },
  MEMBER: {
    displayName: 'メンバー',
    description: 'プロジェクト内の通常メンバー',
    permissions: {
      projects: ['read'],
      users: ['read'],
      roles: ['read'],
      testCases: ['create', 'read', 'update'],
      testRuns: ['read', 'update'],
      testResults: ['create', 'read', 'update'],
      bugs: ['create', 'read', 'update'],
      reports: ['read'],
      settings: ['read'],
    },
  },
  GUEST: {
    displayName: 'ゲスト',
    description: '閲覧のみ可能なロール',
    permissions: {
      projects: ['read'],
      testCases: ['read'],
      testRuns: ['read'],
      testResults: ['read'],
      bugs: ['read'],
      reports: ['read'],
    },
  },
};

// ロール表示名ラベル
export const ROLE_DISPLAY_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: 'システム管理者',
  PROJECT_ADMIN: 'プロジェクト管理者',
  MEMBER: 'メンバー',
  GUEST: 'ゲスト',
};

// リソースタイプラベル
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  projects: 'プロジェクト',
  users: 'ユーザー',
  roles: 'ロール',
  testCases: 'テストケース',
  testRuns: 'テストラン',
  testResults: 'テスト結果',
  bugs: 'バグ',
  reports: 'レポート',
  settings: '設定',
};

// 権限アクションラベル
export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  create: '作成',
  read: '閲覧',
  update: '更新',
  delete: '削除',
};

// 権限チェック関数
export function hasPermission(
  permissions: Permissions,
  resource: ResourceType,
  action: PermissionAction
): boolean {
  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) {
    return false;
  }
  return resourcePermissions.includes(action);
}

// システムロールかどうかを判定
export function isSystemRole(roleName: string): boolean {
  return SYSTEM_ROLE_NAMES.includes(roleName as SystemRoleName);
}

// ロール名バリデーション
export function validateRoleName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'ロール名は必須です。' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'ロール名は100文字以内で入力してください。' };
  }

  // 英数字、アンダースコア、ハイフンのみ許可
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return {
      valid: false,
      error: 'ロール名は英数字、アンダースコア、ハイフンのみ使用できます。',
    };
  }

  return { valid: true };
}
