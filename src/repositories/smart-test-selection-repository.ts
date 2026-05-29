/**
 * Smart Test Selection Repository
 *
 * 変更影響範囲に基づくスマートテスト選択のリポジトリ
 */

import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import {
  ChangeSet,
  ChangeItem,
  ImpactAnalysis,
  AffectedModule,
  AffectedFeature,
  AffectedRequirement,
  TestCaseSelection,
  RecommendedTestSet,
  SelectionReason,
  SelectionSummary,
  ImpactScope,
  ChangeSeverity,
  SelectionStatus,
  SelectionReasonType,
  calculatePriorityScore,
  calculateSelectionSummary,
  getSeverityValue,
  getImpactLevelValue,
} from '@/types/smart-test-selection';

// ====================================
// Change Set Operations
// ====================================

/**
 * 変更セットを作成
 */
export async function createChangeSet(
  projectId: string,
  data: {
    name: string;
    description?: string;
    changes: Omit<ChangeItem, 'id'>[];
    scope?: ImpactScope;
    metadata?: Record<string, unknown>;
  }
): Promise<ChangeSet> {
  const id = uuidv4();
  const changes = data.changes.map((change) => ({
    ...change,
    id: uuidv4(),
  }));

  const changeSet = await prisma.changeSet.create({
    data: {
      id,
      projectId: BigInt(projectId),
      name: data.name,
      description: data.description,
      changes: changes as unknown as object,
      scope: data.scope || ImpactScope.SINGLE_FEATURE,
      metadata: (data.metadata as object) || {},
    },
  });

  return {
    id: changeSet.id,
    name: changeSet.name,
    description: changeSet.description || undefined,
    changes: changeSet.changes as unknown as ChangeItem[],
    scope: changeSet.scope as ImpactScope,
    createdAt: changeSet.createdAt,
    metadata: changeSet.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * 変更セットを取得
 */
export async function getChangeSet(id: string): Promise<ChangeSet | null> {
  const changeSet = await prisma.changeSet.findUnique({
    where: { id },
  });

  if (!changeSet) return null;

  return {
    id: changeSet.id,
    name: changeSet.name,
    description: changeSet.description || undefined,
    changes: changeSet.changes as unknown as ChangeItem[],
    scope: changeSet.scope as ImpactScope,
    createdAt: changeSet.createdAt,
    metadata: changeSet.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * プロジェクトの変更セット一覧を取得
 */
export async function getChangeSets(
  projectId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<{ changeSets: ChangeSet[]; total: number }> {
  const where = { projectId: BigInt(projectId) };
  const [changeSets, total] = await Promise.all([
    prisma.changeSet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.changeSet.count({ where }),
  ]);

  return {
    changeSets: changeSets.map((cs) => ({
      id: cs.id,
      name: cs.name,
      description: cs.description || undefined,
      changes: cs.changes as unknown as ChangeItem[],
      scope: cs.scope as ImpactScope,
      createdAt: cs.createdAt,
      metadata: cs.metadata as Record<string, unknown> | undefined,
    })),
    total,
  };
}

/**
 * 変更セットを更新
 */
export async function updateChangeSet(
  id: string,
  data: {
    name?: string;
    description?: string;
    changes?: ChangeItem[];
    scope?: ImpactScope;
    metadata?: Record<string, unknown>;
  }
): Promise<ChangeSet | null> {
  const changeSet = await prisma.changeSet.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.changes && { changes: data.changes as unknown as object }),
      ...(data.scope && { scope: data.scope }),
      ...(data.metadata && { metadata: data.metadata as object }),
    },
  });

  return {
    id: changeSet.id,
    name: changeSet.name,
    description: changeSet.description || undefined,
    changes: changeSet.changes as unknown as ChangeItem[],
    scope: changeSet.scope as ImpactScope,
    createdAt: changeSet.createdAt,
    metadata: changeSet.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * 変更セットを削除
 */
export async function deleteChangeSet(id: string): Promise<void> {
  await prisma.changeSet.delete({
    where: { id },
  });
}

// ====================================
// Impact Analysis
// ====================================

/**
 * 影響分析を実行
 */
export async function analyzeImpact(
  changeSetId: string,
  options?: {
    includeIndirectImpact?: boolean;
    maxDepth?: number;
    includeHistoricalData?: boolean;
  }
): Promise<ImpactAnalysis> {
  const changeSet = await getChangeSet(changeSetId);
  if (!changeSet) {
    throw new Error('変更セットが見つかりません');
  }

  // 影響を受けるモジュールを分析
  const affectedModules = analyzeAffectedModules(changeSet.changes, options);

  // 影響を受ける機能を分析
  const affectedFeatures = analyzeAffectedFeatures(changeSet.changes, options);

  // 影響を受ける要件を分析
  const affectedRequirements = await analyzeAffectedRequirements(
    changeSet.changes,
    changeSetId,
    options
  );

  // リスクスコアを計算
  const riskScore = calculateRiskScore(changeSet.changes, affectedModules, affectedFeatures);

  // サマリーを生成
  const summary = generateImpactSummary(changeSet, affectedModules, affectedFeatures, riskScore);

  const analysis: ImpactAnalysis = {
    changeSetId,
    analyzedAt: new Date(),
    affectedModules,
    affectedFeatures,
    affectedRequirements,
    riskScore,
    summary,
  };

  // 分析結果を保存
  await saveImpactAnalysis(analysis);

  return analysis;
}

/**
 * 影響を受けるモジュールを分析
 */
function analyzeAffectedModules(
  changes: ChangeItem[],
  options?: { includeIndirectImpact?: boolean }
): AffectedModule[] {
  const moduleMap = new Map<string, AffectedModule>();

  changes.forEach((change) => {
    change.affectedModules.forEach((moduleName) => {
      const existing = moduleMap.get(moduleName);
      const impactLevel = getImpactLevelFromSeverity(change.severity);

      if (existing) {
        // より高い影響レベルを採用
        if (getImpactLevelValue(impactLevel) > getImpactLevelValue(existing.impactLevel)) {
          existing.impactLevel = impactLevel;
        }
        existing.relatedChanges.push(change.id);
        existing.directlyAffected = true;
      } else {
        moduleMap.set(moduleName, {
          moduleId: moduleName,
          moduleName,
          impactLevel,
          directlyAffected: true,
          relatedChanges: [change.id],
        });
      }
    });
  });

  // 間接影響を追加（オプション）
  if (options?.includeIndirectImpact) {
    const directModules = Array.from(moduleMap.keys());
    const indirectModules = getIndirectlyAffectedModules(directModules);

    indirectModules.forEach((moduleName) => {
      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, {
          moduleId: moduleName,
          moduleName,
          impactLevel: 'LOW',
          directlyAffected: false,
          relatedChanges: [],
        });
      }
    });
  }

  return Array.from(moduleMap.values());
}

/**
 * 影響を受ける機能を分析
 */
function analyzeAffectedFeatures(
  changes: ChangeItem[],
  options?: { includeIndirectImpact?: boolean }
): AffectedFeature[] {
  const featureMap = new Map<string, AffectedFeature>();

  changes.forEach((change) => {
    change.affectedFeatures.forEach((featureName) => {
      const existing = featureMap.get(featureName);
      const impactLevel = getImpactLevelFromSeverity(change.severity);

      if (existing) {
        if (getImpactLevelValue(impactLevel) > getImpactLevelValue(existing.impactLevel)) {
          existing.impactLevel = impactLevel;
        }
        existing.relatedChanges.push(change.id);
        existing.directlyAffected = true;
      } else {
        featureMap.set(featureName, {
          featureId: featureName,
          featureName,
          impactLevel,
          directlyAffected: true,
          relatedChanges: [change.id],
        });
      }
    });
  });

  // 間接影響を追加（オプション）
  if (options?.includeIndirectImpact) {
    const directFeatures = Array.from(featureMap.keys());
    const indirectFeatures = getIndirectlyAffectedFeatures(directFeatures);

    indirectFeatures.forEach((featureName) => {
      if (!featureMap.has(featureName)) {
        featureMap.set(featureName, {
          featureId: featureName,
          featureName,
          impactLevel: 'LOW',
          directlyAffected: false,
          relatedChanges: [],
        });
      }
    });
  }

  return Array.from(featureMap.values());
}

/**
 * 影響を受ける要件を分析
 */
async function analyzeAffectedRequirements(
  changes: ChangeItem[],
  changeSetId: string,
  _options?: { includeHistoricalData?: boolean }
): Promise<AffectedRequirement[]> {
  // 変更セットからプロジェクトIDを取得
  const changeSet = await prisma.changeSet.findUnique({
    where: { id: changeSetId },
    select: { projectId: true },
  });

  if (!changeSet) return [];

  // 機能名から関連する要件を検索
  const featureNames = changes.flatMap((c) => c.affectedFeatures);

  if (featureNames.length === 0) return [];

  // 要件を検索（機能名に基づく）
  const requirements = await prisma.requirement.findMany({
    where: {
      projectId: changeSet.projectId,
      OR: [
        { code: { in: featureNames } },
        { description: { contains: featureNames[0] } }, // 簡易的な検索
      ],
    },
    select: {
      id: true,
      code: true,
    },
  });

  const requirementMap = new Map<string, AffectedRequirement>();

  requirements.forEach((req) => {
    const relatedChanges: string[] = [];

    changes.forEach((change) => {
      if (
        change.affectedFeatures.some(
          (f) =>
            req.code.toLowerCase().includes(f.toLowerCase()) ||
            f.toLowerCase().includes(req.code.toLowerCase())
        )
      ) {
        relatedChanges.push(change.id);
      }
    });

    if (relatedChanges.length > 0) {
      const maxSeverity = Math.max(
        ...relatedChanges.map((cid) => {
          const change = changes.find((c) => c.id === cid);
          return change ? getSeverityValue(change.severity) : 0;
        })
      );

      let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (maxSeverity >= 3) impactLevel = 'HIGH';
      else if (maxSeverity >= 2) impactLevel = 'MEDIUM';

      requirementMap.set(req.id.toString(), {
        requirementId: req.id.toString(),
        requirementName: req.code,
        impactLevel,
        relatedChanges,
      });
    }
  });

  return Array.from(requirementMap.values());
}

/**
 * 深刻度から影響レベルを取得
 */
function getImpactLevelFromSeverity(severity: ChangeSeverity): 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (severity) {
    case ChangeSeverity.CRITICAL:
    case ChangeSeverity.HIGH:
      return 'HIGH';
    case ChangeSeverity.MEDIUM:
      return 'MEDIUM';
    case ChangeSeverity.LOW:
    default:
      return 'LOW';
  }
}

