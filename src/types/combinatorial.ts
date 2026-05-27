/**
 * Combinatorial Testing Types
 *
 * 組合せテスト支援の型定義
 */

// ========================================
// 基本型
// ========================================

/**
 * 組合せテスト手法
 */
export const CombinatorialMethod = {
  PAIRWISE: 'PAIRWISE', // ペアワイズ（All-Pairs）
  ALL_COMBINATIONS: 'ALL_COMBINATIONS', // 全組合せ
  ORTHOGONAL_ARRAY: 'ORTHOGONAL_ARRAY', // 直交表
  N_WISE: 'N_WISE', // N-wise（3-wise, 4-wise等）
} as const;

export type CombinatorialMethod = (typeof CombinatorialMethod)[keyof typeof CombinatorialMethod];

/**
 * パラメータ型
 */
export interface CombinatorialParameter {
  id: string;
  name: string;
  description?: string;
  values: ParameterValue[];
  sortOrder: number;
}

/**
 * パラメータ値
 */
export interface ParameterValue {
  id: string;
  value: string;
  description?: string;
  isDefault?: boolean;
  constraints?: string[];
}

/**
 * 組合せテスト定義
 */
export interface CombinatorialTestDefinition {
  id: string;
  testCaseId?: number;
  projectId: number;
  name: string;
  description?: string;
  parameters: CombinatorialParameter[];
  method: CombinatorialMethod;
  nWiseLevel?: number; // N-wise の N値（2=pairwise, 3=3-wise等）
  constraints?: Constraint[];
  metadata?: CombinatorialMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 制約条件
 */
export interface Constraint {
  id: string;
  name: string;
  type: ConstraintType;
  expression: string;
  description?: string;
}

/**
 * 制約タイプ
 */
export const ConstraintType = {
  EXCLUDE: 'EXCLUDE', // 禁止組合せ
  INCLUDE: 'INCLUDE', // 必須組合せ
  IF_THEN: 'IF_THEN', // 条件付き
} as const;

export type ConstraintType = (typeof ConstraintType)[keyof typeof ConstraintType];

/**
 * メタデータ
 */
export interface CombinatorialMetadata {
  version?: string;
  author?: string;
  lastEditedBy?: string;
  tags?: string[];
  category?: string;
}

// ========================================
// 生成結果関連
// ========================================

/**
 * 組合せ（テストケース候補）
 */
export interface Combination {
  id: string;
  index: number;
  values: CombinationValue[];
  isSelected: boolean;
  coveredPairs?: string[]; // カバーしているペアのID
}

/**
 * 組合せ内の値
 */
export interface CombinationValue {
  parameterId: string;
  parameterName: string;
  valueId: string;
  value: string;
}

/**
 * 生成結果
 */
export interface GenerationResult {
  definitionId: string;
  method: CombinatorialMethod;
  combinations: Combination[];
  coverage: CoverageSummary;
  statistics: GenerationStatistics;
  timestamp: Date;
}

/**
 * カバレッジサマリー
 */
export interface CoverageSummary {
  totalPairs: number;
  coveredPairs: number;
  coveragePercentage: number;
  uncoveredPairs?: PairInfo[];
}

/**
 * ペア情報
 */
export interface PairInfo {
  param1Id: string;
  param1Name: string;
  value1Id: string;
  value1: string;
  param2Id: string;
  param2Name: string;
  value2Id: string;
  value2: string;
}

/**
 * 生成統計
 */
export interface GenerationStatistics {
  totalCombinations: number;
  allCombinationsCount: number;
  reductionPercentage: number;
  generationTimeMs: number;
  constraintViolations: number;
}

// ========================================
// 直交表関連
// ========================================

/**
 * 直交表テンプレート
 */
export interface OrthogonalArrayTemplate {
  id: string;
  name: string;
  notation: string; // L4(2^3), L8(2^7) など
  runs: number; // 実験回数（行数）
  factors: number; // 因子数（列数）
  levels: number; // 水準数
  array: number[][];
}

/**
 * 標準直交表リスト
 */
export const STANDARD_ORTHOGONAL_ARRAYS: OrthogonalArrayTemplate[] = [
  {
    id: 'L4_2_3',
    name: 'L4(2^3)',
    notation: 'L4(2³)',
    runs: 4,
    factors: 3,
    levels: 2,
    array: [
      [0, 0, 0],
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
    ],
  },
  {
    id: 'L8_2_7',
    name: 'L8(2^7)',
    notation: 'L8(2⁷)',
    runs: 8,
    factors: 7,
    levels: 2,
    array: [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1],
      [0, 1, 1, 0, 0, 1, 1],
      [0, 1, 1, 1, 1, 0, 0],
      [1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 1, 0, 1, 0],
      [1, 1, 0, 0, 1, 1, 0],
      [1, 1, 0, 1, 0, 0, 1],
    ],
  },
  {
    id: 'L9_3_4',
    name: 'L9(3^4)',
    notation: 'L9(3⁴)',
    runs: 9,
    factors: 4,
    levels: 3,
    array: [
      [0, 0, 0, 0],
      [0, 1, 1, 1],
      [0, 2, 2, 2],
      [1, 0, 1, 2],
      [1, 1, 2, 0],
      [1, 2, 0, 1],
      [2, 0, 2, 1],
      [2, 1, 0, 2],
      [2, 2, 1, 0],
    ],
  },
  {
    id: 'L16_2_15',
    name: 'L16(2^15)',
    notation: 'L16(2¹⁵)',
    runs: 16,
    factors: 15,
    levels: 2,
    array: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
      [0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0],
      [1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0],
      [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1],
      [1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0],
      [1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1],
      [1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1],
      [1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
    ],
  },
  {
    id: 'L27_3_13',
    name: 'L27(3^13)',
    notation: 'L27(3¹³)',
    runs: 27,
    factors: 13,
    levels: 3,
    array: generateL27Array(),
  },
];

