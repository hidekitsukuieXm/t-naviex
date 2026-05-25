/**
 * テストケース依存関係リポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  CaseDependency,
  CaseDependencyWithRelations,
  CaseDependencyType,
  CreateCaseDependencyInput,
  UpdateCaseDependencyInput,
} from '@/types/case-dependency';

// ============================================
// セレクト定義
// ============================================

const caseDependencySelect = {
  id: true,
  testCaseId: true,
  dependsOnId: true,
  dependencyType: true,
  description: true,
  createdAt: true,
};

const caseDependencyWithRelationsSelect = {
  ...caseDependencySelect,
  dependsOn: {
    select: {
      id: true,
      title: true,
      priority: true,
    },
  },
};

// ============================================
// 変換関数
// ============================================

function toCaseDependency(data: {
  id: bigint;
  testCaseId: bigint;
  dependsOnId: bigint;
  dependencyType: string;
  description: string | null;
  createdAt: Date;
}): CaseDependency {
  return {
    id: data.id.toString(),
    testCaseId: data.testCaseId.toString(),
    dependsOnId: data.dependsOnId.toString(),
    dependencyType: data.dependencyType as CaseDependencyType,
    description: data.description,
    createdAt: data.createdAt.toISOString(),
  };
}

function toCaseDependencyWithRelations(data: {
  id: bigint;
  testCaseId: bigint;
  dependsOnId: bigint;
  dependencyType: string;
  description: string | null;
  createdAt: Date;
  dependsOn: {
    id: bigint;
    title: string;
    priority: string;
  };
}): CaseDependencyWithRelations {
  return {
    ...toCaseDependency(data),
    dependsOn: {
      id: data.dependsOn.id.toString(),
      title: data.dependsOn.title,
      priority: data.dependsOn.priority,
    },
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * テストケースの依存関係一覧を取得
 */
export async function getCaseDependencies(
  testCaseId: bigint
): Promise<CaseDependencyWithRelations[]> {
  const dependencies = await prisma.caseDependency.findMany({
    where: { testCaseId },
    select: caseDependencyWithRelationsSelect,
    orderBy: { createdAt: 'asc' },
  });

  return dependencies.map(toCaseDependencyWithRelations);
}

/**
 * テストケースの被依存関係一覧を取得（このケースに依存しているケース）
 */
export async function getCaseDependents(
  testCaseId: bigint
): Promise<CaseDependencyWithRelations[]> {
  const dependents = await prisma.caseDependency.findMany({
    where: { dependsOnId: testCaseId },
    select: {
      ...caseDependencySelect,
      testCase: {
        select: {
          id: true,
          title: true,
          priority: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return dependents.map((d) => ({
    id: d.id.toString(),
    testCaseId: d.testCaseId.toString(),
    dependsOnId: d.dependsOnId.toString(),
    dependencyType: d.dependencyType as CaseDependencyType,
    description: d.description,
    createdAt: d.createdAt.toISOString(),
    dependsOn: {
      id: d.testCase.id.toString(),
      title: d.testCase.title,
      priority: d.testCase.priority,
    },
  }));
}

/**
 * 依存関係を作成
 */
export async function createCaseDependency(
  input: CreateCaseDependencyInput
): Promise<CaseDependency> {
  const dependency = await prisma.caseDependency.create({
    data: {
      testCaseId: BigInt(input.testCaseId),
      dependsOnId: BigInt(input.dependsOnId),
      dependencyType: input.dependencyType || 'REQUIRES',
      description: input.description || null,
    },
    select: caseDependencySelect,
  });

  return toCaseDependency(dependency);
}

/**
 * 依存関係を更新
 */
export async function updateCaseDependency(
  id: bigint,
  input: UpdateCaseDependencyInput
): Promise<CaseDependency | null> {
  const existing = await prisma.caseDependency.findUnique({
    where: { id },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.caseDependency.update({
    where: { id },
    data: {
      dependencyType: input.dependencyType,
      description: input.description,
    },
    select: caseDependencySelect,
  });

  return toCaseDependency(updated);
}

/**
 * 依存関係を削除
 */
export async function deleteCaseDependency(id: bigint): Promise<boolean> {
  const existing = await prisma.caseDependency.findUnique({
    where: { id },
  });

  if (!existing) {
    return false;
  }

  await prisma.caseDependency.delete({
    where: { id },
  });

  return true;
}

/**
 * テストケースの依存関係をすべて削除
 */
export async function deleteAllCaseDependencies(testCaseId: bigint): Promise<number> {
  const result = await prisma.caseDependency.deleteMany({
    where: { testCaseId },
  });

  return result.count;
}

// ============================================
// 存在確認
// ============================================

/**
 * テストケースが存在するか確認
 */
export async function testCaseExists(id: bigint): Promise<boolean> {
  const count = await prisma.testCase.count({
    where: { id, deletedAt: null },
  });
  return count > 0;
}

/**
 * 依存関係が既に存在するか確認
 */
export async function dependencyExists(testCaseId: bigint, dependsOnId: bigint): Promise<boolean> {
  const count = await prisma.caseDependency.count({
    where: { testCaseId, dependsOnId },
  });
  return count > 0;
}

/**
 * 循環依存をチェック
 * 指定されたtestCaseIdからdependsOnIdへの依存を追加した場合に循環が発生するかチェック
 */
export async function checkCircularDependency(
  testCaseId: bigint,
  dependsOnId: bigint
): Promise<boolean> {
  // dependsOnIdから開始して、testCaseIdに到達できるかチェック
  const visited = new Set<string>();
  const queue = [dependsOnId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentStr = current.toString();

    if (currentStr === testCaseId.toString()) {
      return true; // 循環依存が発見された
    }

    if (visited.has(currentStr)) {
      continue;
    }
    visited.add(currentStr);

    // 現在のケースが依存しているケースを取得
    const dependencies = await prisma.caseDependency.findMany({
      where: { testCaseId: current },
      select: { dependsOnId: true },
    });

    for (const dep of dependencies) {
      if (!visited.has(dep.dependsOnId.toString())) {
        queue.push(dep.dependsOnId);
      }
    }
  }

  return false;
}

/**
 * テストケースが指定されたテスト仕様書に属しているか確認
 */
export async function testCaseBelongsToSpec(
  testCaseId: bigint,
  testSpecId: bigint
): Promise<boolean> {
  const count = await prisma.testCase.count({
    where: {
      id: testCaseId,
      testSpecId,
      deletedAt: null,
    },
  });
  return count > 0;
}
