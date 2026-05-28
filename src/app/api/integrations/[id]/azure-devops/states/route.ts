/**
 * Azure DevOps States API
 * GET /api/integrations/[id]/azure-devops/states - Get work item states from Azure DevOps
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';
import { createAzureDevOpsClientFromIntegration } from '@/services/azure-devops-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/integrations/[id]/azure-devops/states
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

    if (!integration.projectKey) {
      return NextResponse.json(
        { error: 'プロジェクトキーが設定されていません。' },
        { status: 400 }
      );
    }

    // Create Azure DevOps client
    const client = await createAzureDevOpsClientFromIntegration(integrationId, {
      baseUrl: integration.baseUrl,
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Azure DevOpsクライアントの作成に失敗しました。' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const workItemType = searchParams.get('workItemType') || 'Bug';

    // Get states for the specified work item type
    const result = await client.getWorkItemStates(integration.projectKey, workItemType);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'ステートの取得に失敗しました。' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      states: result.data?.value?.map((state) => ({
        name: state.name,
        color: state.color,
        category: state.category,
      })),
    });
  } catch (error) {
    console.error('Get Azure DevOps states error:', error);
    return NextResponse.json(
      { error: 'Azure DevOpsステートの取得に失敗しました。' },
      { status: 500 }
    );
  }
}
