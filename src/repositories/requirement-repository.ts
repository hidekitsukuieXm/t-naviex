/**
 * 要求仕様リポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  RequirementWithRelations,
  CreateRequirementInput,
  UpdateRequirementInput,
  RequirementType,
  RequirementStatus,
  RequirementPriority,
} from '@/types/requirement';

// ============================================
// セレクト定義
// ============================================

const requirementSelect = {
  id: true,
  projectId: true,
  parentId: true,
  code: true,
  title: true,
  description: true,
  content: true,
  type: true,
  status: true,
  priority: true,
  version: true,
  source: true,
  rationale: true,
  acceptance: true,
  sortOrder: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
};

const requirementWithRelationsSelect = {
  ...requirementSelect,
  parent: {
    select: {
      id: true,
      code: true,
      title: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  _count: {
    select: {
      children: true,
      testCases: true,
    },
  },
};

// ============================================
// 一覧取得
// ============================================

export interface GetRequirementsOptions {
  projectId: bigint;
  parentId?: bigint | null;
  type?: RequirementType;
  status?: RequirementStatus;
  priority?: RequirementPriority;
  search?: string;
  includeChildren?: boolean;
}

export async function getRequirements(
  options: GetRequirementsOptions
): Promise<RequirementWithRelations[]> {
  const where: Record<string, unknown> = {
    projectId: options.projectId,
  };

  if (options.parentId !== undefined) {
    where.parentId = options.parentId;
  }

  if (options.type) {
    where.type = options.type;
  }

  if (options.status) {
    where.status = options.status;
  }

  if (options.priority) {
    where.priority = options.priority;
  }

  if (options.search) {
    where.OR = [
      { code: { contains: options.search, mode: 'insensitive' } },
      { title: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const requirements = await prisma.requirement.findMany({
    where,
    select: {
      ...requirementWithRelationsSelect,
      children: options.includeChildren
        ? {
            select: requirementWithRelationsSelect,
            orderBy: { sortOrder: 'asc' },
          }
        : false,
    },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  });

  return requirements as unknown as RequirementWithRelations[];
}

/**
 * 階層構造を含めた要求仕様一覧を取得
 */
