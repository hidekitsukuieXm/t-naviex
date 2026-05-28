/**
 * Jira Statuses API
 * GET /api/integrations/[id]/jira/statuses - Get statuses from Jira
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';
import { createJiraClientFromIntegration } from '@/services/jira-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/integrations/[id]/jira/statuses
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const integrationId = BigInt(id);

    // Check if integration exists and is Jira type
    const integration = await getExternalIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json({ error: '連携設定が見つかりません。' }, { status: 404 });
    }

    if (integration.integrationType !== 'JIRA') {
      return NextResponse.json({ error: 'この連携はJIRAではありません。' }, { status: 400 });
    }

    // Create Jira client
    const client = await createJiraClientFromIntegration(integrationId, {
      baseUrl: integration.baseUrl,
      username: integration.username,
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Jiraクライアントの作成に失敗しました。' },
        { status: 500 }
      );
    }

    // Get statuses - use project-specific if projectKey is set
    let result;
    if (integration.projectKey) {
      result = await client.getProjectStatuses(integration.projectKey);
    } else {
      result = await client.getStatuses();
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'ステータスの取得に失敗しました。' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      statuses: result.data?.map((status) => ({
        id: status.id,
        name: status.name,
        description: status.description,
        category: status.statusCategory?.name,
        categoryKey: status.statusCategory?.key,
      })),
    });
  } catch (error) {
    console.error('Get Jira statuses error:', error);
    return NextResponse.json({ error: 'Jiraステータスの取得に失敗しました。' }, { status: 500 });
  }
}
