/**
 * Knowledge Graph Single Entity Sync API
 *
 * POST   /api/knowledge-graph/sync/[entityType]/[entityId] - 単一エンティティ同期
 * DELETE /api/knowledge-graph/sync/[entityType]/[entityId] - 単一エンティティ削除
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  syncSingleTestCase,
  syncSingleBug,
  deleteNodeFromGraph,
} from '@/services/graph/test-data-sync-service';

type EntityType = 'testCase' | 'bug' | 'requirement';

interface RouteParams {
  params: Promise<{
    entityType: EntityType;
    entityId: string;
  }>;
}

/**
 * POST /api/knowledge-graph/sync/[entityType]/[entityId]
 * 単一エンティティを同期
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entityType, entityId } = await params;

  try {
    let result;

    switch (entityType) {
      case 'testCase':
        result = await syncSingleTestCase(entityId);
        break;

      case 'bug':
        result = await syncSingleBug(entityId);
        break;

      case 'requirement':
        // TODO: Implement single requirement sync
        return NextResponse.json({ error: 'Requirement sync not implemented' }, { status: 501 });

      default:
        return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      entityType,
      entityId,
      result,
    });
  } catch (error) {
    console.error(`Failed to sync ${entityType}:`, error);
    return NextResponse.json({ error: `Failed to sync ${entityType}` }, { status: 500 });
  }
}

/**
 * DELETE /api/knowledge-graph/sync/[entityType]/[entityId]
 * 単一エンティティをグラフから削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entityType, entityId } = await params;

  try {
    let nodeType: 'TestCase' | 'Bug' | 'Requirement';

    switch (entityType) {
      case 'testCase':
        nodeType = 'TestCase';
        break;

      case 'bug':
        nodeType = 'Bug';
        break;

      case 'requirement':
        nodeType = 'Requirement';
        break;

      default:
        return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    const result = await deleteNodeFromGraph(entityId, nodeType);

    return NextResponse.json({
      success: result.success,
      entityType,
      entityId,
      result,
    });
  } catch (error) {
    console.error(`Failed to delete ${entityType}:`, error);
    return NextResponse.json({ error: `Failed to delete ${entityType}` }, { status: 500 });
  }
}
