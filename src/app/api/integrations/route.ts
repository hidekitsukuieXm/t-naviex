/**
 * 外部連携設定一覧・作成 API
 * GET /api/integrations - 一覧取得
 * POST /api/integrations - 新規作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getExternalIntegrations,
  createExternalIntegration,
} from '@/repositories/external-integration-repository';
import {
  validateCreateExternalIntegration,
  toExternalIntegrationSafe,
} from '@/types/external-integration';

// GET /api/integrations
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectIdStr = searchParams.get('projectId');
    const projectId = projectIdStr ? BigInt(projectIdStr) : undefined;

    const integrations = await getExternalIntegrations(projectId);
    const safeIntegrations = integrations.map(toExternalIntegrationSafe);

    return NextResponse.json({ integrations: safeIntegrations });
  } catch (error) {
    console.error('Get integrations error:', error);
    return NextResponse.json({ error: '外部連携設定の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/integrations
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateCreateExternalIntegration(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const integration = await createExternalIntegration(validation.data, BigInt(session.user.id));

    // Convert to safe format (without encrypted fields)
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
      lastTestedAt: null,
      lastTestResult: null,
      lastTestError: null,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
      createdById: integration.createdById.toString(),
      updatedById: null,
    };

    return NextResponse.json(safeIntegration, { status: 201 });
  } catch (error) {
    console.error('Create integration error:', error);
    return NextResponse.json({ error: '外部連携設定の作成に失敗しました。' }, { status: 500 });
  }
}