/**
 * 間接的に影響を受けるモジュールを取得
 */
function getIndirectlyAffectedModules(directModules: string[]): string[] {
  // 実際の実装では、モジュール間の依存関係グラフを使用
  // ここでは簡易的な実装
  const dependencyMap: Record<string, string[]> = {
    auth: ['user', 'session'],
    user: ['profile', 'settings'],
    api: ['auth', 'database'],
    database: ['cache', 'backup'],
  };

  const indirectModules = new Set<string>();

  directModules.forEach((module) => {
    const deps = dependencyMap[module] || [];
    deps.forEach((dep) => indirectModules.add(dep));
  });

  return Array.from(indirectModules).filter((m) => !directModules.includes(m));
}

/**
 * 間接的に影響を受ける機能を取得
 */
function getIndirectlyAffectedFeatures(directFeatures: string[]): string[] {
  // 実際の実装では、機能間の関係グラフを使用
  // ここでは簡易的な実装
  const relationMap: Record<string, string[]> = {
    ログイン: ['認証', 'セッション管理'],
    認証: ['アクセス制御', '監査ログ'],
    データ登録: ['バリデーション', '通知'],
  };

  const indirectFeatures = new Set<string>();

  directFeatures.forEach((feature) => {
    const related = relationMap[feature] || [];
    related.forEach((r) => indirectFeatures.add(r));
  });

  return Array.from(indirectFeatures).filter((f) => !directFeatures.includes(f));
}

