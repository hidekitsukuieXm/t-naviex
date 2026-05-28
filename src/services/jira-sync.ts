/**
 * Jira Sync Service
 * Handles bidirectional synchronization between bugs and Jira issues
 */

import { prisma } from '@/lib/prisma';
import { JiraClient, createJiraClientFromIntegration, JiraIssue } from './jira-client';
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
 * Get the Jira client for an integration
 */
async function getJiraClient(integration: ExternalIntegration): Promise<JiraClient | null> {
  return createJiraClientFromIntegration(integration.id, {
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
 * Map local priority to Jira priority
 */
function mapPriorityToJira(priority: string): string {
  const priorityMap: Record<string, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    URGENT: 'Highest',
    CRITICAL: 'Highest',
  };
  return priorityMap[priority] || 'Medium';
}

/**
 * Map Jira priority to local priority
 */
function mapPriorityFromJira(priority: string | undefined): string {
  if (!priority) return 'MEDIUM';
  const priorityReverseMap: Record<string, string> = {
    Lowest: 'LOW',
    Low: 'LOW',
    Medium: 'MEDIUM',
    High: 'HIGH',
    Highest: 'CRITICAL',
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
    parts.push(bug.description);
  }

  if (bug.stepsToReproduce) {
    parts.push('\nh3. Steps to Reproduce\n' + bug.stepsToReproduce);
  }

  if (bug.expectedResult) {
    parts.push('\nh3. Expected Result\n' + bug.expectedResult);
  }

  if (bug.actualResult) {
    parts.push('\nh3. Actual Result\n' + bug.actualResult);
  }

  if (bug.environment) {
    parts.push('\nh3. Environment\n' + bug.environment);
  }

  if (bug.version) {
    parts.push('\nh3. Version\n' + bug.version);
  }

  return parts.join('\n');
}

/**
 * Push a bug to Jira (create or update)
 */
export async function pushBugToJira(bugId: bigint, integrationId: bigint): Promise<SyncResult> {
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

    // Get Jira client
    const client = await getJiraClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Jiraクライアントの作成に失敗しました。',
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

    // Get issue type from integration options
    const options = integration.options as Record<string, unknown> | null;
    const issueTypeId = (options?.issueTypeId as string) || '10004'; // Default to Bug type

    // Create issue data
    const description = buildDescription(bug);

    if (existingSync) {
      // Update existing issue
      const result = await client.updateIssue(existingSync.externalIssueId, {
        fields: {
          summary: bug.title,
          description,
          priority: { name: mapPriorityToJira(bug.priority) },
        },
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
        return { success: false, message: 'Jiraへの更新に失敗しました。', error: result.error };
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
        message: 'Jiraのチケットを更新しました。',
        externalIssueId: existingSync.externalIssueId,
        externalIssueUrl: existingSync.externalIssueUrl || undefined,
      };
    } else {
      // Create new issue
      const result = await client.createIssue({
        fields: {
          project: { key: integration.projectKey || '' },
          summary: bug.title,
          description,
          issuetype: { id: issueTypeId },
          priority: { name: mapPriorityToJira(bug.priority) },
        },
      });

      if (!result.success || !result.data) {
        return { success: false, message: 'Jiraへの登録に失敗しました。', error: result.error };
      }

      const jiraIssue = result.data;
      const externalUrl = `${integration.baseUrl}/browse/${jiraIssue.key}`;

      // Create sync record
      await prisma.bugSync.create({
        data: {
          bugId,
          integrationId,
          externalIssueId: jiraIssue.id,
          externalIssueKey: jiraIssue.key,
          externalIssueUrl: externalUrl,
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          lastSyncDirection: 'TO_EXTERNAL',
          localUpdatedAt: bug.updatedAt,
          externalUpdatedAt: new Date(jiraIssue.fields.updated),
        },
      });

      // Update bug with external reference
      await prisma.bug.update({
        where: { id: bugId },
        data: {
          externalId: jiraIssue.key,
          externalUrl,
        },
      });

      return {
        success: true,
        message: 'Jiraにチケットを登録しました。',
        externalIssueId: jiraIssue.key,
        externalIssueUrl: externalUrl,
      };
    }
  } catch (error) {
    console.error('Push to Jira error:', error);
    return {
      success: false,
      message: 'Jiraへの同期中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pull an issue from Jira to update local bug
 */
export async function pullBugFromJira(bugId: bigint, integrationId: bigint): Promise<SyncResult> {
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

    // Get Jira client
    const client = await getJiraClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Jiraクライアントの作成に失敗しました。',
        error: 'Failed to create client',
      };
    }

    // Get issue from Jira (use key if available, otherwise id)
    const issueKey = syncRecord.externalIssueKey || syncRecord.externalIssueId;
    const result = await client.getIssue(issueKey);

    if (!result.success || !result.data) {
      await prisma.bugSync.update({
        where: { id: syncRecord.id },
        data: {
          syncStatus: 'ERROR',
          lastSyncError: result.error,
          lastSyncAt: new Date(),
        },
      });
      return { success: false, message: 'Jiraからの取得に失敗しました。', error: result.error };
    }

    const jiraIssue = result.data;

    // Get status mapping
    let localStatus: string | undefined;
    const statusMapping = await getStatusMapping(
      integrationId,
      undefined,
      jiraIssue.fields.status.id
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
    const priority = mapPriorityFromJira(jiraIssue.fields.priority?.name);

    // Update bug
    const updateData: Record<string, unknown> = {
      title: jiraIssue.fields.summary,
      description: jiraIssue.fields.description || null,
      priority,
    };

    if (localStatus) {
      updateData.status = localStatus;
    }

    if (jiraIssue.fields.duedate) {
      updateData.dueDate = new Date(jiraIssue.fields.duedate);
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
        externalUpdatedAt: new Date(jiraIssue.fields.updated),
      },
    });

    return {
      success: true,
      message: 'Jiraからバグを更新しました。',
      externalIssueId: syncRecord.externalIssueKey || syncRecord.externalIssueId,
      externalIssueUrl: syncRecord.externalIssueUrl || undefined,
    };
  } catch (error) {
    console.error('Pull from Jira error:', error);
    return {
      success: false,
      message: 'Jiraからの同期中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import an issue from Jira as a new bug
 */
export async function importIssueFromJira(
  integrationId: bigint,
  externalIssueKey: string,
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
    const existingSync = await prisma.bugSync.findFirst({
      where: {
        integrationId,
        OR: [{ externalIssueId: externalIssueKey }, { externalIssueKey }],
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

    // Get Jira client
    const client = await getJiraClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Jiraクライアントの作成に失敗しました。',
        error: 'Failed to create client',
      };
    }

    // Get issue from Jira
    const result = await client.getIssue(externalIssueKey);

    if (!result.success || !result.data) {
      return { success: false, message: 'Jiraからの取得に失敗しました。', error: result.error };
    }

    const jiraIssue = result.data;
    const externalUrl = `${integration.baseUrl}/browse/${jiraIssue.key}`;

    // Get status mapping
    let localStatus = 'NEW';
    const statusMapping = await getStatusMapping(
      integrationId,
      undefined,
      jiraIssue.fields.status.id
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
    const priority = mapPriorityFromJira(jiraIssue.fields.priority?.name);

    // Create bug
    const bug = await prisma.bug.create({
      data: {
        projectId,
        title: jiraIssue.fields.summary,
        description: jiraIssue.fields.description || null,
        type: 'BUG',
        status: localStatus as 'NEW',
        priority: priority as 'MEDIUM',
        severity: 'MAJOR',
        reporterId,
        dueDate: jiraIssue.fields.duedate ? new Date(jiraIssue.fields.duedate) : null,
        externalId: jiraIssue.key,
        externalUrl,
      },
    });

    // Create sync record
    await prisma.bugSync.create({
      data: {
        bugId: bug.id,
        integrationId,
        externalIssueId: jiraIssue.id,
        externalIssueKey: jiraIssue.key,
        externalIssueUrl: externalUrl,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        lastSyncDirection: 'FROM_EXTERNAL',
        localUpdatedAt: bug.updatedAt,
        externalUpdatedAt: new Date(jiraIssue.fields.updated),
      },
    });

    return {
      success: true,
      message: 'Jiraからチケットをインポートしました。',
      bugId: bug.id.toString(),
      externalIssueId: jiraIssue.key,
      externalIssueUrl: externalUrl,
    };
  } catch (error) {
    console.error('Import from Jira error:', error);
    return {
      success: false,
      message: 'Jiraからのインポート中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get list of Jira issues for import
 */
export async function getJiraIssuesForImport(
  integrationId: bigint,
  options: {
    status?: string | string[];
    maxResults?: number;
    startAt?: number;
  } = {}
): Promise<{ success: boolean; issues?: JiraIssue[]; total?: number; error?: string }> {
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

    // Get Jira client
    const client = await getJiraClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return { success: false, error: 'Failed to create client' };
    }

    // Get issues
    const result = await client.getIssues(integration.projectKey, {
      status: options.status,
      maxResults: options.maxResults || 25,
      startAt: options.startAt || 0,
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      issues: result.data.issues,
      total: result.data.total,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
