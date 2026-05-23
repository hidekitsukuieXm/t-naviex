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
