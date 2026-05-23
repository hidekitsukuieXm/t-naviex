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
