/**
 * Jira Issues API
 * GET /api/integrations/[id]/jira/issues - Get issues from Jira for import
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';
import { getJiraIssuesForImport } from '@/services/jira-sync';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/integrations/[id]/jira/issues
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const maxResults = parseInt(searchParams.get('maxResults') || '25', 10);
    const startAt = parseInt(searchParams.get('startAt') || '0', 10);

    const result = await getJiraIssuesForImport(integrationId, {
      status,
      maxResults,
      startAt,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || '取得に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({
      issues: result.issues,
      total: result.total,
    });
  } catch (error) {
    console.error('Get Jira issues error:', error);
    return NextResponse.json({ error: 'Jiraチケットの取得に失敗しました。' }, { status: 500 });
  }
}
