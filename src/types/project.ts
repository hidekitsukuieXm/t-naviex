export type ProjectStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'PLANNING';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  projectType: string | null;
  targetVersion: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    projectMembers: number;
  };
}

export interface ProjectFormData {
  name: string;
  description: string;
  projectType: string;
  targetVersion: string;
  status: ProjectStatus;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: '進行中',
  INACTIVE: '休止中',
  ARCHIVED: 'アーカイブ',
  PLANNING: '計画中',
};

export const PROJECT_TYPE_OPTIONS = [
  { value: 'web', label: 'Webアプリケーション' },
  { value: 'mobile', label: 'モバイルアプリ' },
  { value: 'api', label: 'API/バックエンド' },
  { value: 'embedded', label: '組み込みシステム' },
  { value: 'desktop', label: 'デスクトップアプリ' },
  { value: 'other', label: 'その他' },
];

// プロジェクトメンバー関連の型定義

export interface ProjectMemberUser {
  id: string;
  name: string;
  email: string;
}

export interface ProjectMemberRole {
  id: string;
  name: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  user: ProjectMemberUser;
  role: ProjectMemberRole;
}

export interface AddMemberFormData {
  userId: string;
  roleId: string;
}

export interface UpdateMemberRoleFormData {
  roleId: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  status: string;
}

// プロジェクトコピー関連の型定義

export interface ProjectCopyOptions {
  newName: string;
  copyMembers: boolean;
  copyDescription: boolean;
  newStatus?: ProjectStatus;
}

export interface ProjectCopyResult {
  success: boolean;
  project: Project;
  copiedItems: {
    members: number;
  };
}

// プロジェクト詳細（メンバー数付き）
export interface ProjectDetail extends Project {
  _count: {
    projectMembers: number;
  };
}

// プロジェクト作成用データ（リポジトリ用）
export interface CreateProjectInput {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  projectType?: string | null;
  targetVersion?: string | null;
}

// プロジェクト更新用データ（リポジトリ用）
export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  projectType?: string | null;
  targetVersion?: string | null;
}

// プロジェクト検索パラメータ
export interface ProjectSearchParams {
  query?: string;
  status?: ProjectStatus;
  projectType?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// プロジェクト一覧レスポンス
export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 有効なステータスリスト
export const VALID_PROJECT_STATUSES: ProjectStatus[] = [
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
  'PLANNING',
];

// プロジェクト名バリデーション
export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'プロジェクト名は必須です。' };
  }

  if (name.length > 255) {
    return { valid: false, error: 'プロジェクト名は255文字以内で入力してください。' };
  }

  return { valid: true };
}

// プロジェクトバリデーション
export function validateProject(data: {
  name?: string;
  description?: string | null;
  status?: string;
  projectType?: string | null;
  targetVersion?: string | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 名前のバリデーション
  if (data.name !== undefined) {
    const nameValidation = validateProjectName(data.name);
    if (!nameValidation.valid && nameValidation.error) {
      errors.push(nameValidation.error);
    }
  }

  // 説明のバリデーション
  if (data.description !== undefined && data.description !== null) {
    if (data.description.length > 5000) {
      errors.push('説明は5000文字以内で入力してください。');
    }
  }

  // ステータスのバリデーション
  if (data.status !== undefined) {
    if (!VALID_PROJECT_STATUSES.includes(data.status as ProjectStatus)) {
      errors.push('無効なステータスです。');
    }
  }

  // プロジェクトタイプのバリデーション
  if (data.projectType !== undefined && data.projectType !== null) {
    if (data.projectType.length > 100) {
      errors.push('プロジェクトタイプは100文字以内で入力してください。');
    }
  }

  // ターゲットバージョンのバリデーション
  if (data.targetVersion !== undefined && data.targetVersion !== null) {
    if (data.targetVersion.length > 100) {
      errors.push('ターゲットバージョンは100文字以内で入力してください。');
    }
  }

  return { valid: errors.length === 0, errors };
}