/**
 * L27直交表を生成
 */
function generateL27Array(): number[][] {
  const array: number[][] = [];
  for (let i = 0; i < 27; i++) {
    const row: number[] = [];
    for (let j = 0; j < 13; j++) {
      if (j < 3) {
        row.push(Math.floor(i / Math.pow(3, j)) % 3);
      } else {
        // 交互作用列
        const idx1 = (j - 3) % 3;
        const idx2 = Math.floor((j - 3) / 3);
        row.push((row[idx1] + row[idx2 < 3 ? idx2 : idx2 % 3]) % 3);
      }
    }
    array.push(row);
  }
  return array;
}

// ========================================
// API関連型
// ========================================

/**
 * 定義作成リクエスト
 */
export interface CreateCombinatorialDefinitionRequest {
  name: string;
  description?: string;
  testCaseId?: number;
  parameters: Omit<CombinatorialParameter, 'id'>[];
  method: CombinatorialMethod;
  nWiseLevel?: number;
  constraints?: Omit<Constraint, 'id'>[];
  metadata?: CombinatorialMetadata;
}

/**
 * 定義更新リクエスト
 */
export interface UpdateCombinatorialDefinitionRequest {
  name?: string;
  description?: string;
  parameters?: CombinatorialParameter[];
  method?: CombinatorialMethod;
  nWiseLevel?: number;
  constraints?: Constraint[];
  metadata?: CombinatorialMetadata;
}

/**
 * 組合せ生成リクエスト
 */
export interface GenerateCombinationsRequest {
  method: CombinatorialMethod;
  nWiseLevel?: number;
  orthogonalArrayId?: string;
  applyConstraints?: boolean;
}

/**
 * テストケース作成リクエスト
 */
export interface CreateTestCasesFromCombinationsRequest {
  combinationIds: string[];
  titleTemplate?: string;
  sectionId?: number;
  generateSteps?: boolean;
}

// ========================================
// ユーティリティ関数
// ========================================

/**
 * 組合せ手法のラベルを取得
 */
export function getCombinatorialMethodLabel(method: CombinatorialMethod): string {
  const labels: Record<CombinatorialMethod, string> = {
    PAIRWISE: 'ペアワイズ（All-Pairs）',
    ALL_COMBINATIONS: '全組合せ',
    ORTHOGONAL_ARRAY: '直交表',
    N_WISE: 'N-wise',
  };
  return labels[method] || method;
}

/**
 * 組合せ手法の説明を取得
 */
export function getCombinatorialMethodDescription(method: CombinatorialMethod): string {
  const descriptions: Record<CombinatorialMethod, string> = {
    PAIRWISE: '任意の2パラメータの値の組み合わせを全て網羅',
    ALL_COMBINATIONS: '全てのパラメータ値の組み合わせを生成',
    ORTHOGONAL_ARRAY: '直交表に基づいてバランスの取れた組み合わせを生成',
    N_WISE: '任意のNパラメータの値の組み合わせを全て網羅',
  };
  return descriptions[method] || '';
}

/**
 * 制約タイプのラベルを取得
 */
export function getConstraintTypeLabel(type: ConstraintType): string {
  const labels: Record<ConstraintType, string> = {
    EXCLUDE: '禁止組合せ',
    INCLUDE: '必須組合せ',
    IF_THEN: '条件付き',
  };
  return labels[type] || type;
}

/**
 * ユニークIDを生成
 */
function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 空のパラメータを作成
 */
export function createEmptyParameter(sortOrder: number): CombinatorialParameter {
  return {
    id: generateUniqueId('param'),
    name: `パラメータ${sortOrder + 1}`,
    values: [
      { id: generateUniqueId('val'), value: '値1' },
      { id: generateUniqueId('val'), value: '値2' },
    ],
    sortOrder,
  };
}

