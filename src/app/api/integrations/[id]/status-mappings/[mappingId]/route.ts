/**
 * Integration Status Mapping Detail API
 * DELETE /api/integrations/[id]/status-mappings/[mappingId] - Delete status mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getExternalIntegrationById } from '@/repositories/external-integration-repository';

interface RouteParams {
  params: Promise<{ id: string; mappingId: string }>;
}

// DELETE /api/integrations/[id]/status-mappings/[mappingId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, mappingId } = await params;
    const integrationId = BigInt(id);
    const mappingIdBigInt = BigInt(mappingId);

    // Check if integration exists
    const integration = await getExternalIntegrationById(integrationId);

    if (!integration) {
      return NextResponse.json({ error: '連携設定が見つかりません。' }, { status: 404 });
    }

    // Check if mapping exists and belongs to this integration
    const mapping = await prisma.integrationStatusMapping.findFirst({
      where: {
        id: mappingIdBigInt,
        integrationId,
      },
    });

    if (!mapping) {
      return NextResponse.json(
        { error: 'ステータスマッピングが見つかりません。' },
        { status: 404 }
      );
    }

    await prisma.integrationStatusMapping.delete({
      where: { id: mappingIdBigInt },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete status mapping error:', error);
    return NextResponse.json(
      { error: 'ステータスマッピングの削除に失敗しました。' },
      { status: 500 }
    );
  }
}
