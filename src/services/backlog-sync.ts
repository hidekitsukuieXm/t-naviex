/**
 * Backlog Sync Service
 * Handles bidirectional synchronization between bugs and Backlog issues
 */

import { prisma } from '@/lib/prisma';
import { BacklogClient, createBacklogClientFromIntegration, BacklogIssue } from './backlog-client';
import type { ExternalIntegration } from '@/types/external-integration';

export interface SyncResult {
  success: boolean;
  message: string;
  externalIssueId?: string;
  externalIssueUrl?: string;
  error?: string;
}

/**
 * Get the Backlog client for an integration
 */
async function getBacklogClient(integration: ExternalIntegration): Promise<BacklogClient | null> {
  return createBacklogClientFromIntegration(integration.id, {
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
): Promise<{ localStatusId: bigint; externalStatusId: string; externalStatusName: string } | null> {
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
 * Push a bug to Backlog (create or update)
 */
export async function pushBugToBacklog(bugId: bigint, integrationId: bigint): Promise<SyncResult> {
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

    // Get Backlog client
    const client = await getBacklogClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Backlogクライアントの作成に失敗しました。',
        error: 'Failed to create client',
      };
    }

    // Get project info
    if (!integration.projectKey) {
      return {
        success: false,
        message: 'プロジェクトキーが設定されていません。',
        error: 'Project key not configured',
      };
    }

    const projectResult = await client.getProject(integration.projectKey);
    if (!projectResult.success || !projectResult.data) {
      return {
        success: false,
        message: 'Backlogプロジェクトの取得に失敗しました。',
        error: projectResult.error,
      };
    }

    const project = projectResult.data;

    // Get issue types
    const issueTypesResult = await client.getIssueTypes(integration.projectKey);
    if (!issueTypesResult.success || !issueTypesResult.data || issueTypesResult.data.length === 0) {
      return {
        success: false,
        message: '課題種別の取得に失敗しました。',
        error: issueTypesResult.error,
      };
    }

    // Use first issue type as default (usually "バグ" or similar)
    const issueTypeId =
      issueTypesResult.data.find((t) => t.name.includes('バグ') || t.name.includes('Bug'))?.id ||
      issueTypesResult.data[0].id;

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

    let backlogStatusId: number | undefined;
    if (bugStatusMaster) {
      const statusMapping = await getStatusMapping(integrationId, bugStatusMaster.id);
      if (statusMapping) {
        backlogStatusId = parseInt(statusMapping.externalStatusId, 10);
      }
    }

    // Map priority (Backlog: 2=高, 3=中, 4=低)
    const priorityMap: Record<string, number> = {
      LOW: 4,
      MEDIUM: 3,
      HIGH: 2,
      URGENT: 2,
      CRITICAL: 2,
    };
    const priorityId = priorityMap[bug.priority] || 3;

    if (existingSync) {
      // Update existing issue
      const updateData: Record<string, unknown> = {
        summary: bug.title,
        description: buildDescription(bug),
        priorityId,
      };

      if (backlogStatusId) {
        updateData.statusId = backlogStatusId;
      }

      const result = await client.updateIssue(existingSync.externalIssueId, updateData);

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
          message: 'Backlogへの更新に失敗しました。',
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
        message: 'Backlogの課題を更新しました。',
        externalIssueId: existingSync.externalIssueId,
        externalIssueUrl: existingSync.externalIssueUrl || undefined,
      };
    } else {
      // Create new issue
      const issueData = {
        projectId: project.id,
        summary: bug.title,
        issueTypeId,
        priorityId,
        description: buildDescription(bug),
        statusId: backlogStatusId,
      };

      const result = await client.createIssue(issueData);

      if (!result.success || !result.data) {
        return {
          success: false,
          message: 'Backlogへの登録に失敗しました。',
          error: result.error,
        };
      }

      const backlogIssue = result.data;
      const externalUrl = `${integration.baseUrl}/view/${backlogIssue.issueKey}`;

      // Create sync record
      await prisma.bugSync.create({
        data: {
          bugId,
          integrationId,
          externalIssueId: String(backlogIssue.id),
          externalIssueKey: backlogIssue.issueKey,
          externalIssueUrl: externalUrl,
          syncStatus: 'SYNCED',
          lastSyncAt: new Date(),
          lastSyncDirection: 'TO_EXTERNAL',
          localUpdatedAt: bug.updatedAt,
          externalUpdatedAt: new Date(backlogIssue.updated),
        },
      });

      // Update bug with external reference
      await prisma.bug.update({
        where: { id: bugId },
        data: {
          externalId: backlogIssue.issueKey,
          externalUrl,
        },
      });

      return {
        success: true,
        message: 'Backlogに課題を登録しました。',
        externalIssueId: String(backlogIssue.id),
        externalIssueUrl: externalUrl,
      };
    }
  } catch (error) {
    console.error('Push to Backlog error:', error);
    return {
      success: false,
      message: 'Backlogへの同期中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pull an issue from Backlog to update local bug
 */
export async function pullBugFromBacklog(
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

    // Get Backlog client
    const client = await getBacklogClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Backlogクライアントの作成に失敗しました。',
        error: 'Failed to create client',
      };
    }

    // Get issue from Backlog (use issueKey if available)
    const issueIdOrKey = syncRecord.externalIssueKey || syncRecord.externalIssueId;
    const result = await client.getIssue(issueIdOrKey);

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
        message: 'Backlogからの取得に失敗しました。',
        error: result.error,
      };
    }

    const backlogIssue = result.data;

    // Get status mapping
    let localStatus: string | undefined;
    const statusMapping = await getStatusMapping(
      integrationId,
      undefined,
      String(backlogIssue.status.id)
    );
    if (statusMapping) {
      const statusMaster = await prisma.bugStatusMaster.findUnique({
        where: { id: statusMapping.localStatusId },
      });
      if (statusMaster) {
        localStatus = statusMaster.code;
      }
    }

    // Map priority (Backlog: 2=高, 3=中, 4=低)
    const priorityReverseMap: Record<number, string> = {
      2: 'HIGH',
      3: 'MEDIUM',
      4: 'LOW',
    };
    const priority = priorityReverseMap[backlogIssue.priority.id] || 'MEDIUM';

    // Update bug
    const updateData: Record<string, unknown> = {
      title: backlogIssue.summary,
      description: backlogIssue.description || null,
      priority,
    };

    if (localStatus) {
      updateData.status = localStatus;
    }

    if (backlogIssue.dueDate) {
      updateData.dueDate = new Date(backlogIssue.dueDate);
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
        externalUpdatedAt: new Date(backlogIssue.updated),
      },
    });

    return {
      success: true,
      message: 'Backlogからバグを更新しました。',
      externalIssueId: syncRecord.externalIssueId,
      externalIssueUrl: syncRecord.externalIssueUrl || undefined,
    };
  } catch (error) {
    console.error('Pull from Backlog error:', error);
    return {
      success: false,
      message: 'Backlogからの同期中にエラーが発生しました。',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Import an issue from Backlog as a new bug
 */
export async function importIssueFromBacklog(
  integrationId: bigint,
  externalIssueIdOrKey: string,
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

    // Get Backlog client
    const client = await getBacklogClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return {
        success: false,
        message: 'Backlogクライアントの作成に失敗しました。',
        error: 'Failed to create client',
      };
    }

    // Get issue from Backlog
    const result = await client.getIssue(externalIssueIdOrKey);

    if (!result.success || !result.data) {
      return {
        success: false,
        message: 'Backlogからの取得に失敗しました。',
        error: result.error,
      };
    }

    const backlogIssue = result.data;
    const externalIssueId = String(backlogIssue.id);

    // Check if already imported
    const existingSync = await prisma.bugSync.findUnique({
      where: {
        integrationId_externalIssueId: {
          integrationId,
          externalIssueId,
        },
      },
    });

    if (existingSync) {
      return {
        success: false,
        message: 'この課題は既にインポートされています。',
        bugId: existingSync.bugId.toString(),
        error: 'Already imported',
      };
    }

    const externalUrl = `${integration.baseUrl}/view/${backlogIssue.issueKey}`;

    // Get status mapping
    let localStatus = 'NEW';
    const statusMapping = await getStatusMapping(
      integrationId,
      undefined,
      String(backlogIssue.status.id)
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
      2: 'HIGH',
      3: 'MEDIUM',
      4: 'LOW',
    };
    const priority = priorityReverseMap[backlogIssue.priority.id] || 'MEDIUM';

    // Create bug
    const bug = await prisma.bug.create({
      data: {
        projectId,
        title: backlogIssue.summary,
        description: backlogIssue.description || null,
        type: 'BUG',
        status: localStatus as 'NEW',
        priority: priority as 'MEDIUM',
        severity: 'MAJOR',
        reporterId,
        dueDate: backlogIssue.dueDate ? new Date(backlogIssue.dueDate) : null,
        externalId: backlogIssue.issueKey,
        externalUrl,
      },
    });

    // Create sync record
    await prisma.bugSync.create({
      data: {
        bugId: bug.id,
        integrationId,
        externalIssueId,
        externalIssueKey: backlogIssue.issueKey,
        externalIssueUrl: externalUrl,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        lastSyncDirection: 'FROM_EXTERNAL',
        localUpdatedAt: bug.updatedAt,
        externalUpdatedAt: new Date(backlogIssue.updated),
      },
    });

    return {
      success: true,
      message: 'Backlogから課題をインポートしました。',
      bugId: bug.id.toString(),
      externalIssueId,
      externalIssueUrl: externalUrl,
    };
  } catch (error) {
    console.error('Import from Backlog error:', error);
    return {
      success: false,
      message: 'Backlogからのインポート中にエラーが発生しました。',
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
    parts.push('\n** 再現手順 **\n' + bug.stepsToReproduce);
  }

  if (bug.expectedResult) {
    parts.push('\n** 期待結果 **\n' + bug.expectedResult);
  }

  if (bug.actualResult) {
    parts.push('\n** 実際の結果 **\n' + bug.actualResult);
  }

  if (bug.environment) {
    parts.push('\n** 環境 **\n' + bug.environment);
  }

  if (bug.version) {
    parts.push('\n** バージョン **\n' + bug.version);
  }

  return parts.join('\n');
}

/**
 * Get list of Backlog issues for import
 */
export async function getBacklogIssuesForImport(
  integrationId: bigint,
  options: {
    count?: number;
    offset?: number;
  } = {}
): Promise<{ success: boolean; issues?: BacklogIssue[]; total?: number; error?: string }> {
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

    // Get Backlog client
    const client = await getBacklogClient(integration as unknown as ExternalIntegration);
    if (!client) {
      return { success: false, error: 'Failed to create client' };
    }

    // Get project
    const projectResult = await client.getProject(integration.projectKey);
    if (!projectResult.success || !projectResult.data) {
      return { success: false, error: projectResult.error };
    }

    const projectId = projectResult.data.id;

    // Get issue count
    const countResult = await client.getIssueCount(projectId);
    const total = countResult.success && countResult.data ? countResult.data.count : 0;

    // Get issues
    const result = await client.getIssues(projectId, {
      count: options.count || 25,
      offset: options.offset || 0,
      sort: 'updated',
      order: 'desc',
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      issues: result.data,
      total,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
