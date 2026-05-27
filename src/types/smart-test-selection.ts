/**
 * Smart Test Selection Types
 *
 * 変更影響範囲に基づくスマートテスト選択の型定義
 */

// ====================================
// Enums
// ====================================

/**
 * 変更タイプ
 */
export const ChangeType = {
  /** コード変更 */
  CODE: 'CODE',
  /** 設定変更 */
  CONFIG: 'CONFIG',
  /** データベース変更 */
  DATABASE: 'DATABASE',
  /** API変更 */
  API: 'API',
  /** UI変更 */
  UI: 'UI',
  /** インフラ変更 */
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  /** 依存関係変更 */
  DEPENDENCY: 'DEPENDENCY',
  /** ドキュメント変更 */
  DOCUMENTATION: 'DOCUMENTATION',
  /** その他 */
  OTHER: 'OTHER',
} as const;

export type ChangeType = (typeof ChangeType)[keyof typeof ChangeType];

/**
 * 変更の深刻度
 */
export const ChangeSeverity = {
  /** クリティカル */
  CRITICAL: 'CRITICAL',
  /** 高 */
  HIGH: 'HIGH',
  /** 中 */
  MEDIUM: 'MEDIUM',
  /** 低 */
  LOW: 'LOW',
} as const;

export type ChangeSeverity = (typeof ChangeSeverity)[keyof typeof ChangeSeverity];

/**
 * 影響スコープ
 */
export const ImpactScope = {
  /** 単一機能 */
  SINGLE_FEATURE: 'SINGLE_FEATURE',
  /** 複数機能 */
  MULTIPLE_FEATURES: 'MULTIPLE_FEATURES',
  /** モジュール全体 */
  MODULE: 'MODULE',
  /** システム全体 */
  SYSTEM_WIDE: 'SYSTEM_WIDE',
} as const;

export type ImpactScope = (typeof ImpactScope)[keyof typeof ImpactScope];

/**
 * 選択理由タイプ
 */
export const SelectionReasonType = {
  /** 直接影響 */
  DIRECT_IMPACT: 'DIRECT_IMPACT',
  /** 間接影響 */
  INDIRECT_IMPACT: 'INDIRECT_IMPACT',
  /** 回帰リスク */
  REGRESSION_RISK: 'REGRESSION_RISK',
  /** 過去の障害 */
  HISTORICAL_FAILURE: 'HISTORICAL_FAILURE',
  /** 関連機能 */
  RELATED_FEATURE: 'RELATED_FEATURE',
  /** 高優先度 */
  HIGH_PRIORITY: 'HIGH_PRIORITY',
  /** 要件カバレッジ */
  REQUIREMENT_COVERAGE: 'REQUIREMENT_COVERAGE',
  /** リスクベース */
  RISK_BASED: 'RISK_BASED',
} as const;

export type SelectionReasonType = (typeof SelectionReasonType)[keyof typeof SelectionReasonType];

/**
 * 選択ステータス
 */
export const SelectionStatus = {
  /** 推奨 */
  RECOMMENDED: 'RECOMMENDED',
  /** オプション */
  OPTIONAL: 'OPTIONAL',
  /** 除外 */
  EXCLUDED: 'EXCLUDED',
  /** 手動選択 */
  MANUALLY_SELECTED: 'MANUALLY_SELECTED',
} as const;

export type SelectionStatus = (typeof SelectionStatus)[keyof typeof SelectionStatus];

// ====================================
// Core Types
// ====================================

/**
 * 変更項目
 */