export async function getRequirementsTree(projectId: bigint): Promise<RequirementWithRelations[]> {
  // ルートレベルの要求仕様を取得（parentIdがnull）
  const requirements = await prisma.requirement.findMany({
    where: {
      projectId,
      parentId: null,
    },
    select: {
      ...requirementWithRelationsSelect,
      children: {
        select: {
          ...requirementWithRelationsSelect,
          children: {
            select: requirementWithRelationsSelect,
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  });

  return requirements as unknown as RequirementWithRelations[];
}

// ============================================
// 詳細取得
// ============================================

export async function getRequirementById(id: bigint): Promise<RequirementWithRelations | null> {
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    select: {
      ...requirementWithRelationsSelect,
      children: {
        select: requirementWithRelationsSelect,
        orderBy: { sortOrder: 'asc' },
      },
      testCases: {
        select: {
          testCase: {
            select: {
              id: true,
              title: true,
              testSpecId: true,
            },
          },
        },
      },
    },
  });

  return requirement as unknown as RequirementWithRelations | null;
}

export async function getRequirementByCode(
  projectId: bigint,
  code: string
): Promise<RequirementWithRelations | null> {
  const requirement = await prisma.requirement.findUnique({
    where: {
      projectId_code: {
        projectId,
        code,
      },
    },
    select: requirementWithRelationsSelect,
  });

  return requirement as unknown as RequirementWithRelations | null;
}

// ============================================
// 作成
// ============================================

export async function createRequirement(
  input: CreateRequirementInput,
  createdById: bigint
): Promise<RequirementWithRelations> {
  const requirement = await prisma.requirement.create({
    data: {
      projectId: input.projectId,
      parentId: input.parentId ?? null,
      code: input.code,
      title: input.title,
      description: input.description ?? null,
      content: input.content ?? null,
      type: input.type as RequirementType,
      status: input.status as RequirementStatus,
      priority: input.priority as RequirementPriority,
      version: input.version ?? null,
      source: input.source ?? null,
      rationale: input.rationale ?? null,
      acceptance: input.acceptance ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdById,
    },
    select: requirementWithRelationsSelect,
  });

  return requirement as unknown as RequirementWithRelations;
}

// ============================================
// 更新
// ============================================

export async function updateRequirement(
  id: bigint,
  input: UpdateRequirementInput,
  updatedById: bigint
): Promise<RequirementWithRelations> {
  const updateData: Record<string, unknown> = {
    updatedById,
  };

  if (input.parentId !== undefined) {
    updateData.parentId = input.parentId;
  }
  if (input.code !== undefined) {
    updateData.code = input.code;
  }
  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.content !== undefined) {
    updateData.content = input.content;
  }
  if (input.type !== undefined) {
    updateData.type = input.type;
  }
  if (input.status !== undefined) {
    updateData.status = input.status;
  }
  if (input.priority !== undefined) {
    updateData.priority = input.priority;
  }
  if (input.version !== undefined) {
    updateData.version = input.version;
  }
  if (input.source !== undefined) {
    updateData.source = input.source;
  }
  if (input.rationale !== undefined) {
    updateData.rationale = input.rationale;
  }
  if (input.acceptance !== undefined) {
    updateData.acceptance = input.acceptance;
  }
  if (input.sortOrder !== undefined) {
    updateData.sortOrder = input.sortOrder;
  }

  const requirement = await prisma.requirement.update({
    where: { id },
    data: updateData,
    select: requirementWithRelationsSelect,
  });

  return requirement as unknown as RequirementWithRelations;
}

// ============================================
// 削除
// ============================================

export async function deleteRequirement(id: bigint): Promise<void> {
  await prisma.requirement.delete({
    where: { id },
  });
}

// ============================================
// 存在確認
// ============================================

export async function requirementExists(id: bigint): Promise<boolean> {
  const count = await prisma.requirement.count({
    where: { id },
  });
  return count > 0;
}

export async function requirementCodeExists(
  projectId: bigint,
  code: string,
  excludeId?: bigint
): Promise<boolean> {
  const count = await prisma.requirement.count({
    where: {
      projectId,
      code,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  return count > 0;
}

// ============================================
// テストケースとの関連
// ============================================

export async function linkTestCaseToRequirement(
  testCaseId: bigint,
  requirementId: bigint
): Promise<void> {
  await prisma.testCaseRequirement.upsert({
    where: {
      testCaseId_requirementId: {
        testCaseId,
        requirementId,
      },
    },
    update: {},
    create: {
      testCaseId,
      requirementId,
    },
  });
}

export async function unlinkTestCaseFromRequirement(
  testCaseId: bigint,
  requirementId: bigint
): Promise<void> {
  await prisma.testCaseRequirement.deleteMany({
    where: {
      testCaseId,
      requirementId,
    },
  });
}

export async function getRequirementsByTestCase(
  testCaseId: bigint
): Promise<RequirementWithRelations[]> {
  const relations = await prisma.testCaseRequirement.findMany({
    where: { testCaseId },
    include: {
      requirement: {
        select: requirementWithRelationsSelect,
      },
    },
  });

  return relations.map((r) => r.requirement) as unknown as RequirementWithRelations[];
}

export async function getTestCasesByRequirement(requirementId: bigint): Promise<
  Array<{
    testCaseId: bigint;
    title: string;
    testSpecId: bigint;
  }>
> {
  const relations = await prisma.testCaseRequirement.findMany({
    where: { requirementId },
    include: {
      testCase: {
        select: {
          id: true,
          title: true,
          testSpecId: true,
        },
      },
    },
  });

  return relations.map((r) => ({
    testCaseId: r.testCase.id,
    title: r.testCase.title,
    testSpecId: r.testCase.testSpecId,
  }));
}

// ============================================
// 並び順更新
// ============================================

export async function updateRequirementSortOrder(id: bigint, sortOrder: number): Promise<void> {
  await prisma.requirement.update({
    where: { id },
    data: { sortOrder },
  });
}

export async function reorderRequirements(
  projectId: bigint,
  parentId: bigint | null,
  orderedIds: bigint[]
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.requirement.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );
}

// ============================================
// カバレッジ計算
// ============================================

export interface RequirementCoverage {
  requirementId: bigint;
  code: string;
  title: string;
  type: RequirementType;
  status: RequirementStatus;
  priority: RequirementPriority;
  testCaseCount: number;
  isCovered: boolean;
}

export interface ProjectCoverageStats {
  totalRequirements: number;
  coveredRequirements: number;
  uncoveredRequirements: number;
  coveragePercentage: number;
  byType: Record<string, { total: number; covered: number; percentage: number }>;
  byPriority: Record<string, { total: number; covered: number; percentage: number }>;
}

export async function getRequirementCoverage(projectId: bigint): Promise<RequirementCoverage[]> {
  const requirements = await prisma.requirement.findMany({
    where: { projectId },
    select: {
      id: true,
      code: true,
      title: true,
      type: true,
      status: true,
      priority: true,
      _count: {
        select: {
          testCases: true,
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  });

  return requirements.map((r) => ({
    requirementId: r.id,
    code: r.code,
    title: r.title,
    type: r.type as RequirementType,
    status: r.status as RequirementStatus,
    priority: r.priority as RequirementPriority,
    testCaseCount: r._count.testCases,
    isCovered: r._count.testCases > 0,
  }));
}

export async function getProjectCoverageStats(projectId: bigint): Promise<ProjectCoverageStats> {
  const coverage = await getRequirementCoverage(projectId);

  const totalRequirements = coverage.length;
  const coveredRequirements = coverage.filter((r) => r.isCovered).length;
  const uncoveredRequirements = totalRequirements - coveredRequirements;
  const coveragePercentage =
    totalRequirements > 0 ? Math.round((coveredRequirements / totalRequirements) * 100) : 0;

  // Group by type
  const byType: Record<string, { total: number; covered: number; percentage: number }> = {};
  coverage.forEach((r) => {
    if (!byType[r.type]) {
      byType[r.type] = { total: 0, covered: 0, percentage: 0 };
    }
    byType[r.type].total++;
    if (r.isCovered) {
      byType[r.type].covered++;
    }
  });
  Object.keys(byType).forEach((type) => {
    byType[type].percentage =
      byType[type].total > 0 ? Math.round((byType[type].covered / byType[type].total) * 100) : 0;
  });

  // Group by priority
  const byPriority: Record<string, { total: number; covered: number; percentage: number }> = {};
  coverage.forEach((r) => {
    if (!byPriority[r.priority]) {
      byPriority[r.priority] = { total: 0, covered: 0, percentage: 0 };
    }
    byPriority[r.priority].total++;
    if (r.isCovered) {
      byPriority[r.priority].covered++;
    }
  });
  Object.keys(byPriority).forEach((priority) => {
    byPriority[priority].percentage =
      byPriority[priority].total > 0
        ? Math.round((byPriority[priority].covered / byPriority[priority].total) * 100)
        : 0;
  });

  return {
    totalRequirements,
    coveredRequirements,
    uncoveredRequirements,
    coveragePercentage,
    byType,
    byPriority,
  };
}

// ============================================
// トレーサビリティマトリクス
// ============================================

export interface TraceabilityMatrixRow {
  requirement: {
    id: bigint;
    code: string;
    title: string;
    type: RequirementType;
    status: RequirementStatus;
    priority: RequirementPriority;
  };
  testCases: Array<{
    id: bigint;
    title: string;
    testSpecId: bigint;
    testSpecTitle: string;
  }>;
}

export async function getTraceabilityMatrix(projectId: bigint): Promise<TraceabilityMatrixRow[]> {
  const requirements = await prisma.requirement.findMany({
    where: { projectId },
    select: {
      id: true,
      code: true,
      title: true,
      type: true,
      status: true,
      priority: true,
      testCases: {
        select: {
          testCase: {
            select: {
              id: true,
              title: true,
              testSpecId: true,
              testSpec: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  });

  return requirements.map((r) => ({
    requirement: {
      id: r.id,
      code: r.code,
      title: r.title,
      type: r.type as RequirementType,
      status: r.status as RequirementStatus,
      priority: r.priority as RequirementPriority,
    },
    testCases: r.testCases.map(
      (tc: {
        testCase: { id: bigint; title: string; testSpecId: bigint; testSpec: { name: string } };
      }) => ({
        id: tc.testCase.id,
        title: tc.testCase.title,
        testSpecId: tc.testCase.testSpecId,
        testSpecTitle: tc.testCase.testSpec.name,
      })
    ),
  }));
}
