/**
 * 共有テスト手順のリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  SharedStep,
  SharedStepDetail,
  CreateSharedStepInput,
  UpdateSharedStepInput,
  SharedStepListResponse,
} from '@/types/shared-step';

// ============================================
// 共通ヘルパー関数
// ============================================

/**
 * BigIntをstringに変換するシリアライズ関数
 */
function serializeSharedStep(item: {
  id: bigint;
  projectId: bigint;
  name: string;
  description: string | null;
  contentMd: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): SharedStep {
  return {
    id: item.id.toString(),
    projectId: item.projectId.toString(),
    name: item.name,
    description: item.description,
    contentMd: item.contentMd,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// ============================================
// 共有手順 CRUD
// ============================================

/**
 * プロジェクトの共有手順一覧を取得
 */
export async function getSharedSteps(projectId: string): Promise<SharedStepListResponse> {
  const [sharedSteps, total] = await Promise.all([
    prisma.sharedStep.findMany({
      where: { projectId: BigInt(projectId) },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.sharedStep.count({
      where: { projectId: BigInt(projectId) },
    }),
  ]);

  return {
    sharedSteps: sharedSteps.map(serializeSharedStep),
    total,
  };
}

/**
 * 共有手順を取得
 */
export async function getSharedStep(projectId: string, id: string): Promise<SharedStep | null> {
  const item = await prisma.sharedStep.findFirst({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });

  return item ? serializeSharedStep(item) : null;
}

/**
 * 共有手順詳細を取得（使用回数付き）
 */
export async function getSharedStepDetail(
  projectId: string,
  id: string
): Promise<SharedStepDetail | null> {
  const item = await prisma.sharedStep.findFirst({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
    include: {
      _count: {
        select: { testSteps: true },
      },
    },
  });

  if (!item) return null;

  return {
    ...serializeSharedStep(item),
    usageCount: item._count.testSteps,
  };
}

/**
 * 名前で共有手順を取得
 */
export async function getSharedStepByName(
  projectId: string,
  name: string
): Promise<SharedStep | null> {
  const item = await prisma.sharedStep.findUnique({
    where: {
      projectId_name: {
        projectId: BigInt(projectId),
        name,
      },
    },
  });

  return item ? serializeSharedStep(item) : null;
}

/**
 * 共有手順を作成
 */
export async function createSharedStep(
  projectId: string,
  input: CreateSharedStepInput
): Promise<SharedStep> {
  const item = await prisma.sharedStep.create({
    data: {
      projectId: BigInt(projectId),
      name: input.name,
      description: input.description ?? null,
      contentMd: input.contentMd,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  return serializeSharedStep(item);
}

/**
 * 共有手順を更新
 */
export async function updateSharedStep(
  projectId: string,
  id: string,
  input: UpdateSharedStepInput
): Promise<SharedStep> {
  const item = await prisma.sharedStep.update({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.contentMd !== undefined ? { contentMd: input.contentMd } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });

  return serializeSharedStep(item);
}

/**
 * 共有手順を削除
 */
export async function deleteSharedStep(projectId: string, id: string): Promise<void> {
  await prisma.sharedStep.delete({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });
}

/**
 * 共有手順を複製
 */
export async function duplicateSharedStep(
  projectId: string,
  id: string,
  newName: string
): Promise<SharedStep> {
  const original = await prisma.sharedStep.findFirst({
    where: {
      id: BigInt(id),
      projectId: BigInt(projectId),
    },
  });

  if (!original) {
    throw new Error('Shared step not found');
  }

  const item = await prisma.sharedStep.create({
    data: {
      projectId: BigInt(projectId),
      name: newName,
      description: original.description,
      contentMd: original.contentMd,
      sortOrder: original.sortOrder,
    },
  });

  return serializeSharedStep(item);
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * プロジェクトに共有手順が存在するか確認
 */
export async function hasSharedSteps(projectId: string): Promise<boolean> {
  const count = await prisma.sharedStep.count({
    where: { projectId: BigInt(projectId) },
  });
  return count > 0;
}

/**
 * 共有手順の使用回数を取得
 */
export async function getSharedStepUsageCount(projectId: string, id: string): Promise<number> {
  const count = await prisma.testStep.count({
    where: {
      sharedStepId: BigInt(id),
      testCase: {
        testSpec: {
          projectId: BigInt(projectId),
        },
      },
    },
  });
  return count;
}

/**
 * 共有手順を参照しているテストステップを取得
 */
export async function getTestStepsUsingSharedStep(
  projectId: string,
  sharedStepId: string
): Promise<
  {
    id: string;
    testCaseId: string;
    testCaseTitle: string;
    testSpecId: string;
    testSpecName: string;
    stepNo: number;
  }[]
> {
  const testSteps = await prisma.testStep.findMany({
    where: {
      sharedStepId: BigInt(sharedStepId),
      testCase: {
        testSpec: {
          projectId: BigInt(projectId),
        },
      },
    },
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
  });

  return testSteps.map((step) => ({
    id: step.id.toString(),
    testCaseId: step.testCase.id.toString(),
    testCaseTitle: step.testCase.title,
    testSpecId: step.testCase.testSpec.id.toString(),
    testSpecName: step.testCase.testSpec.name,
    stepNo: step.stepNo,
  }));
}

/**
 * 共有手順の並び順を更新
 */
export async function updateSharedStepSortOrders(
  projectId: string,
  orders: { id: string; sortOrder: number }[]
): Promise<void> {
  await prisma.$transaction(
    orders.map((order) =>
      prisma.sharedStep.update({
        where: {
          id: BigInt(order.id),
          projectId: BigInt(projectId),
        },
        data: { sortOrder: order.sortOrder },
      })
    )
  );
}

/**
 * テストステップに共有手順を適用
 */
export async function applySharedStepToTestStep(
  testStepId: string,
  sharedStepId: string | null
): Promise<void> {
  await prisma.testStep.update({
    where: { id: BigInt(testStepId) },
    data: { sharedStepId: sharedStepId ? BigInt(sharedStepId) : null },
  });
}