export interface ChangeItem {
  id: string;
  type: ChangeType;
  name: string;
  description?: string;
  path?: string;
  severity: ChangeSeverity;
  affectedModules: string[];
  affectedFeatures: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 変更セット
 */
export interface ChangeSet {
  id: string;
  name: string;
  description?: string;
  changes: ChangeItem[];
  scope: ImpactScope;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 影響分析結果
 */
export interface ImpactAnalysis {
  changeSetId: string;
  analyzedAt: Date;
  affectedModules: AffectedModule[];
  affectedFeatures: AffectedFeature[];
  affectedRequirements: AffectedRequirement[];
  riskScore: number;
  summary: string;
}

/**
 * 影響を受けるモジュール
 */
export interface AffectedModule {
  moduleId: string;
  moduleName: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  directlyAffected: boolean;
  relatedChanges: string[];
}

/**
 * 影響を受ける機能
 */
export interface AffectedFeature {
  featureId: string;
  featureName: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  directlyAffected: boolean;
  relatedChanges: string[];
}

/**
 * 影響を受ける要件
 */
export interface AffectedRequirement {
  requirementId: string;
  requirementName: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  relatedChanges: string[];
}

/**
 * 選択理由
 */
export interface SelectionReason {
  type: SelectionReasonType;
  description: string;
  confidence: number;
  relatedChanges?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * テストケース選択結果
 */
export interface TestCaseSelection {
  testCaseId: string;
  testCaseName: string;
  testSpecId?: string;
  testSpecName?: string;
  status: SelectionStatus;
  priorityScore: number;
  reasons: SelectionReason[];
  estimatedDuration?: number;
  lastExecutedAt?: Date;
  lastResult?: 'PASSED' | 'FAILED' | 'SKIPPED';
  historicalFailureRate?: number;
}

/**
 * 推奨テストセット
 */
export interface RecommendedTestSet {
  id: string;
  name: string;
  description?: string;
  changeSetId: string;
  analysisId: string;
  selections: TestCaseSelection[];
  totalTestCases: number;
  estimatedTotalDuration: number;
  coveragePercentage: number;
  riskCoverage: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 選択サマリー
 */
export interface SelectionSummary {
  totalTestCases: number;
  recommendedCount: number;
  optionalCount: number;
  excludedCount: number;
  manuallySelectedCount: number;
  estimatedTotalDuration: number;
  coverageByReason: Record<SelectionReasonType, number>;
  riskScore: number;
}

// ====================================
// API Types
// ====================================

/**
 * 変更セット作成リクエスト
 */
export interface CreateChangeSetRequest {
  name: string;
  description?: string;
  changes: Omit<ChangeItem, 'id'>[];
  scope?: ImpactScope;
  metadata?: Record<string, unknown>;
}

/**
 * 影響分析リクエスト
 */
export interface AnalyzeImpactRequest {
  changeSetId: string;
  options?: {
    includeIndirectImpact?: boolean;
    maxDepth?: number;
    includeHistoricalData?: boolean;
  };
}

/**
 * テスト選択リクエスト
 */
export interface SelectTestsRequest {
  changeSetId: string;
  analysisId?: string;
  options?: {
    maxTestCases?: number;
    minPriorityScore?: number;
    includeOptional?: boolean;
    timeLimit?: number;
    prioritizeByRisk?: boolean;
  };
}

/**
 * テストセット生成リクエスト
 */
export interface GenerateTestSetRequest {
  changeSetId: string;
  analysisId: string;
  selections: {
    testCaseId: string;
    status: SelectionStatus;
  }[];
  name?: string;
  description?: string;
}

/**
 * 変更セットレスポンス
 */
export interface ChangeSetResponse {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  changes: ChangeItem[];
  scope: ImpactScope;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * 影響分析レスポンス
 */
export interface ImpactAnalysisResponse {
  id: string;
  changeSetId: string;
  analyzedAt: string;
  affectedModules: AffectedModule[];
  affectedFeatures: AffectedFeature[];
  affectedRequirements: AffectedRequirement[];
  riskScore: number;
  summary: string;
}

/**
 * テスト選択レスポンス
 */
export interface TestSelectionsResponse {
  selections: TestCaseSelection[];
  summary: SelectionSummary;
  analysisId: string;
}

/**
 * 推奨テストセットレスポンス
 */
export interface RecommendedTestSetResponse {
  id: string;
  name: string;
  description?: string;
  changeSetId: string;
  analysisId: string;
  selections: TestCaseSelection[];
  totalTestCases: number;
  estimatedTotalDuration: number;
  coveragePercentage: number;
  riskCoverage: number;
  createdAt: string;
}

// ====================================
// Utility Functions
// ====================================

/**
 * 変更タイプのラベルを取得
 */
export function getChangeTypeLabel(type: ChangeType): string {
  const labels: Record<ChangeType, string> = {
    [ChangeType.CODE]: 'コード',
    [ChangeType.CONFIG]: '設定',
    [ChangeType.DATABASE]: 'データベース',
    [ChangeType.API]: 'API',
    [ChangeType.UI]: 'UI',
    [ChangeType.INFRASTRUCTURE]: 'インフラ',
    [ChangeType.DEPENDENCY]: '依存関係',
    [ChangeType.DOCUMENTATION]: 'ドキュメント',
    [ChangeType.OTHER]: 'その他',
  };
  return labels[type] || type;
}

/**
 * 変更タイプの色を取得
 */
export function getChangeTypeColor(type: ChangeType): string {
  const colors: Record<ChangeType, string> = {
    [ChangeType.CODE]: 'blue',
    [ChangeType.CONFIG]: 'orange',
    [ChangeType.DATABASE]: 'purple',
    [ChangeType.API]: 'green',
    [ChangeType.UI]: 'pink',
    [ChangeType.INFRASTRUCTURE]: 'gray',
    [ChangeType.DEPENDENCY]: 'yellow',
    [ChangeType.DOCUMENTATION]: 'cyan',
    [ChangeType.OTHER]: 'gray',
  };
  return colors[type] || 'gray';
}

/**
 * 深刻度のラベルを取得
 */
export function getSeverityLabel(severity: ChangeSeverity): string {
  const labels: Record<ChangeSeverity, string> = {
    [ChangeSeverity.CRITICAL]: 'クリティカル',
    [ChangeSeverity.HIGH]: '高',
    [ChangeSeverity.MEDIUM]: '中',
    [ChangeSeverity.LOW]: '低',
  };
  return labels[severity] || severity;
}

/**
 * 深刻度の色を取得
 */
export function getSeverityColor(severity: ChangeSeverity): string {
  const colors: Record<ChangeSeverity, string> = {
    [ChangeSeverity.CRITICAL]: 'red',
    [ChangeSeverity.HIGH]: 'orange',
    [ChangeSeverity.MEDIUM]: 'yellow',
    [ChangeSeverity.LOW]: 'green',
  };
  return colors[severity] || 'gray';
}

/**
 * 影響スコープのラベルを取得
 */
export function getImpactScopeLabel(scope: ImpactScope): string {
  const labels: Record<ImpactScope, string> = {
    [ImpactScope.SINGLE_FEATURE]: '単一機能',
    [ImpactScope.MULTIPLE_FEATURES]: '複数機能',
    [ImpactScope.MODULE]: 'モジュール全体',
    [ImpactScope.SYSTEM_WIDE]: 'システム全体',
  };
  return labels[scope] || scope;
}

/**
 * 選択理由タイプのラベルを取得
 */
export function getSelectionReasonLabel(type: SelectionReasonType): string {
  const labels: Record<SelectionReasonType, string> = {
    [SelectionReasonType.DIRECT_IMPACT]: '直接影響',
    [SelectionReasonType.INDIRECT_IMPACT]: '間接影響',
    [SelectionReasonType.REGRESSION_RISK]: '回帰リスク',
    [SelectionReasonType.HISTORICAL_FAILURE]: '過去の障害',
    [SelectionReasonType.RELATED_FEATURE]: '関連機能',
    [SelectionReasonType.HIGH_PRIORITY]: '高優先度',
    [SelectionReasonType.REQUIREMENT_COVERAGE]: '要件カバレッジ',
    [SelectionReasonType.RISK_BASED]: 'リスクベース',
  };
  return labels[type] || type;
}

/**
 * 選択ステータスのラベルを取得
 */
export function getSelectionStatusLabel(status: SelectionStatus): string {
  const labels: Record<SelectionStatus, string> = {
    [SelectionStatus.RECOMMENDED]: '推奨',
    [SelectionStatus.OPTIONAL]: 'オプション',
    [SelectionStatus.EXCLUDED]: '除外',
    [SelectionStatus.MANUALLY_SELECTED]: '手動選択',
  };
  return labels[status] || status;
}

/**
 * 選択ステータスの色を取得
 */
export function getSelectionStatusColor(status: SelectionStatus): string {
  const colors: Record<SelectionStatus, string> = {
    [SelectionStatus.RECOMMENDED]: 'green',
    [SelectionStatus.OPTIONAL]: 'blue',
    [SelectionStatus.EXCLUDED]: 'gray',
    [SelectionStatus.MANUALLY_SELECTED]: 'purple',
  };
  return colors[status] || 'gray';
}

/**
 * 空の変更項目を作成
 */
export function createEmptyChangeItem(): Omit<ChangeItem, 'id'> {
  return {
    type: ChangeType.CODE,
    name: '',
    severity: ChangeSeverity.MEDIUM,
    affectedModules: [],
    affectedFeatures: [],
  };
}

/**
 * 空の変更セットを作成
 */
export function createEmptyChangeSet(): Omit<ChangeSet, 'id' | 'createdAt'> {
  return {
    name: '',
    changes: [],
    scope: ImpactScope.SINGLE_FEATURE,
  };
}

/**
 * 優先度スコアを計算
 */
export function calculatePriorityScore(
  reasons: SelectionReason[],
  weights?: Partial<Record<SelectionReasonType, number>>
): number {
  const defaultWeights: Record<SelectionReasonType, number> = {
    [SelectionReasonType.DIRECT_IMPACT]: 1.0,
    [SelectionReasonType.INDIRECT_IMPACT]: 0.6,
    [SelectionReasonType.REGRESSION_RISK]: 0.8,
    [SelectionReasonType.HISTORICAL_FAILURE]: 0.9,
    [SelectionReasonType.RELATED_FEATURE]: 0.5,
    [SelectionReasonType.HIGH_PRIORITY]: 0.7,
    [SelectionReasonType.REQUIREMENT_COVERAGE]: 0.6,
    [SelectionReasonType.RISK_BASED]: 0.7,
  };

  const mergedWeights = { ...defaultWeights, ...weights };

  if (reasons.length === 0) return 0;

  const totalScore = reasons.reduce((sum, reason) => {
    const weight = mergedWeights[reason.type] || 0.5;
    return sum + reason.confidence * weight;
  }, 0);

  return Math.min(100, Math.round((totalScore / reasons.length) * 100));
}

/**
 * 選択サマリーを計算
 */
export function calculateSelectionSummary(selections: TestCaseSelection[]): SelectionSummary {
  const summary: SelectionSummary = {
    totalTestCases: selections.length,
    recommendedCount: 0,
    optionalCount: 0,
    excludedCount: 0,
    manuallySelectedCount: 0,
    estimatedTotalDuration: 0,
    coverageByReason: {} as Record<SelectionReasonType, number>,
    riskScore: 0,
  };

  // Initialize coverageByReason
  Object.values(SelectionReasonType).forEach((type) => {
    summary.coverageByReason[type] = 0;
  });

  let totalRisk = 0;

  selections.forEach((selection) => {
    switch (selection.status) {
      case SelectionStatus.RECOMMENDED:
        summary.recommendedCount++;
        break;
      case SelectionStatus.OPTIONAL:
        summary.optionalCount++;
        break;
      case SelectionStatus.EXCLUDED:
        summary.excludedCount++;
        break;
      case SelectionStatus.MANUALLY_SELECTED:
        summary.manuallySelectedCount++;
        break;
    }

    if (selection.estimatedDuration) {
      summary.estimatedTotalDuration += selection.estimatedDuration;
    }

    selection.reasons.forEach((reason) => {
      summary.coverageByReason[reason.type]++;
    });

    if (selection.historicalFailureRate) {
      totalRisk += selection.historicalFailureRate;
    }
  });

  if (selections.length > 0) {
    summary.riskScore = Math.round(totalRisk / selections.length);
  }

  return summary;
}

/**
 * 変更項目のバリデーション
 */
export function validateChangeItem(item: Omit<ChangeItem, 'id'>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!item.name || item.name.trim().length === 0) {
    errors.push('変更名は必須です');
  }

