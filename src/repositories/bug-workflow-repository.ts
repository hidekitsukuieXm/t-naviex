/**
 * バグワークフローリポジトリ
 */

import { prisma } from '@/lib/prisma';
import type {
  BugWorkflow,
  BugWorkflowWithTransitions,
  BugWorkflowTransition,
  CreateBugWorkflowInput,
  UpdateBugWorkflowInput,
  CreateBugWorkflowTransitionInput,
  UpdateBugWorkflowTransitionInput,
} from '@/types/bug-workflow';

// ============================================
// Workflow CRUD
// ============================================

export async function getBugWorkflows(projectId?: bigint): Promise<BugWorkflow[]> {
  const workflows = await prisma.bugWorkflow.findMany({
    where: {
      OR: [{ projectId: null }, ...(projectId ? [{ projectId }] : [])],
    },
    orderBy: [{ projectId: 'asc' }, { name: 'asc' }],
  });

  return workflows as BugWorkflow[];
}

export async function getEnabledBugWorkflows(projectId?: bigint): Promise<BugWorkflow[]> {
  const workflows = await getBugWorkflows(projectId);
  return workflows.filter((w) => w.isEnabled);
}

export async function getBugWorkflowById(id: bigint): Promise<BugWorkflowWithTransitions | null> {
  const workflow = await prisma.bugWorkflow.findUnique({
    where: { id },
    include: {
      transitions: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return workflow as BugWorkflowWithTransitions | null;
}

export async function getDefaultBugWorkflow(
  projectId?: bigint
): Promise<BugWorkflowWithTransitions | null> {
  // First try to find a project-specific default workflow
  if (projectId) {
    const projectWorkflow = await prisma.bugWorkflow.findFirst({
      where: { projectId, isDefault: true, isEnabled: true },
      include: {
        transitions: {
          where: { isEnabled: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (projectWorkflow) {
      return projectWorkflow as BugWorkflowWithTransitions;
    }
  }

  // Fall back to system-wide default workflow
  const systemWorkflow = await prisma.bugWorkflow.findFirst({
    where: { projectId: null, isDefault: true, isEnabled: true },
    include: {
      transitions: {
        where: { isEnabled: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return systemWorkflow as BugWorkflowWithTransitions | null;
}

export async function createBugWorkflow(data: CreateBugWorkflowInput): Promise<BugWorkflow> {
  // If this is being set as default, unset other defaults for the same scope
  if (data.isDefault) {
    await prisma.bugWorkflow.updateMany({
      where: { projectId: data.projectId ?? null, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.bugWorkflow.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      isDefault: data.isDefault,
      isEnabled: data.isEnabled,
    },
  }) as Promise<BugWorkflow>;
}

export async function updateBugWorkflow(
  id: bigint,
  data: UpdateBugWorkflowInput
): Promise<BugWorkflow> {
  // If this is being set as default, unset other defaults for the same scope
  if (data.isDefault) {
    const existing = await prisma.bugWorkflow.findUnique({ where: { id } });
    if (existing) {
      await prisma.bugWorkflow.updateMany({
        where: { projectId: existing.projectId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }
  }

  return prisma.bugWorkflow.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
    },
  }) as Promise<BugWorkflow>;
}

export async function deleteBugWorkflow(id: bigint): Promise<void> {
  await prisma.bugWorkflow.delete({
    where: { id },
  });
}

// ============================================
// Workflow Transition CRUD
// ============================================

export async function getBugWorkflowTransitions(
  workflowId: bigint
): Promise<BugWorkflowTransition[]> {
  return prisma.bugWorkflowTransition.findMany({
    where: { workflowId },
    orderBy: [{ fromStatus: 'asc' }, { sortOrder: 'asc' }],
  }) as Promise<BugWorkflowTransition[]>;
}

export async function getBugWorkflowTransitionById(
  id: bigint
): Promise<BugWorkflowTransition | null> {
  return prisma.bugWorkflowTransition.findUnique({
    where: { id },
  }) as Promise<BugWorkflowTransition | null>;
}

export async function createBugWorkflowTransition(
  data: CreateBugWorkflowTransitionInput
): Promise<BugWorkflowTransition> {
  return prisma.bugWorkflowTransition.create({
    data: {
      workflowId: data.workflowId,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      name: data.name,
      description: data.description,
      buttonLabel: data.buttonLabel,
      buttonColor: data.buttonColor,
      sortOrder: data.sortOrder,
      isEnabled: data.isEnabled,
      requiredRole: data.requiredRole,
    },
  }) as Promise<BugWorkflowTransition>;
}

export async function updateBugWorkflowTransition(
  id: bigint,
  data: UpdateBugWorkflowTransitionInput
): Promise<BugWorkflowTransition> {
  return prisma.bugWorkflowTransition.update({
    where: { id },
    data: {
      ...(data.fromStatus !== undefined && { fromStatus: data.fromStatus }),
      ...(data.toStatus !== undefined && { toStatus: data.toStatus }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.buttonLabel !== undefined && { buttonLabel: data.buttonLabel }),
      ...(data.buttonColor !== undefined && { buttonColor: data.buttonColor }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
      ...(data.requiredRole !== undefined && { requiredRole: data.requiredRole }),
    },
  }) as Promise<BugWorkflowTransition>;
}

export async function deleteBugWorkflowTransition(id: bigint): Promise<void> {
  await prisma.bugWorkflowTransition.delete({
    where: { id },
  });
}

// ============================================
// Helper Functions
// ============================================

export async function getAvailableTransitionsForBug(
  projectId: bigint,
  currentStatus: string
): Promise<BugWorkflowTransition[]> {
  const workflow = await getDefaultBugWorkflow(projectId);
  if (!workflow) {
    return [];
  }

  return workflow.transitions
    .filter((t) => t.fromStatus === currentStatus && t.isEnabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
