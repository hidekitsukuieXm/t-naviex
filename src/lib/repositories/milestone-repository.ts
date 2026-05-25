/**
 * マイルストーンリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  Milestone,
  MilestoneWithProject,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  MilestoneSearchParams,
  UpdateSortOrderInput,
  MilestoneStatus,
} from '@/types/milestone';

// ============================================
// セレクト定義
// ============================================

const milestoneSelect = {
  id: true,
  projectId: true,
  name: true,
  description: true,
  status: true,
  startDate: true,
  dueDate: true,
  completedAt: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

const milestoneWithProjectSelect = {
  ...milestoneSelect,
  project: {
    select: {
      id: true,
      name: true,
    },
  },
};

// ============================================
// 変換関数
// ============================================

interface DbMilestone {
  id: bigint;
  projectId: bigint;
  name: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  dueDate: Date | null;
  completedAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DbMilestoneWithProject extends DbMilestone {
  project: {
    id: bigint;
    name: string;
  };
}

function serializeMilestone(milestone: DbMilestone): Milestone {
  return {
    id: milestone.id.toString(),
    projectId: milestone.projectId.toString(),
    name: milestone.name,
    description: milestone.description,
    status: milestone.status as MilestoneStatus,
    startDate: milestone.startDate?.toISOString().split('T')[0] ?? null,
    dueDate: milestone.dueDate?.toISOString().split('T')[0] ?? null,
    completedAt: milestone.completedAt?.toISOString() ?? null,
    sortOrder: milestone.sortOrder,
    createdAt: milestone.createdAt.toISOString(),
    updatedAt: milestone.updatedAt.toISOString(),
  };
}

function serializeMilestoneWithProject(milestone: DbMilestoneWithProject): MilestoneWithProject {
  return {
    ...serializeMilestone(milestone),
    project: {
      id: milestone.project.id.toString(),
      name: milestone.project.name,
    },
  };
}

// ============================================
// CRUD操作
// ============================================

/**
 * マイルストーン作成
 */
export async function createMilestone(input: CreateMilestoneInput): Promise<Milestone> {
  const trimmedName = input.name.trim();

  // 並び順を決定（指定がなければ最後に追加）
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const maxSortOrder = await prisma.milestone.aggregate({
      where: { projectId: BigInt(input.projectId) },
      _max: { sortOrder: true },
    });
    sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
  }

  const milestone = await prisma.milestone.create({
    data: {
      projectId: BigInt(input.projectId),
      name: trimmedName,
      description: input.description ?? null,
      status: input.status ?? 'PLANNED',
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      sortOrder,
    },
    select: milestoneSelect,
  });

  return serializeMilestone(milestone as DbMilestone);
}

/**
 * マイルストーン取得（ID指定）
 */
export async function getMilestoneById(id: bigint): Promise<MilestoneWithProject | null> {
  const milestone = await prisma.milestone.findUnique({
    where: { id },
    select: milestoneWithProjectSelect,
  });

  if (!milestone) {
    return null;
  }

  return serializeMilestoneWithProject(milestone as DbMilestoneWithProject);
}

/**
 * マイルストーン一覧取得
 */
export async function getMilestones(params: MilestoneSearchParams): Promise<Milestone[]> {
  const where: {
    projectId: bigint;
    status?: MilestoneStatus;
    OR?: { name: { contains: string; mode: 'insensitive' } }[];
  } = {
    projectId: BigInt(params.projectId),
  };

  // ステータスフィルター
  if (params.status) {
    where.status = params.status;
  }

  // 検索クエリ
  if (params.query) {
    where.OR = [{ name: { contains: params.query, mode: 'insensitive' } }];
  }

  const milestones = await prisma.milestone.findMany({
    where,
    select: milestoneSelect,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return milestones.map((m) => serializeMilestone(m as DbMilestone));
}

/**
 * マイルストーン更新
 */
export async function updateMilestone(
  id: bigint,
  input: UpdateMilestoneInput
): Promise<Milestone | null> {
  const existing = await prisma.milestone.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return null;
  }

  const updateData: {
    name?: string;
    description?: string | null;
    status?: MilestoneStatus;
    startDate?: Date | null;
    dueDate?: Date | null;
    completedAt?: Date | null;
    sortOrder?: number;
  } = {};

  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;

    // ステータスが COMPLETED になった場合、completedAt を設定
    if (input.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    // ステータスが COMPLETED 以外になった場合、completedAt をクリア
    else if (input.status !== 'COMPLETED' && existing.status === 'COMPLETED') {
      updateData.completedAt = null;
    }
  }

  if (input.startDate !== undefined) {
    updateData.startDate = input.startDate ? new Date(input.startDate) : null;
  }

  if (input.dueDate !== undefined) {
    updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }

  if (input.completedAt !== undefined) {
    updateData.completedAt = input.completedAt ? new Date(input.completedAt) : null;
  }

  if (input.sortOrder !== undefined) {
    updateData.sortOrder = input.sortOrder;
  }

  const milestone = await prisma.milestone.update({
    where: { id },
    data: updateData,
    select: milestoneSelect,
  });

  return serializeMilestone(milestone as DbMilestone);
}

/**
 * マイルストーン削除
 */
export async function deleteMilestone(id: bigint): Promise<{ success: boolean; error?: string }> {
  const existing = await prisma.milestone.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return { success: false, error: 'マイルストーンが見つかりません。' };
  }

  await prisma.milestone.delete({
    where: { id },
  });

  return { success: true };
}

/**
 * 並び順一括更新
 */
export async function updateMilestoneSortOrders(
  projectId: string,
  items: UpdateSortOrderInput[]
): Promise<Milestone[]> {
  const updates = items.map((item) =>
    prisma.milestone.update({
      where: {
        id: BigInt(item.id),
        projectId: BigInt(projectId),
      },
      data: {
        sortOrder: item.sortOrder,
      },
      select: milestoneSelect,
    })
  );

  const milestones = await prisma.$transaction(updates);

  return milestones.map((m) => serializeMilestone(m as DbMilestone));
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * プロジェクトが存在するか確認
 */
export async function projectExists(projectId: bigint): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  return project !== null;
}

/**
 * マイルストーン名が同じプロジェクト内で重複しているか確認
 */
export async function isMilestoneNameTaken(
  projectId: bigint,
  name: string,
  excludeId?: bigint
): Promise<boolean> {
  const where: {
    projectId: bigint;
    name: string;
    id?: { not: bigint };
  } = {
    projectId,
    name: name.trim(),
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existing = await prisma.milestone.findFirst({
    where,
    select: { id: true },
  });

  return existing !== null;
}

/**
 * マイルストーンがプロジェクトに属しているか確認
 */
export async function milestoneExistsInProject(
  projectId: bigint,
  milestoneId: bigint
): Promise<boolean> {
  const milestone = await prisma.milestone.findFirst({
    where: {
      id: milestoneId,
      projectId,
    },
    select: { id: true },
  });

  return milestone !== null;
}

/**
 * プロジェクトのマイルストーン数を取得
 */
export async function getMilestoneCount(
  projectId: bigint,
  status?: MilestoneStatus
): Promise<number> {
  const where: { projectId: bigint; status?: MilestoneStatus } = {
    projectId,
  };

  if (status) {
    where.status = status;
  }

  return prisma.milestone.count({ where });
}
