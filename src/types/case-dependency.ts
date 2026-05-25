/**
 * テストケース依存関係の型定義
 */

// ============================================
// 基本型定義
// ============================================

/**
 * テストケース依存関係タイプ
 */
export type CaseDependencyType = 'BLOCKS' | 'REQUIRES' | 'RELATED';

/**
 * 依存関係タイプのラベル
 */
export const CASE_DEPENDENCY_TYPE_LABELS: Record<CaseDependencyType, string> = {
  BLOCKS: 'ブロック',
  REQUIRES: '前提条件',
  RELATED: '関連',
};

/**
 * 依存関係タイプの説明
 */
export const CASE_DEPENDENCY_TYPE_DESCRIPTIONS: Record<CaseDependencyType, string> = {
  BLOCKS: 'このケースが完了するまで依存ケースはブロックされる',
  REQUIRES: '依存ケースが合格である必要がある',
  RELATED: '関連があるが実行順序には影響しない',
};

/**
 * 依存関係タイプの定数
 */
export const CASE_DEPENDENCY_TYPE = {
  BLOCKS: 'BLOCKS',
  REQUIRES: 'REQUIRES',
  RELATED: 'RELATED',
} as const;

/**
 * テストケース依存関係
 */
export interface CaseDependency {
  id: string;
  testCaseId: string;
  dependsOnId: string;
  dependencyType: CaseDependencyType;
  description: string | null;
  createdAt: string;
}

/**
 * テストケース依存関係（関連情報付き）
 */
export interface CaseDependencyWithRelations extends CaseDependency {
  dependsOn: {
    id: string;
    title: string;
    priority: string;
  };
}

// ============================================
// 入力・更新型定義
// ============================================

/**
 * 依存関係作成入力
 */
export interface CreateCaseDependencyInput {
  testCaseId: string;
  dependsOnId: string;
  dependencyType?: CaseDependencyType;
  description?: string | null;
}

/**
 * 依存関係更新入力
 */
export interface UpdateCaseDependencyInput {
  dependencyType?: CaseDependencyType;
  description?: string | null;
}
