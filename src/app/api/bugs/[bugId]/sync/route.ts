/**
 * Bug Sync API
 * POST /api/bugs/[bugId]/sync - Sync bug with external system
 * GET /api/bugs/[bugId]/sync - Get sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pushBugToRedmine, pullBugFromRedmine } from '@/services/redmine-sync';

interface RouteParams {
  params: Promise<{ bugId: string }>;
}

const syncSchema = z.object({
  integrationId: z
    .bigint()
    .or(z.string().transform((s) => BigInt(s)))
    .or(z.number().transform((n) => BigInt(n))),
  direction: z.enum(['push', 'pull']),
});

// GET /api/bugs/[bugId]/sync
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { bugId } = await params;
    const bugIdBigInt = BigInt(bugId);

    // Get all sync records for this bug
    const syncRecords = await prisma.bugSync.findMany({
      where: { bugId: bugIdBigInt },
      include: {
        integration: {
          select: {
            id: true,
            name: true,
            integrationType: true,
            baseUrl: true,
          },
        },
      },
    });

    const safeSyncRecords = syncRecords.map((record) => ({
      id: record.id.toString(),
      bugId: record.bugId.toString(),
      integrationId: record.integrationId.toString(),
      integrationName: record.integration.name,
      integrationType: record.integration.integrationType,
      externalIssueId: record.externalIssueId,
      externalIssueKey: record.externalIssueKey,
      externalIssueUrl: record.externalIssueUrl,
      syncStatus: record.syncStatus,
      lastSyncAt: record.lastSyncAt.toISOString(),
      lastSyncDirection: record.lastSyncDirection,
      lastSyncError: record.lastSyncError,
      localUpdatedAt: record.localUpdatedAt.toISOString(),
      externalUpdatedAt: record.externalUpdatedAt?.toISOString() || null,
    }));

    return NextResponse.json({ syncRecords: safeSyncRecords });
  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json({ error: '同期状態の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/bugs/[bugId]/sync
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { bugId } = await params;
    const bugIdBigInt = BigInt(bugId);

    // Check if bug exists
    const bug = await prisma.bug.findUnique({
      where: { id: bugIdBigInt },
    });

    if (!bug) {
      return NextResponse.json({ error: 'バグが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const validation = syncSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { integrationId, direction } = validation.data;

    // Check if integration exists
    const integration = await prisma.externalIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return NextResponse.json({ error: '連携設定が見つかりません。' }, { status: 404 });
    }

    if (!integration.isEnabled) {
      return NextResponse.json({ error: '連携が無効です。' }, { status: 400 });
    }

    let result;

    switch (integration.integrationType) {
      case 'REDMINE':
        if (direction === 'push') {
          result = await pushBugToRedmine(bugIdBigInt, integrationId);
        } else {
          result = await pullBugFromRedmine(bugIdBigInt, integrationId);
        }
        break;

      default:
        return NextResponse.json(
          { error: `${integration.integrationType}との同期は未対応です。` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      externalIssueId: result.externalIssueId,
      externalIssueUrl: result.externalIssueUrl,
    });
  } catch (error) {
    console.error('Sync bug error:', error);
    return NextResponse.json({ error: '同期に失敗しました。' }, { status: 500 });
  }
}
