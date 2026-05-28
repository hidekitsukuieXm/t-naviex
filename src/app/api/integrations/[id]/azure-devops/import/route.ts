/**
 * Azure DevOps Import API
 * POST /api/integrations/[id]/azure-devops/import - Import work item from Azure DevOps
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';
import { importWorkItemFromAzureDevOps } from '@/services/azure-devops-sync';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const importSchema = z.object({
  workItemId: z.number().int().positive('ワークアイテムIDは正の整数である必要があります'),
  projectId: z.string().min(1, 'プロジェクトIDは必須です'),
});

// POST /api/integrations/[id]/azure-devops/import
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    // Parse and validate request body
    const body = await request.json();
    const validation = importSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { workItemId, projectId } = validation.data;
    const reporterId = BigInt(session.user.id);

    // Import work item
    const result = await importWorkItemFromAzureDevOps(
      integrationId,
      workItemId,
      BigInt(projectId),
      reporterId
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || result.message,
          bugId: result.bugId,
        },
        { status: result.bugId ? 409 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      bugId: result.bugId,
      externalIssueId: result.externalIssueId,
      externalIssueUrl: result.externalIssueUrl,
    });
  } catch (error) {
    console.error('Import Azure DevOps work item error:', error);
    return NextResponse.json(
      { error: 'Azure DevOpsワークアイテムのインポートに失敗しました。' },
      { status: 500 }
    );
  }
}
