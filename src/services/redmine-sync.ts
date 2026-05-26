/**
 * Redmine Sync Service
 * Handles bidirectional synchronization between bugs and Redmine issues
 */

import { prisma } from '@/lib/prisma';
import { RedmineClient, createRedmineClientFromIntegration, RedmineIssue } from './redmine-client';
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
 * Get the Redmine client for an integration
 */
async function getRedmineClient(integration: ExternalIntegration): Promise<RedmineClient | null> {
  return createRedmineClientFromIntegration(integration.id, {
    baseUrl: integration.baseUrl,
    username: integration.username,
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
 * Push a bug to Redmine (create or update)
 */
export async function pushBugToRedmine(bugId: bigint, integrationId: bigint): Promise<SyncResult> {
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

    // Get Redmine client
    const client = await getRedmineClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Redmineクライアントの作成に失敗しました。',
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

    // Get status mapping for current bug status
    const bugStatusMaster = await prisma.bugStatusMaster.findFirst({
      where: { code: bug.status },
    });

    let redmineStatusId: number | undefined;
    if (bugStatusMaster) {
      const statusMapping = await getStatusMapping(integrationId, bugStatusMaster.id);
      if (statusMapping) {
        redmineStatusId = parseInt(statusMapping.externalStatusId, 10);
      }
    }

    // Map priority
    const priorityMap: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      URGENT: 4,
      CRITICAL: 5,
    };
    const priorityId = priorityMap[bug.priority] || 2;

    // Create issue data
    const issueData = {
      project_id: integration.projectKey || '',
      subject: bug.title,
      description: buildDescription(bug),
      priority_id: priorityId,
      status_id: redmineStatusId,
    };

    if (existingSync) {
      // Update existing issue
      const externalIssueId = parseInt(existingSync.externalIssueId, 10);
      const result = await client.updateIssue(externalIssueId, {
        ...issueData,
        notes: `Updated from T-NaviEx at ${new Date().toISOString()}`,
      });

      if (!result.success) {
        // Update sync status to error
        await prisma.bugSync.update({
          where: { id: existingSync.id },
          data: {
            syncStatus: 'ERROR',
            lastSyncError: result.error,
            lastSyncAt: new Date(),
          },
        });
        return { success: false, message: 'Redmineへの更新に失敗しました。', error: result.error };
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
        message: 'Redmineのチケットを更新しました。',
        externalIssueId: existingSync.externalIssueId,
        externalIssueUrl: existingSync.externalIssueUrl || undefined,
      };
    } else {
      // Create new issue
      const result = await client.createIssue(issueData);

      if (!result.success || !result.data) {
        return { success: false, message: 'Redmineへの登録に失敗しました。', error: result.error };
      }

      const redmineIssue = result.data.issue;
      const externalUrl = `${integration.baseUrl}/issues/${redmineIssue.id}`;

      // Create sync record
      await prisma.bugSync.create({
        data: {
          bugId,
          integrationId,
          externalIssueId: String(redmineIssue.id),
          externalIssueKey: `#${redmineIssue.id}`,
          externalIssueUrl: externalUrl,
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          lastSyncDirection: 'TO_EXTERNAL',
          localUpdatedAt: bug.updatedAt,
          externalUpdatedAt: new Date(redmineIssue.updated_on),
        },
      });

      // Update bug with external reference
      await prisma.bug.update({
        where: { id: bugId },
        data: {
          externalId: String(redmineIssue.id),
          externalUrl,
        },
      });

      return {
        success: true,
        message: 'Redmineにチケットを登録しました。',
        externalIssueId: String(redmineIssue.id),
        externalIssueUrl: externalUrl,
      };
    }
  } catch (error) {
    console.error('Push to Redmine error:', error);
    return {
      success: false,
      message: 'Redmineへの同期中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pull an issue from Redmine to update local bug
 */
export async function pullBugFromRedmine(
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

    // Get Redmine client
    const client = await getRedmineClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Redmineクライアントの作成に失敗しました。',
        error: 'Failed to create client',
      };
    }

    // Get issue from Redmine
    const issueId = parseInt(syncRecord.externalIssueId, 10);
    const result = await client.getIssue(issueId);

    if (!result.success || !result.data) {
      await prisma.bugSync.update({
        where: { id: syncRecord.id },
        data: {
          syncStatus: 'ERROR',
          lastSyncError: result.error,
          lastSyncAt: new Date(),
        },
      });
      return { success: false, message: 'Redmineからの取得に失敗しました。', error: result.error };
    }

    const redmineIssue = result.data.issue;

    // Get status mapping
    let localStatus: string | undefined;
    const statusMapping = await getStatusMapping(
      integrationId,
      undefined,
      String(redmineIssue.status.id)
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
    const priorityReverseMap: Record<number, string> = {
      1: 'LOW',
      2: 'MEDIUM',
      3: 'HIGH',
      4: 'URGENT',
      5: 'CRITICAL',
    };
    const priority = priorityReverseMap[redmineIssue.priority.id] || 'MEDIUM';

    // Update bug
    const updateData: Record<string, unknown> = {
      title: redmineIssue.subject,
      description: redmineIssue.description || null,
      priority,
    };

    if (localStatus) {
      updateData.status = localStatus;
    }

    if (redmineIssue.due_date) {
      updateData.dueDate = new Date(redmineIssue.due_date);
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
        externalUpdatedAt: new Date(redmineIssue.updated_on),
      },
    });

    return {
      success: true,
      message: 'Redmineからバグを更新しました。',
      externalIssueId: syncRecord.externalIssueId,
      externalIssueUrl: syncRecord.externalIssueUrl || undefined,
    };
  } catch (error) {
    console.error('Pull from Redmine error:', error);
    return {
      success: false,
      message: 'Redmineからの同期中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import an issue from Redmine as a new bug
 */
export async function importIssueFromRedmine(
  integrationId: bigint,
  externalIssueId: number,
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
          externalIssueId: String(externalIssueId),
        },
      },
    });

    if (existingSync) {
      return {
        success: false,
        message: 'このチケットは既にインポートされています。',
        bugId: existingSync.bugId.toString(),
        error: 'Already imported',
      };
    }

    // Get Redmine client
    const client = await getRedmineClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Redmineクライアントの作成に失敗しました。',
        error: 'Failed to create client',
      };
    }

    // Get issue from Redmine
    const result = await client.getIssue(externalIssueId);

    if (!result.success || !result.data) {
      return { success: false, message: 'Redmineからの取得に失敗しました。', error: result.error };
    }

    const redmineIssue = result.data.issue;
    const externalUrl = `${integration.baseUrl}/issues/${redmineIssue.id}`;

    // Get status mapping
    let localStatus = 'NEW';
    const statusMapping = await getStatusMapping(
      integrationId,
      undefined,
      String(redmineIssue.status.id)
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
    const priorityReverseMap: Record<number, string> = {
      1: 'LOW',
      2: 'MEDIUM',
      3: 'HIGH',
      4: 'URGENT',
      5: 'CRITICAL',
    };
    const priority = priorityReverseMap[redmineIssue.priority.id] || 'MEDIUM';

    // Create bug
    const bug = await prisma.bug.create({
      data: {
        projectId,
        title: redmineIssue.subject,
        description: redmineIssue.description || null,
        type: 'BUG',
        status: localStatus as 'NEW',
        priority: priority as 'MEDIUM',
        severity: 'MAJOR',
        reporterId,
        dueDate: redmineIssue.due_date ? new Date(redmineIssue.due_date) : null,
        externalId: String(redmineIssue.id),
        externalUrl,
      },
    });

    // Create sync record
    await prisma.bugSync.create({
      data: {
        bugId: bug.id,
        integrationId,
        externalIssueId: String(redmineIssue.id),
        externalIssueKey: `#${redmineIssue.id}`,
        externalIssueUrl: externalUrl,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        lastSyncDirection: 'FROM_EXTERNAL',
        localUpdatedAt: bug.updatedAt,
        externalUpdatedAt: new Date(redmineIssue.updated_on),
      },
    });

    return {
      success: true,
      message: 'Redmineからチケットをインポートしました。',
      bugId: bug.id.toString(),
      externalIssueId: String(redmineIssue.id),
      externalIssueUrl: externalUrl,
    };
  } catch (error) {
    console.error('Import from Redmine error:', error);
    return {
      success: false,
      message: 'Redmineからのインポート中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
    parts.push(bug.description);
  }

  if (bug.stepsToReproduce) {
    parts.push('\n### 再現手順\n' + bug.stepsToReproduce);
  }

  if (bug.expectedResult) {
    parts.push('\n### 期待結果\n' + bug.expectedResult);
  }

  if (bug.actualResult) {
    parts.push('\n### 実際の結果\n' + bug.actualResult);
  }

  if (bug.environment) {
    parts.push('\n### 環境\n' + bug.environment);
  }

  if (bug.version) {
    parts.push('\n### バージョン\n' + bug.version);
  }

  return parts.join('\n');
}

/**
 * Get list of Redmine issues for import
 */
export async function getRedmineIssuesForImport(
  integrationId: bigint,
  options: {
    status_id?: string | number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ success: boolean; issues?: RedmineIssue[]; total?: number; error?: string }> {
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

    // Get Redmine client
    const client = await getRedmineClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return { success: false, error: 'Failed to create client' };
    }

    // Get issues
    const result = await client.getIssues(integration.projectKey, {
      ...options,
      limit: options.limit || 25,
      sort: 'updated_on:desc',
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      issues: result.data.issues,
      total: result.data.total_count,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
