/**
 * Backlog Issues API
 * GET /api/integrations/[id]/backlog/issues - Get issues from Backlog for import
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';
import { getBacklogIssuesForImport } from '@/services/backlog-sync';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/integrations/[id]/backlog/issues
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

    const searchParams = request.nextUrl.searchParams;
    const count = parseInt(searchParams.get('count') || '25', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getBacklogIssuesForImport(integrationId, {
      count,
      offset,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || '取得に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({
      issues: result.issues,
      total: result.total,
    });
  } catch (error) {
    console.error('Get Backlog issues error:', error);
    return NextResponse.json({ error: 'Backlog課題の取得に失敗しました。' }, { status: 500 });
  }
}
