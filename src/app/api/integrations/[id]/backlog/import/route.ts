/**
 * Backlog Import API
 * POST /api/integrations/[id]/backlog/import - Import issue from Backlog
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';
import { importIssueFromBacklog } from '@/services/backlog-sync';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const importSchema = z.object({
  externalIssueIdOrKey: z.string().min(1),
  projectId: z
    .bigint()
    .or(z.string().transform((s) => BigInt(s)))
    .or(z.number().transform((n) => BigInt(n))),
});

// POST /api/integrations/[id]/backlog/import
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const validation = importSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { externalIssueIdOrKey, projectId } = validation.data;

    const result = await importIssueFromBacklog(
      integrationId,
      externalIssueIdOrKey,
      projectId,
      BigInt(session.user.id)
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      bugId: result.bugId,
      externalIssueId: result.externalIssueId,
      externalIssueUrl: result.externalIssueUrl,
    });
  } catch (error) {
    console.error('Import from Backlog error:', error);
    return NextResponse.json({ error: 'Backlogからのインポートに失敗しました。' }, { status: 500 });
  }
}
