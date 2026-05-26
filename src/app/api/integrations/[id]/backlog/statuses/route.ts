/**
 * Backlog Statuses API
 * GET /api/integrations/[id]/backlog/statuses - Get issue statuses from Backlog
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';
import { createBacklogClientFromIntegration } from '@/services/backlog-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/integrations/[id]/backlog/statuses
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const integrationId = BigInt(id);

    // Check if integration exists and is Backlog type
    const integration = await getExternalIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json({ error: '連携設定が見つかりません。' }, { status: 404 });
    }

    if (integration.integrationType !== 'BACKLOG') {
      return NextResponse.json({ error: 'この連携はBacklogではありません。' }, { status: 400 });
    }

    if (!integration.projectKey) {
      return NextResponse.json(
        { error: 'プロジェクトキーが設定されていません。' },
        { status: 400 }
      );
    }

    // Get Backlog client
    const client = await createBacklogClientFromIntegration(integrationId, {
      baseUrl: integration.baseUrl,
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Backlogクライアントの作成に失敗しました。' },
        { status: 500 }
      );
    }

    const result = await client.getStatuses(integration.projectKey);

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || '取得に失敗しました。' }, { status: 500 });
    }

    const statuses = result.data.map((status) => ({
      id: String(status.id),
      name: status.name,
      color: status.color,
      displayOrder: status.displayOrder,
    }));

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Get Backlog statuses error:', error);
    return NextResponse.json({ error: 'Backlogステータスの取得に失敗しました。' }, { status: 500 });
  }
}