/**
 * リスクスコアを計算
 */
function calculateRiskScore(
  changes: ChangeItem[],
  affectedModules: AffectedModule[],
  affectedFeatures: AffectedFeature[]
): number {
  let score = 0;

  // 変更の深刻度に基づくスコア
  changes.forEach((change) => {
    score += getSeverityValue(change.severity) * 10;
  });

  // 影響を受けるモジュール数に基づくスコア
  affectedModules.forEach((module) => {
    score += getImpactLevelValue(module.impactLevel) * 5;
  });

  // 影響を受ける機能数に基づくスコア
  affectedFeatures.forEach((feature) => {
    score += getImpactLevelValue(feature.impactLevel) * 5;
  });

  // 0-100の範囲に正規化
  return Math.min(100, Math.round(score));
}

/**
 * 影響サマリーを生成
 */
function generateImpactSummary(
  changeSet: ChangeSet,
  affectedModules: AffectedModule[],
  affectedFeatures: AffectedFeature[],
  riskScore: number
): string {
  const highImpactModules = affectedModules.filter((m) => m.impactLevel === 'HIGH');
  const highImpactFeatures = affectedFeatures.filter((f) => f.impactLevel === 'HIGH');

  let summary = `${changeSet.changes.length}件の変更が、`;
  summary += `${affectedModules.length}モジュール、${affectedFeatures.length}機能に影響。`;

  if (highImpactModules.length > 0) {
    summary += ` 高影響モジュール: ${highImpactModules.map((m) => m.moduleName).join(', ')}。`;
  }

  if (highImpactFeatures.length > 0) {
    summary += ` 高影響機能: ${highImpactFeatures.map((f) => f.featureName).join(', ')}。`;
  }

  summary += ` リスクスコア: ${riskScore}/100。`;

  return summary;
}

