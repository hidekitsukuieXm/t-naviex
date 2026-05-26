/**
 * Redmine Issues API
 * GET /api/integrations/[id]/redmine/issues - Get issues from Redmine for import
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';
import { getRedmineIssuesForImport } from '@/services/redmine-sync';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/integrations/[id]/redmine/issues
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

    const searchParams = request.nextUrl.searchParams;
    const statusId = searchParams.get('status_id') || '*';
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getRedmineIssuesForImport(integrationId, {
      status_id: statusId,
      limit,
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
    console.error('Get Redmine issues error:', error);
    return NextResponse.json({ error: 'Redmineチケットの取得に失敗しました。' }, { status: 500 });
  }
}
