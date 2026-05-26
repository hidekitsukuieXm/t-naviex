/**
 * Integration Status Mapping API
 * GET /api/integrations/[id]/status-mappings - Get status mappings
 * POST /api/integrations/[id]/status-mappings - Create status mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const createMappingSchema = z.object({
  localStatusId: z
    .bigint()
    .or(z.string().transform((s) => BigInt(s)))
    .or(z.number().transform((n) => BigInt(n))),
  externalStatusId: z.string().min(1).max(100),
  externalStatusName: z.string().min(1).max(100),
  syncDirection: z.enum(['BIDIRECTIONAL', 'TO_EXTERNAL', 'FROM_EXTERNAL']),
});

// GET /api/integrations/[id]/status-mappings
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const integrationId = BigInt(id);

    // Check if integration exists
    const integration = await getExternalIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json({ error: '連携設定が見つかりません。' }, { status: 404 });
    }

    const mappings = await prisma.integrationStatusMapping.findMany({
      where: { integrationId },
      include: {
        localStatus: {
          select: {
            id: true,
            code: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const safeMappings = mappings.map((mapping) => ({
      id: mapping.id.toString(),
      integrationId: mapping.integrationId.toString(),
      localStatusId: mapping.localStatusId.toString(),
      localStatusCode: mapping.localStatus.code,
      localStatusName: mapping.localStatus.name,
      localStatusColor: mapping.localStatus.color,
      externalStatusId: mapping.externalStatusId,
      externalStatusName: mapping.externalStatusName,
      syncDirection: mapping.syncDirection,
      createdAt: mapping.createdAt.toISOString(),
      updatedAt: mapping.updatedAt.toISOString(),
    }));

    return NextResponse.json({ mappings: safeMappings });
  } catch (error) {
    console.error('Get status mappings error:', error);
    return NextResponse.json(
      { error: 'ステータスマッピングの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// POST /api/integrations/[id]/status-mappings
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const integrationId = BigInt(id);

    // Check if integration exists
    const integration = await getExternalIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json({ error: '連携設定が見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const validation = createMappingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { localStatusId, externalStatusId, externalStatusName, syncDirection } = validation.data;

    // Check if local status exists
    const localStatus = await prisma.bugStatusMaster.findUnique({
      where: { id: localStatusId },
    });

    if (!localStatus) {
      return NextResponse.json({ error: 'ローカルステータスが見つかりません。' }, { status: 400 });
    }

    // Check for existing mapping with same local status
    const existingLocal = await prisma.integrationStatusMapping.findUnique({
      where: {
        integrationId_localStatusId: {
          integrationId,
          localStatusId,
        },
      },
    });

    if (existingLocal) {
      return NextResponse.json(
        { error: 'このローカルステータスは既にマッピングされています。' },
        { status: 400 }
      );
    }

    // Check for existing mapping with same external status
    const existingExternal = await prisma.integrationStatusMapping.findUnique({
      where: {
        integrationId_externalStatusId: {
          integrationId,
          externalStatusId,
        },
      },
    });

    if (existingExternal) {
      return NextResponse.json(
        { error: 'この外部ステータスは既にマッピングされています。' },
        { status: 400 }
      );
    }

    const mapping = await prisma.integrationStatusMapping.create({
      data: {
        integrationId,
        localStatusId,
        externalStatusId,
        externalStatusName,
        syncDirection,
      },
      include: {
        localStatus: {
          select: {
            id: true,
            code: true,
            name: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: mapping.id.toString(),
        integrationId: mapping.integrationId.toString(),
        localStatusId: mapping.localStatusId.toString(),
        localStatusCode: mapping.localStatus.code,
        localStatusName: mapping.localStatus.name,
        localStatusColor: mapping.localStatus.color,
        externalStatusId: mapping.externalStatusId,
        externalStatusName: mapping.externalStatusName,
        syncDirection: mapping.syncDirection,
        createdAt: mapping.createdAt.toISOString(),
        updatedAt: mapping.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create status mapping error:', error);
    return NextResponse.json(
      { error: 'ステータスマッピングの作成に失敗しました。' },
      { status: 500 }
    );
  }
}
