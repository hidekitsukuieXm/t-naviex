/**
 * Combinatorial Testing Repository
 *
 * 組合せテスト支援のリポジトリ
 */

import { prisma } from '@/lib/prisma';
import {
  CombinatorialTestDefinition,
  CombinatorialParameter,
  Constraint,
  CombinatorialMethod,
  Combination,
  CombinationValue,
  GenerationResult,
  CoverageSummary,
  GenerationStatistics,
  PairInfo,
  OrthogonalArrayTemplate,
  STANDARD_ORTHOGONAL_ARRAYS,
} from '@/types/combinatorial';

// ========================================
// 定義 CRUD
// ========================================

/**
 * 組合せテスト定義を作成
 */
export async function createCombinatorialDefinition(
  projectId: number,
  data: {
    name: string;
    description?: string;
    testCaseId?: number;
    parameters: Omit<CombinatorialParameter, 'id'>[];
    method: CombinatorialMethod;
    nWiseLevel?: number;
    constraints?: Omit<Constraint, 'id'>[];
    metadata?: Record<string, unknown>;
  }
): Promise<CombinatorialTestDefinition> {
  // パラメータにIDを付与
  const parametersWithIds: CombinatorialParameter[] = data.parameters.map((p, index) => ({
    ...p,
    id: `param_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
    values: p.values.map((v, vIndex) => ({
      ...v,
      id: `val_${Date.now()}_${index}_${vIndex}_${Math.random().toString(36).substring(2, 9)}`,
    })),
  }));

  // 制約にIDを付与
  const constraintsWithIds: Constraint[] = (data.constraints || []).map((c, index) => ({
    ...c,
    id: `constraint_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
  }));

  const definition = await prisma.combinatorialDefinition.create({
    data: {
      projectId: BigInt(projectId),
      testCaseId: data.testCaseId ? BigInt(data.testCaseId) : null,
      name: data.name,
      description: data.description,
      method: data.method,
      nWiseLevel: data.nWiseLevel,
      parameters: parametersWithIds as unknown as object,
      constraints: constraintsWithIds as unknown as object,
      metadata: (data.metadata as object) || {},
    },
  });

  return mapDefinitionFromDb(definition);
}

/**
 * 組合せテスト定義を取得
 */
export async function getCombinatorialDefinition(
  definitionId: number
): Promise<CombinatorialTestDefinition | null> {
  const definition = await prisma.combinatorialDefinition.findUnique({
    where: { id: BigInt(definitionId) },
  });

  return definition ? mapDefinitionFromDb(definition) : null;
}

/**
 * プロジェクトの組合せテスト定義一覧を取得
 */
export async function getCombinatorialDefinitions(
  projectId: number,
  options?: {
    testCaseId?: number;
    method?: CombinatorialMethod;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ definitions: CombinatorialTestDefinition[]; total: number }> {
  const where: Record<string, unknown> = {
    projectId: BigInt(projectId),
  };

  if (options?.testCaseId) {
    where.testCaseId = BigInt(options.testCaseId);
  }

  if (options?.method) {
    where.method = options.method;
  }

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [definitions, total] = await Promise.all([
    prisma.combinatorialDefinition.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.combinatorialDefinition.count({ where }),
  ]);

  return {
    definitions: definitions.map(mapDefinitionFromDb),
    total,
  };
}

/**
 * 組合せテスト定義を更新
 */
export async function updateCombinatorialDefinition(
  definitionId: number,
  data: {
    name?: string;
    description?: string;
    parameters?: CombinatorialParameter[];
    method?: CombinatorialMethod;
    nWiseLevel?: number;
    constraints?: Constraint[];
    metadata?: Record<string, unknown>;
  }
): Promise<CombinatorialTestDefinition> {
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.parameters !== undefined) updateData.parameters = data.parameters as unknown as object;
  if (data.method !== undefined) updateData.method = data.method;
  if (data.nWiseLevel !== undefined) updateData.nWiseLevel = data.nWiseLevel;
  if (data.constraints !== undefined)
    updateData.constraints = data.constraints as unknown as object;
  if (data.metadata !== undefined) updateData.metadata = data.metadata as object;

  const definition = await prisma.combinatorialDefinition.update({
    where: { id: BigInt(definitionId) },
    data: updateData,
  });

  return mapDefinitionFromDb(definition);
}

