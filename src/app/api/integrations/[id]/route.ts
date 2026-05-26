/**
 * 外部連携設定詳細・更新・削除 API
 * GET /api/integrations/[id] - 詳細取得
 * PUT /api/integrations/[id] - 更新
 * DELETE /api/integrations/[id] - 削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getExternalIntegrationById,
  updateExternalIntegration,
  deleteExternalIntegration,
} from '@/repositories/external-integration-repository';
import {
  validateUpdateExternalIntegration,
  toExternalIntegrationSafe,
} from '@/types/external-integration';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/integrations/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const integrationId = BigInt(id);

    const integration = await getExternalIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json({ error: '外部連携設定が見つかりません。' }, { status: 404 });
    }

    const safeIntegration = toExternalIntegrationSafe(integration);

    return NextResponse.json(safeIntegration);
  } catch (error) {
    console.error('Get integration error:', error);
    return NextResponse.json({ error: '外部連携設定の取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/integrations/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const integrationId = BigInt(id);

    // Check if integration exists
    const existingIntegration = await getExternalIntegrationById(integrationId);

    if (!existingIntegration) {
      return NextResponse.json({ error: '外部連携設定が見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateUpdateExternalIntegration(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const integration = await updateExternalIntegration(
      integrationId,
      validation.data,
      BigInt(session.user.id)
    );

    // Build safe response
    const safeIntegration = {
      id: integration.id.toString(),
      projectId: integration.projectId?.toString() || null,
      name: integration.name,
      integrationType: integration.integrationType,
      baseUrl: integration.baseUrl,
      hasApiKey: !!integration.apiKeyEncrypted,
      username: integration.username,
      hasPassword: !!integration.passwordEncrypted,
      projectKey: integration.projectKey,
      options: integration.options,
      isEnabled: integration.isEnabled,
      lastTestedAt: integration.lastTestedAt?.toISOString() || null,
      lastTestResult: integration.lastTestResult,
      lastTestError: integration.lastTestError,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
      createdById: integration.createdById.toString(),
      updatedById: integration.updatedById?.toString() || null,
    };

    return NextResponse.json(safeIntegration);
  } catch (error) {
    console.error('Update integration error:', error);
    return NextResponse.json({ error: '外部連携設定の更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/integrations/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const integrationId = BigInt(id);

    // Check if integration exists
    const existingIntegration = await getExternalIntegrationById(integrationId);

    if (!existingIntegration) {
      return NextResponse.json({ error: '外部連携設定が見つかりません。' }, { status: 404 });
    }

    await deleteExternalIntegration(integrationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete integration error:', error);
    return NextResponse.json({ error: '外部連携設定の削除に失敗しました。' }, { status: 500 });
  }
}
