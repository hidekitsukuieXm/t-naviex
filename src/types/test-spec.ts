// テスト仕様書ステータス
export type TestSpecStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ARCHIVED';

// テスト仕様書
export interface TestSpec {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: TestSpecStatus;
  version: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    versions: number;
  };
}

// テスト仕様書バージョン
export interface TestSpecVersion {
  id: string;
  testSpecId: string;
  version: string;
  changeNote: string | null;
  createdBy: string | null;
  createdAt: string;
}

// テスト仕様書詳細（バージョン履歴付き）
export interface TestSpecDetail extends TestSpec {
  versions: TestSpecVersion[];
  project?: {
    id: string;
    name: string;
  };
}

// テスト仕様書作成用データ
export interface CreateTestSpecInput {
  projectId: string;
  name: string;
  description?: string | null;
  status?: TestSpecStatus;
}

// テスト仕様書更新用データ
export interface UpdateTestSpecInput {
  name?: string;
  description?: string | null;
  status?: TestSpecStatus;
  isLocked?: boolean;
}

// テスト仕様書バージョン作成用データ
export interface CreateTestSpecVersionInput {
  version: string;
  changeNote?: string | null;
  createdBy?: string | null;
}

// テスト仕様書検索パラメータ
export interface TestSpecSearchParams {
  projectId?: string;
  query?: string;
  status?: TestSpecStatus;
  isLocked?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'status' | 'version';
  sortOrder?: 'asc' | 'desc';
}

// テスト仕様書一覧レスポンス
export interface TestSpecListResponse {
  testSpecs: TestSpec[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ステータスラベル
export const TEST_SPEC_STATUS_LABELS: Record<TestSpecStatus, string> = {
  DRAFT: '下書き',
  REVIEW: 'レビュー中',
  APPROVED: '承認済み',
  ARCHIVED: 'アーカイブ',
};

// 有効なステータスリスト
export const VALID_TEST_SPEC_STATUSES: TestSpecStatus[] = [
  'DRAFT',
  'REVIEW',
  'APPROVED',
  'ARCHIVED',
];

// テスト仕様書名バリデーション
export function validateTestSpecName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'テスト仕様書名は必須です。' };
  }

  if (name.length > 255) {
    return { valid: false, error: 'テスト仕様書名は255文字以内で入力してください。' };
  }

  return { valid: true };
}

// バージョン形式バリデーション
export function validateVersion(version: string): { valid: boolean; error?: string } {
  if (!version || version.trim().length === 0) {
    return { valid: false, error: 'バージョンは必須です。' };
  }

  if (version.length > 50) {
    return { valid: false, error: 'バージョンは50文字以内で入力してください。' };
  }

  // セマンティックバージョニング形式または任意の形式を許可
  const versionRegex = /^[\w.-]+$/;
  if (!versionRegex.test(version)) {
    return {
      valid: false,
      error: 'バージョンには英数字、ドット、ハイフン、アンダースコアのみ使用できます。',
    };
  }

  return { valid: true };
}

// テスト仕様書バリデーション
export function validateTestSpec(data: {
  name?: string;
  description?: string | null;
  status?: string;
  projectId?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 名前のバリデーション
  if (data.name !== undefined) {
    const nameValidation = validateTestSpecName(data.name);
    if (!nameValidation.valid && nameValidation.error) {
      errors.push(nameValidation.error);
    }
  }

  // 説明のバリデーション
  if (data.description !== undefined && data.description !== null) {
    if (data.description.length > 10000) {
      errors.push('説明は10000文字以内で入力してください。');
    }
  }

  // ステータスのバリデーション
  if (data.status !== undefined) {
    if (!VALID_TEST_SPEC_STATUSES.includes(data.status as TestSpecStatus)) {
      errors.push('無効なステータスです。');
    }
  }

  // プロジェクトIDのバリデーション
  if (data.projectId !== undefined) {
    if (!data.projectId || data.projectId.trim().length === 0) {
      errors.push('プロジェクトIDは必須です。');
    }
  }

  return { valid: errors.length === 0, errors };
}

// バージョン作成バリデーション
export function validateTestSpecVersion(data: { version?: string; changeNote?: string | null }): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // バージョンのバリデーション
  if (data.version !== undefined) {
    const versionValidation = validateVersion(data.version);
    if (!versionValidation.valid && versionValidation.error) {
      errors.push(versionValidation.error);
    }
  }

  // 変更内容のバリデーション
  if (data.changeNote !== undefined && data.changeNote !== null) {
    if (data.changeNote.length > 5000) {
      errors.push('変更内容は5000文字以内で入力してください。');
    }
  }

  return { valid: errors.length === 0, errors };
}

// バージョン比較（セマンティックバージョニング風）
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

// 次のマイナーバージョンを計算
export function incrementMinorVersion(version: string): string {
  const parts = version.split('.');
  if (parts.length < 2) {
    return `${version}.1`;
  }

  const minor = parseInt(parts[1], 10) || 0;
  parts[1] = (minor + 1).toString();

  // パッチバージョンがあればリセット
  if (parts.length > 2) {
    parts[2] = '0';
  }

  return parts.join('.');
}

// 次のパッチバージョンを計算
export function incrementPatchVersion(version: string): string {
  const parts = version.split('.');
  if (parts.length < 3) {
    return `${version}.0.1`;
  }

  const patch = parseInt(parts[2], 10) || 0;
  parts[2] = (patch + 1).toString();

  return parts.join('.');
}
