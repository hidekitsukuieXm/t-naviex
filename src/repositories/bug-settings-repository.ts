/**
 * バグ設定リポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  BugTypeMaster,
  BugStatusMaster,
  BugPriorityMaster,
  BugSeverityMaster,
  CreateBugTypeMasterInput,
  UpdateBugTypeMasterInput,
  CreateBugStatusMasterInput,
  UpdateBugStatusMasterInput,
  CreateBugPriorityMasterInput,
  UpdateBugPriorityMasterInput,
  CreateBugSeverityMasterInput,
  UpdateBugSeverityMasterInput,
} from '@/types/bug-settings';

// ============================================
// Bug Type Master
// ============================================

export async function getBugTypeMasters(projectId?: bigint): Promise<BugTypeMaster[]> {
  const types = await prisma.bugTypeMaster.findMany({
    where: {
      OR: [{ projectId: null }, ...(projectId ? [{ projectId }] : [])],
    },
    orderBy: [{ projectId: 'asc' }, { sortOrder: 'asc' }],
  });

  // If projectId is provided, project-specific items override system defaults
  if (projectId) {
    const projectTypes = types.filter((t) => t.projectId === projectId);
    const systemTypes = types.filter((t) => t.projectId === null);
    const projectCodes = new Set(projectTypes.map((t) => t.code));
    const merged = [...projectTypes, ...systemTypes.filter((t) => !projectCodes.has(t.code))];
    return merged.sort((a, b) => a.sortOrder - b.sortOrder) as BugTypeMaster[];
  }

  return types as BugTypeMaster[];
}

export async function getEnabledBugTypeMasters(projectId?: bigint): Promise<BugTypeMaster[]> {
  const types = await getBugTypeMasters(projectId);
  return types.filter((t) => t.isEnabled);
}

export async function getBugTypeMasterById(id: bigint): Promise<BugTypeMaster | null> {
  return prisma.bugTypeMaster.findUnique({
    where: { id },
  }) as Promise<BugTypeMaster | null>;
}

export async function createBugTypeMaster(data: CreateBugTypeMasterInput): Promise<BugTypeMaster> {
  return prisma.bugTypeMaster.create({
    data: {
      projectId: data.projectId,
      code: data.code,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      sortOrder: data.sortOrder,
      isEnabled: data.isEnabled,
      isDefault: data.isDefault,
    },
  }) as Promise<BugTypeMaster>;
}

export async function updateBugTypeMaster(
  id: bigint,
  data: UpdateBugTypeMasterInput
): Promise<BugTypeMaster> {
  return prisma.bugTypeMaster.update({
    where: { id },
    data: {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    },
  }) as Promise<BugTypeMaster>;
}

export async function deleteBugTypeMaster(id: bigint): Promise<void> {
  await prisma.bugTypeMaster.delete({
    where: { id },
  });
}

// ============================================
// Bug Status Master
// ============================================

export async function getBugStatusMasters(projectId?: bigint): Promise<BugStatusMaster[]> {
  const statuses = await prisma.bugStatusMaster.findMany({
    where: {
      OR: [{ projectId: null }, ...(projectId ? [{ projectId }] : [])],
    },
    orderBy: [{ projectId: 'asc' }, { sortOrder: 'asc' }],
  });

  if (projectId) {
    const projectStatuses = statuses.filter((s) => s.projectId === projectId);
    const systemStatuses = statuses.filter((s) => s.projectId === null);
    const projectCodes = new Set(projectStatuses.map((s) => s.code));
    const merged = [...projectStatuses, ...systemStatuses.filter((s) => !projectCodes.has(s.code))];
    return merged.sort((a, b) => a.sortOrder - b.sortOrder) as BugStatusMaster[];
  }

  return statuses as BugStatusMaster[];
}

export async function getEnabledBugStatusMasters(projectId?: bigint): Promise<BugStatusMaster[]> {
  const statuses = await getBugStatusMasters(projectId);
  return statuses.filter((s) => s.isEnabled);
}

export async function getBugStatusMasterById(id: bigint): Promise<BugStatusMaster | null> {
  return prisma.bugStatusMaster.findUnique({
    where: { id },
  }) as Promise<BugStatusMaster | null>;
}

export async function createBugStatusMaster(
  data: CreateBugStatusMasterInput
): Promise<BugStatusMaster> {
  return prisma.bugStatusMaster.create({
    data: {
      projectId: data.projectId,
      code: data.code,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      category: data.category,
      sortOrder: data.sortOrder,
      isEnabled: data.isEnabled,
      isDefault: data.isDefault,
      isFinal: data.isFinal,
    },
  }) as Promise<BugStatusMaster>;
}

export async function updateBugStatusMaster(
  id: bigint,
  data: UpdateBugStatusMasterInput
): Promise<BugStatusMaster> {
  return prisma.bugStatusMaster.update({
    where: { id },
    data: {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.isFinal !== undefined && { isFinal: data.isFinal }),
    },
  }) as Promise<BugStatusMaster>;
}

export async function deleteBugStatusMaster(id: bigint): Promise<void> {
  await prisma.bugStatusMaster.delete({
    where: { id },
  });
}

// ============================================
// Bug Priority Master
// ============================================

export async function getBugPriorityMasters(projectId?: bigint): Promise<BugPriorityMaster[]> {
  const priorities = await prisma.bugPriorityMaster.findMany({
    where: {
      OR: [{ projectId: null }, ...(projectId ? [{ projectId }] : [])],
    },
    orderBy: [{ projectId: 'asc' }, { sortOrder: 'asc' }],
  });

  if (projectId) {
    const projectPriorities = priorities.filter((p) => p.projectId === projectId);
    const systemPriorities = priorities.filter((p) => p.projectId === null);
    const projectCodes = new Set(projectPriorities.map((p) => p.code));
    const merged = [
      ...projectPriorities,
      ...systemPriorities.filter((p) => !projectCodes.has(p.code)),
    ];
    return merged.sort((a, b) => a.sortOrder - b.sortOrder) as BugPriorityMaster[];
  }

  return priorities as BugPriorityMaster[];
}

export async function getEnabledBugPriorityMasters(
  projectId?: bigint
): Promise<BugPriorityMaster[]> {
  const priorities = await getBugPriorityMasters(projectId);
  return priorities.filter((p) => p.isEnabled);
}

export async function getBugPriorityMasterById(id: bigint): Promise<BugPriorityMaster | null> {
  return prisma.bugPriorityMaster.findUnique({
    where: { id },
  }) as Promise<BugPriorityMaster | null>;
}

export async function createBugPriorityMaster(
  data: CreateBugPriorityMasterInput
): Promise<BugPriorityMaster> {
  return prisma.bugPriorityMaster.create({
    data: {
      projectId: data.projectId,
      code: data.code,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      level: data.level,
      sortOrder: data.sortOrder,
      isEnabled: data.isEnabled,
      isDefault: data.isDefault,
    },
  }) as Promise<BugPriorityMaster>;
}

export async function updateBugPriorityMaster(
  id: bigint,
  data: UpdateBugPriorityMasterInput
): Promise<BugPriorityMaster> {
  return prisma.bugPriorityMaster.update({
    where: { id },
    data: {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    },
  }) as Promise<BugPriorityMaster>;
}

export async function deleteBugPriorityMaster(id: bigint): Promise<void> {
  await prisma.bugPriorityMaster.delete({
    where: { id },
  });
}

// ============================================
// Bug Severity Master
// ============================================

export async function getBugSeverityMasters(projectId?: bigint): Promise<BugSeverityMaster[]> {
  const severities = await prisma.bugSeverityMaster.findMany({
    where: {
      OR: [{ projectId: null }, ...(projectId ? [{ projectId }] : [])],
    },
    orderBy: [{ projectId: 'asc' }, { sortOrder: 'asc' }],
  });

  if (projectId) {
    const projectSeverities = severities.filter((s) => s.projectId === projectId);
    const systemSeverities = severities.filter((s) => s.projectId === null);
    const projectCodes = new Set(projectSeverities.map((s) => s.code));
    const merged = [
      ...projectSeverities,
      ...systemSeverities.filter((s) => !projectCodes.has(s.code)),
    ];
    return merged.sort((a, b) => a.sortOrder - b.sortOrder) as BugSeverityMaster[];
  }

  return severities as BugSeverityMaster[];
}

export async function getEnabledBugSeverityMasters(
  projectId?: bigint
): Promise<BugSeverityMaster[]> {
  const severities = await getBugSeverityMasters(projectId);
  return severities.filter((s) => s.isEnabled);
}

export async function getBugSeverityMasterById(id: bigint): Promise<BugSeverityMaster | null> {
  return prisma.bugSeverityMaster.findUnique({
    where: { id },
  }) as Promise<BugSeverityMaster | null>;
}

export async function createBugSeverityMaster(
  data: CreateBugSeverityMasterInput
): Promise<BugSeverityMaster> {
  return prisma.bugSeverityMaster.create({
    data: {
      projectId: data.projectId,
      code: data.code,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      level: data.level,
      sortOrder: data.sortOrder,
      isEnabled: data.isEnabled,
      isDefault: data.isDefault,
    },
  }) as Promise<BugSeverityMaster>;
}

export async function updateBugSeverityMaster(
  id: bigint,
  data: UpdateBugSeverityMasterInput
): Promise<BugSeverityMaster> {
  return prisma.bugSeverityMaster.update({
    where: { id },
    data: {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.level !== undefined && { level: data.level }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    },
  }) as Promise<BugSeverityMaster>;
}

export async function deleteBugSeverityMaster(id: bigint): Promise<void> {
  await prisma.bugSeverityMaster.delete({
    where: { id },
  });
}