/**
 * 空のパラメータ値を作成
 */
export function createEmptyParameterValue(): ParameterValue {
  return {
    id: generateUniqueId('val'),
    value: '',
  };
}

/**
 * 空の制約を作成
 */
export function createEmptyConstraint(): Constraint {
  return {
    id: generateUniqueId('constraint'),
    name: '',
    type: 'EXCLUDE',
    expression: '',
  };
}

/**
 * 全組合せ数を計算
 */
export function calculateAllCombinationsCount(parameters: CombinatorialParameter[]): number {
  if (parameters.length === 0) return 0;
  return parameters.reduce((acc, param) => acc * (param.values.length || 1), 1);
}

/**
 * 全ペア数を計算
 */
export function calculateAllPairsCount(parameters: CombinatorialParameter[]): number {
  if (parameters.length < 2) return 0;

  let totalPairs = 0;
  for (let i = 0; i < parameters.length; i++) {
    for (let j = i + 1; j < parameters.length; j++) {
      totalPairs += parameters[i].values.length * parameters[j].values.length;
    }
  }
  return totalPairs;
}

/**
 * 推奨される直交表を取得
 */
export function getRecommendedOrthogonalArray(
  parameters: CombinatorialParameter[]
): OrthogonalArrayTemplate | null {
  if (parameters.length === 0) return null;

  const maxLevels = Math.max(...parameters.map((p) => p.values.length));
  const factorsNeeded = parameters.length;

  // 適切な直交表を探す
  const candidates = STANDARD_ORTHOGONAL_ARRAYS.filter(
    (oa) => oa.levels >= maxLevels && oa.factors >= factorsNeeded
  ).sort((a, b) => a.runs - b.runs);

  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * 組合せをCSV形式に変換
 */
export function combinationsToCsv(
  combinations: Combination[],
  parameters: CombinatorialParameter[]
): string {
  const headers = parameters.map((p) => p.name).join(',');
  const rows = combinations.map((combo) => {
    return parameters
      .map((param) => {
        const value = combo.values.find((v) => v.parameterId === param.id);
        return `"${(value?.value || '').replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * 組合せの統計を計算
 */
export function calculateCombinationStatistics(
  combinations: Combination[],
  parameters: CombinatorialParameter[]
): GenerationStatistics {
  const allCombinationsCount = calculateAllCombinationsCount(parameters);
  const totalCombinations = combinations.length;

  return {
    totalCombinations,
    allCombinationsCount,
    reductionPercentage:
      allCombinationsCount > 0
        ? Math.round((1 - totalCombinations / allCombinationsCount) * 100)
        : 0,
    generationTimeMs: 0,
    constraintViolations: 0,
  };
}

/**
 * テストケースタイトルを生成
 */
export function generateTestCaseTitle(
  combination: Combination,
  template: string = '{index}: {values}'
): string {
  const valuesStr = combination.values.map((v) => `${v.parameterName}=${v.value}`).join(', ');
  return template
    .replace('{index}', String(combination.index + 1))
    .replace('{values}', valuesStr)
    .replace(
      /{(\w+)}/g,
      (_, paramName) => combination.values.find((v) => v.parameterName === paramName)?.value || ''
    );
}

/**
 * パラメータの検証
 */
export function validateParameter(param: CombinatorialParameter): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!param.name || param.name.trim().length === 0) {
    errors.push('パラメータ名は必須です');
  }

  if (param.name && param.name.length > 100) {
    errors.push('パラメータ名は100文字以内で入力してください');
  }

  if (!param.values || param.values.length === 0) {
    errors.push('パラメータ値を1つ以上設定してください');
  }

  if (param.values) {
    const emptyValues = param.values.filter((v) => !v.value || v.value.trim().length === 0);
    if (emptyValues.length > 0) {
      errors.push('空のパラメータ値があります');
    }

    const uniqueValues = new Set(param.values.map((v) => v.value));
    if (uniqueValues.size !== param.values.length) {
      errors.push('重複するパラメータ値があります');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 定義の検証
 */
export function validateDefinition(def: Partial<CombinatorialTestDefinition>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!def.name || def.name.trim().length === 0) {
    errors.push('名前は必須です');
  }

  if (def.name && def.name.length > 200) {
    errors.push('名前は200文字以内で入力してください');
  }

  if (!def.parameters || def.parameters.length < 2) {
    errors.push('パラメータを2つ以上設定してください');
  }

  if (def.parameters) {
    def.parameters.forEach((param, index) => {
      const result = validateParameter(param);
      if (!result.valid) {
        errors.push(`パラメータ${index + 1}: ${result.errors.join(', ')}`);
      }
    });
  }

  if (def.method === 'N_WISE' && (!def.nWiseLevel || def.nWiseLevel < 2)) {
    errors.push('N-wiseのレベルは2以上を指定してください');
  }

  return { valid: errors.length === 0, errors };
}
