/**
 * Azure DevOps Sync Service
 * Handles bidirectional synchronization between bugs and Azure DevOps work items
 */

import { prisma } from '@/lib/prisma';
import {
  AzureDevOpsClient,
  createAzureDevOpsClientFromIntegration,
  AzureDevOpsWorkItem,
} from './azure-devops-client';
import type { ExternalIntegration } from '@/types/external-integration';

export interface SyncResult {
  success: boolean;
  message: string;
  externalIssueId?: string;
  externalIssueUrl?: string;
  error?: string;
}

export interface StatusMapping {
  localStatusId: bigint;
  externalStatusId: string;
  externalStatusName: string;
}

/**
 * Get the Azure DevOps client for an integration
 */
async function getAzureDevOpsClient(
  integration: ExternalIntegration
): Promise<AzureDevOpsClient | null> {
  return createAzureDevOpsClientFromIntegration(integration.id, {
    baseUrl: integration.baseUrl,
  });
}

/**
 * Get status mapping for an integration
 */
async function getStatusMapping(
  integrationId: bigint,
  localStatusId?: bigint,
  externalStatusId?: string
): Promise<StatusMapping | null> {
  const where: Record<string, unknown> = { integrationId };

  if (localStatusId) {
    where.localStatusId = localStatusId;
  }
  if (externalStatusId) {
    where.externalStatusId = externalStatusId;
  }

  const mapping = await prisma.integrationStatusMapping.findFirst({
    where,
  });

  if (!mapping) {
    return null;
  }

  return {
    localStatusId: mapping.localStatusId,
    externalStatusId: mapping.externalStatusId,
    externalStatusName: mapping.externalStatusName,
  };
}

/**
 * Map local priority to Azure DevOps priority (1-4)
 */
function mapPriorityToAzureDevOps(priority: string): number {
  const priorityMap: Record<string, number> = {
    LOW: 4,
    MEDIUM: 3,
    HIGH: 2,
    URGENT: 1,
    CRITICAL: 1,
  };
  return priorityMap[priority] || 3;
}

/**
 * Map Azure DevOps priority to local priority
 */
function mapPriorityFromAzureDevOps(priority: number | undefined): string {
  if (!priority) return 'MEDIUM';
  const priorityReverseMap: Record<number, string> = {
    1: 'CRITICAL',
    2: 'HIGH',
    3: 'MEDIUM',
    4: 'LOW',
  };
  return priorityReverseMap[priority] || 'MEDIUM';
}

/**
 * Build description from bug fields
 */
function buildDescription(bug: {
  description: string | null;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  version: string | null;
}): string {
  const parts: string[] = [];

  if (bug.description) {
    parts.push(`<p>${escapeHtml(bug.description)}</p>`);
  }

  if (bug.stepsToReproduce) {
    parts.push(`<h3>Steps to Reproduce</h3><p>${escapeHtml(bug.stepsToReproduce)}</p>`);
  }

  if (bug.expectedResult) {
    parts.push(`<h3>Expected Result</h3><p>${escapeHtml(bug.expectedResult)}</p>`);
  }

  if (bug.actualResult) {
    parts.push(`<h3>Actual Result</h3><p>${escapeHtml(bug.actualResult)}</p>`);
  }

  if (bug.environment) {
    parts.push(`<h3>Environment</h3><p>${escapeHtml(bug.environment)}</p>`);
  }

  if (bug.version) {
    parts.push(`<h3>Version</h3><p>${escapeHtml(bug.version)}</p>`);
  }

  return parts.join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br/>');
}

/**
 * Push a bug to Azure DevOps (create or update)
 */