/**
 * 組合せテスト定義を削除
 */
export async function deleteCombinatorialDefinition(definitionId: number): Promise<void> {
  // 関連する生成結果も削除
  await prisma.combinatorialResult.deleteMany({
    where: { definitionId: BigInt(definitionId) },
  });

  await prisma.combinatorialDefinition.delete({
    where: { id: BigInt(definitionId) },
  });
}

// ========================================
// 組合せ生成アルゴリズム
// ========================================

/**
 * ペアワイズ組合せを生成
 */
export function generatePairwiseCombinations(
  parameters: CombinatorialParameter[],
  constraints?: Constraint[]
): Combination[] {
  if (parameters.length < 2) {
    return [];
  }

  // 全ペアを生成
  const allPairs = generateAllPairs(parameters);
  const uncoveredPairs = new Set(allPairs.map((p) => pairToKey(p)));
  const combinations: Combination[] = [];
  let index = 0;

  // ペアが全てカバーされるまで組合せを生成
  while (uncoveredPairs.size > 0) {
    const combination = findBestCombination(parameters, uncoveredPairs, constraints);
    if (!combination) break;

    // カバーしたペアを記録
    const coveredPairs = getCoveredPairs(combination);
    coveredPairs.forEach((pairKey) => uncoveredPairs.delete(pairKey));

    combinations.push({
      id: `combo_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
      index,
      values: combination,
      isSelected: true,
      coveredPairs: coveredPairs,
    });

    index++;

    // 無限ループ防止
    if (index > 10000) break;
  }

  return combinations;
}

/**
 * 全組合せを生成
 */
export function generateAllCombinations(
  parameters: CombinatorialParameter[],
  constraints?: Constraint[]
): Combination[] {
  if (parameters.length === 0) return [];

  const combinations: Combination[] = [];
  const indices = new Array(parameters.length).fill(0);
  let index = 0;

  while (true) {
    // 現在のインデックスから組合せを生成
    const values: CombinationValue[] = parameters.map((param, i) => ({
      parameterId: param.id,
      parameterName: param.name,
      valueId: param.values[indices[i]].id,
      value: param.values[indices[i]].value,
    }));

    // 制約チェック
    if (!constraints || checkConstraints(values, constraints)) {
      combinations.push({
        id: `combo_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
        index,
        values,
        isSelected: true,
      });
      index++;
    }

    // 次のインデックスに進む
    let carry = true;
    for (let i = parameters.length - 1; i >= 0 && carry; i--) {
      indices[i]++;
      if (indices[i] >= parameters[i].values.length) {
        indices[i] = 0;
      } else {
        carry = false;
      }
    }

    if (carry) break; // 全ての組合せを生成完了

    // 安全制限
    if (index > 100000) break;
  }

  return combinations;
}

/**
 * 直交表に基づいて組合せを生成
 */
