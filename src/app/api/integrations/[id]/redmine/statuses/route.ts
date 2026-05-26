/**
 * Redmine Statuses API
 * GET /api/integrations/[id]/redmine/statuses - Get issue statuses from Redmine
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';
import { createRedmineClientFromIntegration } from '@/services/redmine-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/integrations/[id]/redmine/statuses
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const integrationId = BigInt(id);

    // Check if integration exists and is Redmine type
    const integration = await getExternalIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json({ error: '連携設定が見つかりません。' }, { status: 404 });
    }

    if (integration.integrationType !== 'REDMINE') {
      return NextResponse.json({ error: 'この連携はRedmineではありません。' }, { status: 400 });
    }

    // Get Redmine client
    const client = await createRedmineClientFromIntegration(integrationId, {
      baseUrl: integration.baseUrl,
      username: integration.username,
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Redmineクライアントの作成に失敗しました。' },
        { status: 500 }
      );
    }

    const result = await client.getIssueStatuses();

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || '取得に失敗しました。' }, { status: 500 });
    }

    const statuses = result.data.issue_statuses.map((status) => ({
      id: String(status.id),
      name: status.name,
      isClosed: status.is_closed,
    }));

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Get Redmine statuses error:', error);
    return NextResponse.json({ error: 'Redmineステータスの取得に失敗しました。' }, { status: 500 });
  }
}