export async function pushBugToAzureDevOps(
  bugId: bigint,
  integrationId: bigint
): Promise<SyncResult> {
  try {
    // Get bug details
    const bug = await prisma.bug.findUnique({
      where: { id: bugId },
      include: {
        project: true,
        assignee: true,
        reporter: true,
      },
    });

    if (!bug) {
      return { success: false, message: 'バグが見つかりません。', error: 'Bug not found' };
    }

    // Get integration
    const integration = await prisma.externalIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return {
        success: false,
        message: '連携設定が見つかりません。',
        error: 'Integration not found',
      };
    }

    if (!integration.isEnabled) {
      return { success: false, message: '連携が無効です。', error: 'Integration disabled' };
    }

    // Get Azure DevOps client
    const client = await getAzureDevOpsClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Azure DevOpsクライアントの作成に失敗しました。',
        error: 'Failed to create client',
      };
    }

    // Check if already synced
    const existingSync = await prisma.bugSync.findUnique({
      where: {
        bugId_integrationId: {
          bugId,
          integrationId,
        },
      },
    });

    // Get work item type from integration options
    const options = integration.options as Record<string, unknown> | null;
    const workItemType = (options?.workItemType as string) || 'Bug';

    // Create work item operations
    const description = buildDescription(bug);

    if (existingSync) {
      // Update existing work item
      const workItemId = parseInt(existingSync.externalIssueId, 10);
      const operations = [
        { op: 'replace' as const, path: '/fields/System.Title', value: bug.title },
        { op: 'replace' as const, path: '/fields/System.Description', value: description },
        {
          op: 'replace' as const,
          path: '/fields/Microsoft.VSTS.Common.Priority',
          value: mapPriorityToAzureDevOps(bug.priority),
        },
      ];

      const result = await client.updateWorkItem(workItemId, operations, {
        project: integration.projectKey || undefined,
      });

      if (!result.success) {
        await prisma.bugSync.update({
          where: { id: existingSync.id },
          data: {
            syncStatus: 'ERROR',
            lastSyncError: result.error,
            lastSyncAt: new Date(),
          },
        });
        return {
          success: false,
          message: 'Azure DevOpsへの更新に失敗しました。',
          error: result.error,
        };
      }

      // Update sync record
      await prisma.bugSync.update({
        where: { id: existingSync.id },
        data: {
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          lastSyncDirection: 'TO_EXTERNAL',
          lastSyncError: null,
          localUpdatedAt: bug.updatedAt,
        },
      });

      return {
        success: true,
        message: 'Azure DevOpsのワークアイテムを更新しました。',
        externalIssueId: existingSync.externalIssueId,
        externalIssueUrl: existingSync.externalIssueUrl || undefined,
      };
    } else {
      // Create new work item
      const operations = [
        { op: 'add' as const, path: '/fields/System.Title', value: bug.title },
        { op: 'add' as const, path: '/fields/System.Description', value: description },
        {
          op: 'add' as const,
          path: '/fields/Microsoft.VSTS.Common.Priority',
          value: mapPriorityToAzureDevOps(bug.priority),
        },
      ];

      const result = await client.createWorkItem(
        integration.projectKey || '',
        workItemType,
        operations
      );

      if (!result.success || !result.data) {
        return {
          success: false,
          message: 'Azure DevOpsへの登録に失敗しました。',
          error: result.error,
        };
      }

      const workItem = result.data;
      const externalUrl =
        workItem._links?.html?.href || `${integration.baseUrl}/_workitems/edit/${workItem.id}`;

      // Create sync record
      await prisma.bugSync.create({
        data: {
          bugId,
          integrationId,
          externalIssueId: String(workItem.id),
          externalIssueKey: String(workItem.id),
          externalIssueUrl: externalUrl,
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          lastSyncDirection: 'TO_EXTERNAL',
          localUpdatedAt: bug.updatedAt,
          externalUpdatedAt: new Date(workItem.fields['System.ChangedDate']),
        },
      });

      // Update bug with external reference
      await prisma.bug.update({
        where: { id: bugId },
        data: {
          externalId: String(workItem.id),
          externalUrl,
        },
      });

      return {
        success: true,
        message: 'Azure DevOpsにワークアイテムを登録しました。',
        externalIssueId: String(workItem.id),
        externalIssueUrl: externalUrl,
      };
    }
  } catch (error) {
    console.error('Push to Azure DevOps error:', error);
    return {
      success: false,
      message: 'Azure DevOpsへの同期中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pull a work item from Azure DevOps to update local bug
 */
export async function pullBugFromAzureDevOps(
  bugId: bigint,
  integrationId: bigint
): Promise<SyncResult> {
  try {
    // Get sync record
    const syncRecord = await prisma.bugSync.findUnique({
      where: {
        bugId_integrationId: {
          bugId,
          integrationId,
        },
      },
    });

    if (!syncRecord) {
      return {
        success: false,
        message: 'この連携の同期レコードが見つかりません。',
        error: 'Sync record not found',
      };
    }

    // Get integration
    const integration = await prisma.externalIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return {
        success: false,
        message: '連携設定が見つかりません。',
        error: 'Integration not found',
      };
    }

    // Get Azure DevOps client
    const client = await getAzureDevOpsClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Azure DevOpsクライアントの作成に失敗しました。',
        error: 'Failed to create client',
      };
    }

    // Get work item from Azure DevOps
    const workItemId = parseInt(syncRecord.externalIssueId, 10);
    const result = await client.getWorkItem(workItemId, {
      project: integration.projectKey || undefined,
    });

    if (!result.success || !result.data) {
      await prisma.bugSync.update({
        where: { id: syncRecord.id },
        data: {
          syncStatus: 'ERROR',
          lastSyncError: result.error,
          lastSyncAt: new Date(),
        },
      });
      return {
        success: false,
        message: 'Azure DevOpsからの取得に失敗しました。',
        error: result.error,
      };
    }

    const workItem = result.data;

    // Get status mapping
    let localStatus: string | undefined;
    const statusMapping = await getStatusMapping(
      integrationId,
      undefined,
      workItem.fields['System.State']
    );
    if (statusMapping) {
      const statusMaster = await prisma.bugStatusMaster.findUnique({
        where: { id: statusMapping.localStatusId },
      });
      if (statusMaster) {
        localStatus = statusMaster.code;
      }
    }

    // Map priority
    const priority = mapPriorityFromAzureDevOps(workItem.fields['Microsoft.VSTS.Common.Priority']);

    // Update bug
    const updateData: Record<string, unknown> = {
      title: workItem.fields['System.Title'],
      description: workItem.fields['System.Description'] || null,
      priority,
    };

    if (localStatus) {
      updateData.status = localStatus;
    }

    if (workItem.fields['Microsoft.VSTS.Scheduling.DueDate']) {
      updateData.dueDate = new Date(workItem.fields['Microsoft.VSTS.Scheduling.DueDate']);
    }

    await prisma.bug.update({
      where: { id: bugId },
      data: updateData,
    });

    // Update sync record
    await prisma.bugSync.update({
      where: { id: syncRecord.id },
      data: {
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        lastSyncDirection: 'FROM_EXTERNAL',
        lastSyncError: null,
        externalUpdatedAt: new Date(workItem.fields['System.ChangedDate']),
      },
    });

    return {
      success: true,
      message: 'Azure DevOpsからバグを更新しました。',
      externalIssueId: syncRecord.externalIssueId,
      externalIssueUrl: syncRecord.externalIssueUrl || undefined,
    };
  } catch (error) {
    console.error('Pull from Azure DevOps error:', error);
    return {
      success: false,
      message: 'Azure DevOpsからの同期中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import a work item from Azure DevOps as a new bug
 */
export async function importWorkItemFromAzureDevOps(
  integrationId: bigint,
  workItemId: number,
  projectId: bigint,
  reporterId: bigint
): Promise<SyncResult & { bugId?: string }> {
  try {
    // Get integration
    const integration = await prisma.externalIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return {
        success: false,
        message: '連携設定が見つかりません。',
        error: 'Integration not found',
      };
    }

    // Check if already imported
    const existingSync = await prisma.bugSync.findUnique({
      where: {
        integrationId_externalIssueId: {
          integrationId,
          externalIssueId: String(workItemId),
        },
      },
    });

    if (existingSync) {
      return {
        success: false,
        message: 'このワークアイテムは既にインポートされています。',
        bugId: existingSync.bugId.toString(),
        error: 'Already imported',
      };
    }

    // Get Azure DevOps client
    const client = await getAzureDevOpsClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Azure DevOpsクライアントの作成に失敗しました。',
        error: 'Failed to create client',
      };
    }

    // Get work item from Azure DevOps
    const result = await client.getWorkItem(workItemId, {
      project: integration.projectKey || undefined,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: 'Azure DevOpsからの取得に失敗しました。',
        error: result.error,
      };
    }

    const workItem = result.data;
    const externalUrl =
      workItem._links?.html?.href || `${integration.baseUrl}/_workitems/edit/${workItem.id}`;

    // Get status mapping
    let localStatus = 'NEW';
    const statusMapping = await getStatusMapping(
      integrationId,
      undefined,
      workItem.fields['System.State']
    );
    if (statusMapping) {
      const statusMaster = await prisma.bugStatusMaster.findUnique({
        where: { id: statusMapping.localStatusId },
      });
      if (statusMaster) {
        localStatus = statusMaster.code;
      }
    }

    // Map priority
    const priority = mapPriorityFromAzureDevOps(workItem.fields['Microsoft.VSTS.Common.Priority']);

    // Create bug
    const bug = await prisma.bug.create({
      data: {
        projectId,
        title: workItem.fields['System.Title'],
        description: workItem.fields['System.Description'] || null,
        type: 'BUG',
        status: localStatus as 'NEW',
        priority: priority as 'MEDIUM',
        severity: 'MAJOR',
        reporterId,
        dueDate: workItem.fields['Microsoft.VSTS.Scheduling.DueDate']
          ? new Date(workItem.fields['Microsoft.VSTS.Scheduling.DueDate'])
          : null,
        externalId: String(workItem.id),
        externalUrl,
      },
    });

    // Create sync record
    await prisma.bugSync.create({
      data: {
        bugId: bug.id,
        integrationId,
        externalIssueId: String(workItem.id),
        externalIssueKey: String(workItem.id),
        externalIssueUrl: externalUrl,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        lastSyncDirection: 'FROM_EXTERNAL',
        localUpdatedAt: bug.updatedAt,
        externalUpdatedAt: new Date(workItem.fields['System.ChangedDate']),
      },
    });

    return {
      success: true,
      message: 'Azure DevOpsからワークアイテムをインポートしました。',
      bugId: bug.id.toString(),
      externalIssueId: String(workItem.id),
      externalIssueUrl: externalUrl,
    };
  } catch (error) {
    console.error('Import from Azure DevOps error:', error);
    return {
      success: false,
      message: 'Azure DevOpsからのインポート中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get list of Azure DevOps work items for import
 */
export async function getAzureDevOpsWorkItemsForImport(
  integrationId: bigint,
  options: {
    workItemType?: string;
    state?: string | string[];
    top?: number;
  } = {}
): Promise<{
  success: boolean;
  workItems?: AzureDevOpsWorkItem[];
  total?: number;
  error?: string;
}> {
  try {
    // Get integration
    const integration = await prisma.externalIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return { success: false, error: 'Integration not found' };
    }

    if (!integration.projectKey) {
      return { success: false, error: 'Project key not configured' };
    }

    // Get Azure DevOps client
    const client = await getAzureDevOpsClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return { success: false, error: 'Failed to create client' };
    }

    // Get work items
    const result = await client.getProjectWorkItems(integration.projectKey, {
      workItemType: options.workItemType,
      state: options.state,
      top: options.top || 25,
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      workItems: result.data,
      total: result.data.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