export function generateOrthogonalArrayCombinations(
  parameters: CombinatorialParameter[],
  orthogonalArrayId: string,
  constraints?: Constraint[]
): Combination[] {
  const template = STANDARD_ORTHOGONAL_ARRAYS.find((oa) => oa.id === orthogonalArrayId);
  if (!template) {
    throw new Error(`直交表 ${orthogonalArrayId} が見つかりません`);
  }

  if (parameters.length > template.factors) {
    throw new Error(
      `パラメータ数(${parameters.length})が直交表の因子数(${template.factors})を超えています`
    );
  }

  // 各パラメータの水準数が直交表の水準数以下かチェック
  const invalidParams = parameters.filter((p) => p.values.length > template.levels);
  if (invalidParams.length > 0) {
    throw new Error(
      `パラメータ「${invalidParams.map((p) => p.name).join(', ')}」の水準数が直交表の水準数(${template.levels})を超えています`
    );
  }

  const combinations: Combination[] = [];

  template.array.forEach((row, index) => {
    const values: CombinationValue[] = parameters.map((param, paramIndex) => {
      const levelIndex = row[paramIndex] % param.values.length;
      return {
        parameterId: param.id,
        parameterName: param.name,
        valueId: param.values[levelIndex].id,
        value: param.values[levelIndex].value,
      };
    });

    // 制約チェック
    if (!constraints || checkConstraints(values, constraints)) {
      combinations.push({
        id: `combo_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
        index,
        values,
        isSelected: true,
      });
    }
  });

  // 重複を除去
  const uniqueCombinations: Combination[] = [];
  const seen = new Set<string>();

  combinations.forEach((combo) => {
    const key = combo.values.map((v) => `${v.parameterId}:${v.valueId}`).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCombinations.push({
        ...combo,
        index: uniqueCombinations.length,
      });
    }
  });

  return uniqueCombinations;
}

/**
 * N-wise組合せを生成
 */
export function generateNWiseCombinations(
  parameters: CombinatorialParameter[],
  nLevel: number,
  constraints?: Constraint[]
): Combination[] {
  if (nLevel < 2) {
    throw new Error('N-wiseのレベルは2以上を指定してください');
  }

  if (nLevel >= parameters.length) {
    // N >= パラメータ数の場合は全組合せ
    return generateAllCombinations(parameters, constraints);
  }

  if (nLevel === 2) {
    // 2-wise = ペアワイズ
    return generatePairwiseCombinations(parameters, constraints);
  }

  // N-wise (N >= 3) の実装
  const allTuples = generateAllNTuples(parameters, nLevel);
  const uncoveredTuples = new Set(allTuples.map((t) => tupleToKey(t)));
  const combinations: Combination[] = [];
  let index = 0;

  while (uncoveredTuples.size > 0) {
    const combination = findBestNWiseCombination(parameters, uncoveredTuples, nLevel, constraints);
    if (!combination) break;

    // カバーしたタプルを記録
    const coveredTuples = getCoveredNTuples(combination, parameters, nLevel);
    coveredTuples.forEach((tupleKey) => uncoveredTuples.delete(tupleKey));

    combinations.push({
      id: `combo_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
      index,
      values: combination,
      isSelected: true,
    });

    index++;

    if (index > 100000) break;
  }

  return combinations;
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * 全ペアを生成
 */
function generateAllPairs(parameters: CombinatorialParameter[]): PairInfo[] {
  const pairs: PairInfo[] = [];

  for (let i = 0; i < parameters.length; i++) {
    for (let j = i + 1; j < parameters.length; j++) {
      const param1 = parameters[i];
      const param2 = parameters[j];

      for (const value1 of param1.values) {
        for (const value2 of param2.values) {
          pairs.push({
            param1Id: param1.id,
            param1Name: param1.name,
            value1Id: value1.id,
            value1: value1.value,
            param2Id: param2.id,
            param2Name: param2.name,
            value2Id: value2.id,
            value2: value2.value,
          });
        }
      }
    }
  }

  return pairs;
}

/**
 * ペアをキーに変換
 */
function pairToKey(pair: PairInfo): string {
  return `${pair.param1Id}:${pair.value1Id}|${pair.param2Id}:${pair.value2Id}`;
}

/**
 * 組合せがカバーするペアを取得
 */
function getCoveredPairs(combination: CombinationValue[]): string[] {
  const covered: string[] = [];

  for (let i = 0; i < combination.length; i++) {
    for (let j = i + 1; j < combination.length; j++) {
      const v1 = combination[i];
      const v2 = combination[j];
      covered.push(`${v1.parameterId}:${v1.valueId}|${v2.parameterId}:${v2.valueId}`);
    }
  }

  return covered;
}

/**
 * 最も多くのペアをカバーする組合せを探す
 */
function findBestCombination(
  parameters: CombinatorialParameter[],
  uncoveredPairs: Set<string>,
  constraints?: Constraint[]
): CombinationValue[] | null {
  // グリーディ法で組合せを構築
  const combination: CombinationValue[] = [];

  for (const param of parameters) {
    let bestValue: CombinationValue | null = null;
    let bestValueCoverage = -1;

    for (const value of param.values) {
      const tempCombination: CombinationValue[] = [
        ...combination,
        {
          parameterId: param.id,
          parameterName: param.name,
          valueId: value.id,
          value: value.value,
        },
      ];

      // 制約チェック
      if (constraints && !checkConstraints(tempCombination, constraints)) {
        continue;
      }

      // カバレッジを計算
      const coverage = countCoveredPairs(tempCombination, uncoveredPairs);
      if (coverage > bestValueCoverage) {
        bestValueCoverage = coverage;
        bestValue = {
          parameterId: param.id,
          parameterName: param.name,
          valueId: value.id,
          value: value.value,
        };
      }
    }

    if (bestValue) {
      combination.push(bestValue);
    } else {
      // 制約を満たす値がない場合、最初の値を使用
      combination.push({
        parameterId: param.id,
        parameterName: param.name,
        valueId: param.values[0].id,
        value: param.values[0].value,
      });
    }
  }

  const coverage = countCoveredPairs(combination, uncoveredPairs);
  if (coverage > 0) {
    return combination;
  }

  return null;
}

/**
 * 組合せがカバーする未カバーペア数を計算
 */
function countCoveredPairs(combination: CombinationValue[], uncoveredPairs: Set<string>): number {
  let count = 0;

  for (let i = 0; i < combination.length; i++) {
    for (let j = i + 1; j < combination.length; j++) {
      const v1 = combination[i];
      const v2 = combination[j];
      const key = `${v1.parameterId}:${v1.valueId}|${v2.parameterId}:${v2.valueId}`;
      if (uncoveredPairs.has(key)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * 制約をチェック
 */
function checkConstraints(combination: CombinationValue[], constraints: Constraint[]): boolean {
  for (const constraint of constraints) {
    if (!checkSingleConstraint(combination, constraint)) {
      return false;
    }
  }
  return true;
}

/**
 * 単一制約をチェック
 */
function checkSingleConstraint(combination: CombinationValue[], constraint: Constraint): boolean {
  // 簡易的な制約評価
  // expression形式: "param1=value1 AND param2=value2" など
  try {
    const expr = constraint.expression;

    // EXCLUDE制約: 指定した組合せを禁止
    if (constraint.type === 'EXCLUDE') {
      const conditions = parseExpression(expr);
      const allMatch = conditions.every((cond) => {
        const value = combination.find((v) => v.parameterName === cond.param);
        return value && value.value === cond.value;
      });
      return !allMatch; // 全てマッチしたら禁止（falseを返す）
    }

    // INCLUDE制約: 指定した組合せを必須
    if (constraint.type === 'INCLUDE') {
      const conditions = parseExpression(expr);
      const anyMatch = conditions.some((cond) => {
        const value = combination.find((v) => v.parameterName === cond.param);
        return value && value.value === cond.value;
      });
      return anyMatch;
    }

    // IF_THEN制約: 条件付き
    if (constraint.type === 'IF_THEN') {
      const [ifPart, thenPart] = expr.split(' THEN ');
      if (!ifPart || !thenPart) return true;

      const ifConditions = parseExpression(ifPart.replace('IF ', ''));
      const thenConditions = parseExpression(thenPart);

      const ifMatch = ifConditions.every((cond) => {
        const value = combination.find((v) => v.parameterName === cond.param);
        return value && value.value === cond.value;
      });

      if (!ifMatch) return true; // IF条件が満たされない場合は制約適用外

      const thenMatch = thenConditions.every((cond) => {
        const value = combination.find((v) => v.parameterName === cond.param);
        return value && value.value === cond.value;
      });

      return thenMatch;
    }
  } catch {
    // パースエラー時は制約を無視
    return true;
  }

  return true;
}

/**
 * 式をパース
 */
function parseExpression(expr: string): { param: string; value: string }[] {
  const conditions: { param: string; value: string }[] = [];
  const parts = expr.split(' AND ');

  for (const part of parts) {
    const match = part.trim().match(/(\w+)\s*=\s*["']?([^"']+)["']?/);
    if (match) {
      conditions.push({ param: match[1], value: match[2] });
    }
  }

  return conditions;
}

/**
 * N-タプルを生成
 */
function generateAllNTuples(
  parameters: CombinatorialParameter[],
  n: number
): { params: number[]; values: number[] }[] {
  const tuples: { params: number[]; values: number[] }[] = [];

  // パラメータのインデックス組合せを生成
  const paramCombinations = getCombinations(
    Array.from({ length: parameters.length }, (_, i) => i),
    n
  );

  for (const paramIndices of paramCombinations) {
    // 各パラメータ組合せに対して値の組合せを生成
    const valueCombinations = getCartesianProduct(
      paramIndices.map((pi) => Array.from({ length: parameters[pi].values.length }, (_, i) => i))
    );

    for (const valueIndices of valueCombinations) {
      tuples.push({ params: paramIndices, values: valueIndices });
    }
  }

  return tuples;
}

/**
 * タプルをキーに変換
 */
function tupleToKey(tuple: { params: number[]; values: number[] }): string {
  return tuple.params.map((p, i) => `${p}:${tuple.values[i]}`).join('|');
}

/**
 * 組合せがカバーするN-タプルを取得
 */
function getCoveredNTuples(
  combination: CombinationValue[],
  parameters: CombinatorialParameter[],
  n: number
): string[] {
  const covered: string[] = [];

  const paramCombinations = getCombinations(
    Array.from({ length: parameters.length }, (_, i) => i),
    n
  );

  for (const paramIndices of paramCombinations) {
    const valueIndices = paramIndices.map((pi) => {
      const param = parameters[pi];
      const comboValue = combination.find((v) => v.parameterId === param.id);
      return param.values.findIndex((v) => v.id === comboValue?.valueId);
    });

    covered.push(paramIndices.map((p, i) => `${p}:${valueIndices[i]}`).join('|'));
  }

  return covered;
}

/**
 * N-wiseで最適な組合せを探す
 */
function findBestNWiseCombination(
  parameters: CombinatorialParameter[],
  uncoveredTuples: Set<string>,
  n: number,
  constraints?: Constraint[]
): CombinationValue[] | null {
  // グリーディ法で組合せを構築
  const combination: CombinationValue[] = [];

  for (const param of parameters) {
    let bestValue: CombinationValue | null = null;
    let bestCoverage = -1;

    for (const value of param.values) {
      const tempCombination: CombinationValue[] = [
        ...combination,
        {
          parameterId: param.id,
          parameterName: param.name,
          valueId: value.id,
          value: value.value,
        },
      ];

      if (constraints && !checkConstraints(tempCombination, constraints)) {
        continue;
      }

      // カバレッジを見積もり
      const coverage = tempCombination.length;
      if (coverage > bestCoverage) {
        bestCoverage = coverage;
        bestValue = {
          parameterId: param.id,
          parameterName: param.name,
          valueId: value.id,
          value: value.value,
        };
      }
    }

    if (bestValue) {
      combination.push(bestValue);
    } else {
      combination.push({
        parameterId: param.id,
        parameterName: param.name,
        valueId: param.values[0].id,
        value: param.values[0].value,
      });
    }
  }

  // カバレッジを計算
  const covered = getCoveredNTuples(combination, parameters, n);
  const coverageCount = covered.filter((key) => uncoveredTuples.has(key)).length;

  if (coverageCount > 0) {
    return combination;
  }

  return null;
}

/**
 * 組合せを取得（nCr）
 */
function getCombinations<T>(arr: T[], r: number): T[][] {
  if (r === 1) return arr.map((item) => [item]);
  if (r === arr.length) return [arr.slice()];

  const result: T[][] = [];

  for (let i = 0; i <= arr.length - r; i++) {
    const head = arr[i];
    const tailCombinations = getCombinations(arr.slice(i + 1), r - 1);
    for (const tail of tailCombinations) {
      result.push([head, ...tail]);
    }
  }

  return result;
}

/**
 * 直積を取得
 */
function getCartesianProduct(arrays: number[][]): number[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map((v) => [v]);

  const result: number[][] = [];
  const [first, ...rest] = arrays;
  const restProduct = getCartesianProduct(rest);

  for (const item of first) {
    for (const restItems of restProduct) {
      result.push([item, ...restItems]);
    }
  }

  return result;
}

// ========================================
// 生成結果の保存・取得
// ========================================

/**
 * 生成結果を保存
 */
export async function saveGenerationResult(
  definitionId: number,
  result: Omit<GenerationResult, 'definitionId' | 'timestamp'>
): Promise<void> {
  await prisma.combinatorialResult.upsert({
    where: { definitionId: BigInt(definitionId) },
    create: {
      definitionId: BigInt(definitionId),
      method: result.method,
      combinations: result.combinations as unknown as object,
      coverage: result.coverage as unknown as object,
      statistics: result.statistics as unknown as object,
    },
    update: {
      method: result.method,
      combinations: result.combinations as unknown as object,
      coverage: result.coverage as unknown as object,
      statistics: result.statistics as unknown as object,
    },
  });
}

/**
 * 生成結果を取得
 */
export async function getGenerationResult(definitionId: number): Promise<GenerationResult | null> {
  const result = await prisma.combinatorialResult.findUnique({
    where: { definitionId: BigInt(definitionId) },
  });

  if (!result) return null;

  return {
    definitionId: String(definitionId),
    method: result.method as CombinatorialMethod,
    combinations: result.combinations as unknown as Combination[],
    coverage: result.coverage as unknown as CoverageSummary,
    statistics: result.statistics as unknown as GenerationStatistics,
    timestamp: result.updatedAt,
  };
}

// ========================================
// カバレッジ計算
// ========================================

/**
 * カバレッジを計算
 */
export function calculateCoverage(
  combinations: Combination[],
  parameters: CombinatorialParameter[]
): CoverageSummary {
  const allPairs = generateAllPairs(parameters);
  const totalPairs = allPairs.length;

  const coveredPairKeys = new Set<string>();

  for (const combo of combinations) {
    if (!combo.isSelected) continue;

    for (let i = 0; i < combo.values.length; i++) {
      for (let j = i + 1; j < combo.values.length; j++) {
        const v1 = combo.values[i];
        const v2 = combo.values[j];
        coveredPairKeys.add(`${v1.parameterId}:${v1.valueId}|${v2.parameterId}:${v2.valueId}`);
      }
    }
  }

  const coveredPairs = coveredPairKeys.size;
  const uncoveredPairs = allPairs.filter((pair) => !coveredPairKeys.has(pairToKey(pair)));

  return {
    totalPairs,
    coveredPairs,
    coveragePercentage: totalPairs > 0 ? Math.round((coveredPairs / totalPairs) * 100) : 0,
    uncoveredPairs: uncoveredPairs.length > 0 ? uncoveredPairs : undefined,
  };
}

// ========================================
// 直交表関連
// ========================================

/**
 * 利用可能な直交表テンプレート一覧を取得
 */
export function getOrthogonalArrayTemplates(): OrthogonalArrayTemplate[] {
  return STANDARD_ORTHOGONAL_ARRAYS;
}

/**
 * 適切な直交表を推奨
 */
export function recommendOrthogonalArray(
  parameters: CombinatorialParameter[]
): OrthogonalArrayTemplate | null {
  if (parameters.length === 0) return null;

  const maxLevels = Math.max(...parameters.map((p) => p.values.length));
  const factorsNeeded = parameters.length;

  const candidates = STANDARD_ORTHOGONAL_ARRAYS.filter(
    (oa) => oa.levels >= maxLevels && oa.factors >= factorsNeeded
  ).sort((a, b) => a.runs - b.runs);

  return candidates.length > 0 ? candidates[0] : null;
}

// ========================================
// マッピング関数
// ========================================

function mapDefinitionFromDb(dbRecord: {
  id: bigint;
  testCaseId: bigint | null;
  projectId: bigint;
  name: string;
  description: string | null;
  method: string;
  nWiseLevel: number | null;
  parameters: unknown;
  constraints: unknown;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): CombinatorialTestDefinition {
  return {
    id: String(dbRecord.id),
    testCaseId: dbRecord.testCaseId ? Number(dbRecord.testCaseId) : undefined,
    projectId: Number(dbRecord.projectId),
    name: dbRecord.name,
    description: dbRecord.description || undefined,
    method: dbRecord.method as CombinatorialMethod,
    nWiseLevel: dbRecord.nWiseLevel || undefined,
    parameters: dbRecord.parameters as CombinatorialParameter[],
    constraints: dbRecord.constraints as Constraint[] | undefined,
    metadata: dbRecord.metadata as CombinatorialTestDefinition['metadata'],
    createdAt: dbRecord.createdAt,
    updatedAt: dbRecord.updatedAt,
  };
}
