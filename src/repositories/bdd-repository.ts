/**
 * BDD Repository
 *
 * BDD/Gherkin関連のデータアクセス層
 */

import { Prisma, GherkinStepType, GherkinLanguage } from '@/generated/prisma';
import prisma from '@/lib/prisma';
import { parseGherkin, validateGherkin } from '@/lib/gherkin-parser';
import type { GherkinFeature } from '@/types/gherkin';

// ========================================
// ステップ定義関連
// ========================================

/**
 * ステップ定義作成パラメータ
 */
export interface CreateStepDefinitionParams {
  projectId: bigint;
  type: GherkinStepType;
  pattern: string;
  displayText: string;
  description?: string;
  parameters?: StepParameterDef[];
  isShared?: boolean;
}

/**
 * ステップパラメータ定義
 */
export interface StepParameterDef {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'table' | 'docstring';
  description?: string;
  defaultValue?: string;
}

/**
 * ステップ定義更新パラメータ
 */
export interface UpdateStepDefinitionParams {
  displayText?: string;
  description?: string;
  parameters?: StepParameterDef[];
  isShared?: boolean;
  isActive?: boolean;
}

/**
 * ステップ定義検索オプション
 */
export interface FindStepDefinitionsOptions {
  projectId: bigint;
  type?: GherkinStepType;
  search?: string;
  isShared?: boolean;
  isActive?: boolean;
  includeShared?: boolean; // 共有ステップも含める
  skip?: number;
  take?: number;
  orderBy?: 'displayText' | 'usageCount' | 'lastUsedAt' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * ステップ定義を作成
 */
export async function createStepDefinition(params: CreateStepDefinitionParams) {
  const { projectId, type, pattern, displayText, description, parameters, isShared } = params;

  return prisma.stepDefinition.create({
    data: {
      projectId,
      type,
      pattern,
      displayText,
      description,
      parameters: parameters ? (parameters as unknown as Prisma.InputJsonValue) : undefined,
      isShared: isShared ?? false,
    },
  });
}

/**
 * ステップ定義を取得
 */
export async function getStepDefinition(id: bigint) {
  return prisma.stepDefinition.findUnique({
    where: { id },
  });
}

/**
 * ステップ定義を検索
 */
export async function findStepDefinitions(options: FindStepDefinitionsOptions) {
  const {
    projectId,
    type,
    search,
    isShared,
    isActive = true,
    includeShared = false,
    skip,
    take,
    orderBy = 'displayText',
    orderDirection = 'asc',
  } = options;

  const where: Prisma.StepDefinitionWhereInput = {
    isActive,
    ...(type && { type }),
    ...(isShared !== undefined && { isShared }),
  };

  // プロジェクトIDと共有ステップの条件
  if (includeShared) {
    where.OR = [{ projectId }, { isShared: true }];
  } else {
    where.projectId = projectId;
  }

  // 検索条件
  if (search) {
    where.AND = [
      {
        OR: [
          { displayText: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { pattern: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.stepDefinition.findMany({
      where,
      skip,
      take,
      orderBy: { [orderBy]: orderDirection },
    }),
    prisma.stepDefinition.count({ where }),
  ]);

  return { items, total };
}

/**
 * ステップ定義を更新
 */
export async function updateStepDefinition(id: bigint, params: UpdateStepDefinitionParams) {
  const { displayText, description, parameters, isShared, isActive } = params;

  return prisma.stepDefinition.update({
    where: { id },
    data: {
      ...(displayText !== undefined && { displayText }),
      ...(description !== undefined && { description }),
      ...(parameters !== undefined && {
        parameters: parameters as unknown as Prisma.InputJsonValue,
      }),
      ...(isShared !== undefined && { isShared }),
      ...(isActive !== undefined && { isActive }),
    },
  });
}

/**
 * ステップ定義を削除（論理削除）
 */
export async function deleteStepDefinition(id: bigint) {
  return prisma.stepDefinition.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * ステップ定義の使用回数を更新
 */
export async function incrementStepUsage(id: bigint) {
  return prisma.stepDefinition.update({
    where: { id },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

/**
 * よく使われるステップ定義を取得
 */
export async function getPopularStepDefinitions(
  projectId: bigint,
  options: { type?: GherkinStepType; limit?: number } = {}
) {
  const { type, limit = 10 } = options;

  return prisma.stepDefinition.findMany({
    where: {
      isActive: true,
      OR: [{ projectId }, { isShared: true }],
      ...(type && { type }),
    },
    orderBy: { usageCount: 'desc' },
    take: limit,
  });
}

/**
 * ステップ定義をパターンで検索
 */
export async function findStepDefinitionByPattern(projectId: bigint, text: string) {
  const definitions = await prisma.stepDefinition.findMany({
    where: {
      isActive: true,
      OR: [{ projectId }, { isShared: true }],
    },
  });

  // パターンマッチングで検索
  for (const def of definitions) {
    try {
      const regex = new RegExp(def.pattern);
      if (regex.test(text)) {
        return def;
      }
    } catch {
      // 正規表現が無効な場合は完全一致で比較
      if (def.displayText === text) {
        return def;
      }
    }
  }

  return null;
}

// ========================================
// BDDテストケース関連
// ========================================

/**
 * BDDテストケース作成パラメータ
 */
export interface CreateBddTestCaseParams {
  testCaseId: bigint;
  gherkinText: string;
  language?: GherkinLanguage;
}

/**
 * BDDテストケース更新パラメータ
 */
export interface UpdateBddTestCaseParams {
  gherkinText?: string;
  language?: GherkinLanguage;
}

/**
 * BDDテストケースを作成または更新
 */
export async function upsertBddTestCase(params: CreateBddTestCaseParams) {
  const { testCaseId, gherkinText, language = 'JA' } = params;

  // Gherkinテキストをパース
  const langKey = language === 'JA' ? 'ja' : 'en';
  const document = parseGherkin(gherkinText, langKey);
  const errors = validateGherkin(document);

  const isValid = errors.length === 0;

  return prisma.bddTestCase.upsert({
    where: { testCaseId },
    create: {
      testCaseId,
      gherkinText,
      parsedFeature: document.feature as unknown as Prisma.InputJsonValue,
      language,
      isValid,
      parseErrors: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : undefined,
    },
    update: {
      gherkinText,
      parsedFeature: document.feature as unknown as Prisma.InputJsonValue,
      language,
      isValid,
      parseErrors: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : null,
    },
  });
}

/**
 * BDDテストケースを取得
 */
export async function getBddTestCase(testCaseId: bigint) {
  return prisma.bddTestCase.findUnique({
    where: { testCaseId },
  });
}

/**
 * BDDテストケースを削除
 */
export async function deleteBddTestCase(testCaseId: bigint) {
  return prisma.bddTestCase.delete({
    where: { testCaseId },
  });
}

/**
 * テストケースのBDDモードを確認
 */
export async function hasBddTestCase(testCaseId: bigint): Promise<boolean> {
  const count = await prisma.bddTestCase.count({
    where: { testCaseId },
  });
  return count > 0;
}

/**
 * プロジェクト内のBDDテストケースを検索
 */
export async function findBddTestCasesByProject(
  projectId: bigint,
  options: {
    isValid?: boolean;
    language?: GherkinLanguage;
    skip?: number;
    take?: number;
  } = {}
) {
  const { isValid, language, skip, take } = options;

  const where: Prisma.BddTestCaseWhereInput = {
    testCase: {
      testSpec: {
        projectId,
      },
    },
    ...(isValid !== undefined && { isValid }),
    ...(language && { language }),
  };

  const [items, total] = await Promise.all([
    prisma.bddTestCase.findMany({
      where,
      include: {
        testCase: {
          select: {
            id: true,
            title: true,
            testSpec: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      skip,
      take,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.bddTestCase.count({ where }),
  ]);

  return { items, total };
}

/**
 * パース済みFeatureを取得
 */
export async function getParsedFeature(testCaseId: bigint): Promise<GherkinFeature | null> {
  const bdd = await prisma.bddTestCase.findUnique({
    where: { testCaseId },
    select: { parsedFeature: true },
  });

  if (!bdd?.parsedFeature) {
    return null;
  }

  return bdd.parsedFeature as unknown as GherkinFeature;
}

// ========================================
// 統計関連
// ========================================

/**
 * ステップ定義の統計を取得
 */
export async function getStepDefinitionStats(projectId: bigint) {
  const [total, byType, sharedCount] = await Promise.all([
    prisma.stepDefinition.count({
      where: { projectId, isActive: true },
    }),
    prisma.stepDefinition.groupBy({
      by: ['type'],
      where: { projectId, isActive: true },
      _count: { _all: true },
    }),
    prisma.stepDefinition.count({
      where: { isShared: true, isActive: true },
    }),
  ]);

  const typeStats = Object.fromEntries(byType.map((item) => [item.type, item._count._all]));

  return {
    total,
    byType: typeStats,
    sharedCount,
  };
}

/**
 * BDDテストケースの統計を取得
 */
export async function getBddTestCaseStats(projectId: bigint) {
  const [total, validCount, invalidCount, byLanguage] = await Promise.all([
    prisma.bddTestCase.count({
      where: { testCase: { testSpec: { projectId } } },
    }),
    prisma.bddTestCase.count({
      where: { testCase: { testSpec: { projectId } }, isValid: true },
    }),
    prisma.bddTestCase.count({
      where: { testCase: { testSpec: { projectId } }, isValid: false },
    }),
    prisma.bddTestCase.groupBy({
      by: ['language'],
      where: { testCase: { testSpec: { projectId } } },
      _count: { _all: true },
    }),
  ]);

  const languageStats = Object.fromEntries(
    byLanguage.map((item) => [item.language, item._count._all])
  );

  return {
    total,
    validCount,
    invalidCount,
    byLanguage: languageStats,
  };
}
