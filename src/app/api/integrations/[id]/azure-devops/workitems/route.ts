/**
 * Azure DevOps Work Items API
 * GET /api/integrations/[id]/azure-devops/workitems - Get work items from Azure DevOps for import
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';
import { getAzureDevOpsWorkItemsForImport } from '@/services/azure-devops-sync';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/integrations/[id]/azure-devops/workitems
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const integrationId = BigInt(id);

    // Check if integration exists and is Azure DevOps type
    const integration = await getExternalIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json({ error: '連携設定が見つかりません。' }, { status: 404 });
    }

    if (integration.integrationType !== 'AZURE_DEVOPS') {
      return NextResponse.json(
        { error: 'この連携はAzure DevOpsではありません。' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const workItemType = searchParams.get('workItemType') || undefined;
    const state = searchParams.get('state') || undefined;
    const top = parseInt(searchParams.get('top') || '25', 10);

    const result = await getAzureDevOpsWorkItemsForImport(integrationId, {
      workItemType,
      state,
      top,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || '取得に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({
      workItems: result.workItems,
      total: result.total,
    });
  } catch (error) {
    console.error('Get Azure DevOps work items error:', error);
    return NextResponse.json(
      { error: 'Azure DevOpsワークアイテムの取得に失敗しました。' },
      { status: 500 }
    );
  }
}