  if (!Object.values(ChangeType).includes(item.type)) {
    errors.push('無効な変更タイプです');
  }

  if (!Object.values(ChangeSeverity).includes(item.severity)) {
    errors.push('無効な深刻度です');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 変更セットのバリデーション
 */
export function validateChangeSet(changeSet: Omit<ChangeSet, 'id' | 'createdAt'>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!changeSet.name || changeSet.name.trim().length === 0) {
    errors.push('変更セット名は必須です');
  }

  if (!changeSet.changes || changeSet.changes.length === 0) {
    errors.push('少なくとも1つの変更項目が必要です');
  }

  if (!Object.values(ImpactScope).includes(changeSet.scope)) {
    errors.push('無効な影響スコープです');
  }

  changeSet.changes.forEach((item, index) => {
    const itemValidation = validateChangeItem(item);
    if (!itemValidation.valid) {
      itemValidation.errors.forEach((err) => {
        errors.push(`変更項目${index + 1}: ${err}`);
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 推定実行時間をフォーマット
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${remainingMinutes}分`;
}

/**
 * 影響レベルの数値を取得
 */
export function getImpactLevelValue(level: 'HIGH' | 'MEDIUM' | 'LOW'): number {
  const values: Record<string, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  return values[level] || 0;
}

/**
 * 深刻度の数値を取得
 */
export function getSeverityValue(severity: ChangeSeverity): number {
  const values: Record<ChangeSeverity, number> = {
    [ChangeSeverity.CRITICAL]: 4,
    [ChangeSeverity.HIGH]: 3,
    [ChangeSeverity.MEDIUM]: 2,
    [ChangeSeverity.LOW]: 1,
  };
  return values[severity] || 0;
}
