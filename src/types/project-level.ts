// プロジェクトレベルの型定義

// プロジェクトレベル制限
export interface ProjectLevelLimits {
  maxUsers?: number;
  maxTestCases?: number;
  maxTestRuns?: number;
  maxProjects?: number;
  maxStorageMb?: number;
  maxApiCallsPerDay?: number;
}

// 機能フラグ
export const PROJECT_LEVEL_FEATURES = [
  'ai_test_generation',
  'ai_review',
  'advanced_reporting',
  'custom_fields',
  'external_integrations',
  'audit_mode',
  'sso',
  'mfa',
  'api_access',
  'bulk_operations',
  'export_pdf',
  'export_excel',
] as const;

export type ProjectLevelFeature = (typeof PROJECT_LEVEL_FEATURES)[number];

// 機能フラグラベル
export const PROJECT_LEVEL_FEATURE_LABELS: Record<ProjectLevelFeature, string> = {
  ai_test_generation: 'AIテストケース生成',
  ai_review: 'AIレビュー',
  advanced_reporting: '高度なレポート機能',
  custom_fields: 'カスタムフィールド',
  external_integrations: '外部連携',
  audit_mode: '監査モード',
  sso: 'シングルサインオン',
  mfa: '多要素認証',
  api_access: 'API アクセス',
  bulk_operations: '一括操作',
  export_pdf: 'PDFエクスポート',
  export_excel: 'Excelエクスポート',
};

// プロジェクトレベル基本情報
export interface ProjectLevel {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  features: ProjectLevelFeature[];
  limits: ProjectLevelLimits;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// プロジェクトレベル作成用データ
export interface CreateProjectLevelData {
  name: string;
  displayName: string;
  description?: string | null;
  features?: ProjectLevelFeature[];
  limits?: ProjectLevelLimits;
  isDefault?: boolean;
  sortOrder?: number;
}

// プロジェクトレベル更新用データ
export interface UpdateProjectLevelData {
  name?: string;
  displayName?: string;
  description?: string | null;
  features?: ProjectLevelFeature[];
  limits?: ProjectLevelLimits;
  isDefault?: boolean;
  sortOrder?: number;
}

// プロジェクトレベル一覧レスポンス
export interface ProjectLevelListResponse {
  levels: ProjectLevel[];
  total: number;
}

// デフォルトのプロジェクトレベル
export const DEFAULT_PROJECT_LEVELS: Record<
  string,
  Omit<ProjectLevel, 'id' | 'createdAt' | 'updatedAt'>
> = {
  FREE: {
    name: 'FREE',
    displayName: 'フリー',
    description: '基本機能のみ利用可能な無料プラン',
    features: ['export_excel'],
    limits: {
      maxUsers: 3,
      maxTestCases: 100,
      maxTestRuns: 10,
      maxProjects: 1,
      maxStorageMb: 100,
    },
    isDefault: true,
    sortOrder: 0,
  },
  STANDARD: {
    name: 'STANDARD',
    displayName: 'スタンダード',
    description: '中小規模チーム向けの標準プラン',
    features: ['custom_fields', 'bulk_operations', 'export_pdf', 'export_excel'],
    limits: {
      maxUsers: 10,
      maxTestCases: 1000,
      maxTestRuns: 100,
      maxProjects: 5,
      maxStorageMb: 1000,
    },
    isDefault: false,
    sortOrder: 1,
  },
  PROFESSIONAL: {
    name: 'PROFESSIONAL',
    displayName: 'プロフェッショナル',
    description: '高度な機能を利用可能なプロフェッショナルプラン',
    features: [
      'ai_test_generation',
      'ai_review',
      'advanced_reporting',
      'custom_fields',
      'external_integrations',
      'api_access',
      'bulk_operations',
      'export_pdf',
      'export_excel',
    ],
    limits: {
      maxUsers: 50,
      maxTestCases: 10000,
      maxTestRuns: 1000,
      maxProjects: 20,
      maxStorageMb: 10000,
      maxApiCallsPerDay: 10000,
    },
    isDefault: false,
    sortOrder: 2,
  },
  ENTERPRISE: {
    name: 'ENTERPRISE',
    displayName: 'エンタープライズ',
    description: '全機能が利用可能なエンタープライズプラン',
    features: [
      'ai_test_generation',
      'ai_review',
      'advanced_reporting',
      'custom_fields',
      'external_integrations',
      'audit_mode',
      'sso',
      'mfa',
      'api_access',
      'bulk_operations',
      'export_pdf',
      'export_excel',
    ],
    limits: {}, // 無制限
    isDefault: false,
    sortOrder: 3,
  },
};

// バリデーション
export function validateProjectLevel(data: CreateProjectLevelData | UpdateProjectLevelData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if ('name' in data && data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      errors.push('レベル名は必須です。');
    } else if (data.name.length > 100) {
      errors.push('レベル名は100文字以内で入力してください。');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(data.name)) {
      errors.push('レベル名は英数字、アンダースコア、ハイフンのみ使用できます。');
    }
  }

  if ('displayName' in data && data.displayName !== undefined) {
    if (!data.displayName || data.displayName.trim().length === 0) {
      errors.push('表示名は必須です。');
    } else if (data.displayName.length > 255) {
      errors.push('表示名は255文字以内で入力してください。');
    }
  }

  if (data.features !== undefined) {
    for (const feature of data.features) {
      if (!PROJECT_LEVEL_FEATURES.includes(feature)) {
        errors.push(`無効な機能フラグです: ${feature}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