/**
 * 影響分析結果を保存
 */
async function saveImpactAnalysis(analysis: ImpactAnalysis): Promise<void> {
  await prisma.impactAnalysis.create({
    data: {
      id: uuidv4(),
      changeSetId: analysis.changeSetId,
      analyzedAt: analysis.analyzedAt,
      affectedModules: analysis.affectedModules as unknown as object,
      affectedFeatures: analysis.affectedFeatures as unknown as object,
      affectedRequirements: analysis.affectedRequirements as unknown as object,
      riskScore: analysis.riskScore,
      summary: analysis.summary,
    },
  });
}

/**
 * 影響分析結果を取得
 */
export async function getImpactAnalysis(changeSetId: string): Promise<ImpactAnalysis | null> {
  const analysis = await prisma.impactAnalysis.findFirst({
    where: { changeSetId },
    orderBy: { analyzedAt: 'desc' },
  });

  if (!analysis) return null;

  return {
    changeSetId: analysis.changeSetId,
    analyzedAt: analysis.analyzedAt,
    affectedModules: analysis.affectedModules as unknown as AffectedModule[],
    affectedFeatures: analysis.affectedFeatures as unknown as AffectedFeature[],
    affectedRequirements: analysis.affectedRequirements as unknown as AffectedRequirement[],
    riskScore: analysis.riskScore,
    summary: analysis.summary,
  };
}

// ====================================
// Test Selection
// ====================================

/**
 * テストケースを選択
 */
export async function selectTestCases(
  projectId: string,
  changeSetId: string,
  options?: {
    maxTestCases?: number;
    minPriorityScore?: number;
    includeOptional?: boolean;
    timeLimit?: number;
    prioritizeByRisk?: boolean;
  }
): Promise<{ selections: TestCaseSelection[]; summary: SelectionSummary; analysisId: string }> {
  // 影響分析を取得または実行
  let analysis = await getImpactAnalysis(changeSetId);
  if (!analysis) {
    analysis = await analyzeImpact(changeSetId, { includeIndirectImpact: true });
  }

  // テストケースを取得
  const testCases = await prisma.testCase.findMany({
    where: { testSpec: { projectId: BigInt(projectId) } },
    include: {
      testSpec: { select: { id: true, name: true } },
      testCaseTags: { include: { tag: true } },
    },
  });

  // 各テストケースの選択理由とスコアを計算
  const selections: TestCaseSelection[] = testCases.map((tc) => {
    // Transform to match expected format
    const tcForReason = {
      id: tc.id.toString(),
      title: tc.title,
      description: tc.description,
      tags: tc.testCaseTags.map((t) => ({ tag: { name: t.tag.name } })),
      testResults: [] as { result: string; executedAt: Date }[],
      priority:
        tc.priority === 'HIGH' ? 4 : tc.priority === 'MEDIUM' ? 3 : tc.priority === 'LOW' ? 2 : 1,
    };
    const reasons = calculateSelectionReasons(tcForReason, analysis!);
    const priorityScore = calculatePriorityScore(reasons);

    // 履歴データから失敗率を計算 (no testResults available directly)
    const totalResults = 0;
    const historicalFailureRate = 0;

    // ステータスを決定
    let status: SelectionStatus;
    if (priorityScore >= 70) {
      status = SelectionStatus.RECOMMENDED;
    } else if (priorityScore >= 40) {
      status = SelectionStatus.OPTIONAL;
    } else {
      status = SelectionStatus.EXCLUDED;
    }

    return {
      testCaseId: tc.id.toString(),
      testCaseName: tc.title,
      testSpecId: tc.testSpec?.id.toString(),
      testSpecName: tc.testSpec?.name,
      status,
      priorityScore,
      reasons,
      estimatedDuration: tc.estimatedTime || undefined,
      lastExecutedAt: undefined,
      lastResult: undefined,
      historicalFailureRate,
    };
  });

  // フィルタリングとソート
  let filteredSelections = selections;

  if (!options?.includeOptional) {
    filteredSelections = filteredSelections.filter((s) => s.status === SelectionStatus.RECOMMENDED);
  }

  if (options?.minPriorityScore) {
    filteredSelections = filteredSelections.filter(
      (s) => s.priorityScore >= options.minPriorityScore!
    );
  }

  // リスク優先でソート
  if (options?.prioritizeByRisk) {
    filteredSelections.sort((a, b) => {
      const riskA = (a.historicalFailureRate || 0) + a.priorityScore;
      const riskB = (b.historicalFailureRate || 0) + b.priorityScore;
      return riskB - riskA;
    });
  } else {
    filteredSelections.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  // 時間制限またはテストケース数制限を適用
  if (options?.timeLimit) {
    let totalDuration = 0;
    filteredSelections = filteredSelections.filter((s) => {
      if (totalDuration + (s.estimatedDuration || 0) <= options.timeLimit!) {
        totalDuration += s.estimatedDuration || 0;
        return true;
      }
      return false;
    });
  }

  if (options?.maxTestCases) {
    filteredSelections = filteredSelections.slice(0, options.maxTestCases);
  }

  const summary = calculateSelectionSummary(filteredSelections);

  return {
    selections: filteredSelections,
    summary,
    analysisId: changeSetId,
  };
}

/**
 * テストケースの選択理由を計算
 */
function calculateSelectionReasons(
  testCase: {
    id: string;
    title: string;
    description: string | null;
    tags: { tag: { name: string } }[];
    testResults: { result: string; executedAt: Date }[];
    priority?: number | null;
  },
  analysis: ImpactAnalysis
): SelectionReason[] {
  const reasons: SelectionReason[] = [];

  // 直接影響のチェック
  const directImpact = checkDirectImpact(testCase, analysis);
  if (directImpact.impacted) {
    reasons.push({
      type: SelectionReasonType.DIRECT_IMPACT,
      description: `変更に直接関連: ${directImpact.details}`,
      confidence: directImpact.confidence,
      relatedChanges: directImpact.relatedChanges,
    });
  }

  // 間接影響のチェック
  const indirectImpact = checkIndirectImpact(testCase, analysis);
  if (indirectImpact.impacted) {
    reasons.push({
      type: SelectionReasonType.INDIRECT_IMPACT,
      description: `間接的に影響: ${indirectImpact.details}`,
      confidence: indirectImpact.confidence,
    });
  }

  // 回帰リスクのチェック
  const regressionRisk = checkRegressionRisk(testCase, analysis);
  if (regressionRisk.hasRisk) {
    reasons.push({
      type: SelectionReasonType.REGRESSION_RISK,
      description: `回帰リスクあり: ${regressionRisk.details}`,
      confidence: regressionRisk.confidence,
    });
  }

  // 過去の障害履歴のチェック
  const historicalFailure = checkHistoricalFailure(testCase.testResults);
  if (historicalFailure.hasFailures) {
    reasons.push({
      type: SelectionReasonType.HISTORICAL_FAILURE,
      description: `過去の障害履歴: ${historicalFailure.details}`,
      confidence: historicalFailure.confidence,
    });
  }

  // 高優先度のチェック
  if (testCase.priority && testCase.priority >= 4) {
    reasons.push({
      type: SelectionReasonType.HIGH_PRIORITY,
      description: `高優先度テストケース（優先度: ${testCase.priority}）`,
      confidence: 0.8,
    });
  }

  return reasons;
}

/**
 * 直接影響をチェック
 */
function checkDirectImpact(
  testCase: {
    title: string;
    description: string | null;
    tags: { tag: { name: string } }[];
  },
  analysis: ImpactAnalysis
): { impacted: boolean; confidence: number; details: string; relatedChanges: string[] } {
  const tagNames = testCase.tags.map((t) => t.tag.name.toLowerCase());
  const testTitle = testCase.title.toLowerCase();
  const testDescription = (testCase.description || '').toLowerCase();

  const relatedChanges: string[] = [];
  let maxConfidence = 0;
  const matchedFeatures: string[] = [];

  // 影響を受ける機能との一致をチェック
  analysis.affectedFeatures.forEach((feature) => {
    const featureName = feature.featureName.toLowerCase();

    if (
      testTitle.includes(featureName) ||
      testDescription.includes(featureName) ||
      tagNames.some((t) => t.includes(featureName) || featureName.includes(t))
    ) {
      matchedFeatures.push(feature.featureName);
      relatedChanges.push(...feature.relatedChanges);
      const confidence = feature.directlyAffected ? 0.9 : 0.6;
      maxConfidence = Math.max(maxConfidence, confidence);
    }
  });

  // 影響を受けるモジュールとの一致をチェック
  analysis.affectedModules.forEach((module) => {
    const moduleName = module.moduleName.toLowerCase();

    if (
      testTitle.includes(moduleName) ||
      testDescription.includes(moduleName) ||
      tagNames.some((t) => t.includes(moduleName) || moduleName.includes(t))
    ) {
      matchedFeatures.push(module.moduleName);
      relatedChanges.push(...module.relatedChanges);
      const confidence = module.directlyAffected ? 0.85 : 0.5;
      maxConfidence = Math.max(maxConfidence, confidence);
    }
  });

  return {
    impacted: matchedFeatures.length > 0,
    confidence: maxConfidence,
    details: matchedFeatures.length > 0 ? matchedFeatures.join(', ') : '',
    relatedChanges: [...new Set(relatedChanges)],
  };
}

/**
 * 間接影響をチェック
 */
function checkIndirectImpact(
  testCase: {
    title: string;
    description: string | null;
    tags: { tag: { name: string } }[];
  },
  analysis: ImpactAnalysis
): { impacted: boolean; confidence: number; details: string } {
  const tagNames = testCase.tags.map((t) => t.tag.name.toLowerCase());
  const testTitle = testCase.title.toLowerCase();

  // 間接的に影響を受けるモジュール/機能をチェック
  const indirectModules = analysis.affectedModules.filter((m) => !m.directlyAffected);
  const indirectFeatures = analysis.affectedFeatures.filter((f) => !f.directlyAffected);

  const matchedItems: string[] = [];

  [...indirectModules, ...indirectFeatures].forEach((item) => {
    const itemName = ('moduleName' in item ? item.moduleName : item.featureName).toLowerCase();

    if (testTitle.includes(itemName) || tagNames.some((t) => t.includes(itemName))) {
      matchedItems.push('moduleName' in item ? item.moduleName : item.featureName);
    }
  });

  return {
    impacted: matchedItems.length > 0,
    confidence: matchedItems.length > 0 ? 0.5 : 0,
    details: matchedItems.join(', '),
  };
}

/**
 * 回帰リスクをチェック
 */
function checkRegressionRisk(
  testCase: {
    title: string;
    tags: { tag: { name: string } }[];
  },
  analysis: ImpactAnalysis
): { hasRisk: boolean; confidence: number; details: string } {
  // リスクスコアが高い場合、すべてのテストに回帰リスクがある
  if (analysis.riskScore >= 70) {
    return {
      hasRisk: true,
      confidence: 0.7,
      details: `高リスク変更（スコア: ${analysis.riskScore}）`,
    };
  }

  // タグに「回帰」「regression」が含まれるテストは優先
  const tagNames = testCase.tags.map((t) => t.tag.name.toLowerCase());
  const hasRegressionTag = tagNames.some(
    (t) => t.includes('回帰') || t.includes('regression') || t.includes('smoke')
  );

  if (hasRegressionTag) {
    return {
      hasRisk: true,
      confidence: 0.6,
      details: '回帰テストとしてマーク済み',
    };
  }

  return { hasRisk: false, confidence: 0, details: '' };
}

/**
 * 過去の障害履歴をチェック
 */
function checkHistoricalFailure(testResults: { result: string; executedAt: Date }[]): {
  hasFailures: boolean;
  confidence: number;
  details: string;
} {
  if (testResults.length === 0) {
    return { hasFailures: false, confidence: 0, details: '' };
  }

  const failedCount = testResults.filter((r) => r.result === 'FAILED').length;
  const failureRate = failedCount / testResults.length;

  if (failureRate >= 0.3) {
    return {
      hasFailures: true,
      confidence: Math.min(0.9, failureRate + 0.3),
      details: `過去${testResults.length}回中${failedCount}回失敗（${Math.round(failureRate * 100)}%）`,
    };
  }

  // 直近で失敗した場合
  const recentResults = testResults.slice(0, 3);
  const recentFailures = recentResults.filter((r) => r.result === 'FAILED').length;

  if (recentFailures > 0) {
    return {
      hasFailures: true,
      confidence: 0.6,
      details: `直近${recentResults.length}回中${recentFailures}回失敗`,
    };
  }

  return { hasFailures: false, confidence: 0, details: '' };
}

// ====================================
// Recommended Test Set
// ====================================

/**
 * 推奨テストセットを生成
 */
export async function generateRecommendedTestSet(
  projectId: string,
  changeSetId: string,
  analysisId: string,
  selections: { testCaseId: string; status: SelectionStatus }[],
  options?: {
    name?: string;
    description?: string;
  }
): Promise<RecommendedTestSet> {
  const id = uuidv4();

  // 選択されたテストケースの詳細を取得
  const testCases = await prisma.testCase.findMany({
    where: {
      id: { in: selections.map((s) => BigInt(s.testCaseId)) },
    },
    include: {
      testSpec: { select: { id: true, name: true } },
    },
  });

  // 分析データを取得
  const analysis = await getImpactAnalysis(changeSetId);

  // 選択結果を構築
  const fullSelections: TestCaseSelection[] = selections.map((sel) => {
    const tc = testCases.find((t) => t.id.toString() === sel.testCaseId)!;
    const priorityNum =
      tc.priority === 'HIGH' ? 4 : tc.priority === 'MEDIUM' ? 3 : tc.priority === 'LOW' ? 2 : 1;
    const reasons = analysis
      ? calculateSelectionReasons(
          {
            id: tc.id.toString(),
            title: tc.title,
            description: tc.description,
            tags: [],
            testResults: [],
            priority: priorityNum,
          },
          analysis
        )
      : [];

    return {
      testCaseId: tc.id.toString(),
      testCaseName: tc.title,
      testSpecId: tc.testSpec?.id.toString(),
      testSpecName: tc.testSpec?.name,
      status: sel.status,
      priorityScore: calculatePriorityScore(reasons),
      reasons,
      estimatedDuration: tc.estimatedTime || undefined,
      lastExecutedAt: undefined,
      lastResult: undefined,
    };
  });

  // 統計を計算
  const totalTestCases = fullSelections.filter(
    (s) =>
      s.status === SelectionStatus.RECOMMENDED || s.status === SelectionStatus.MANUALLY_SELECTED
  ).length;

  const estimatedTotalDuration = fullSelections
    .filter(
      (s) =>
        s.status === SelectionStatus.RECOMMENDED || s.status === SelectionStatus.MANUALLY_SELECTED
    )
    .reduce((sum, s) => sum + (s.estimatedDuration || 0), 0);

  // カバレッジを計算（影響を受ける機能のうち、テストでカバーされる割合）
  const totalAffectedFeatures = analysis?.affectedFeatures.length || 1;
  const coveredFeatures = new Set<string>();
  fullSelections.forEach((s) => {
    s.reasons.forEach((r) => {
      if (r.type === SelectionReasonType.DIRECT_IMPACT) {
        (r.relatedChanges || []).forEach((c) => coveredFeatures.add(c));
      }
    });
  });
  const coveragePercentage = Math.round((coveredFeatures.size / totalAffectedFeatures) * 100);

  // リスクカバレッジを計算
  const highRiskSelections = fullSelections.filter((s) => s.priorityScore >= 70);
  const riskCoverage = Math.round(
    (highRiskSelections.length / Math.max(1, fullSelections.length)) * 100
  );

  const recommendedSet: RecommendedTestSet = {
    id,
    name: options?.name || `推奨テストセット - ${new Date().toLocaleDateString('ja-JP')}`,
    description: options?.description,
    changeSetId,
    analysisId,
    selections: fullSelections,
    totalTestCases,
    estimatedTotalDuration,
    coveragePercentage,
    riskCoverage,
    createdAt: new Date(),
  };

  // DBに保存
  await prisma.recommendedTestSet.create({
    data: {
      id: recommendedSet.id,
      projectId: BigInt(projectId),
      name: recommendedSet.name,
      description: recommendedSet.description,
      changeSetId: recommendedSet.changeSetId,
      analysisId: recommendedSet.analysisId,
      selections: recommendedSet.selections as unknown as object,
      totalTestCases: recommendedSet.totalTestCases,
      estimatedTotalDuration: recommendedSet.estimatedTotalDuration,
      coveragePercentage: recommendedSet.coveragePercentage,
      riskCoverage: recommendedSet.riskCoverage,
    },
  });

  return recommendedSet;
}

/**
 * 推奨テストセットを取得
 */
export async function getRecommendedTestSet(id: string): Promise<RecommendedTestSet | null> {
  const set = await prisma.recommendedTestSet.findUnique({
    where: { id },
  });

  if (!set) return null;

  return {
    id: set.id,
    name: set.name,
    description: set.description || undefined,
    changeSetId: set.changeSetId,
    analysisId: set.analysisId,
    selections: set.selections as unknown as TestCaseSelection[],
    totalTestCases: set.totalTestCases,
    estimatedTotalDuration: set.estimatedTotalDuration,
    coveragePercentage: set.coveragePercentage,
    riskCoverage: set.riskCoverage,
    createdAt: set.createdAt,
  };
}

/**
 * プロジェクトの推奨テストセット一覧を取得
 */
export async function getRecommendedTestSets(
  projectId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ sets: RecommendedTestSet[]; total: number }> {
  const where = { projectId: BigInt(projectId) };
  const [sets, total] = await Promise.all([
    prisma.recommendedTestSet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.recommendedTestSet.count({ where }),
  ]);

  return {
    sets: sets.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || undefined,
      changeSetId: s.changeSetId,
      analysisId: s.analysisId,
      selections: s.selections as unknown as TestCaseSelection[],
      totalTestCases: s.totalTestCases,
      estimatedTotalDuration: s.estimatedTotalDuration,
      coveragePercentage: s.coveragePercentage,
      riskCoverage: s.riskCoverage,
      createdAt: s.createdAt,
    })),
    total,
  };
}

/**
 * 推奨テストセットを削除
 */
export async function deleteRecommendedTestSet(id: string): Promise<void> {
  await prisma.recommendedTestSet.delete({
    where: { id },
  });
}
